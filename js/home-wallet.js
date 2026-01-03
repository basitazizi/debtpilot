const tabs = document.querySelectorAll(".tab");
const panes = {
  recent: document.getElementById("tab-recent"),
  payoff: document.getElementById("tab-payoff"),
  rules: document.getElementById("tab-rules")
};

tabs.forEach(t=>{
  t.addEventListener("click", ()=>{
    tabs.forEach(x=>x.classList.remove("active"));
    t.classList.add("active");
    const key = t.dataset.tab;
    Object.values(panes).forEach(p=>p.classList.remove("show"));
    panes[key]?.classList.add("show");
  });
});

// Parallax tilt on the main card (desktop only)
const main = document.querySelector(".cc.main");
const wrap = document.querySelector(".stackWrap");
if (main && wrap){
  wrap.addEventListener("mousemove", (e)=>{
    const r = wrap.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    main.style.transform = `translateY(0px) rotateX(${(-py*6).toFixed(2)}deg) rotateY(${(px*8).toFixed(2)}deg)`;
  });
  wrap.addEventListener("mouseleave", ()=>{
    main.style.transform = "";
  });
}
