# Firebase Setup (DebtPilot)

## 1) Create a Firebase project
Firebase Console → Add project → Create

## 2) Add a Web App (get config)
Project overview → Web icon `</>` → Register app → copy config

## 3) Enable Authentication (Email/Password)
Build → Authentication → Sign-in method → Email/Password → Enable → Save

## 4) Create Firestore Database
Build → Firestore Database → Create database → Production mode → Enable

## 5) Paste config into the app
File: `js/firebase.js` already contains your config in this ZIP.

## 6) Firestore Security Rules (copy/paste and Publish)
Firestore → Rules:

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

## 7) Do you need to manually add collections?
No. The app will auto-create:
`users/<uid>/cards/<cardId>` when you add your first card.

## 8) Run locally
Use a local server (PyCharm “Open in Browser” works) and test Signup → Add card → Refresh.
