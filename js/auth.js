// auth.js
// Implements signup and login using Firebase Authentication.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { firebaseConfig } from './firebaseConfig.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Redirect users who are already logged in
onAuthStateChanged(auth, (user) => {
  // If user is logged in and is on login or signup page, redirect to dashboard
  const path = window.location.pathname;
  if (user && (path.endsWith('login.html') || path.endsWith('signup.html'))) {
    window.location.href = 'dashboard.html';
  }
});

// Sign up handler
export function handleSignup(form) {
  const email = form.querySelector('#signup-email').value;
  const password = form.querySelector('#signup-password').value;
  createUserWithEmailAndPassword(auth, email, password)
    .then(() => {
      window.location.href = 'dashboard.html';
    })
    .catch((error) => {
      alert(error.message);
    });
}

// Login handler
export function handleLogin(form) {
  const email = form.querySelector('#login-email').value;
  const password = form.querySelector('#login-password').value;
  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      window.location.href = 'dashboard.html';
    })
    .catch((error) => {
      alert(error.message);
    });
}