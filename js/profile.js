// Profile page logic: display user info and stats
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { firebaseConfig } from './firebaseConfig.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const infoContainer = document.getElementById('profile-info');

function formatCurrency(val) {
  return '$' + val.toFixed(2);
}

// When the auth state changes, load profile data
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // redirect to login if not logged in
    window.location.href = 'login.html';
    return;
  }
  // Fetch user cards to compute stats
  const cardsRef = collection(db, 'users', user.uid, 'cards');
  const snapshot = await getDocs(cardsRef);
  const cards = snapshot.docs.map((doc) => doc.data());
  const totalDebt = cards.reduce((sum, c) => sum + parseFloat(c.balance || 0), 0);
  const totalMin = cards.reduce((sum, c) => sum + parseFloat(c.minPayment || 0), 0);
  // Build profile display
  const html = [];
  html.push(`<p><strong>Email:</strong> ${user.email}</p>`);
  html.push(`<p><strong>Total Cards:</strong> ${cards.length}</p>`);
  html.push(`<p><strong>Total Debt:</strong> ${formatCurrency(totalDebt)}</p>`);
  html.push(`<p><strong>Total Minimum Payment:</strong> ${formatCurrency(totalMin)}</p>`);
  html.push(`<p><strong>User ID:</strong> ${user.uid}</p>`);
  infoContainer.innerHTML = html.join('');
});