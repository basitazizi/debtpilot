import { $, $all, money, pct, parseMoney, toast, escapeHtml } from "./app.js";
import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  collection, addDoc, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { computePlan } from "./payoff.js";
import { simulatePayoff } from "./simulate.js";

const el = {
  summaryBadges: $("#summaryBadges"),
  cardsTbody: $("#cardsTbody"),
  planTbody: $("#planTbody"),
  planMeta: $("#planMeta"),
  insightsTop: $("#insightsTop"),
  whyBox: $("#whyBox"),
  timelineTbody: $("#timelineTbody")
};

let uid = null;
let cardsCache = [];

$("#logoutBtn")?.addEventListener("click", async (e) => {
  e.preventDefault();
  await signOut(auth);
  location.href = "./index.html";
});

onAuthStateChanged(auth, (user) => {
  if (!user) {
    location.href = "./login.html";
    return;
  }
  uid = user.uid;
  bindCards();
});

function bindCards(){
  const cardsRef = collection(db, "users", uid, "cards");
  const qy = query(cardsRef, orderBy("createdAt","desc"));
  onSnapshot(qy, (snap) => {
    cardsCache = snap.docs.map(d => ({ id:d.id, ...d.data() }));
    renderCards(cardsCache);
    renderSummary(cardsCache);
  }, (err) => {
    console.error(err);
    toast(err?.message || "Firestore error");
  });
}

$("#cardForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const bank = $("#bank").value.trim();
  const nickname = $("#nickname").value.trim();
  const balance = parseMoney($("#balance").value);
  const apr = Number($("#apr").value);
  const minPayment = parseMoney($("#minPayment").value);
  const dueDate = $("#dueDate").value.trim();

  if (!bank || !nickname) return toast("Enter bank + nickname.");
  if (balance <= 0) return toast("Balance must be > 0.");
  if (!(apr >= 0)) return toast("APR must be a number.");
  if (minPayment <= 0) return toast("Minimum payment must be > 0.");

  try {
    await addDoc(collection(db, "users", uid, "cards"), {
      bank, nickname, balance, apr, minPayment, dueDate,
      createdAt: serverTimestamp()
    });
    e.target.reset();
    toast("Card saved.");
  } catch (err) {
    console.error(err);
    toast(err?.message || "Could not save card.");
  }
});

function renderCards(cards){
  el.cardsTbody.innerHTML = "";
  if (!cards.length){
    el.cardsTbody.innerHTML = `<tr><td colspan="6" style="color:rgba(255,255,255,.65)">No cards yet.</td></tr>`;
    return;
  }
  for (const c of cards){
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(c.bank)} • ${escapeHtml(c.nickname)}</td>
      <td class="mono">${money(c.balance||0)}</td>
      <td class="mono">${pct(c.apr||0)}</td>
      <td class="mono">${money(c.minPayment||0)}</td>
      <td class="mono">${escapeHtml(c.dueDate||"—")}</td>
      <td>
        <button class="icon-btn danger" data-del="${c.id}">Delete</button>
      </td>
    `;
    el.cardsTbody.appendChild(tr);
  }

  $all("[data-del]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-del");
      if (!confirm("Delete this card?")) return;
      try{
        await deleteDoc(doc(db, "users", uid, "cards", id));
        toast("Deleted.");
      }catch(err){
        console.error(err);
        toast(err?.message || "Delete failed.");
      }
    });
  });
}

function renderSummary(cards){
  const totalDebt = cards.reduce((s,c)=> s + Number(c.balance||0), 0);
  const totalMin = cards.reduce((s,c)=> s + Number(c.minPayment||0), 0);
  const estMonthlyInterest = cards.reduce((s,c)=> s + (Number(c.balance||0) * (Number(c.apr||0)/100)/12), 0);

  el.summaryBadges.innerHTML = `
    <span class="badge">Debt: <span class="kbd">${money(totalDebt)}</span></span>
    <span class="badge">Minimums: <span class="kbd">${money(totalMin)}</span></span>
    <span class="badge accent"><span class="dot"></span>Est. interest/mo: <span class="kbd">${money(estMonthlyInterest)}</span></span>
  `;
}

$("#planForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  refreshPlan();
});

function refreshPlan(){
  const budget = parseMoney($("#monthlyBudget").value);
  const strat = $("#strategy").value;

  if (!cardsCache.length) return toast("Add at least one card.");
  if (budget <= 0) return toast("Enter your monthly budget.");

  const plan = computePlan(cardsCache, budget, strat);
  renderPlan(plan);

  const sim = simulatePayoff(cardsCache, budget, strat);
  renderInsights(sim, plan);
}

function renderPlan(plan){
  el.planTbody.innerHTML = "";
  el.planMeta.innerHTML = "";

  if (plan.budget < plan.totalMin){
    el.planMeta.innerHTML = `<span class="badge" style="border-color:rgba(255,170,0,.45); background:rgba(255,170,0,.08)">Warning: budget is below total minimums. You may still get late fees.</span>`;
  } else {
    el.planMeta.innerHTML = `
      <div class="split">
        <span class="badge">Budget <span class="kbd">${money(plan.budget)}</span></span>
        <span class="badge">Total minimums <span class="kbd">${money(plan.totalMin)}</span></span>
        <span class="badge accent"><span class="dot"></span>Extra available <span class="kbd">${money(plan.extra)}</span></span>
      </div>
    `;
  }

  for (const r of plan.rows){
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(r.label)}</td>
      <td class="mono">${money(r.min)}</td>
      <td class="mono">${money(r.extra)}</td>
      <td class="mono">${money(r.total)}</td>
      <td>${escapeHtml(r.reason)}</td>
    `;
    el.planTbody.appendChild(tr);
  }
}

function renderInsights(sim){
  if (el.insightsTop){
    const payDate = sim.payoffDateEstimate ? sim.payoffDateEstimate : "—";
    el.insightsTop.innerHTML = `
      <span class="badge">Payoff est.: <span class="kbd">${payDate}</span></span>
      <span class="badge">Months: <span class="kbd">${sim.months || 0}</span></span>
      <span class="badge accent"><span class="dot"></span>Interest saved: <span class="kbd">${money(sim.interestSaved||0)}</span></span>
    `;
  }

  if (el.whyBox){
    el.whyBox.innerHTML = "";
    if (!sim.why || !sim.focusCard){
      el.whyBox.innerHTML = `<div style="color:rgba(255,255,255,.65)">Add cards and set a budget to see explanations.</div>`;
    } else {
      const title = document.createElement("div");
      title.className = "badge accent";
      title.innerHTML = `<span class="dot"></span>${sim.why.title}: <span class="kbd">${escapeHtml(sim.focusCard.bank)} • ${escapeHtml(sim.focusCard.nickname)}</span>`;
      el.whyBox.appendChild(title);

      for (const b of sim.why.bullets){
        const item = document.createElement("div");
        item.className = "panel";
        item.style.background = "rgba(0,0,0,.18)";
        item.innerHTML = `<div class="p-body" style="padding:12px 14px; color:rgba(255,255,255,.80); font-size:13px; line-height:1.6">${escapeHtml(b)}</div>`;
        el.whyBox.appendChild(item);
      }
    }
  }

  if (el.timelineTbody){
    el.timelineTbody.innerHTML = "";
    if (!sim.monthlyBreakdown || sim.monthlyBreakdown.length === 0){
      el.timelineTbody.innerHTML = `<tr><td colspan="4" style="color:rgba(255,255,255,.65)">No timeline yet.</td></tr>`;
    } else {
      const focusId = sim.focusCard?.id || null;
      for (const row of sim.monthlyBreakdown){
        const totalPaid = row.payments.reduce((s,p)=>s + Number(p.pay||0), 0);
        const focusPaid = focusId ? (row.payments.find(p=>p.id===focusId)?.pay || 0) : 0;
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td class="mono">${row.month}</td>
          <td class="mono">${money(row.interest||0)}</td>
          <td class="mono">${money(totalPaid)}</td>
          <td class="mono">${money(focusPaid)}</td>
        `;
        el.timelineTbody.appendChild(tr);
      }
    }
  }
}
