# Expense Tracker

A responsive personal finance web app built with **Angular** and **Firebase**. It tracks spending with a **double-entry ledger** (accounts + journal entries), so every transaction stays balanced and dashboard totals stay consistent.

**Live demo:** [https://expense-tracker-e0028.firebaseapp.com/](https://expense-tracker-e0028.firebaseapp.com/)

---

## Why this project

Most expense apps store flat “expense rows.” This project models money the way accounting systems do:

- **Accounts** (Cash, Rent Expense, Supplies Expense, …) hold running balances
- **Journal entries** post equal debits and credits
- The **dashboard** aggregates account balances for expenses, assets, and charts

That design makes imports, edits, and summaries more reliable when data grows.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | Angular 20, TypeScript, standalone components, lazy-loaded routes |
| UI | Angular Material (Material Design 3), Bootstrap utilities |
| Charts | Highcharts |
| Auth | Firebase Authentication + AngularFire auth guards |
| Data | Cloud Firestore (journal truth) + Realtime Database (UI mirror / fallback) |
| CSV | ngx-papaparse |
| Hosting | Firebase Hosting |

---

## Features

### Authentication
- Email/password sign-up and login
- Auth-guarded routes (`dashboard`, `settings`, `import-expenses`, `new-expense`)
- Logged-in users are redirected away from login

### Dashboard
- Summary cards: date range, **Total Expenses**, **Total Assets**
- Category, source, and monthly charts
- Filterable detailed account table
- Bulk edit / delete
- CSV/JSON-style data export

### Transactions
- Add a new expense as a balanced journal entry (expense account + payment account such as Cash)
- Edit and reverse/update existing entries
- Categories and payment sources are configurable

### Settings
- Manage expense categories and payment/source types
- Defaults seeded for new users from a chart of accounts

### CSV import
- Drag-and-drop or browse `.csv` files
- Column mapping + negative-amount rules (omit / credit / debit)
- Review expenses vs credits before save
- Creates missing category accounts when needed
- Import summary after save

### Resilience
- Writes prefer Firestore for journal integrity
- Realtime Database mirrors balances for a snappy UI
- Timeouts + RTDB fallback keep save/import usable if Firestore stalls

---

## Project structure

```text
src/app/
  core/                 # layout, auth, database, shared app services
  dashboard/            # charts, cards, table summary
  expense-settings/     # categories & payment sources
  import-expenses/      # CSV upload → map → review → save
  log-expense/          # create transaction
  login/                # login & sign-up
  shared/               # modals, constants, responsive helpers
  app.routes.ts         # lazy routes + auth guards
```

---

## Getting started

### Prerequisites
- Node.js 20+ (recommended)
- npm
- A Firebase project (Auth, Firestore, Realtime Database, Hosting)

### Install & run

```bash
npm install
npm start
# or: ng serve
```

Open [http://localhost:4200/](http://localhost:4200/).

### Build

```bash
ng build
```

Artifacts go to `dist/`.

### Test & lint

```bash
ng test
ng lint
```

### Deploy (Firebase)

```bash
npm install -g firebase-tools
firebase login
firebase init    # if not already initialized
npm run deploy   # builds then deploys
```

Configure Firebase keys in `src/app/app.firebase.config.ts` (do not commit secrets you care about protecting).

---

## Data model (short)

- **Account** — `name`, `type` (`Asset` | `Expense` | `Revenue` | `Liability` | `Equity`), `balance`, source metadata  
- **JournalEntry** — `description`, `date`, balanced `entries[]` of `{ account, type: Debit|Credit, amount }`  
- **Expense** (import/UI shape) — mapped into journal entries on save  

Example: “Office supplies $25.50 paid with Cash”

| Account | Debit | Credit |
| --- | ---: | ---: |
| Supplies Expense | 25.50 | |
| Cash | | 25.50 |

---

## Interview / demo materials

| File | Purpose |
| --- | --- |
| [`docs/INTERVIEW_VIDEO_SCRIPT.md`](docs/INTERVIEW_VIDEO_SCRIPT.md) | Spoken script for a project intro video |
| [`docs/Interview_Questions_and_Answers.pdf`](docs/Interview_Questions_and_Answers.pdf) | Expected interviewer Q&A |

---

## Roadmap

- [x] Material Design 3 UI
- [x] Login / registration refresh
- [x] Configurable expense metadata
- [x] Dashboard filtering
- [x] Double-entry accounts + journal persistence
- [x] CSV import with map / review / save
- [ ] Offline-first queue polish
- [ ] Stronger automated e2e coverage for import + ledger

---

## License

Private project unless otherwise stated by the author.
