import { Injectable } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/compat/database';
import localforage from 'localforage';
// import { SnapshotMetadata } from 'firebase/firestore';
import { QueuedEntry } from '@core/interfaces/account-model';

@Injectable({
  providedIn: 'root',
})
export class SyncService {
  constructor(private db: AngularFireDatabase) {
    // Retry queue on startup
    this.flushQueue();
  }

  async enqueue(userId: string, account: string, txId: string, data: unknown) {
    const key = `${userId}_${account}_${txId}`;
    await localforage.setItem(key, { userId, account, txId, data });
  }

  async flushQueue() {
    await localforage.iterate(async (value: QueuedEntry, key: string) => {
      try {
        await this.db.database.ref(`users/${value.userId}/transactions/${value.account}/${value.txId}`).set(value.data);

        // ✅ Success → remove from queue
        await localforage.removeItem(key);
        console.log(`Flushed queued tx: ${key}`);
      } catch (err) {
        console.warn(`Retry failed for ${key}, keeping in queue`, err);
      }
    });
  }
}
