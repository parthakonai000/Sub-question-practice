// প্রশ্নের ভাণ্ডার: প্রতিটা বিষয়ের প্রশ্ন সাইটের রুটে আলাদা JSON ফাইলে থাকে (index.html-এর পাশে)।
// ফাইলের ফরম্যাট (প্রতিটা প্রশ্নে ঠিক ৪টা option, একটাই correct):
//   [ { "question": "...", "options": [ { "text": "...", "correct": false }, ... ] } ]
// চাইলে প্রশ্নে "explanation": "..." দিতে পারো, উত্তরের পর সেটা দেখাবে।
window.QB = (() => {
  const SUBJECTS = [
    { id: "bengali", label: "বাংলা", file: "bengali.json" },
    { id: "english", label: "English", file: "english.json" },
    { id: "math", label: "গণিত", file: "math.json" },
    { id: "physical_science", label: "ভৌতবিজ্ঞান", file: "physical_science.json" },
    { id: "life_science", label: "জীবনবিজ্ঞান", file: "life_science.json" },
    { id: "history", label: "ইতিহাস", file: "history.json" },
    { id: "geography", label: "ভূগোল", file: "geography.json" },
  ];
  const ALL = { id: "all", label: "সব বিষয় (মিশ্র)" };
  const bank = {};
  let loading = null;

  function normalize(raw) {
    const list = Array.isArray(raw) ? raw : raw?.questions || [];
    const out = [];
    for (const it of list) {
      const q = String(it?.question ?? it?.q ?? "").trim();
      const opts = Array.isArray(it?.options) ? it.options : [];
      if (!q || opts.length !== 4) continue;
      const texts = opts.map((o) => String(typeof o === "string" ? o : o?.text ?? "").trim());
      const flagged = opts.map((o, i) => (o && o.correct === true ? i : -1)).filter((i) => i >= 0);
      const answer = flagged.length === 1 ? flagged[0] : Number.isInteger(it.answer) ? it.answer : -1;
      if (answer < 0 || answer > 3 || texts.some((t) => !t)) continue;
      out.push({ q, options: texts, answer, explain: String(it.explanation ?? it.explain ?? "").trim() });
    }
    return out;
  }

  // সব বিষয়ের ফাইল একসাথে আনে; যে ফাইল নেই সেই বিষয় খালি থাকে।
  function load() {
    if (!loading) {
      loading = Promise.all(SUBJECTS.map(async (s) => {
        try {
          const res = await fetch(s.file, { cache: "no-cache" });
          if (!res.ok) throw new Error(res.status);
          bank[s.id] = normalize(await res.json());
        } catch (e) { bank[s.id] = []; }
      }));
    }
    return loading;
  }

  const count = (id) => (id === ALL.id ? SUBJECTS.reduce((n, s) => n + (bank[s.id]?.length || 0), 0) : bank[id]?.length || 0);
  const has = (id) => count(id) > 0;
  const label = (id) => (id === ALL.id ? ALL : SUBJECTS.find((s) => s.id === id))?.label || id;
  const choices = () => [...SUBJECTS, ALL].map((c) => ({ ...c, text: c.label + (has(c.id) ? ` · ${count(c.id)}` : "") }));

  // ফাইলের যেকোনো জায়গা থেকে র‍্যান্ডম n টা (একই প্রশ্ন দুবার আসে না); "all" হলে সব বিষয় মিশিয়ে
  function pick(id, n) {
    const pool = id === ALL.id ? SUBJECTS.flatMap((s) => bank[s.id] || []) : [...(bank[id] || [])];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, n);
  }

  return { SUBJECTS, ALL, load, has, count, label, choices, pick };
})();
