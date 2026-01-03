import { parseMoney } from "./app.js";

function monthlyRate(apr){
  return (Number(apr||0)/100)/12;
}

export function simulatePayoff(cards, monthlyBudget, strategy="avalanche", maxMonths=360){
  const budget = parseMoney(monthlyBudget);

  const active = cards
    .map(c => ({
      id: c.id,
      bank: c.bank || "",
      nickname: c.nickname || "",
      apr: Number(c.apr||0),
      minPayment: Number(c.minPayment||0),
      dueDate: c.dueDate || "",
      balance: Number(c.balance||0),
      startBalance: Number(c.balance||0),
    }))
    .filter(c => c.balance > 0);

  const totalMin = active.reduce((s,c)=>s + c.minPayment, 0);
  const feasible = budget >= totalMin && active.every(c => c.minPayment > 0);

  const order = (arr) => [...arr].sort((a,b)=>{
    if (strategy === "snowball") return a.balance - b.balance || b.apr - a.apr;
    return b.apr - a.apr || a.balance - b.balance;
  });

  const baseline = runSim(active, totalMin, "avalanche", maxMonths, true);
  const plan = runSim(active, budget, strategy, maxMonths, false);

  const initialOrder = order(active);
  const focus = initialOrder[0] || null;

  const why = focus ? buildWhy(focus, strategy, plan, baseline) : null;

  return {
    feasible,
    budget,
    totalMin,
    extra: Math.max(0, budget - totalMin),
    months: plan.months,
    totalInterest: plan.totalInterest,
    payoffDateEstimate: monthsToDate(plan.months),
    baselineMonths: baseline.months,
    baselineInterest: baseline.totalInterest,
    interestSaved: Math.max(0, baseline.totalInterest - plan.totalInterest),
    focusCard: focus ? {
      id: focus.id,
      bank: focus.bank,
      nickname: focus.nickname,
      apr: focus.apr,
      balance: focus.startBalance
    } : null,
    why,
    monthlyBreakdown: plan.monthlyBreakdown
  };
}

function runSim(active, budget, strategy, maxMonths, minimumOnly){
  const cards = active.map(c => ({...c, balance: c.startBalance}));
  let months = 0;
  let totalInterest = 0;
  const monthlyBreakdown = [];
  const clamp = (x)=> Math.max(0, x);

  for (months=0; months<maxMonths; months++){
    if (cards.every(c => c.balance <= 0.00001)) break;

    let interestThisMonth = 0;
    for (const c of cards){
      if (c.balance <= 0) continue;
      const i = c.balance * monthlyRate(c.apr);
      c.balance += i;
      interestThisMonth += i;
    }
    totalInterest += interestThisMonth;

    const mins = cards.map(c => c.balance<=0 ? 0 : Math.min(c.minPayment, c.balance));
    const minTotal = mins.reduce((s,x)=>s+x,0);

    let remainingBudget = budget;
    const payments = cards.map(()=>0);

    if (budget < minTotal){
      for (let idx=0; idx<cards.length; idx++){
        const share = mins[idx] > 0 ? (mins[idx] / minTotal) : 0;
        payments[idx] += remainingBudget * share;
      }
      remainingBudget = 0;
    } else {
      for (let idx=0; idx<cards.length; idx++){
        payments[idx] += mins[idx];
        remainingBudget -= mins[idx];
      }
    }

    if (!minimumOnly && remainingBudget > 0.01){
      const sorted = [...cards].filter(c=>c.balance>0).sort((a,b)=>{
        if (strategy === "snowball") return a.balance - b.balance || b.apr - a.apr;
        return b.apr - a.apr || a.balance - b.balance;
      });

      let extra = remainingBudget;
      for (const target of sorted){
        if (extra <= 0.01) break;
        const idx = cards.findIndex(c=>c.id===target.id);
        const pay = Math.min(extra, cards[idx].balance);
        payments[idx] += pay;
        extra -= pay;
      }
    }

    for (let idx=0; idx<cards.length; idx++){
      cards[idx].balance = clamp(cards[idx].balance - payments[idx]);
    }

    if (months < 12){
      monthlyBreakdown.push({
        month: months + 1,
        interest: interestThisMonth,
        payments: cards.map((c,idx)=>({ id:c.id, pay: payments[idx] }))
      });
    }
  }

  return { months, totalInterest, monthlyBreakdown };
}

function monthsToDate(months){
  if (!months || months<=0) return null;
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0,10);
}

function buildWhy(focus, strategy, plan, baseline){
  const strategyLabel = (strategy === "snowball")
    ? "Snowball focuses on the smallest balance first to build momentum."
    : "Avalanche focuses on the highest APR first to reduce interest fastest.";

  const aprReason = `This card has an APR of ${Number(focus.apr||0).toFixed(2)}%, which is where interest grows fastest.`;

  const savings = Math.max(0, baseline.totalInterest - plan.totalInterest);
  const savedLine = savings > 1
    ? `Compared to paying only minimums, this plan estimates about $${savings.toFixed(0)} less interest overall.`
    : `This plan reduces interest compared to minimum-only payments (estimate varies).`;

  return { title:"Why this card is first", bullets:[strategyLabel, aprReason, savedLine] };
}
