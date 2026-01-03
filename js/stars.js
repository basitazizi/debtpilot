// Starfield background (lightweight, performant)
(() => {
  const canvas = document.getElementById('stars');
  const ctx = canvas.getContext('2d', { alpha: true });

  let w, h, dpr;
  let stars = [];
  const STAR_COUNT = 380;

  function resize() {
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    w = canvas.width = Math.floor(window.innerWidth * dpr);
    h = canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    init();
  }

  function rand(min, max) { return min + Math.random() * (max - min); }

  function init() {
    stars = new Array(STAR_COUNT).fill(0).map(() => ({
      x: rand(0, w),
      y: rand(0, h),
      r: rand(0.6, 1.9) * dpr,
      a: rand(0.15, 0.95),
      tw: rand(0.002, 0.01),
      vx: rand(-0.02, 0.02) * dpr,
      vy: rand(0.03, 0.08) * dpr
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    // faint haze
    const haze = ctx.createRadialGradient(w*0.5, h*0.12, 0, w*0.5, h*0.12, Math.max(w,h)*0.65);
    haze.addColorStop(0, 'rgba(26, 224, 158, 0.08)');
    haze.addColorStop(0.45, 'rgba(64, 200, 255, 0.03)');
    haze.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, w, h);

    for (const s of stars) {
      // twinkle
      s.a += s.tw * (Math.random() > 0.5 ? 1 : -1);
      s.a = Math.max(0.10, Math.min(0.95, s.a));

      // drift
      s.x += s.vx;
      s.y += s.vy;
      if (s.y > h + 20*dpr) { s.y = -10*dpr; s.x = rand(0, w); }
      if (s.x < -20*dpr) s.x = w + 10*dpr;
      if (s.x > w + 20*dpr) s.x = -10*dpr;

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${s.a})`;
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize, { passive: true });
  resize();
  draw();
})();
