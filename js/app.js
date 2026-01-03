export function $(sel, root=document){ return root.querySelector(sel); }
export function $all(sel, root=document){ return [...root.querySelectorAll(sel)]; }

export function money(n){
  const x = Number(n || 0);
  return x.toLocaleString(undefined, {style:"currency", currency:"USD"});
}

export function pct(n){
  const x = Number(n || 0);
  return `${x.toFixed(2)}%`;
}

export function parseMoney(str){
  if (typeof str === "number") return str;
  return Number(String(str).replace(/[^0-9.-]/g,"")) || 0;
}

export function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

export function toast(msg){
  const t = document.getElementById("toast");
  if (!t) return alert(msg);
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(()=>t.classList.remove("show"), 2600);
}
