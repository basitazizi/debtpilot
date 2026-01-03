import { $, toast } from "./app.js";
import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  doc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const isLogin = location.pathname.endsWith("login.html");
const form = document.getElementById(isLogin ? "loginForm" : "signupForm");

onAuthStateChanged(auth, (user) => {
  if (user) {
    location.href = "./dashboard.html";
  }
});

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("#email").value.trim();
  const password = $("#password").value;

  try {
    if (isLogin) {
      await signInWithEmailAndPassword(auth, email, password);
      toast("Logged in.");
      location.href = "./dashboard.html";
    } else {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // Create user profile doc
      await setDoc(doc(db, "users", cred.user.uid), {
        email,
        createdAt: serverTimestamp()
      }, { merge: true });
      toast("Account created.");
      location.href = "./dashboard.html";
    }
  } catch (err) {
    toast(err?.message || "Auth error.");
    console.error(err);
  }
});
