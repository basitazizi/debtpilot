// DebtPilot dashboard logic
// Integrates Firebase Firestore for storing cards per user.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { getFirestore, collection, addDoc, doc as fsDoc, deleteDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { firebaseConfig } from './firebaseConfig.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Data structures
let cards = [];
let strategy = 'avalanche';
let budget = 0;
let currentUser = null;
let unsubscribeCards = null;

// Set up authentication state listener
onAuthStateChanged(auth, (user) => {
  if (!user) {
    // redirect to login page if not logged in
    window.location.href = 'login.html';
    return;
  }
  currentUser = user;
  // Setup Firestore listener for this user's cards
  setupCardListener();
});

function setupCardListener() {
  if (!currentUser) return;
  // unsubscribe previous listener if any
  if (unsubscribeCards) unsubscribeCards();
  const cardsRef = collection(db, 'users', currentUser.uid, 'cards');
  unsubscribeCards = onSnapshot(cardsRef, (snapshot) => {
    cards = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        bank: data.bank,
        nickname: data.nickname,
        balance: parseNumber(data.balance),
        apr: parseNumber(data.apr),
        minPayment: parseNumber(data.minPayment),
        dueDate: data.dueDate || '',
        promoEndDate: data.promoEndDate || null,
        autopay: data.autopay || false,
        noMin: data.noMin || false,
        type: data.type || 'purchase',
        creditLimit: parseNumber(data.creditLimit)
      };
    });
    updateAll();
  });
}

// Utility functions
function parseNumber(value) {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

function formatCurrency(value) {
  return '$' + value.toFixed(2);
}

function getDaysUntil(dateStr) {
  if (!dateStr) return null;
  const end = new Date(dateStr);
  const today = new Date();
  const diff = (end - today) / (1000 * 60 * 60 * 24);
  return Math.ceil(diff);
}

function addMonths(date, months) {
  const d = new Date(date);
  const n = d.getDate();
  d.setMonth(d.getMonth() + months);
  // Handle month overflow
  if (d.getDate() !== n) d.setDate(0);
  return d;
}

// Rendering functions
function renderMetrics() {
  const totalDebt = cards.reduce((sum, c) => sum + c.balance, 0);
  const monthlyInterest = cards.reduce((sum, c) => sum + c.balance * (c.apr / 100) / 12, 0);
  const totalMin = cards.reduce((sum, c) => sum + c.minPayment, 0);
  document.getElementById('metric-total-debt').textContent = formatCurrency(totalDebt);
  document.getElementById('metric-monthly-interest').textContent = formatCurrency(monthlyInterest);
  document.getElementById('metric-min-pay').textContent = formatCurrency(totalMin);
  document.getElementById('metric-active-cards').textContent = cards.length.toString();
}

function renderPromoAlert() {
  // Show alert if any promo card ends within 60 days
  const alertDiv = document.getElementById('promo-alert');
  const msgDiv = document.getElementById('promo-message');
  let urgentCard = null;
  for (const c of cards) {
    if (c.promoEndDate) {
      const days = getDaysUntil(c.promoEndDate);
      if (days !== null && days <= 60) {
        urgentCard = { card: c, days: days };
        break;
      }
    }
  }
  if (urgentCard) {
    // compute required monthly payment to finish before promo ends
    const monthsLeft = Math.ceil(urgentCard.days / 30);
    const required = urgentCard.card.balance / monthsLeft;
    msgDiv.innerHTML = `Your promotional APR ends in <strong>${urgentCard.days} days</strong>. Pay <strong>${formatCurrency(required)}</strong>/month to clear before interest kicks in.`;
    alertDiv.style.display = 'flex';
  } else {
    alertDiv.style.display = 'none';
  }
}

function renderBudget() {
  const totalMin = cards.reduce((sum, c) => sum + c.minPayment, 0);
  const budgetInput = document.getElementById('budget-input');
  if (budgetInput.value) budget = parseNumber(budgetInput.value);
  // If budget < min, treat extra as 0
  const extra = Math.max(0, budget - totalMin);
  const minPercent = budget > 0 ? Math.min(100, (totalMin / budget) * 100) : 100;
  const extraPercent = budget > 0 ? Math.max(0, (extra / budget) * 100) : 0;
  const minBar = document.getElementById('budget-bar-min');
  const extraBar = document.getElementById('budget-bar-extra');
  minBar.style.width = `${minPercent}%`;
  extraBar.style.left = `${minPercent}%`;
  extraBar.style.width = `${extraPercent}%`;
  document.getElementById('budget-min-display').textContent = formatCurrency(totalMin);
  document.getElementById('budget-extra-display').textContent = formatCurrency(extra);
}

function renderStrategyButtons() {
  const cards = document.querySelectorAll('.strategy-card');
  cards.forEach((el) => {
    if (el.getAttribute('data-mode') === strategy) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });
  document.getElementById('mode-badge').textContent = strategy.toUpperCase() + ' MODE';
}

function renderCards() {
  const list = document.getElementById('cards-list');
  list.innerHTML = '';
  // Determine focus card index based on strategy
  let sortedCards = [];
  if (strategy === 'avalanche') {
    sortedCards = [...cards].sort((a, b) => b.apr - a.apr);
  } else if (strategy === 'snowball') {
    sortedCards = [...cards].sort((a, b) => a.balance - b.balance);
  } else {
    sortedCards = [...cards];
  }
  if (sortedCards.length > 0) {
    // highlight first as focus
    sortedCards[0].focus = true;
  }
  sortedCards.forEach((card) => {
    const item = document.createElement('div');
    item.className = 'card-item';
    if (card.focus) item.classList.add('focus-card');
    // Name
    const nameDiv = document.createElement('div');
    nameDiv.className = 'card-name';
    nameDiv.textContent = `${card.bank} • ${card.nickname}`;
    item.appendChild(nameDiv);
    // Tags (autopay, no minimum)
    if (card.autopay || card.noMin) {
      const tagContainer = document.createElement('div');
      tagContainer.className = 'card-tags';
      if (card.autopay) {
        const tag = document.createElement('span');
        tag.className = 'badge autopay';
        tag.textContent = 'Autopay';
        tagContainer.appendChild(tag);
      }
      if (card.noMin) {
        const tag = document.createElement('span');
        tag.className = 'badge noMin';
        tag.textContent = 'No Min';
        tagContainer.appendChild(tag);
      }
      item.appendChild(tagContainer);
    }
    // Balance
    const balDiv = document.createElement('div');
    balDiv.className = 'card-balance';
    balDiv.textContent = formatCurrency(card.balance);
    item.appendChild(balDiv);
    // APR
    const aprDiv = document.createElement('div');
    aprDiv.className = 'card-apr';
    aprDiv.textContent = (card.apr).toFixed(2) + '%';
    item.appendChild(aprDiv);
    // Min payment
    const minDiv = document.createElement('div');
    minDiv.className = 'card-min';
    minDiv.textContent = formatCurrency(card.minPayment);
    item.appendChild(minDiv);
    // Due date or promo end
    const dueDiv = document.createElement('div');
    dueDiv.className = 'card-due';
    if (card.promoEndDate) {
      const daysLeft = getDaysUntil(card.promoEndDate);
      dueDiv.textContent = daysLeft !== null ? `${daysLeft} days` : '-';
    } else {
      dueDiv.textContent = card.dueDate;
    }
    item.appendChild(dueDiv);
    // This month payment (min + extra if focus)
    const thisDiv = document.createElement('div');
    thisDiv.className = 'card-this';
    let totalMin = cards.reduce((sum, c) => sum + c.minPayment, 0);
    const extra = Math.max(0, budget - totalMin);
    let thisPayment = card.minPayment;
    if (card.focus) thisPayment += extra;
    thisDiv.textContent = formatCurrency(thisPayment);
    item.appendChild(thisDiv);
    // Actions placeholder
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'card-actions';
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = async () => {
      if (!currentUser) return;
      try {
        await deleteDoc(fsDoc(db, 'users', currentUser.uid, 'cards', card.id));
      } catch (err) {
        console.error(err);
        alert('Failed to delete card: ' + err.message);
      }
    };
    const pinBtn = document.createElement('button');
    pinBtn.textContent = 'Pin';
    pinBtn.onclick = () => {
      strategy = 'manual';
      // reorder to put this card first
      cards = [card, ...cards.filter((c) => c !== card)];
      updateAll();
    };
    actionsDiv.appendChild(deleteBtn);
    actionsDiv.appendChild(pinBtn);
    item.appendChild(actionsDiv);
    // Promo progress bar if promo
    if (card.promoEndDate) {
      const progress = document.createElement('div');
      progress.className = 'promo-progress';
      const bar = document.createElement('div');
      bar.className = 'bar';
      const totalDays = getDaysUntil(card.promoEndDate);
      const daysLeft = totalDays;
      const percent = daysLeft !== null && totalDays > 0 ? (1 - daysLeft / totalDays) * 100 : 0;
      bar.style.width = percent + '%';
      progress.appendChild(bar);
      item.appendChild(progress);
    }
    list.appendChild(item);
  });
}

function simulatePayoff(simBudget) {
  // Deep copy cards for simulation
  const simCards = cards.map(c => Object.assign({}, c));
  let month = 0;
  let totalInterest = 0;
  const timeline = [];
  let totalDebt = simCards.reduce((s, c) => s + c.balance, 0);
  // Safety limit: 120 months
  while (totalDebt > 0 && month < 120) {
    // Compute interest for each card
    let monthInterest = 0;
    simCards.forEach(c => {
      // Use promo APR 0 if promo still active
      const daysLeft = c.promoEndDate ? getDaysUntil(c.promoEndDate) : null;
      const monthlyRate = (daysLeft !== null && daysLeft > 0) ? 0 : (c.apr / 100) / 12;
      const interest = c.balance * monthlyRate;
      c.balance += interest;
      monthInterest += interest;
    });
    totalInterest += monthInterest;
    // Pay minimums
    const minSum = simCards.reduce((sum, c) => sum + c.minPayment, 0);
    let extra = Math.max(0, simBudget - minSum);
    // Sort according to strategy
    let simList;
    if (strategy === 'snowball') {
      simList = simCards.sort((a, b) => a.balance - b.balance);
    } else {
      // avalanche or manual treat same as avalanche
      simList = simCards.sort((a, b) => b.apr - a.apr);
    }
    simList.forEach(c => {
      const pay = Math.min(c.minPayment, c.balance);
      c.balance -= pay;
    });
    // Apply extra to first card still with balance
    for (const c of simList) {
      if (c.balance > 0 && extra > 0) {
        const pay = Math.min(extra, c.balance);
        c.balance -= pay;
        extra -= pay;
      }
    }
    // Remove paid off cards (for next iterations, keep but treat as 0)
    totalDebt = simCards.reduce((s, c) => s + c.balance, 0);
    timeline.push({ month: month, debt: totalDebt });
    month++;
  }
  return { timeline, months: month, totalInterest };
}

function renderTimeline() {
  const sim = simulatePayoff(budget);
  const svg = document.getElementById('timeline-svg');
  svg.innerHTML = '';
  if (sim.timeline.length === 0) return;
  const width = svg.clientWidth || 300;
  const height = svg.clientHeight || 200;
  const maxDebt = Math.max(...sim.timeline.map(p => p.debt));
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', '#e0373f');
  path.setAttribute('stroke-width', '2');
  let d = '';
  sim.timeline.forEach((point, index) => {
    const x = (index / (sim.timeline.length - 1)) * (width - 10) + 5;
    const y = height - (point.debt / maxDebt) * (height - 10) - 5;
    d += (index === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2) + ' ';
  });
  path.setAttribute('d', d.trim());
  svg.appendChild(path);
  // Display debt free date and total interest
  const debtFreeDate = addMonths(new Date(), sim.months);
  document.getElementById('debt-free-date').textContent = debtFreeDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  document.getElementById('total-interest').textContent = formatCurrency(sim.totalInterest);
}

function renderWhatIf() {
  const container = document.getElementById('what-if-list');
  container.innerHTML = '';
  const scenarios = [
    { label: 'Pay +$100/month', delta: 100 },
    { label: 'Pay +$50/month', delta: 50 },
    { label: 'Pay -$50/month', delta: -50 },
  ];
  const base = simulatePayoff(budget);
  scenarios.forEach(scen => {
    const newBudget = Math.max(0, budget + scen.delta);
    const sim = simulatePayoff(newBudget);
    const diffMonths = base.months - sim.months;
    const diffInterest = base.totalInterest - sim.totalInterest;
    const row = document.createElement('div');
    row.className = 'scenario';
    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = scen.label;
    const result = document.createElement('span');
    if (scen.delta >= 0) {
      result.className = 'save';
      const monthsSave = diffMonths > 0 ? `SAVE ${diffMonths} MONTHS` : `—`;
      result.textContent = `${monthsSave}\n${diffInterest > 0 ? 'Interest Saved ' + formatCurrency(diffInterest) : ''}`.trim();
    } else {
      result.className = 'cost';
      const monthsAdd = diffMonths < 0 ? `+${-diffMonths} MONTHS` : `—`;
      result.textContent = `${monthsAdd}\n${diffInterest < 0 ? 'Extra Interest ' + formatCurrency(-diffInterest) : ''}`.trim();
    }
    row.appendChild(label);
    row.appendChild(result);
    container.appendChild(row);
  });
}

function renderInsights() {
  const list = document.getElementById('insights-list');
  list.innerHTML = '';
  const totalDebt = cards.reduce((sum, c) => sum + c.balance, 0);
  const baseline = simulatePayoff(cards.reduce((s, c) => s + c.minPayment, 0));
  const sim = simulatePayoff(budget);
  // Example insights
  const insights = [];
  if (cards.length > 0) {
    insights.push({ type: 'success', message: `You're on track to be debt‑free by ${addMonths(new Date(), sim.months).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}. Your current strategy saves ${formatCurrency(baseline.totalInterest - sim.totalInterest)} vs minimum payments only.` });
    // milestone: first payoff card
    const firstCard = strategy === 'snowball' ? [...cards].sort((a, b) => a.balance - b.balance)[0] : [...cards].sort((a, b) => b.apr - a.apr)[0];
    insights.push({ type: 'info', message: `Upcoming Milestone: You'll pay off ${firstCard.nickname} in about ${Math.ceil(firstCard.balance / Math.max(1, budget - cards.reduce((s, c) => s + c.minPayment, 0)))} months if you continue.` });
    // optimization tip if high APR card exists
    const highAPR = cards.find(c => c.apr > 20);
    if (highAPR) {
      insights.push({ type: 'warning', message: `Consider transferring ${highAPR.nickname} balance to a 0% card. This could save you ${formatCurrency(highAPR.balance * highAPR.apr / 100)} in interest over 12 months.` });
    }
  }
  insights.forEach(ins => {
    const item = document.createElement('div');
    item.className = 'insight-item ' + ins.type;
    item.textContent = ins.message;
    list.appendChild(item);
  });
}

function updateAll() {
  // Reset focus property
  cards.forEach(c => c.focus = false);
  renderMetrics();
  renderPromoAlert();
  renderBudget();
  renderStrategyButtons();
  renderCards();
  renderTimeline();
  renderWhatIf();
  renderInsights();
}

// Event handlers
document.addEventListener('DOMContentLoaded', () => {
  // Set default budget value display
  document.getElementById('budget-input').value = budget;
  // Budget input change
  document.getElementById('budget-input').addEventListener('input', () => {
    // update budget and re-render
    budget = parseNumber(document.getElementById('budget-input').value);
    updateAll();
  });
  // Strategy card click
  document.querySelectorAll('.strategy-card').forEach(el => {
    el.addEventListener('click', () => {
      strategy = el.getAttribute('data-mode');
      updateAll();
    });
  });
  // Promo dismiss
  document.getElementById('dismissAlertBtn').addEventListener('click', () => {
    document.getElementById('promo-alert').style.display = 'none';
  });
  // Add card modal events
  const modal = document.getElementById('card-modal');
  document.getElementById('addCardBtn').addEventListener('click', () => {
    modal.style.display = 'flex';
  });
  document.getElementById('closeModalBtn').addEventListener('click', () => {
    modal.style.display = 'none';
  });
  document.getElementById('card-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    // Add card to Firestore for current user
    if (!currentUser) return;
    const bank = document.getElementById('card-bank').value.trim();
    const nickname = document.getElementById('card-name').value.trim();
    const balance = parseNumber(document.getElementById('card-balance').value);
    const apr = parseNumber(document.getElementById('card-apr').value);
    let min = parseNumber(document.getElementById('card-min').value);
    const dueDate = document.getElementById('card-due').value;
    const promo = document.getElementById('card-promo').value || null;
    // New fields
    const autopay = document.getElementById('card-autopay').checked;
    const noMin = document.getElementById('card-nomin').checked;
    const type = document.getElementById('card-type').value;
    const creditLimit = parseNumber(document.getElementById('card-limit').value);
    // If user indicates no minimum due, override min to 0
    if (noMin) {
      min = 0;
    }
    try {
      const cardsRef = collection(db, 'users', currentUser.uid, 'cards');
      await addDoc(cardsRef, {
        bank,
        nickname,
        balance,
        apr,
        minPayment: min,
        dueDate,
        promoEndDate: promo,
        autopay,
        noMin,
        type,
        creditLimit
      });
    } catch (err) {
      console.error(err);
      alert('Failed to add card: ' + err.message);
    }
    modal.style.display = 'none';
    e.target.reset();
  });
});