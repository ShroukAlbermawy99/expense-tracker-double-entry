import { EnvironmentInjector, inject, Injectable, runInInjectionContext } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/compat/database';
import firebase from 'firebase/compat/app';
import { map, Observable, Subject } from 'rxjs';

import { Account, AccountCategory, Entry, EntryWithAccounts, Expense, JournalEntry } from '../interfaces/account-model';
import { UserDetails } from '../interfaces/user-details';
// import { Transaction } from 'firebase/firestore';
// import { Transaction } from '../interfaces/expense-model';
import {
  collection,
  collectionData,
  // CollectionReference,
  deleteDoc,
  doc,
  Firestore,
  getDoc,
  getDocs,
  increment,
  // QueryDocumentSnapshot,
  runTransaction,
  setDoc,
} from '@angular/fire/firestore';
import { EntrySource } from '@core/enums/entry-types';
import { defaultChartOfAccounts } from '../../shared/constants/expense-constants';
import { SyncService } from './sync.service';
import { TransactionDataService } from './transaction-data.service';
// import { create } from 'lodash';
// Inside your Firestore transaction:

@Injectable({
  providedIn: 'root',
})

/* 
Subject: a special type of Observable that acts as both an Observable and an Observer. This dual nature allows it to:
Be an Observable:
You can subscribe to a Subject just like any other Observable to receive emitted values.
Be an Observer:
It has next(), error(), and complete() methods, allowing you to feed values into it, which are then multicasted to all its active subscribers.
The key characteristic of a Subject is its multicasting ability. Unlike a plain Observable where each subscribe() call triggers an independent execution, a Subject shares a single execution among all its subscribers. When a value is emitted via subject.next(), all currently subscribed observers receive that same value.
*/
export class DatabaseService {
  private expenseAddedSource = new Subject<string>();
  private transactionAddedSource = new Subject<string>();
  private categoriesAddedSource = new Subject<string>();
  private injectionContext = inject(EnvironmentInjector);
  private chartOfAccounts: Account[] = [...defaultChartOfAccounts];
  private readonly firestoreTimeoutMs = 8000;
  syncService = inject(SyncService);
  transactionDataService = inject(TransactionDataService);
  constructor(
    public db: AngularFireDatabase,
    private firestore: Firestore,
  ) {}

  private withTimeout<T>(promise: Promise<T>, ms = this.firestoreTimeoutMs, label = 'operation'): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (err) => {
          clearTimeout(timer);
          reject(err);
        },
      );
    });
  }

  getRealTimeUserAccounts(userId: string, source: 'firestore' | 'rtdb' = 'firestore'): Observable<Account[]> {
    if (source === 'rtdb') {
      return this.db.list<Account>(`users/${userId}/accounts`).valueChanges();
    }
    const txCollection = collection(this.firestore, `users/${userId}/accounts`);
    return collectionData(txCollection, { idField: 'id' }) as Observable<Account[]>;
  }

  
  async getCategories(userId: string): Promise<Record<AccountCategory, { value: string; removable: boolean }[]>> {
    const userRef = doc(this.firestore, `users/${userId}`);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data() || {};
    return (userData['categories'] as Record<AccountCategory, { value: string; removable: boolean }[]>) || {
      Asset: [],
      Liability: [],
      Equity: [],
      Revenue: [],
      Expense: [],
    };
  }

  getMirrorCategories(userId: string): Promise<firebase.database.DataSnapshot> {
    return this.db.database.ref('users/' + userId+ '/' + 'categories').once('value');
  }

  async getUserAccountsOnce(userId: string, source: 'firestore' | 'rtdb' = 'rtdb'): Promise<Account[]> {
    if (source === 'rtdb') {
      const snapshot = await this.db.database.ref(`users/${userId}/accounts`).once('value');
      const value = (snapshot.val() ?? {}) as Record<string, Account>;
      return Object.entries(value).map(([name, account]) => ({
        ...account,
        name: account?.name ?? name,
        id: account?.id ?? name,
      }));
    }

    return await getDocs(collection(this.firestore, `users/${userId}/accounts`)).then((snapshot) =>
      snapshot.docs.map((accountDoc) => {
        const data = accountDoc.data() as Account;
        return { ...data, id: data.id ?? accountDoc.id, name: data.name ?? accountDoc.id };
      }),
    );
  }
  async getRealTimeTypes(userId: string): Promise<Observable<string[]>> {
    return this.getRealTimeUserAccounts(userId).pipe(map((accounts: Account[]) => accounts?.map((a) => a.type)));
  }
  announceExpenseCreated(message: string) {
    this.expenseAddedSource.next(message);
  }

  announceTransacionCreated(message: string) {
    this.transactionAddedSource.next(message);
  }

  announceCategoriesAdded(message: string) {
    this.categoriesAddedSource.next(message);
  }

  saveNewExpense(expense: Expense, userId: string) {
    return this.db.database.ref('users/' + userId + '/expenses').push(expense);
  }

  async initializeAccounts(userId: string): Promise<void> {
    if (!userId) {
      return;
    }

    // Seed missing default accounts in RTDB first so the UI can render immediately.
    try {
      const rtdbSnap = await this.db.database.ref(`users/${userId}/accounts`).once('value');
      const existing = (rtdbSnap.val() ?? {}) as Record<string, Account>;
      const updates: Record<string, Account> = {};

      for (const acc of this.chartOfAccounts) {
        if (!existing[acc.name]) {
          updates[acc.name] = {
            ...acc,
            createdBy: userId,
            createdAt: new Date().toISOString(),
            source: EntrySource.AUTO,
            importedOn: false,
          };
        }
      }

      if (Object.keys(updates).length) {
        await this.db.database.ref(`users/${userId}/accounts`).update(updates);
      }
    } catch (err) {
      console.warn('RTDB account init failed', err);
    }

    // Firestore mirror is best-effort and must not block the UI.
    void Promise.allSettled(
      this.chartOfAccounts.map(async (acc) => {
        const accByUser: Account = {
          ...acc,
          createdBy: userId,
          createdAt: new Date().toISOString(),
          source: EntrySource.AUTO,
          importedOn: false,
        };

        try {
          const accRef = doc(this.firestore, `users/${userId}/accounts/${acc.name}`);
          const existing = await getDoc(accRef);
          if (!existing.exists()) {
            await setDoc(accRef, accByUser);
          }
        } catch (err) {
          console.warn(`Firestore account init failed for ${acc.name}`, err);
        }
      }),
    );
  }

  initializeCategories(userId: string) {
    // 1️⃣ Group default chart of accounts by type
    const groupedCategories: Record<string, { value: string; removable: boolean }[]> = {};

    for (const acc of defaultChartOfAccounts) {
      if (!groupedCategories[acc.type]) groupedCategories[acc.type] = [];

      // each category entry is now an object with value + removable
      groupedCategories[acc.type].push({
        value: acc.name,
        removable: false, // default behavior
      });
    }

    // 2️⃣ Save all categories to Firestore under one user doc
    const userRef = doc(this.firestore, `users/${userId}`);
    setDoc(userRef, { categories: groupedCategories }, { merge: true });

    // 3️⃣ Mirror to Realtime DB (for quick syncing)
    return this.db.database.ref(`users/${userId}/categories`).set(groupedCategories);
  }

  async saveNewAccount(account: Account, userId: string, importedFromFile: string, importedOn: boolean): Promise<void> {
    if (!userId) {
      throw new Error('A user id is required to save an account');
    }

    const accByUser: Account = {
      ...account,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      source: importedOn ? EntrySource.IMPORTED : EntrySource.MANUAL,
      importedOn,
      importedFrom: importedOn ? importedFromFile : '',
    };

    // RTDB first so import/UI stay responsive when Firestore hangs.
    await this.db.database.ref(`users/${userId}/accounts/${account.name}`).set(accByUser);

    try {
      const accRef = doc(this.firestore, `users/${userId}/accounts/${account.name}`);
      await this.withTimeout(setDoc(accRef, accByUser, { merge: true }), this.firestoreTimeoutMs, 'saveNewAccount');
    } catch (err) {
      console.warn(`Firestore account save failed for ${account.name}`, err);
    }
  }

  /* this.db.list('users/' + userId + '/expenses'):
  This accesses a Firebase Realtime Database instance (this.db) and targets a specific path within the database: users/<userId>/expenses. This path is expected to contain a list of expenses associated with the given userId.
  .snapshotChanges():
  This method from AngularFire returns an Observable that emits SnapshotAction objects whenever there are changes (additions, removals, modifications) to the data at the specified Firebase path.
  .pipe(...):
  This initiates an RxJS pipe operation, allowing for the application of various RxJS operators to the Observable stream.
  debounceTime(500):
  This RxJS operator delays the emission of values from the source Observable by 500 milliseconds. If new values are emitted within this delay, the previous pending emission is discarded, and the timer resets. This helps in reducing the frequency of emissions, especially during rapid changes to the data.
  distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)):
  This RxJS operator filters out consecutive duplicate values. The provided comparison function (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr) converts the previous and current SnapshotAction arrays to JSON strings and compares them. This ensures that emissions only occur when the actual content of the expense list changes, 
  preventing unnecessary updates if the order or other non-content-related aspects of the snapshots change.*/

  // Firestore is preferred for journal writes; RTDB mirrors balances for the UI.
  // If Firestore is unavailable, fall back to an RTDB write so the app stays usable.
  async saveNewTransaction(journalEntry: JournalEntry, userId: string): Promise<string> {
    if (!userId) {
      throw new Error('A user id is required to save a transaction');
    }

    await this.ensureAccountsForEntries(userId, journalEntry.entries);

    try {
      const txRef = doc(collection(this.firestore, `users/${userId}/transactions`));
      const accountsInvolved = journalEntry.entries.map((e) => e.account);
      const entryWithAccounts = { ...journalEntry, accountsInvolved, transactionId: txRef.id };

      const txId = await this.withTimeout(
        runTransaction(this.firestore, async (transaction) => {
          transaction.set(txRef, entryWithAccounts);

          for (const entry of journalEntry.entries) {
            const accRef = doc(this.firestore, `users/${userId}/accounts/${entry.account}`);
            const accSnap = await transaction.get(accRef);
            const account = accSnap.data();
            const delta = this.balanceDelta(
              String(account?.['type'] ?? this.resolveAccountTemplate(entry.account, userId).type),
              entry.type,
              entry.amount,
            );

            if (!account) {
              const seeded = this.resolveAccountTemplate(entry.account, userId);
              transaction.set(accRef, { ...seeded, balance: delta });
            } else {
              transaction.update(accRef, {
                balance: increment(delta),
              });
            }
          }

          return txRef.id;
        }),
        this.firestoreTimeoutMs,
        'saveNewTransaction',
      );

      try {
        await this.withTimeout(
          this.mirrorTransaction(userId, txId, entryWithAccounts, journalEntry.entries),
          this.firestoreTimeoutMs,
          'mirrorTransaction',
        );
      } catch (mirrorErr) {
        console.warn('RTDB mirror after Firestore save failed', mirrorErr);
      }
      return txId;
    } catch (err) {
      console.warn('Firestore transaction save failed, falling back to RTDB', err);
      return this.saveNewTransactionToRtdb(journalEntry, userId);
    }
  }

  private async ensureAccountsForEntries(userId: string, entries: Entry[]): Promise<void> {
    await Promise.all(
      entries.map(async (entry) => {
        const template = this.resolveAccountTemplate(entry.account, userId);

        try {
          const rtdbSnap = await this.db.database.ref(`users/${userId}/accounts/${entry.account}`).once('value');
          if (!rtdbSnap.exists()) {
            await this.db.database.ref(`users/${userId}/accounts/${entry.account}`).set(template);
          }
        } catch (err) {
          console.warn(`Could not ensure RTDB account ${entry.account}`, err);
        }

        // Firestore ensure is best-effort and time-boxed by the caller falling back to RTDB.
        void (async () => {
          try {
            const accRef = doc(this.firestore, `users/${userId}/accounts/${entry.account}`);
            const existing = await getDoc(accRef);
            if (!existing.exists()) {
              await setDoc(accRef, template);
            }
          } catch (err) {
            console.warn(`Could not ensure Firestore account ${entry.account}`, err);
          }
        })();
      }),
    );
  }

  private resolveAccountTemplate(accountName: string, userId: string): Account {
    const known =
      this.chartOfAccounts.find((account) => account.name === accountName) ||
      defaultChartOfAccounts.find((account) => account.name === accountName);

    return {
      name: accountName,
      type: known?.type ?? 'Expense',
      balance: known?.balance ?? 0,
      source: EntrySource.AUTO,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      importedOn: false,
      comments: known?.comments,
    };
  }

  private async saveNewTransactionToRtdb(journalEntry: JournalEntry, userId: string): Promise<string> {
    const txId = this.db.database.ref(`users/${userId}/transactions`).push().key;
    if (!txId) {
      throw new Error('Could not create transaction id');
    }

    const accountsInvolved = journalEntry.entries.map((e) => e.account);
    const entryWithAccounts = { ...journalEntry, accountsInvolved, transactionId: txId };
    const updates: Record<string, unknown> = {};

    for (const entry of journalEntry.entries) {
      updates[`users/${userId}/transactions/${entry.account}/${txId}`] = entryWithAccounts;

      const accSnap = await this.db.database.ref(`users/${userId}/accounts/${entry.account}`).once('value');
      const account = (accSnap.val() as Account | null) ?? this.resolveAccountTemplate(entry.account, userId);
      const nextBalance =
        Number(account.balance ?? 0) + this.balanceDelta(String(account.type), entry.type, entry.amount);

      updates[`users/${userId}/accounts/${entry.account}`] = {
        ...account,
        name: account.name || entry.account,
        balance: nextBalance,
      };
    }

    await this.db.database.ref().update(updates);
    return txId;
  }

  getRealTimeUserTransactions(userId: string): Observable<EntryWithAccounts[]> {
    const txCollection = collection(this.firestore, `users/${userId}/transactions`);
    return collectionData(txCollection, { idField: 'transactionId' }) as Observable<EntryWithAccounts[]>;
  }

  async getUserTransactionsOnce(userId: string): Promise<EntryWithAccounts[]> {
    const snapshot = await getDocs(collection(this.firestore, `users/${userId}/transactions`));
    return snapshot.docs.map((transactionDoc) => {
      const data = transactionDoc.data() as EntryWithAccounts;
      return { ...data, transactionId: data.transactionId ?? transactionDoc.id };
    });
  }

  async getBalance(userId: string, entry: Entry): Promise<number> {
    const accSnap = await getDoc(doc(this.firestore, `users/${userId}/accounts/${entry.account}`));
    const account = accSnap.data();
    return typeof account?.['balance'] === 'number' ? account['balance'] : 0;
  }

  async reverseTransaction(originalTxId: string, userId: string): Promise<string> {
    const txDoc = doc(this.firestore, `users/${userId}/transactions/${originalTxId}`);
    const originalSnap = await getDoc(txDoc);

    if (!originalSnap.exists()) {
      throw new Error(`Transaction not found: ${originalTxId}`);
    }

    const originalData = originalSnap.data() as JournalEntry;
    const reversalEntries: Entry[] = originalData.entries.map((entry) => ({
      account: entry.account,
      amount: Math.abs(entry.amount),
      type: entry.type.toLowerCase() === 'debit' ? 'Credit' : 'Debit',
    }));

    const reversalTxRef = doc(collection(this.firestore, `users/${userId}/transactions`));
    const reversalTx = {
      date: new Date().toISOString(),
      description: `Reversal of ${originalData.description ?? originalTxId}`,
      entries: reversalEntries,
      accountsInvolved: reversalEntries.map((entry) => entry.account),
      originalTxId,
      transactionId: reversalTxRef.id,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      reversalOf: originalTxId,
      source: EntrySource.AUTO,
    };

    await runTransaction(this.firestore, async (transaction) => {
      transaction.set(reversalTxRef, reversalTx);

      for (const entry of reversalEntries) {
        const accRef = doc(this.firestore, `users/${userId}/accounts/${entry.account}`);
        const accSnap = await transaction.get(accRef);
        const account = accSnap.data();
        if (!account) throw new Error(`Account ${entry.account} not found`);

        transaction.update(accRef, {
          balance: increment(this.balanceDelta(String(account['type']), entry.type, entry.amount)),
        });
      }
    });

    await this.mirrorTransaction(userId, reversalTxRef.id, reversalTx, reversalEntries);
    return reversalTxRef.id;
  }

  private balanceDelta(accountType: string, entryType: string, amount: number): number {
    const isDebit = entryType.toLowerCase() === 'debit';
    const normalizedAmount = Math.abs(amount);
    switch (accountType) {
      case 'Asset':
      case 'Expense':
        return (isDebit ? 1 : -1) * normalizedAmount;
      case 'Liability':
      case 'Equity':
      case 'Revenue':
        return (isDebit ? -1 : 1) * normalizedAmount;
      default:
        return 0;
    }
  }

  private async mirrorTransaction(userId: string, txId: string, payload: object, entries: Entry[]): Promise<void> {
    try {
      for (const entry of entries) {
        await this.db.database.ref(`users/${userId}/transactions/${entry.account}/${txId}`).set(payload);

        let nextBalance = 0;
        try {
          const accSnap = await getDoc(doc(this.firestore, `users/${userId}/accounts/${entry.account}`));
          const account = accSnap.data();
          if (typeof account?.['balance'] === 'number') {
            nextBalance = account['balance'];
          }
        } catch {
          const rtdbSnap = await this.db.database.ref(`users/${userId}/accounts/${entry.account}`).once('value');
          const account = rtdbSnap.val() as Account | null;
          nextBalance =
            Number(account?.balance ?? 0) + this.balanceDelta(String(account?.type ?? 'Expense'), entry.type, entry.amount);
        }

        await this.db.database.ref(`users/${userId}/accounts/${entry.account}/balance`).set(nextBalance);
      }
    } catch (err) {
      console.warn('RTDB sync failed, Firestore is still valid:', err);
      for (const entry of entries) {
        await this.syncService.enqueue(userId, entry.account, txId, payload);
      }
    }
  }

  // ✅ Real-time subscription (auto-updates UI)
  // getUserTransactionAccounts(userId: string): Observable<unknown[]> {
  //   const txCollection = collection(this.firestore, 'users' + {userId} +'accounts');
  //   return collectionData(txCollection, { idField: 'id' });
  //   // idField adds Firestore docId as "id"
  // }

  // ✅ One-time fetch (manual load)
  // async getTransactionsOnce(userId: string): Promise<(EntryWithAccounts & { id: string })[]> {
  //   const txCollection = collection(
  //     this.firestore,
  //     'users' + {userId} +'transactions'
  //   ) as CollectionReference<EntryWithAccounts>;
  //   const snapshot = await getDocs(txCollection);
  //   return snapshot.docs.map((doc: QueryDocumentSnapshot<EntryWithAccounts>) => ({
  //     id: doc.id, // Firestore ID
  //     ...doc.data(), // Transaction fields
  //   }));
  // }

  // import { collection, query, where, getDocs } from "firebase/firestore";

  // async searchCashTransactions() {
  //   const collRef = collection(this.firestore, "transactions");

  //   // Search transactions where debit or credit account is "Cash"
  //   const q = query(collRef, where("entries.0.account", "==", "Cash"));

  //   const snapshot = await getDocs(q);

  //   snapshot.forEach((doc) => {
  //     console.log("Transaction ID:", doc.id);
  //     console.log("Transaction data:", doc.data());
  //   });
  // }

  /*  🔹 If you’re using Firebase Realtime Database

      Then yes, you need it (or something equivalent).

      Realtime Database uses .ref(...).push(...) to insert new data.

      Example:

      this.db.database.ref('users/' + userId + '/transaction').push(transactionObj);


      Here, this.db is usually AngularFireDatabase.

      🔹 If you’re using Cloud Firestore

      Then you should not use .ref(...).push(...) — because that’s only for Realtime DB.

      Firestore uses addDoc or setDoc with collections:

      import { collection, addDoc } from '@angular/fire/firestore';

      await addDoc(collection(this.firestore, 'users', userId, 'transactions'), transactionObj);


      Here, this.firestore is AngularFirestore. */
  // getUserTransactions(userId: string): Observable<SnapshotAction<unknown>[]> {
  //   return runInInjectionContext(this.injectionContext, () => {
  //     return this.db
  //       .list('users/' + userId + '/expenses')
  //       .snapshotChanges()
  //       .pipe(
  //         debounceTime(500),
  //         distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
  //       );
  //   });
  // }

  // | Goal              | Use                | Description                                                 |
  // | ----------------- | ------------------ | ----------------------------------------------------------- |
  // | Real-time updates | `collectionData()` | Subscribes to Firestore and auto-updates when data changes. |
  // | One-time snapshot | `getDocs()`        | Fetches the data once and stops listening.                  |

  async saveNewCategories(
    categories:
      | Record<AccountCategory, { value: string; removable: boolean }[]>
      | Record<AccountCategory, { value: string; removable: boolean }>[]
      | string[],
    userId: string,
  ): Promise<void> {
    if (Array.isArray(categories) && categories.every((item) => typeof item === 'string')) {
      for (const name of categories as string[]) {
        await this.saveNewCategory(
          { Expense: { value: name, removable: true } } as Record<
            AccountCategory,
            { value: string; removable: boolean }
          >,
          userId,
        );
      }
      return;
    }

    if (Array.isArray(categories)) {
      for (const cat of categories as Record<AccountCategory, { value: string; removable: boolean }>[]) {
        await this.saveNewCategory(cat, userId);
      }
      return;
    }

    await this.db.database.ref(`users/${userId}/categories`).set(categories);
    try {
      const userRef = doc(this.firestore, `users/${userId}`);
      await this.withTimeout(
        setDoc(userRef, { categories }, { merge: true }),
        this.firestoreTimeoutMs,
        'saveNewCategories',
      );
    } catch (err) {
      console.warn('Firestore categories save failed', err);
    }
  }

  // async saveNewCategory(category: Record<AccountCategory, {value: string, removable: boolean}>, userId: string) {
  //   const type = Object.keys(category)[0] as AccountCategory;
  //   const value = category[type].value;

  //   if (!value) throw new Error('No category value provided');

  //   const userRef = doc(this.firestore, `users/${userId}`);

  //   // 1️⃣ Get existing document
  //   const userSnap = await getDoc(userRef);
  //   const userData = userSnap.data() || {};

  //   // 2️⃣ Extract existing categories or initialize
  //   const existingCategories = Array(userData['categories']?.[type].value) || [];

  //   // 3️⃣ Push new category if it doesn’t already exist
  //   // const updatedArray = [...new Set([...existingCategories, ...value])]; // avoid duplicates

  //   // // 4️⃣ Save back to Firestore
  //   // await setDoc(
  //   //   userRef,
  //   //   { categories: { [type]: updatedArray } },
  //   //   { merge: true } // merge so other types stay intact
  //   // );

  //   // console.log(`✅ Added category "${value}" under "${type}"`);

  //   // // 5️⃣ (Optional) Mirror to RTDB
  //   // return await this.db.database.ref(`users/${userId}/categories/${type}`).set(updatedArray);
  //   if (!includes(existingCategories, value)) {
  //     await setDoc(
  //       userRef,
  //       { categories: { [type]: category } },
  //       { merge: true } // merge so other types stay intact
  //     );
  //     return await this.db.database.ref(`users/${userId}/categories/${type}`).set(category);
  //   }
  // }
  async saveNewCategory(
    category: Record<AccountCategory, { value: string; removable: boolean }>,
    userId: string,
  ): Promise<void> {
    const type = Object.keys(category)[0] as AccountCategory;
    const newCategory = category[type];

    if (!newCategory?.value) throw new Error('No category value provided');

    const userRef = doc(this.firestore, `users/${userId}`);

    // 1️⃣ Get existing document
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data() || {};

    // 2️⃣ Extract existing categories (or initialize empty)
    const existingCategories: { value: string; removable: boolean }[] = userData['categories']?.[type] || [];

    // 3️⃣ Check for duplicates (by value)
    const alreadyExists = existingCategories.some((cat) => cat.value.toLowerCase() === newCategory.value.toLowerCase());

    if (alreadyExists) {
      console.log(`⚠️ Category "${newCategory.value}" already exists under "${type}"`);
      return;
    }

    // 4️⃣ Add the new one
    const updatedCategories = [...existingCategories, newCategory];

    // 5️⃣ Save back to Firestore
    await setDoc(userRef, { categories: { [type]: updatedCategories } }, { merge: true });

    console.log(`✅ Added category "${newCategory.value}" under "${type}"`);

    // 6️⃣ Mirror to Realtime DB
    return await this.db.database.ref(`users/${userId}/categories/${type}`).set(updatedCategories);
  }

  saveNewImportedFiles(files: string[], userId: string): Promise<void> {
    return this.db.database.ref('users/' + userId + '/filesImported').set(files);
  }

  saveNewExpenseSourceTypes(types: string[], userId: string): Promise<void> {
    return this.db.database.ref('users/' + userId + '/types').set(types);
  }
  /* .once('value'):
  This method attaches a listener that retrieves the data at the specified location and then detaches itself. 
  It triggers once with the entire data snapshot that matches the query. The value event receives a DataSnapshot containing
  all data at the query's location after the ordering and filtering have been applied.*/
  getUserDetails(currentUser: string): Promise<firebase.database.DataSnapshot> {
    return this.db.database.ref('users').orderByChild('email').equalTo(currentUser).once('value');
  }

  getUserDetailsById(userId: string): Promise<firebase.database.DataSnapshot> {
    return this.db.database.ref('users/' + userId).once('value');
  }

  updateExpense(userId: string, key: string, expense: Expense): Promise<void> {
    return runInInjectionContext(this.injectionContext, () => {
      return this.db.list('users/' + userId + '/expenses').update(key, expense);
    });
  }
  /* 
  Feature	updateUserDetails	            batchUpdateExpenses
  
  Path	Specific path (users/{userId})	Root path with multiple keys
  Update type	Single node update	      Multi-location batch update
  DI requirement	No special handling   already inside injected class	Needs runInInjectionContext to ensure DI works outside standard Angular scope
  Use case	Change one user’s Update    many expenses (and possibly delete some) in one atomic call 
  */

  updateUserDetails(userId: string, userDetails: UserDetails): Promise<void> {
    return this.db.database.ref('users/' + userId).update(userDetails);
  }

  deleteExpense(userId: string, key: string): Promise<void> {
    return runInInjectionContext(this.injectionContext, () => {
      return this.db.list('users/' + userId + '/expenses').remove(key);
    });
  }

  addExpense(userId: string, expense: Expense): firebase.database.ThenableReference {
    return runInInjectionContext(this.injectionContext, () => {
      return this.db.list('users/' + userId + '/expenses').push(expense);
    });
  }
  /* 🔧 Why runInInjectionContext matters

      Normally, Angular handles DI for you in components and services.
      But what if you want to use an injectable outside of Angular’s normal DI flow?

      Example:

      Inside a utility function

      Inside signals/effects

      In standalone code not tied to a component

      Angular doesn’t know the DI context there, so injection can fail.

      👉 runInInjectionContext(injector, fn) solves this by:

      Taking an existing injector (e.g., this.injectionContext)

      Running your function inside that injector’s DI environment

      So inside that function, Angular knows how to resolve injectables. 
  */
  batchUpdateExpenses(updates: Record<string, Expense> | Record<string, null>): Promise<void> {
    return runInInjectionContext(this.injectionContext, () => {
      return this.db.database.ref().update(updates);
    });
  }

  batchPushExpensesWithBatch(expenses: Expense[], userId: string): Promise<void> {
    return this.importExpensesAsTransactions(expenses, userId);
  }

  async updateAccount(userId: string, account: Account): Promise<void> {
    if (!userId || !account.name) {
      throw new Error('User id and account name are required');
    }
    const accRef = doc(this.firestore, `users/${userId}/accounts/${account.name}`);
    const { id: _id, ...accountData } = account;
    await setDoc(accRef, accountData, { merge: true });
    await this.db.database.ref(`users/${userId}/accounts/${account.name}`).update(accountData);
  }

  async deleteAccount(userId: string, accountName: string): Promise<void> {
    const accRef = doc(this.firestore, `users/${userId}/accounts/${accountName}`);
    await deleteDoc(accRef);
    await this.db.database.ref(`users/${userId}/accounts/${accountName}`).remove();
  }

  /**
   * Converts imported expense rows into balanced journal entries.
   * Debits: Debit category account, Credit payment/type account (default Cash).
   * Credits/refunds: Credit category account, Debit payment/type account.
   */
  async importExpensesAsTransactions(expenses: Expense[], userId: string): Promise<void> {
    if (!userId) {
      throw new Error('A user id is required to import transactions');
    }
    if (!expenses.length) {
      return;
    }

    await this.initializeAccounts(userId);
    const existingAccounts = await this.getUserAccountsOnce(userId);
    const accountNames = new Set(existingAccounts.map((account) => account.name));

    for (const expense of expenses) {
      const amount = Math.abs(Number(expense.amount));
      if (!amount || Number.isNaN(amount)) {
        continue;
      }

      const categoryAccount = expense.category?.trim() || 'Unassigned';
      const paymentAccount = expense.type?.trim() || 'Cash';
      const isCredit = Number(expense.amount) < 0 || String(expense.type).toLowerCase() === 'credit';

      await this.ensureAccountExists(userId, categoryAccount, 'Expense', accountNames, expense);
      await this.ensureAccountExists(userId, paymentAccount, 'Asset', accountNames, expense);

      const rawDate = expense.date as string | Date | undefined;
      const normalizedDate =
        rawDate instanceof Date
          ? rawDate.toISOString()
          : typeof rawDate === 'string' && rawDate
            ? new Date(rawDate).toISOString()
            : new Date().toISOString();

      const journalEntry: JournalEntry = {
        date: normalizedDate,
        description: expense.name || 'Imported transaction',
        entries: isCredit
          ? [
              { account: paymentAccount, type: 'Debit', amount },
              { account: categoryAccount, type: 'Credit', amount },
            ]
          : [
              { account: categoryAccount, type: 'Debit', amount },
              { account: paymentAccount, type: 'Credit', amount },
            ],
        source: EntrySource.IMPORTED,
        importedfrom: expense.importedFrom,
        createdBy: userId,
        createdAt: new Date().toISOString(),
      };

      await this.saveNewTransaction(journalEntry, userId);
    }
  }

  private async ensureAccountExists(
    userId: string,
    accountName: string,
    type: AccountCategory,
    knownNames: Set<string>,
    expense: Expense,
  ): Promise<void> {
    if (knownNames.has(accountName)) {
      return;
    }

    await this.saveNewAccount(
      {
        name: accountName,
        type,
        balance: 0,
        source: EntrySource.IMPORTED,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        importedOn: true,
        importedFrom: expense.importedFrom,
        comments: expense.comments,
      },
      userId,
      expense.importedFrom ?? '',
      true,
    );
    knownNames.add(accountName);
  }
}
/* Great — thanks for sharing the full `DatabaseService` code.
Let me break it down so you can **understand and document it step by step** without getting overwhelmed.

---

# 📝 DatabaseService — Simplified Documentation

This service is the **bridge between your Angular app and Firebase Realtime Database**.
It handles **CRUD operations** (create, read, update, delete) and uses **RxJS** + **Angular signals** for reactivity.

---

## 🔑 Key Concepts in This Service

1. **Subjects**

   * Used for sending “events” (e.g., expense created, categories added).
   * Example: `expenseAddedSource.next(message)` notifies all subscribers.

2. **Firebase Realtime Database**

   * Data is stored in a tree-like structure (`users/{userId}/expenses`).
   * Methods like `.ref()`, `.push()`, `.update()`, `.remove()` map to standard CRUD.

3. **runInInjectionContext**

   * Ensures dependency injection (DI) works properly **outside normal Angular flow**.
   * Needed for async operations like signals, effects, and utilities.

4. **RxJS Operators**

   * `debounceTime(500)` → avoids flooding with too many events.
   * `distinctUntilChanged(...)` → only emits when **real changes** happen.

---

## 🔄 Data Flow (Step by Step)

### 1. Adding Data

* **Expense:**

  * `saveNewExpense(expense, userId)` → saves one expense under that user.
  * `addExpense(userId, expense)` → same, but ensures DI context is active.
* **Categories, Files, Types:**

  * Stored under paths like `users/{userId}/categories`.

### 2. Reading Data

* **User Expenses:**

  * `getUserExpenses(userId)` → Observable stream of snapshot changes.
  * Uses **debounce + distinctUntilChanged** to avoid duplicate updates.
* **User Details:**

  * `getUserDetails(email)` → finds a user by email.
  * `getUserDetailsById(userId)` → finds a user directly.

### 3. Updating Data

* **Single Update:**

  * `updateExpense(userId, key, expense)` → modifies one expense.
  * `updateUserDetails(userId, details)` → modifies one user profile.
* **Batch Update:**

  * `batchUpdateExpenses(updates)` → modifies multiple expenses at once.
  * `batchPushExpensesWithBatch(expenses, userId)` → pushes multiple new expenses in one atomic operation.

### 4. Deleting Data

* `deleteExpense(userId, key)` → removes a specific expense by its Firebase key.

---

## 🗂 Example Firebase Structure

```json
{
  "users": {
    "uid123": {
      "email": "user@email.com",
      "expenses": {
        "exp1": { "title": "Coffee", "amount": 5 },
        "exp2": { "title": "Book", "amount": 15 }
      },
      "categories": ["Food", "Books"],
      "filesImported": ["jan.csv"],
      "types": ["manual", "imported"]
    }
  }
}
```

---

## ⚡ Simplified Flow Diagram

```
UI (Component)
   │
   ▼
DatabaseService
   │
   ├─ announceExpenseCreated() → Subject → Subscribers
   │
   ├─ saveNewExpense() → Firebase push()
   │
   ├─ getUserExpenses() → snapshotChanges() → Observable
   │
   ├─ updateExpense() / updateUserDetails() → Firebase update()
   │
   └─ deleteExpense() → Firebase remove()
```

---

✅ This way, the service:

* Acts as the **single source of truth** for expenses.
* Keeps components **decoupled** (they listen via Subjects/Observables instead of direct Firebase calls).
* Handles both **individual operations** and **batch updates** efficiently.

---

Would you like me to now create a **visual diagram (boxes + arrows)** for this service like we did before with the Expense form flow? That might make it much easier to grasp at a glance.

 */
