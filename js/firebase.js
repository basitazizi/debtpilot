// Firebase (CDN modular) — works with plain HTML/CSS/JS (no npm, no bundler)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// ✅ Your Firebase config
export const firebaseConfig = {
  apiKey: "AIzaSyCYgQjXfYYQ_GgaA7u_WbjDXhwlRxHRQ_8",
  authDomain: "debtpilot-5d906.firebaseapp.com",
  projectId: "debtpilot-5d906",
  storageBucket: "debtpilot-5d906.appspot.com",
  messagingSenderId: "263058954314",
  appId: "1:263058954314:web:07ebbed42d2b5309092eb3"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
