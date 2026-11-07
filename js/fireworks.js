(() => {
// Canvas fireworks show: rockets rise with sparkling trails and burst into
// several shell types (peony, ring, double ring, willow, heart, glitter).
const rand = (a, b) => Math.random() * (b - a) + a;
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

const SHELLS = ["peony", "peony", "ring", "double", "willow", "glitter", "heart"];
const MAX_PARTICLES = 3200;

class Fireworks {
  constructor(canvas, { auto = true } = {}) {
    this.c = canvas;
    this.ctx = canvas.getContext("2d");
    this.auto = auto;
    this.rockets = [];
    this.parts = [];
    this.flashes = [];
    this.running = false;
    this.nextAuto = 0;
    this.loop = this.loop.bind(this);
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = this.c.getBoundingClientRect();
    this.w = r.width;
    this.h = r.height;
    this.c.width = Math.round(this.w * dpr);
    this.c.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.scale = Math.max(0.6, Math.min(1.4, Math.min(this.w, this.h) / 700));
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
  }

  launch(tx, ty, type) {
    tx ??= rand(this.w * 0.12, this.w * 0.88);
    ty ??= rand(this.h * 0.1, this.h * 0.45);
    const sx = Math.min(this.w, Math.max(0, tx + rand(-this.w * 0.12, this.w * 0.12)));
    const sy = this.h + 10;
    this.rockets.push({
      x: sx, y: sy, sx, sy, tx, ty,
      trail: [[sx, sy], [sx, sy], [sx, sy], [sx, sy]],
      angle: Math.atan2(ty - sy, tx - sx),
      speed: 2 * this.scale,
      acc: 1.05,
      dist: Math.hypot(tx - sx, ty - sy),
      hue: rand(0, 360),
      type: type || pick(SHELLS),
    });
  }

  /** A big multi-rocket salvo across the sky. */
  finale(count = 9) {
    for (let i = 0; i < count; i++) {
      setTimeout(() => this.launch(this.w * ((i + 0.5) / count) + rand(-30, 30)), i * 140);
    }
  }

  particle(x, y, vx, vy, o) {
    if (this.parts.length > MAX_PARTICLES) return;
    const len = o.trail || 5;
    const trail = [];
    for (let i = 0; i < len; i++) trail.push([x, y]);
    this.parts.push({
      x, y, vx, vy, trail,
      friction: o.friction ?? 0.95,
      gravity: (o.gravity ?? 1) * this.scale * 0.9,
      hue: o.hue,
      sat: o.sat ?? 100,
      light: o.light ?? rand(50, 75),
      alpha: 1,
      decay: o.decay ?? rand(0.012, 0.028),
      twinkle: o.twinkle || false,
      width: o.width ?? 1.8,
    });
  }

  explode(x, y, hue, type) {
    const s = this.scale;
    this.flashes.push({ x, y, r: rand(90, 170) * s, a: 0.55, hue });

    switch (type) {
      case "ring": {
        const n = 80;
        const sp = rand(5.5, 7) * s;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          this.particle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, { hue: hue + rand(-10, 10), gravity: 0.6, decay: rand(0.012, 0.018) });
        }
        // a few inner sparks
        for (let i = 0; i < 30; i++) {
          const a = rand(0, Math.PI * 2), v = rand(0.5, 2.5) * s;
          this.particle(x, y, Math.cos(a) * v, Math.sin(a) * v, { hue: 50, light: 85, decay: 0.03 });
        }
        break;
      }
      case "double": {
        const hue2 = (hue + 150) % 360;
        [[90, 7.5, hue], [60, 4, hue2]].forEach(([n, sp, h]) => {
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2 + rand(-0.03, 0.03);
            const v = sp * s * rand(0.95, 1.05);
            this.particle(x, y, Math.cos(a) * v, Math.sin(a) * v, { hue: h, gravity: 0.7, decay: rand(0.011, 0.017) });
          }
        });
        break;
      }
      case "willow": {
        const n = 110;
        for (let i = 0; i < n; i++) {
          const a = rand(0, Math.PI * 2), v = rand(1, 7.5) * s;
          this.particle(x, y, Math.cos(a) * v, Math.sin(a) * v, {
            hue: rand(32, 46), sat: 90, light: rand(55, 70),
            friction: 0.965, gravity: 0.35, decay: rand(0.006, 0.011), trail: 12, width: 1.4,
          });
        }
        break;
      }
      case "glitter": {
        const n = 130;
        for (let i = 0; i < n; i++) {
          const a = rand(0, Math.PI * 2), v = rand(1, 9) * s;
          this.particle(x, y, Math.cos(a) * v, Math.sin(a) * v, {
            hue: Math.random() < 0.5 ? hue : 50, light: rand(65, 90), twinkle: true, decay: rand(0.01, 0.02),
          });
        }
        break;
      }
      case "heart": {
        const n = 90;
        const k = 0.36 * s * rand(0.9, 1.1);
        const h = rand(330, 355);
        for (let i = 0; i < n; i++) {
          const t = (i / n) * Math.PI * 2;
          const hx = 16 * Math.pow(Math.sin(t), 3);
          const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
          this.particle(x, y, hx * k, hy * k, { hue: h, light: rand(60, 72), friction: 0.94, gravity: 0.25, decay: rand(0.011, 0.015) });
        }
        break;
      }
      default: { // peony
        const n = (rand(90, 140) * Math.min(1.2, s)) | 0;
        for (let i = 0; i < n; i++) {
          const a = rand(0, Math.PI * 2), v = rand(1, 10) * s;
          this.particle(x, y, Math.cos(a) * v, Math.sin(a) * v, { hue: hue + rand(-25, 25) });
        }
      }
    }
  }

  update() {
    // rockets
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      r.trail.pop();
      r.trail.unshift([r.x, r.y]);
      r.speed *= r.acc;
      const vx = Math.cos(r.angle) * r.speed;
      const vy = Math.sin(r.angle) * r.speed;
      const traveled = Math.hypot(r.x + vx - r.sx, r.y + vy - r.sy);
      if (traveled >= r.dist) {
        this.explode(r.tx, r.ty, r.hue, r.type);
        this.rockets.splice(i, 1);
        continue;
      }
      r.x += vx;
      r.y += vy;
      if (Math.random() < 0.6) {
        this.particle(r.x, r.y, rand(-0.6, 0.6), rand(0.2, 1.2), { hue: 40, light: 70, gravity: 0.15, decay: rand(0.04, 0.08), trail: 2, width: 1.2 });
      }
    }
    // particles
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.trail.pop();
      p.trail.unshift([p.x, p.y]);
      p.vx *= p.friction;
      p.vy *= p.friction;
      p.vy += p.gravity * 0.12;
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      if (p.alpha <= p.decay) this.parts.splice(i, 1);
    }
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      this.flashes[i].a *= 0.86;
      if (this.flashes[i].a < 0.01) this.flashes.splice(i, 1);
    }
  }

  draw() {
    const ctx = this.ctx;
    // fade the previous frame → long glowing trails
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";

    for (const f of this.flashes) {
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
      g.addColorStop(0, `hsla(${f.hue},100%,80%,${f.a * 0.5})`);
      g.addColorStop(1, `hsla(${f.hue},100%,50%,0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const r of this.rockets) {
      const t = r.trail[r.trail.length - 1];
      ctx.strokeStyle = `hsl(${r.hue},100%,75%)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(t[0], t[1]);
      ctx.lineTo(r.x, r.y);
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(r.x, r.y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const p of this.parts) {
      let a = p.alpha;
      if (p.twinkle) a *= Math.random() < 0.5 ? 0.15 : 1;
      const t = p.trail[p.trail.length - 1];
      ctx.strokeStyle = `hsla(${p.hue},${p.sat}%,${p.light}%,${a})`;
      ctx.lineWidth = p.width;
      ctx.beginPath();
      ctx.moveTo(t[0], t[1]);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  loop(now) {
    if (!this.running) return;
    if (this.auto && now > this.nextAuto) {
      if (Math.random() < 0.18) {
        const n = (rand(3, 6)) | 0;
        for (let i = 0; i < n; i++) setTimeout(() => this.launch(), i * rand(80, 200));
        this.nextAuto = now + rand(1400, 2200);
      } else {
        this.launch();
        this.nextAuto = now + rand(320, 1000);
      }
    }
    this.update();
    this.draw();
    requestAnimationFrame(this.loop);
  }
}
window.Fireworks = Fireworks;
})();
