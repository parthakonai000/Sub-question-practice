// ====== কনফিগ ======
const TOTAL = 10;

const $ = (s) => document.querySelector(s);
const state = { subject: "all", qs: [], i: 0, score: 0, picks: [] };

// ====== ভিউ বদল ======
function show(id) {
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === id));
  window.scrollTo(0, 0);
}
document.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => show(b.dataset.go)));

// ====== সেটআপ: বিষয় বাছাই (প্রশ্নের ফাইল না থাকলে বিষয়টা বন্ধ দেখায়) ======
function chips(box, items, isOn, isOff, onPick) {
  box.replaceChildren();
  items.forEach((it) => {
    const b = document.createElement("button");
    b.className = "chip" + (isOn(it) ? " on" : "");
    b.textContent = it.text;
    b.disabled = isOff(it);
    b.onclick = () => { onPick(it); chips(box, items, isOn, isOff, onPick); };
    box.appendChild(b);
  });
}
$("#startBtn").disabled = true;
QB.load().then(() => {
  state.subject = QB.SUBJECTS.find((s) => QB.has(s.id))?.id || "all";
  chips($("#subjects"), QB.choices(), (s) => s.id === state.subject, (s) => !QB.has(s.id), (s) => (state.subject = s.id));
  if (QB.has("all")) $("#startBtn").disabled = false;
  else { $("#setupError").textContent = "কোনো প্রশ্নের ফাইল পাওয়া যায়নি। physical_science.json-এর মতো ফাইল index.html-এর পাশে রাখো।"; $("#setupError").hidden = false; }
});

// ====== শুরু: ফাইল থেকে র‍্যান্ডম ১০টা প্রশ্ন ======
function start() {
  $("#setupError").hidden = true;
  const qs = QB.pick(state.subject, TOTAL);
  if (!qs.length) { $("#setupError").textContent = "এই বিষয়ের প্রশ্ন এখনো যোগ করা হয়নি।"; $("#setupError").hidden = false; return; }
  Object.assign(state, { qs, i: 0, score: 0, picks: [] });
  show("quiz");
  renderQ();
}
$("#startBtn").onclick = start;
$("#againBtn").onclick = () => show("setup");
$("#quitBtn").onclick = () => { if (confirm("প্র্যাকটিস বন্ধ করবে?")) show("home"); };

// ====== প্রশ্ন দেখানো ======
function renderQ() {
  const q = state.qs[state.i];
  $("#counter").textContent = `${state.i + 1} / ${state.qs.length}`;
  $("#barFill").style.width = (state.i / state.qs.length) * 100 + "%";
  $("#qText").textContent = q.q;
  $("#explain").hidden = true;
  $("#nextBtn").hidden = true;
  const box = $("#options");
  box.replaceChildren();
  q.options.forEach((opt, idx) => {
    const b = document.createElement("button");
    b.className = "choice";
    const k = document.createElement("span");
    k.className = "k";
    k.textContent = "ক খ গ ঘ"[idx * 2];
    const t = document.createElement("span");
    t.textContent = opt;
    b.append(k, t);
    b.onclick = () => pick(idx);
    box.appendChild(b);
  });
}

function pick(idx) {
  const q = state.qs[state.i];
  state.picks.push(idx);
  if (idx === q.answer) state.score++;
  [...$("#options").children].forEach((b, n) => {
    b.disabled = true;
    if (n === q.answer) b.classList.add("ok");
    else if (n === idx) b.classList.add("bad");
  });
  if (q.explain) { $("#explain").textContent = q.explain; $("#explain").hidden = false; }
  const last = state.i === state.qs.length - 1;
  $("#nextBtn").textContent = last ? "রেজাল্ট দেখো" : "পরবর্তী";
  $("#nextBtn").hidden = false;
}

$("#nextBtn").onclick = () => {
  if (state.i < state.qs.length - 1) { state.i++; renderQ(); }
  else showResult();
};

// ====== রেজাল্ট ======
function showResult() {
  const n = state.qs.length, s = state.score, pct = s / n;
  $("#scoreStamp").textContent = `${s}/${n}`;
  $("#resultMsg").textContent = pct >= 0.8 ? "দারুণ! তুমি তৈরি 🎉" : pct >= 0.5 ? "ভালো হয়েছে, আরেকটু প্র্যাকটিস করো" : "চিন্তা নেই, আবার চেষ্টা করো 💪";
  $("#resultSub").textContent = `${state.subject} · সঠিক ${s}টি, ভুল ${n - s}টি`;
  const box = $("#review");
  box.replaceChildren();
  state.qs.forEach((q, i) => {
    const right = state.picks[i] === q.answer;
    const d = document.createElement("div");
    d.className = "rv " + (right ? "ok" : "bad");
    const p = document.createElement("div");
    p.textContent = `${i + 1}. ${q.q}`;
    const a = document.createElement("small");
    a.textContent = right ? `✔ ${q.options[q.answer]}` : `✘ তোমার উত্তর: ${q.options[state.picks[i]]} · সঠিক: ${q.options[q.answer]}`;
    d.append(p, a);
    box.appendChild(d);
  });
  show("result");
}
