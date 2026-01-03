// Monthly allocation snapshot
export function computePlan(cards, monthlyBudget, strategy="avalanche"){
  const budget = Number(monthlyBudget || 0);
  const active = cards.filter(c => Number(c.balance||0) > 0);

  const totalMin = active.reduce((s,c)=> s + Number(c.minPayment||0), 0);
  const extra = Math.max(0, budget - totalMin);

  const sorted = [...active].sort((a,b)=>{
    const ab = Number(a.balance||0), bb = Number(b.balance||0);
    const aa = Number(a.apr||0), ba = Number(b.apr||0);
    if (strategy === "snowball") return ab - bb || ba - aa;
    return ba - aa || ab - bb;
  });

  const focus = sorted[0] || null;

  const rows = active.map(c => {
    const min = Number(c.minPayment||0);
    let extraPay = 0;
    let reason = "Pay minimum to avoid fees.";
    if (focus && c.id === focus.id){
      extraPay = extra;
      reason = strategy === "snowball"
        ? "Smallest balance first to build momentum."
        : "Highest APR first to reduce interest fastest.";
    }
    return {
      id: c.id,
      label: `${c.bank} • ${c.nickname}`,
      min,
      extra: extraPay,
      total: min + extraPay,
      reason
    };
  });

  // Put focus first in table
  rows.sort((a,b)=> (focus && a.id===focus.id ? -1 : 0) - (focus && b.id===focus.id ? -1 : 0));

  return { budget, totalMin, extra, focus, rows };
}
