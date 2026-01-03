# DebtPilot (MVP)

A pitch-black, minimal credit card payoff dashboard with accent **#1AE09E**.
Built with **HTML + CSS + JS** and **Firebase (Auth + Firestore)**.

## Pages
- `index.html` — landing
- `login.html` — sign in
- `signup.html` — create account
- `dashboard.html` — add cards + generate payoff plan

## Quick start (local)
Because Firebase Auth uses modules from Google CDN, this app should be served from a local web server (not `file://`).

### Option 1: VS Code Live Server
1. Install the **Live Server** extension
2. Right-click `index.html` → **Open with Live Server**

### Option 2: Python server
```bash
cd debtpilot
python -m http.server 5500
```
Then open: `http://localhost:5500`

## Firebase setup
See **FIREBASE_SETUP.md** for exact console steps.

## Firebase setup
1. Create a Firebase project
2. Enable **Authentication → Email/Password**
3. Create **Firestore Database**
4. Copy your Firebase web config and paste it into:
   - `js/firebase.js` → `firebaseConfig = { ... }`

### Firestore data model
- `users/{uid}`
- `users/{uid}/cards/{cardId}` with fields:
  - `bank`, `nickname`, `balance`, `apr`, `minPayment`, `dueDate`, `sinceDate`, `createdAt`

## Firestore security rules (recommended for MVP)
In Firebase console → Firestore → Rules:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      match /cards/{cardId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

## What’s improved in v2
- Removed star/snow visuals and replaced with ambient orb lighting + subtle grid
- Added payoff simulation (month‑by‑month estimate)
- Added “Insights” panel explaining why a card is prioritized and estimating interest saved

## Next upgrades (later)
- Full payoff timeline (month-by-month amortization)
- Due-date notifications + reminders
- “What-if” slider (pay $X more)
- Import statements / link accounts (optional, higher complexity)
- AI helper chat (optional)

— Built for your brand direction: **black / white** + accent **#1AE09E**
