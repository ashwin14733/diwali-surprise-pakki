(() => {
// Lightning text: every letter is ignited by its own strike from the sky,
// then electric arcs crawl along the glyph outlines, big strikes flash the
// whole scene, and the cursor pulls sparks off the nearest letter.
const rand = (a, b) => Math.random() * (b - a) + a;
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

/** Midpoint-displacement jagged path between two points. */
function boltPath(x1, y1, x2, y2, rough = 0.35, min = 2) {
  let pts = [[x1, y1], [x2, y2]];
  let d = Math.hypot(x2 - x1, y2 - y1) * rough;
  while (d > min) {
    const out = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
      const off = (Math.random() - 0.5) * d;
      out.push([(ax + bx) / 2 + (-dy / len) * off, (ay + by) / 2 + (dx / len) * off], pts[i + 1]);
    }
    pts = out;
    d *= 0.55;
  }
  return pts;
}

class LightningText {
  constructor(canvas, { lines = ["HAPPY", "DIWALI"], hue = 42, font = "Poppins", weight = 800, onIgnited } = {}) {
    this.c = canvas;
    this.ctx = canvas.getContext("2d");
    this.lines = lines;
    this.hue = hue;
    this.font = font;
    this.weight = weight;
    this.onIgnited = onIgnited;
    this.letters = [];
    this.bolts = [];
    this.sparks = [];
    this.flash = 0;
    this.shake = 0;
    this.queue = [];
    this.started = false;
    this.ignited = false;
    this.running = false;
    this.pointer = null;
    this.nextBig = 0;
    this.loop = this.loop.bind(this);

    window.addEventListener("resize", () => this.resize());
    canvas.parentElement.addEventListener("pointermove", (e) => {
      const r = this.c.getBoundingClientRect();
      this.pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
    });
    canvas.parentElement.addEventListener("pointerleave", () => (this.pointer = null));
    canvas.parentElement.addEventListener("click", (e) => {
      if (!this.ignited) return;
      const r = this.c.getBoundingClientRect();
      this.bigStrike(e.clientX - r.left);
    });
  }

  init() {
    this.ready = (async () => {
      try { await document.fonts.load(`${this.weight} 100px ${this.font}`); } catch (_) {}
      this.resize();
    })();
    return this.ready;
  }

  get fontStr() {
    return `${this.weight} ${this.fs}px ${this.font}, sans-serif`;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = this.c.getBoundingClientRect();
    this.w = r.width;
    this.h = r.height;
    this.c.width = Math.round(this.w * dpr);
    this.c.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.dpr = dpr;
    this.layout();
  }

  layout() {
    const ctx = this.ctx;
    const prev = this.letters;
    ctx.font = `${this.weight} 100px ${this.font}, sans-serif`;
    const track = 0.02;
    const widthAt100 = Math.max(...this.lines.map((l) => {
      let w = 0;
      for (const ch of l) w += ctx.measureText(ch).width + 100 * track;
      return w;
    }));
    // stack lines on narrow screens, otherwise one line
    const stacked = this.w < 900 || this.lines.length === 1 ? this.lines : [this.lines.join(" ")];
    const longest = stacked === this.lines ? widthAt100 : (() => {
      let w = 0;
      for (const ch of stacked[0]) w += ctx.measureText(ch).width + 100 * track;
      return w;
    })();
    this.fs = Math.min((this.w * (this.w < 600 ? 0.8 : 0.88) * 100) / longest, this.h * (stacked.length > 1 ? 0.22 : 0.28));
    ctx.font = this.fontStr;

    const lineH = this.fs * 1.02;
    const top = this.h * 0.44 - (stacked.length * lineH) / 2 + lineH / 2;
    this.letters = [];
    stacked.forEach((line, li) => {
      const ws = [...line].map((ch) => ctx.measureText(ch).width);
      const total = ws.reduce((a, b) => a + b, 0) + this.fs * track * (ws.length - 1);
      let x = (this.w - total) / 2;
      const y = top + li * lineH;
      [...line].forEach((ch, i) => {
        if (ch !== " ") this.letters.push(this.sample({ ch, x, y, w: ws[i] }));
        x += ws[i] + this.fs * track;
      });
    });
    this.letters.forEach((l, i) => {
      if (prev[i]) { l.lit = prev[i].lit; l.glow = prev[i].glow; }
    });

    const g = ctx.createLinearGradient(0, top - this.fs / 2, 0, top + (stacked.length - 1) * lineH + this.fs / 2);
    g.addColorStop(0, "#fff3d1");
    g.addColorStop(0.35, "#f0c977");
    g.addColorStop(0.7, "#d59c3e");
    g.addColorStop(1, "#a8711f");
    this.gold = g;
  }

  /** Render a glyph off-screen and collect outline + interior points. */
  sample(l) {
    const pad = this.fs * 0.2;
    const W = Math.ceil(l.w + pad * 2), H = Math.ceil(this.fs * 1.4);
    const off = document.createElement("canvas");
    off.width = W; off.height = H;
    const o = off.getContext("2d", { willReadFrequently: true });
    o.font = this.fontStr;
    o.textBaseline = "middle";
    o.fillStyle = "#fff";
    o.fillText(l.ch, pad, H / 2);
    const data = o.getImageData(0, 0, W, H).data;
    const A = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : data[(y * W + x) * 4 + 3]);
    const s = Math.max(2, Math.round(this.fs / 70));
    const edges = [], inner = [];
    for (let y = 0; y < H; y += s) {
      for (let x = 0; x < W; x += s) {
        if (A(x, y) < 128) continue;
        const gx = l.x - pad + x, gy = l.y - H / 2 + y;
        if (A(x - s, y) < 128 || A(x + s, y) < 128 || A(x, y - s) < 128 || A(x, y + s) < 128) edges.push([gx, gy]);
        else inner.push([gx, gy]);
      }
    }
    return { ...l, edges, inner: inner.length ? inner : edges, lit: false, glow: 0 };
  }

  async start() {
    if (this.running) return;
    this.running = true;
    await (this.ready || this.init());
    if (!this.running) return;
    if (!this.started) {
      this.started = true;
      const t0 = performance.now() + 400;
      this.letters.forEach((_, i) => this.queue.push({ t: t0 + i * 230 + rand(-40, 40), i }));
      this.queue.push({ t: t0 + this.letters.length * 230 + 350, final: true });
    }
    requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
  }

  addBolt(x1, y1, x2, y2, { width = 2, life = 12, rough = 0.35, branches = 0 } = {}) {
    const paths = [{ pts: boltPath(x1, y1, x2, y2, rough), w: width }];
    const main = paths[0].pts;
    const len = Math.hypot(x2 - x1, y2 - y1);
    const ang = Math.atan2(y2 - y1, x2 - x1);
    for (let b = 0; b < branches; b++) {
      const [bx, by] = main[(rand(0.15, 0.7) * main.length) | 0];
      const a = ang + (Math.random() < 0.5 ? -1 : 1) * rand(0.35, 0.9);
      const bl = len * rand(0.12, 0.3);
      paths.push({ pts: boltPath(bx, by, bx + Math.cos(a) * bl, by + Math.sin(a) * bl, 0.4), w: width * 0.5 });
    }
    this.bolts.push({ paths, life, max: life });
  }

  burst(x, y, n = 18) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), v = rand(1, 5);
      this.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: rand(18, 34), max: 34 });
    }
  }

  /** Strike from the sky onto letter i, igniting it. */
  strikeLetter(i, { width = 2.6 } = {}) {
    const l = this.letters[i];
    if (!l) return;
    const [tx, ty] = pick(l.inner);
    this.addBolt(tx + rand(-this.w * 0.08, this.w * 0.08), -20, tx, ty, { width, life: 14, branches: 3 });
    l.lit = true;
    l.glow = 1.4;
    this.flash = Math.max(this.flash, 0.18);
    this.shake = Math.max(this.shake, 4);
    this.burst(tx, ty);
    // electric afterglow on the freshly lit letter
    for (let k = 0; k < 3; k++) setTimeout(() => this.arcOn(l), k * 60);
  }

  bigStrike(x) {
    const l = x == null
      ? pick(this.letters)
      : this.letters.reduce((best, c) => (Math.abs(c.x + c.w / 2 - x) < Math.abs(best.x + best.w / 2 - x) ? c : best));
    const [tx, ty] = pick(l.inner);
    this.addBolt(x ?? tx + rand(-120, 120), -20, tx, ty, { width: 3.6, life: 16, branches: 5 });
    // chain across neighbours
    const idx = this.letters.indexOf(l);
    [-1, 1].forEach((dir) => {
      let a = l;
      for (let k = 1; k <= 2; k++) {
        const b = this.letters[idx + dir * k];
        if (!b) break;
        const p = pick(a.edges), q = pick(b.edges);
        this.addBolt(p[0], p[1], q[0], q[1], { width: 1.6, life: 10, rough: 0.5 });
        b.glow = Math.max(b.glow, 1.1 - k * 0.2);
        a = b;
      }
    });
    this.letters.forEach((c) => (c.glow = Math.max(c.glow, 0.7)));
    l.glow = 1.5;
    this.flash = 0.42;
    this.shake = 9;
    this.burst(tx, ty, 34);
  }

  /** Small arc crawling between two outline points of one letter. */
  arcOn(l) {
    if (!l.edges.length) return;
    const p = pick(l.edges);
    let q = null;
    for (let t = 0; t < 12; t++) {
      const c = pick(l.edges);
      const d = Math.hypot(c[0] - p[0], c[1] - p[1]);
      if (d > this.fs * 0.08 && d < this.fs * 0.55) { q = c; break; }
    }
    if (!q) return;
    this.addBolt(p[0], p[1], q[0], q[1], { width: 1.1, life: (rand(5, 10)) | 0, rough: 0.55 });
    l.glow = Math.min(1.5, l.glow + 0.18);
  }

  update(now) {
    while (this.queue.length && this.queue[0].t <= now) {
      const q = this.queue.shift();
      if (q.final) {
        this.ignited = true;
        this.bigStrike();
        this.nextBig = now + rand(2500, 4500);
        this.onIgnited?.();
      } else this.strikeLetter(q.i);
    }

    if (this.ignited) {
      if (Math.random() < 0.3) this.arcOn(pick(this.letters));
      if (now > this.nextBig) {
        this.bigStrike();
        this.nextBig = now + rand(2800, 6000);
      }
      if (this.pointer && Math.random() < 0.35) this.pointerArc();
    }

    for (const l of this.letters) {
      l.glow *= 0.93;
      if (l.lit && l.glow < 0.12) l.glow = 0.12 + Math.random() * 0.05;
    }
    for (let i = this.bolts.length - 1; i >= 0; i--) if (--this.bolts[i].life <= 0) this.bolts.splice(i, 1);
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.vx *= 0.94; s.vy = s.vy * 0.94 + 0.18;
      s.x += s.vx; s.y += s.vy;
      if (--s.life <= 0) this.sparks.splice(i, 1);
    }
    this.flash *= 0.82;
    this.shake *= 0.82;
  }

  pointerArc() {
    const { x, y } = this.pointer;
    const reach = Math.max(140, this.fs * 0.9);
    let best = null, bd = reach;
    for (const l of this.letters) {
      if (Math.abs(l.x + l.w / 2 - x) > reach + l.w) continue;
      for (let k = 0; k < l.edges.length; k += 3) {
        const e = l.edges[k];
        const d = Math.hypot(e[0] - x, e[1] - y);
        if (d < bd) { bd = d; best = { e, l }; }
      }
    }
    if (!best) return;
    this.addBolt(x, y, best.e[0], best.e[1], { width: 1.3, life: 6, rough: 0.45 });
    best.l.glow = Math.min(1.4, best.l.glow + 0.3);
  }

  draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);

    if (this.flash > 0.01) {
      const g = ctx.createRadialGradient(this.w / 2, 0, 0, this.w / 2, 0, Math.max(this.w, this.h));
      g.addColorStop(0, `hsla(${this.hue + 180},60%,85%,${this.flash})`);
      g.addColorStop(1, `hsla(${this.hue + 180},60%,60%,${this.flash * 0.25})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.w, this.h);
    }

    if (this.shake > 0.3) ctx.translate(rand(-1, 1) * this.shake, rand(-1, 1) * this.shake);

    ctx.font = this.fontStr;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    for (const l of this.letters) {
      if (!l.lit) {
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 1;
        ctx.strokeText(l.ch, l.x, l.y);
        continue;
      }
      const g = Math.min(1.5, l.glow);
      ctx.save();
      ctx.shadowColor = `hsla(${this.hue},100%,60%,${Math.min(1, 0.5 + g * 0.5)})`;
      ctx.shadowBlur = 14 + 46 * g;
      ctx.globalAlpha = Math.min(1, 0.62 + g * 0.5);
      ctx.fillStyle = this.gold;
      ctx.fillText(l.ch, l.x, l.y);
      ctx.restore();
      if (g > 0.45) {
        ctx.fillStyle = `rgba(255,255,255,${Math.min(0.85, (g - 0.45) * 0.9)})`;
        ctx.fillText(l.ch, l.x, l.y);
      }
      ctx.strokeStyle = `hsla(${this.hue + 10},100%,80%,${Math.min(1, 0.25 + g * 0.6)})`;
      ctx.lineWidth = 1.2;
      ctx.strokeText(l.ch, l.x, l.y);
    }

    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const b of this.bolts) {
      const a = (b.life / b.max) * (0.55 + Math.random() * 0.45);
      for (const p of b.paths) {
        const passes = [
          [p.w * 7, `hsla(${this.hue},100%,55%,${a * 0.12})`],
          [p.w * 3, `hsla(${this.hue},100%,65%,${a * 0.4})`],
          [p.w, `hsla(${this.hue + 15},100%,92%,${a})`],
        ];
        for (const [w, col] of passes) {
          ctx.lineWidth = w;
          ctx.strokeStyle = col;
          ctx.beginPath();
          ctx.moveTo(p.pts[0][0], p.pts[0][1]);
          for (let i = 1; i < p.pts.length; i++) ctx.lineTo(p.pts[i][0], p.pts[i][1]);
          ctx.stroke();
        }
      }
    }
    for (const s of this.sparks) {
      const a = s.life / s.max;
      ctx.fillStyle = `hsla(${this.hue},100%,${70 + a * 25}%,${a})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  loop(now) {
    if (!this.running) return;
    this.update(now);
    this.draw();
    requestAnimationFrame(this.loop);
  }
}
window.LightningText = LightningText;
})();
