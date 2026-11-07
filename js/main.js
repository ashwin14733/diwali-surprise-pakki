(() => {

const gsap = window.gsap;
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── Per-character headline reveal (ported from the gempick Layout):
   characters fan out from the centre and converge into place. ── */
function splitChars(el) {
  el.setAttribute("aria-label", el.textContent.trim().replace(/\s+/g, " "));
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) nodes.push(n);
  nodes.forEach((tn) => {
    const cleaned = tn.nodeValue.replace(/\s+/g, " ");
    if (!cleaned.trim()) return;
    const frag = document.createDocumentFragment();
    const words = cleaned.split(" ");
    words.forEach((word, wi) => {
      if (word) {
        const w = document.createElement("span");
        w.className = "char-word";
        w.setAttribute("aria-hidden", "true");
        for (const ch of word) {
          const s = document.createElement("span");
          s.className = "char-item";
          s.textContent = ch;
          w.appendChild(s);
        }
        frag.appendChild(w);
      }
      if (wi < words.length - 1) frag.appendChild(document.createTextNode(" "));
    });
    tn.replaceWith(frag);
  });
  return [...el.querySelectorAll(".char-item")];
}

function prepReveal(el) {
  const chars = splitChars(el);
  const spread = innerWidth < 768 ? 22 : 46;
  const mid = Math.floor(chars.length / 2);
  if (!REDUCED) chars.forEach((c, i) => gsap.set(c, { x: (i - mid) * spread, opacity: 0 }));
  el._chars = chars;
}

function playReveal(el, delay = 0) {
  if (REDUCED || !el._chars) return;
  gsap.to(el._chars, { x: 0, opacity: 1, stagger: { each: 0.03, from: "center" }, duration: 1.1, ease: "expo.out", delay });
}

function fadeUp(els, delay = 0) {
  gsap.fromTo(els, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1.1, ease: "power3.out", stagger: 0.15, delay });
}

document.querySelectorAll("[data-reveal], [data-reveal-late]").forEach(prepReveal);

/* ── Effects ── */
const fw = new Fireworks(document.getElementById("fireworks"));
const s1 = document.getElementById("s1");
s1.addEventListener("click", (e) => {
  const r = fw.c.getBoundingClientRect();
  fw.launch(e.clientX - r.left, e.clientY - r.top);
});

const lateHead = document.querySelector("[data-reveal-late]");
const lt = new LightningText(document.getElementById("lightning"), {
  lines: ["HAPPY", "DIWALI"],
  hue: 42, // golden lightning — try 200 for classic electric blue
  onIgnited() {
    playReveal(lateHead, 0.3);
    fadeUp(document.querySelectorAll("[data-rv-late]"), 0.6);
  },
});
lt.init();

/* ── Section 3 · balloons + love words ── */
const s3 = document.getElementById("s3");
const loveHead = s3.querySelector("[data-reveal-love]");
prepReveal(loveHead);
let loveShown = false;

function launchBalloons() {
  window.balloons?.();
  setTimeout(() => {
    window.textBalloons?.([
      { text: "LOVE YOU", fontSize: innerWidth < 600 ? 46 : 120, color: "#ff5c8a" },
    ]);
  }, 900);
}

function showLove() {
  if (loveShown) return;
  loveShown = true;
  playReveal(loveHead, 0.1);
  fadeUp(s3.querySelectorAll("[data-pop]"), 0.5);
  if (!REDUCED) {
    gsap.fromTo(s3.querySelectorAll("[data-note]"),
      { opacity: 0, y: 40, scale: 0.85, rotate: () => gsap.utils.random(-6, 6) },
      { opacity: 1, y: 0, scale: 1, rotate: 0, duration: 0.9, ease: "back.out(1.8)", stagger: 0.12, delay: 0.9 });
  }
  launchBalloons();
  startRotator();
}
document.getElementById("balloonBtn").addEventListener("click", launchBalloons);

const LOVE_WORDS = [
  "favourite person", "safe place", "fighting queen", "monkey",
  "biggest blessing", "forever love", "happy place" , "lovebug",
];
function startRotator() {
  const el = document.getElementById("rotWord");
  let i = 0;
  setInterval(() => {
    i = (i + 1) % LOVE_WORDS.length;
    gsap.to(el, {
      y: -14, opacity: 0, filter: "blur(6px)", duration: 0.35, ease: "power2.in",
      onComplete() {
        el.textContent = LOVE_WORDS[i];
        gsap.fromTo(el, { y: 14, opacity: 0, filter: "blur(6px)" }, { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.5, ease: "power3.out" });
      },
    });
  }, 2400);
}

// drifting hearts in the background
const hearts = s3.querySelector(".hearts");
for (let i = 0; i < 18; i++) {
  const h = document.createElement("span");
  h.textContent = "♥";
  h.style.left = Math.random() * 100 + "%";
  h.style.fontSize = 10 + Math.random() * 22 + "px";
  h.style.animationDuration = 9 + Math.random() * 10 + "s";
  h.style.animationDelay = -Math.random() * 15 + "s";
  hearts.appendChild(h);
}

/* ── Section 4 · 3D "I love you" heart ── */
const s4 = document.getElementById("s4");
const heartRot = document.getElementById("heart3d");
const heartHead = s4.querySelector("[data-reveal-heart]");
prepReveal(heartHead);
let heartShown = false;

function buildHeart() {
  heartRot.innerHTML = "";
  const stage = s4.querySelector(".heart-stage");
  const u = Math.min(stage.clientWidth * 0.9, stage.clientHeight * 1.05) / 36; // heart is ~34 units wide
  const fs = Math.max(9, u * 0.62);
  const layers = 7, perLayer = innerWidth < 600 ? 22 : 30;
  for (let L = 0; L < layers; L++) {
    const d = (L - (layers - 1) / 2) / ((layers - 1) / 2); // -1 … 1
    const s = Math.sqrt(1 - d * d * 0.85);                 // rounder in the middle
    for (let i = 0; i < perLayer; i++) {
      const t = (i / perLayer) * Math.PI * 2 + L * 0.2;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      const w = document.createElement("span");
      w.className = "heart-word";
      w.textContent = "I love you";
      w.style.setProperty("--x", (x * u * s).toFixed(1) + "px");
      w.style.setProperty("--y", ((y - 2.5) * u * s).toFixed(1) + "px");
      w.style.setProperty("--z", (d * u * 5).toFixed(1) + "px");
      w.style.fontSize = (fs * (0.8 + s * 0.3)).toFixed(1) + "px";
      w.style.animationDelay = (-(i / perLayer) * 3 - L * 0.4).toFixed(2) + "s";
      heartRot.appendChild(w);
    }
  }
}
buildHeart();
let heartResize;
addEventListener("resize", () => { clearTimeout(heartResize); heartResize = setTimeout(buildHeart, 200); });

function showHeart() {
  if (heartShown) return;
  heartShown = true;
  playReveal(heartHead, 0.3);
  fadeUp(s4.querySelectorAll("[data-heart-pop]"), 0.7);
  if (!REDUCED) gsap.from(s4.querySelector(".heart-beat"), { scale: 0, rotate: -30, duration: 1.6, ease: "elastic.out(1, 0.5)" });
}

// tap the heart → a little burst of floating "I love you"s
s4.querySelector(".heart-stage").addEventListener("click", () => {
  const stage = s4.querySelector(".heart-stage");
  gsap.fromTo(s4.querySelector(".heart-beat"), { scale: 1.25 }, { scale: 1, duration: 0.8, ease: "elastic.out(1, 0.4)" });
  for (let i = 0; i < 12; i++) {
    const p = document.createElement("span");
    p.className = "heart-pop";
    p.textContent = Math.random() < 0.5 ? "I love you" : "♥";
    p.style.fontSize = 14 + Math.random() * 18 + "px";
    stage.appendChild(p);
    const a = Math.random() * Math.PI * 2, r = 120 + Math.random() * 200;
    gsap.fromTo(p, { x: "-50%", y: "-50%", opacity: 1, scale: 0.4 },
      { x: `calc(-50% + ${Math.cos(a) * r}px)`, y: `calc(-50% + ${Math.sin(a) * r - 60}px)`, opacity: 0, scale: 1.2,
        duration: 1.6 + Math.random(), ease: "power2.out", onComplete: () => p.remove() });
  }
});

/* ── Section 5 · "Do you love me?" ── */
const s5 = document.getElementById("s5");
const askHead = s5.querySelector("[data-reveal-ask]");
prepReveal(askHead);
let askShown = false;
const fw2 = new Fireworks(document.getElementById("fireworks2"), { auto: false });

const askBox = document.getElementById("askBox");
const askBtns = document.getElementById("askBtns");
const yesBtn = document.getElementById("yesBtn");
const noBtn = document.getElementById("noBtn");
const loader = document.getElementById("heartLoader");
const result = document.getElementById("askResult");
const NO_LINES = ["No", "Are you sure?", "Think again!", "Really?? 🥺", "Last chance!", "Nope, try Yes", "You can't 😜", "Just press Yes"];
let noCount = 0;

function showAsk() {
  if (askShown) return;
  askShown = true;
  playReveal(askHead, 0.2);
  if (!REDUCED) gsap.from(askBtns.children, { opacity: 0, y: 30, scale: 0.7, duration: 0.9, ease: "back.out(2)", stagger: 0.12, delay: 0.8 });
}

// "No" runs away from the cursor / finger
function dodge(e) {
  e?.preventDefault?.();
  noCount++;
  noBtn.textContent = NO_LINES[Math.min(noCount, NO_LINES.length - 1)];
  gsap.to(yesBtn, { scale: Math.min(1 + noCount * 0.15, 2), duration: 0.5, ease: "back.out(3)" });
  const box = askBtns.getBoundingClientRect();
  if (!noBtn.classList.contains("running")) {
    const b = noBtn.getBoundingClientRect();
    noBtn.style.left = b.left - box.left + "px";
    noBtn.style.top = b.top - box.top + "px";
    noBtn.classList.add("running");
    noBtn.offsetWidth; // commit start position so it animates
  }
  // jump anywhere inside the section, away from the Yes button
  const area = s5.getBoundingClientRect();
  const nb = noBtn.getBoundingClientRect();
  const yb = yesBtn.getBoundingClientRect();
  let x, y, tries = 0;
  do {
    x = Math.random() * (area.width - nb.width - 40) + 20;
    y = Math.random() * (area.height - nb.height - 40) + 20;
    tries++;
  } while (tries < 20 && Math.abs(area.left + x - yb.left) < yb.width + 40 && Math.abs(area.top + y - yb.top) < yb.height + 40);
  noBtn.style.left = area.left + x - box.left + "px";
  noBtn.style.top = area.top + y - box.top + "px";
}
noBtn.addEventListener("mouseover", dodge);
noBtn.addEventListener("touchstart", dodge, { passive: false });
noBtn.addEventListener("click", dodge);

function celebrate() {
  fw2.start();
  fw2.finale(10);
  setTimeout(() => fw2.launch(undefined, undefined, "heart"), 600);
  setTimeout(() => fw2.launch(undefined, undefined, "heart"), 1200);
  fw2.auto = true;
  window.balloons?.();
  setTimeout(() => window.textBalloons?.([{ text: "YAY", fontSize: innerWidth < 600 ? 60 : 120, color: "#ff6b81" }]), 1200);
}

yesBtn.addEventListener("click", () => {
  askBox.hidden = true;
  noBtn.hidden = true;
  loader.hidden = false;
  gsap.from(loader, { opacity: 0, scale: 0.8, duration: 0.6, ease: "back.out(2)" });
  setTimeout(() => {
    loader.hidden = true;
    result.hidden = false;
    gsap.from(result.children, { opacity: 0, y: 40, scale: 0.85, duration: 1, ease: "back.out(1.8)", stagger: 0.15 });
    celebrate();
  }, 3000);
});

document.getElementById("replayBtn").addEventListener("click", () => location.reload());

/* ── Gate ── */
const gate = document.getElementById("gate");
document.body.classList.add("locked");
playReveal(gate.querySelector("[data-reveal]"), 0.2);

document.getElementById("openBtn").addEventListener("click", () => {
  gate.classList.add("is-gone");
  document.body.classList.remove("locked");
  playReveal(s0.querySelector("[data-reveal-intro]"), 0.4);
  fadeUp(s0.querySelectorAll("[data-intro-pop]"), 0.9);
  observeSections();
});

/* ── Section 0 · floating heart intro (css-doodle) ── */
const s0 = document.getElementById("s0");
prepReveal(s0.querySelector("[data-reveal-intro]"));

// Fireworks section: big opening volley the first time it is reached
let s1Shown = false;
function showFireworks() {
  if (s1Shown) return;
  s1Shown = true;
  fw.finale(7);
  playReveal(s1.querySelector("[data-reveal]"), 0.3);
  fadeUp(s1.querySelectorAll("[data-rv]"), 0.7);
}

// Preview helpers: ?open skips the gate, ?open&s=2 jumps to a section.
const qs = new URLSearchParams(location.search);
if (qs.has("open")) {
  document.getElementById("openBtn").click();
  const s = qs.get("s");
  if (s) document.getElementById("s" + s)?.scrollIntoView({ behavior: "instant" });
}

/* ── Run each effect only while its section is on screen ── */
function observeSections() {
  const dots = [...document.querySelectorAll(".dot")];
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        const id = en.target.id;
        if (id === "s0") s0.classList.toggle("is-on", en.isIntersecting);
        if (id === "s1") {
          en.isIntersecting ? fw.start() : fw.stop();
          if (en.intersectionRatio >= 0.5) showFireworks();
        }
        if (id === "s2") {
          if (en.intersectionRatio >= 0.5) lt.start();
          else if (!en.isIntersecting) lt.stop();
        }
        if (id === "s3" && en.intersectionRatio >= 0.5) showLove();
        if (id === "s5") {
          if (en.intersectionRatio >= 0.5) showAsk();
          if (!en.isIntersecting) fw2.stop();
          else if (!result.hidden) fw2.start();
        }
        if (id === "s4") {
          s4.classList.toggle("is-on", en.isIntersecting);
          if (en.intersectionRatio >= 0.5) showHeart();
        }
        if (en.intersectionRatio > 0.5) {
          dots.forEach((d) => d.classList.toggle("is-active", d.getAttribute("href") === "#" + id));
        }
      });
    },
    { threshold: [0, 0.5] }
  );
  document.querySelectorAll(".panel").forEach((p) => io.observe(p));
}
})();
