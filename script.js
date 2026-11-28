// ====== কনফিগ ======
const TOTAL = 10;                       // প্রতিবার কতগুলো প্রশ্ন
const DIR = "question practice/";       // JSON ফাইলের ফোল্ডার (index.html-এর সাপেক্ষে)

// বিষয়ের তালিকা: files = সম্ভাব্য ফাইলের নাম (প্রথম যেটা পাওয়া যাবে সেটা), en = ইংরেজি বিষয়
const SUBJECTS = [
  { id: "bangla", name: "বাংলা", files: ["bengali.json"] },
  { id: "english", name: "English", files: ["english.json"], en: true },
  { id: "math", name: "গণিত", files: ["math.json", "mathematics.json"] },
  { id: "physical_science", name: "ভৌতবিজ্ঞান", files: ["physical_science.json", "wbbse_physical_science_mcq_bn.json"] },
  { id: "life_science", name: "জীবনবিজ্ঞান", files: ["life_science.json", "wbbse_life_science_mcq_bn.json"] },
  { id: "history", name: "ইতিহাস", files: ["history.json"] },
  { id: "geography", name: "ভূগোল", files: ["geography.json"] },
];
const ICONS = {
  bangla: "M4 19V5.5A2.5 2.5 0 0 1 6.5 3H20v18H6.5A2.5 2.5 0 0 1 4 18.5M8 7h8M8 11h6",
  english: "m4 20 8-16 8 16M7.5 14h9",
  math: "M18 4H6l7 8-7 8h12",
  physical_science: "M9 3h6M10 3v6L4.5 19a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L14 9V3M7 15h10",
  life_science: "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10zM2 22c0-4 3-8 9-10",
  history: "M3 22h18M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 2 3 7h18z",
  geography: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20",
  all: "m12 2 10 5-10 5L2 7zM2 17l10 5 10-5M2 12l10 5 10-5",
};
const svg = (d) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;

const $ = (s) => document.querySelector(s);
const bn = (n) => n.toLocaleString("bn-IN");
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const state = { subject: null, bank: {}, qs: [], i: 0, score: 0, picks: [] };

// ====== থিম ======
$("#themeBtn").onclick = () => {
  const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem("pk-theme", t); } catch (e) {}
};

// ====== ভিউ বদল ======
function show(id) {
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === id));
  window.scrollTo(0, 0);
}
document.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => show(b.dataset.go)));

// ====== JSON → একই ফরম্যাটে (বিভিন্ন কী-নাম সামলায়) ======
function norm(raw) {
  const arr = Array.isArray(raw) ? raw : raw.questions || raw.data || raw.items || Object.values(raw).find(Array.isArray) || [];
  return arr.map((x) => {
    const q = x.question ?? x.q ?? x.text ?? x.title;
    let o = x.options ?? x.choices ?? x.answers ?? x.opts;
    if (o && !Array.isArray(o)) o = Object.values(o);
    if (!q || !Array.isArray(o) || o.length < 2) return null;
    let ans = -1;
    const opts = o.map((v, i) => {
      if (v && typeof v === "object") {
        if (v.correct === true || v.isCorrect === true || v.is_correct === true) ans = i;
        return String(v.text ?? v.option ?? v.label ?? v.value ?? v.answer ?? "");
      }
      return String(v);
    });
    if (ans < 0) {
      const a = x.answer ?? x.correct ?? x.correctAnswer ?? x.correct_answer ?? x.correctIndex;
      if (typeof a === "number") ans = a;
      else if (a != null) {
        const t = String(a).trim();
        ans = opts.findIndex((p) => p.trim() === t);
        if (ans < 0 && /^[a-dA-D]$/.test(t)) ans = "abcd".indexOf(t.toLowerCase());
      }
    }
    if (ans < 0 || ans >= opts.length) return null;
    return { q: String(q), options: opts, answer: ans, explain: x.explain ?? x.explanation ?? x.solution ?? "" };
  }).filter(Boolean);
}

async function loadSubject(s) {
  for (const f of s.files) {
    try {
      const r = await fetch(encodeURI(DIR + f));
      if (!r.ok) continue;
      const qs = norm(await r.json());
      if (qs.length) return qs.map((q) => ({ ...q, sub: s }));
    } catch (e) {}
  }
  return [];
}

// ====== সেটআপ: বিষয় বাছাই ======
function renderSubjects() {
  const box = $("#subjects");
  const total = SUBJECTS.reduce((n, s) => n + state.bank[s.id].length, 0);
  const items = [...SUBJECTS.map((s) => ({ id: s.id, name: s.name, ok: state.bank[s.id].length > 0, note: "শীঘ্রই আসছে" })),
    { id: "all", name: "সব বিষয় একসাথে", ok: total > 0, note: "সব বিষয় থেকে মিশিয়ে", wide: true }];
  box.replaceChildren();
  items.forEach((it) => {
    const b = document.createElement("button");
    b.className = "tile" + (it.wide ? " wide" : "") + (state.subject === it.id ? " on" : "");
    b.disabled = !it.ok;
    b.innerHTML = `<span class="ti">${svg(ICONS[it.id])}</span><span><span class="tn"></span><small></small></span>`;
    b.querySelector(".tn").textContent = it.name;
    const sm = b.querySelector("small");
    if (!it.ok) sm.textContent = it.note; else if (it.wide) sm.textContent = it.note; else sm.remove();
    b.onclick = () => { state.subject = it.id; renderSubjects(); };
    box.appendChild(b);
  });
  const btn = $("#startBtn"), cur = items.find((x) => x.id === state.subject);
  btn.disabled = !cur;
  btn.textContent = cur ? `শুরু করো: ${cur.name}` : "বিষয় বাছাই করো";
  if (!total) { $("#setupError").textContent = `কোনো প্রশ্নের ফাইল পাওয়া যায়নি। "${DIR}physical_science.json"-এর মতো ফাইল ঠিক জায়গায় আছে কিনা দেখো।`; $("#setupError").hidden = false; }
}
Promise.all(SUBJECTS.map(async (s) => (state.bank[s.id] = await loadSubject(s)))).then(renderSubjects);

// ====== শুরু ======
function start() {
  const pool = state.subject === "all" ? SUBJECTS.flatMap((s) => state.bank[s.id]) : state.bank[state.subject];
  const qs = shuffle(pool.slice()).slice(0, TOTAL);
  Object.assign(state, { qs, i: 0, score: 0, picks: [] });
  $("#segs").replaceChildren(...qs.map(() => document.createElement("i")));
  show("quiz");
  renderQ();
}
$("#startBtn").onclick = start;
$("#againBtn").onclick = () => show("setup");
$("#quitBtn").onclick = () => { if (confirm("প্র্যাকটিস বন্ধ করবে?")) show("home"); };

// ====== প্রশ্ন দেখানো ======
function renderQ() {
  const q = state.qs[state.i], en = !!q.sub.en;
  $("#counter").textContent = `${bn(state.i + 1)} / ${bn(state.qs.length)}`;
  [...$("#segs").children].forEach((s, n) => { if (n === state.i) s.className = "cur"; });
  $("#qCard").classList.toggle("en", en);
  $("#qCard").lang = en ? "en" : "bn";
  $("#qSubject").textContent = q.sub.name;
  $("#qText").textContent = q.q;
  $("#feedback").hidden = true;
  $("#nextBtn").hidden = true;
  const box = $("#options");
  box.replaceChildren();
  q.options.forEach((opt, idx) => {
    const b = document.createElement("button");
    b.className = "option";
    b.innerHTML = '<span class="key"></span><span class="otext"></span><span class="mark"></span>';
    b.children[0].textContent = (en ? "ABCD" : "কখগঘ")[idx] || idx + 1;
    b.children[1].textContent = opt;
    b.onclick = () => pick(idx);
    box.appendChild(b);
  });
}

function pick(idx) {
  const q = state.qs[state.i], right = idx === q.answer;
  state.picks.push(idx);
  if (right) state.score++;
  $("#segs").children[state.i].className = right ? "ok" : "no";
  [...$("#options").children].forEach((b, n) => {
    b.disabled = true;
    if (n === q.answer) b.classList.add("is-correct");
    else if (n === idx) b.classList.add("is-wrong");
    else b.classList.add("dim");
  });
  const f = $("#feedback");
  f.className = "feedback " + (right ? "ok" : "no");
  f.replaceChildren();
  const h = document.createElement("b");
  h.textContent = right ? "সঠিক উত্তর!" : `ভুল হয়েছে। সঠিক উত্তর: ${q.options[q.answer]}`;
  f.appendChild(h);
  if (q.explain) { const e = document.createElement("span"); e.className = "ex"; e.textContent = q.explain; f.appendChild(e); }
  f.hidden = false;
  $("#nextBtn").textContent = state.i === state.qs.length - 1 ? "রেজাল্ট দেখো" : "পরবর্তী";
  $("#nextBtn").hidden = false;
  $("#nextBtn").scrollIntoView({ block: "nearest", behavior: "smooth" });
}

$("#nextBtn").onclick = () => {
  if (state.i < state.qs.length - 1) { state.i++; renderQ(); window.scrollTo(0, 0); }
  else showResult();
};

// ====== রেজাল্ট ======
function showResult() {
  const n = state.qs.length, s = state.score, f = s / n, pct = Math.round(f * 100);
  const ring = $("#ring");
  ring.className = "ring" + (f >= 0.8 ? " win" : f < 0.5 ? " low" : "");
  $("#score").textContent = bn(s);
  $("#total").textContent = `/ ${bn(n)}`;
  $("#stOk").textContent = bn(s);
  $("#stNo").textContent = bn(n - s);
  $("#stPct").textContent = bn(pct) + "%";
  $("#resultMsg").textContent = f >= 0.8 ? "দারুণ! তুমি তৈরি" : f >= 0.5 ? "ভালো হয়েছে, আরেকটু প্র্যাকটিস করো" : "চিন্তা নেই, আবার চেষ্টা করো";
  $("#resultSub").textContent = state.subject === "all" ? "সব বিষয়" : SUBJECTS.find((x) => x.id === state.subject).name;
  const ul = $("#review");
  ul.replaceChildren();
  state.qs.forEach((q, i) => {
    const ok = state.picks[i] === q.answer;
    const li = document.createElement("li");
    li.className = ok ? "" : "bad";
    const a = document.createElement("div"); a.className = "q"; a.textContent = `${bn(i + 1)}. ${q.q}`;
    li.appendChild(a);
    if (!ok) { const w = document.createElement("div"); w.className = "wrong"; w.textContent = `তোমার উত্তর: ${q.options[state.picks[i]]}`; li.appendChild(w); }
    const r = document.createElement("div"); r.className = "right"; r.textContent = `সঠিক: ${q.options[q.answer]}`;
    li.appendChild(r);
    ul.appendChild(li);
  });
  show("result");
  const arc = $("#arc");
  arc.style.strokeDashoffset = 327;
  requestAnimationFrame(() => requestAnimationFrame(() => (arc.style.strokeDashoffset = 327 * (1 - f))));
}
