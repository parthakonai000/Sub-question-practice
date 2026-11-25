/* =====================================================================
 Play with Friends — real-time 2 to 4 player Madhyamik quiz + WebRTC Voice Chat
 Firebase Realtime Database + Anonymous Auth (Web SDK v10, modular)
 ===================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, get, set, update, remove, push, onValue, onChildAdded, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ---------- 1. Config (paste YOUR Firebase config here) ----------
const firebaseConfig = {
apiKey: "AIzaSyDLJrsQpEiyZ4M_5AQ08vW1aAWjDdW4UU0",
authDomain: "group-verb-with-friends.firebaseapp.com",
databaseURL: "https://group-verb-with-friends-default-rtdb.firebaseio.com",
projectId: "group-verb-with-friends",
appId: "1:129201173122:web:9ff625333ab94942493a9b"
};

const TOTAL      = 10;
const NAME_KEY   = "pk_username";
const THEME_KEY  = "pk_theme";
const SEATS      = ["player1", "player2", "player3", "player4"];
const SIDES      = ["me", "opp", "opp2", "opp3"];

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getDatabase(app);

// ---------- 2. Small helpers ----------
const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};
const ICONS = {
  crown:  '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-1.6 10.2a1 1 0 0 1-1 .8H5.6a1 1 0 0 1-1-.8L3 8z" fill="currentColor" stroke="none"/>',
  check:  '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x:      '<path d="M6 6l12 12M18 6L6 18"/>',
  plus:   '<circle cx="10" cy="8" r="3.6"/><path d="M3.5 20a6.5 6.5 0 0 1 13 0"/><path d="M19 7.5v6M16 10.5h6"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4"/><path d="M12 13v4M8.5 20h7M10 17h4"/>',
  flag:   '<path d="M6 21V4M6 5h11l-2.5 4 2.5 4H6"/>',
  rings:  '<circle cx="9" cy="12" r="5"/><circle cx="15" cy="12" r="5"/>',
  link:   '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  replay: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4.5V9h-4.5"/>',
  share:  '<circle cx="6" cy="12" r="2.5"/><circle cx="17.5" cy="6" r="2.5"/><circle cx="17.5" cy="18" r="2.5"/><path d="M8.2 10.8l7-3.6M8.2 13.2l7 3.6"/>'
};
const icon = (name, size = 18) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

const segmenter = (typeof Intl !== "undefined" && Intl.Segmenter) ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
function initial(name) {
  const s = String(name || "").trim();
  if (!s) return "?";
  const first = segmenter ? [...segmenter.segment(s)][0].segment : Array.from(s)[0];
  return first.toUpperCase();
}
function makeAvatar(name, side, size, host) {
  const a = el("span", `avatar ${side} ${size || ""}`.trim(), initial(name));
  a.setAttribute("aria-hidden", "true");
  if (host) {
    const b = el("span", "host-badge");
    b.innerHTML = icon("crown", 15);
    b.title = "Host";
    a.appendChild(b);
  }
  return a;
}

let toastTimer;
function toast(msg, kind = "") {
  const t = $("toast");
  t.textContent = msg;
  t.className = "toast show " + kind;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 4200);
}
const showError = (msg) => toast(msg, "err");

// ---------- 3. Theme ----------
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]').content = t === "dark" ? "#0F1733" : "#EFF4FC";
}
applyTheme(document.documentElement.dataset.theme);
$("btn-theme").onclick = () => {
  const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(t);
  try { localStorage.setItem(THEME_KEY, t); } catch {}
};

function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; };
}

// ---------- 4. Questions from the JSON files (questions.js) ----------
function pickQuestions(subject) {
  const qs = QB.pick(QB.has(subject) ? subject : "all", TOTAL).map((q) => ({
    q: q.q.slice(0, 400), options: q.options.map((o) => o.slice(0, 200)), answer: q.answer, explain: (q.explain || "").slice(0, 400)
  }));
  if (!qs.length) throw new Error("No questions found for this subject yet.");
  return qs;
}
const asList = (x) => (Array.isArray(x) ? x : Object.keys(x || {}).sort((a, b) => a - b).map((k) => x[k]));
const toQs = (raw) => asList(raw).filter(Boolean).map((q) => ({ ...q, options: asList(q.options) }));

// Subject picker: question count removed (only shows "Coming soon" if unavailable)
function renderTiles(box, getSel, onPick) {
  box.replaceChildren();
  QB.choices().forEach((c) => {
    const ok = QB.has(c.id), on = c.id === getSel();
    const b = el("button", "tile" + (c.id === "all" ? " all" : "") + (on ? " on" : ""));
    b.type = "button"; b.disabled = !ok;
    b.setAttribute("aria-pressed", on ? "true" : "false");
    b.append(el("span", "tn", c.label));
    if (!ok) b.append(el("span", "tc", "Coming soon"));
    b.onclick = () => { onPick(c.id); renderTiles(box, getSel, onPick); };
    box.appendChild(b);
  });
}

// ---------- 4b. Free WebRTC Mesh Voice Chat (2-4 players) ----------
const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ]
};
let localStream = null;
let micMuted = false;
let voicePeers = {};       // { [peerSeat]: { pc, unsubs: [], audioEl } }
let voiceSession = 0;

function updateMicUI() {
  const btn = $("btn-mic");
  if (!btn) return;
  const isMuted = !localStream || micMuted;
  btn.classList.toggle("muted", isMuted);
  btn.setAttribute("aria-pressed", isMuted ? "true" : "false");
}

async function initVoice() {
  const btn = $("btn-mic");
  if (btn) btn.classList.remove("hidden");
  if (localStream) {
    localStream.getAudioTracks().forEach((t) => (t.enabled = !micMuted));
    updateMicUI();
    return true;
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    micMuted = true;
    updateMicUI();
    return false;
  }
  const vs = voiceSession;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false
    });
    if (vs !== voiceSession) {
      stream.getTracks().forEach((t) => t.stop());
      return false;
    }
    localStream = stream;
    micMuted = false; // Default ON after permission
    localStream.getAudioTracks().forEach((t) => (t.enabled = true));
    updateMicUI();

    // Add tracks to any already-initialized peers
    Object.keys(voicePeers).forEach((seat) => {
      const p = voicePeers[seat];
      if (p && p.pc && !p.tracksAdded) {
        localStream.getTracks().forEach((t) => p.pc.addTrack(t, localStream));
        p.tracksAdded = true;
      }
    });
    if (lastRoom?.players) syncVoicePeers(lastRoom.players);
    return true;
  } catch (err) {
    console.warn("Mic permission denied or unavailable:", err);
    micMuted = true;
    updateMicUI();
    toast("Mic permission off. Tap the mic icon to enable voice.");
    return false;
  }
}

async function toggleMic() {
  if (!localStream) {
    await initVoice();
    return;
  }
  micMuted = !micMuted;
  localStream.getAudioTracks().forEach((t) => (t.enabled = !micMuted));
  updateMicUI();
}

function syncVoicePeers(players) {
  if (!roomCode || !myRole || !players) return;
  const activeOthers = seatsOf(players).filter((s) => s !== myRole);

  // Close peers who left
  for (const seat of Object.keys(voicePeers)) {
    if (!activeOthers.includes(seat)) closeVoicePeer(seat);
  }
  // Connect to new peers
  for (const seat of activeOthers) {
    if (!voicePeers[seat]) connectVoicePeer(seat);
  }
}

async function connectVoicePeer(peerSeat) {
  if (!roomCode || !myRole || voicePeers[peerSeat]) return;
  const vs = voiceSession;
  const isCaller = myRole < peerSeat;
  const pairId = isCaller ? `${myRole}_${peerSeat}` : `${peerSeat}_${myRole}`;
  const basePath = `Rooms/${roomCode}/voice/${pairId}`;

  const pc = new RTCPeerConnection(RTC_CONFIG);
  const audioEl = document.createElement("audio");
  audioEl.autoplay = true;
  audioEl.playsInline = true;
  $("voice-audios").appendChild(audioEl);

  const peerObj = { pc, unsubs: [], audioEl, tracksAdded: false, answered: false, offered: false };
  voicePeers[peerSeat] = peerObj;

  if (localStream) {
    localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
    peerObj.tracksAdded = true;
  }

  pc.ontrack = (e) => {
    if (e.streams && e.streams[0]) {
      audioEl.srcObject = e.streams[0];
      audioEl.play().catch(() => {});
    }
  };

  const myIcePath = `${basePath}/${isCaller ? "callerIce" : "calleeIce"}`;
  const remoteIcePath = `${basePath}/${isCaller ? "calleeIce" : "callerIce"}`;

  pc.onicecandidate = (e) => {
    if (e.candidate && vs === voiceSession && roomCode) {
      push(ref(db, myIcePath), e.candidate.toJSON()).catch(() => {});
    }
  };

  // Listen for remote ICE candidates
  const unsubIce = onChildAdded(ref(db, remoteIcePath), (snap) => {
    const c = snap.val();
    if (c && pc.remoteDescription) {
      pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
    } else if (c) {
      peerObj.pendingIce = peerObj.pendingIce || [];
      peerObj.pendingIce.push(c);
    }
  });
  peerObj.unsubs.push(unsubIce);

  const flushIce = () => {
    if (!peerObj.pendingIce) return;
    for (const c of peerObj.pendingIce) {
      pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
    }
    peerObj.pendingIce = [];
  };

  if (isCaller) {
    try {
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      if (vs !== voiceSession) return;
      await pc.setLocalDescription(offer);
      await set(ref(db, `${basePath}/offer`), { type: offer.type, sdp: offer.sdp });

      const unsubAns = onValue(ref(db, `${basePath}/answer`), async (snap) => {
        const ans = snap.val();
        if (ans && !peerObj.answered && pc.signalingState === "have-local-offer") {
          peerObj.answered = true;
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(ans));
            flushIce();
          } catch {}
        }
      });
      peerObj.unsubs.push(unsubAns);
    } catch (err) { console.warn("WebRTC offer error:", err); }
  } else {
    const unsubOff = onValue(ref(db, `${basePath}/offer`), async (snap) => {
      const off = snap.val();
      if (off && !peerObj.offered && pc.signalingState === "stable") {
        peerObj.offered = true;
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(off));
          flushIce();
          const answer = await pc.createAnswer();
          if (vs !== voiceSession) return;
          await pc.setLocalDescription(answer);
          await set(ref(db, `${basePath}/answer`), { type: answer.type, sdp: answer.sdp });
        } catch (err) { console.warn("WebRTC answer error:", err); }
      }
    });
    peerObj.unsubs.push(unsubOff);
  }
}

function closeVoicePeer(seat) {
  const p = voicePeers[seat];
  if (!p) return;
  p.unsubs.forEach((u) => u());
  try { p.pc.close(); } catch {}
  try { p.audioEl.srcObject = null; p.audioEl.remove(); } catch {}
  delete voicePeers[seat];
}

function stopVoice() {
  voiceSession++;
  Object.keys(voicePeers).forEach(closeVoicePeer);
  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop());
    localStream = null;
  }
  micMuted = false;
  const btn = $("btn-mic");
  if (btn) btn.classList.add("hidden");
}

// ---------- 5. App state ----------
let myUid = null, myName = "", myRole = null, roomCode = null;
let unsubscribe = null;
let questions = [], answers = [];
let currentQ = 0, myScore = 0;
let locked = false, pendingFeedback = false;
let gameStarted = false;
let currentState = "lobby";
let lastRoom = null;
let session = 0;
let ready = false;
let seatKeys = {};
let lastScores = {};
let gen = false, genErr = "", lastSeatCount = 0, raceKey = "", seenSubject = null;
const pickSel = { subject: "all" };
const seatsOf = (players) => SEATS.filter((s) => players && players[s]);
const sideOf = (seat) => seat === myRole ? "me" : SIDES[1 + SEATS.filter((s) => s !== myRole).indexOf(seat)];
let round = 1;
let moving = false;
let nextWatchers = [], nextCtx = null;

function showState(name) {
  currentState = name;
  for (const s of ["lobby", "waiting", "game", "result"]) $("state-" + s).classList.toggle("hidden", s !== name);
  window.scrollTo({ top: 0 });
}

// ---------- 6. Lobby UI ----------
const cells = [...document.querySelectorAll(".cell")];
function paintCells(v) {
  cells.forEach((c, i) => { c.textContent = v[i] || ""; c.classList.toggle("active", i === Math.min(v.length, 3)); });
}
function updateButtons() {
  const code = $("input-code").value;
  $("btn-create").disabled = !ready;
  $("btn-join").disabled = !(ready && /^\d{4}$/.test(code));
}
function paintLobbyAvatar() {
  const a = $("lobby-avatar");
  a.textContent = initial($("input-name").value);
}
function readName() {
  const v = $("input-name").value.trim().slice(0, 20);
  if (!v) { showError("Type your name first."); $("input-name").focus(); return null; }
  myName = v;
  try { localStorage.setItem(NAME_KEY, v); } catch {}
  return v;
}

function renderRoomCode(code) {
  const box = $("room-code");
  box.innerHTML = "";
  for (const d of code) box.appendChild(el("span", "code-tile", d));
  box.setAttribute("aria-label", "Room code " + code.split("").join(" "));
}

// ---------- 7. Startup ----------
async function init() {
  let saved = "";
  try { saved = (localStorage.getItem(NAME_KEY) || "").trim().slice(0, 20); } catch {}
  $("input-name").value = saved;
  paintLobbyAvatar(); paintCells("");

  $("btn-mic").onclick = toggleMic;

  $("input-name").addEventListener("input", paintLobbyAvatar);
  $("input-name").addEventListener("keydown", (e) => { if (e.key === "Enter") $("input-code").value.length === 4 ? $("btn-join").click() : $("input-code").focus(); });
  $("input-code").addEventListener("input", (e) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 4);
    e.target.value = v; paintCells(v); updateButtons();
  });
  $("input-code").addEventListener("keydown", (e) => { if (e.key === "Enter" && !$("btn-join").disabled) $("btn-join").click(); });

  $("btn-create").onclick = createRoom;
  $("btn-join").onclick   = () => joinRoom($("input-code").value);
  $("btn-share").onclick  = copyInviteLink;
  $("btn-native-share").onclick = shareInvite;
  $("btn-cancel").onclick = leaveRoom;
  $("btn-leave").onclick  = () => { if (confirm("Leave this match?")) leaveRoom(); };
  $("btn-back").onclick   = leaveRoom;
  $("btn-next").onclick   = openNextRoundPicker;
  paintNextBtn(false);

  $("btn-share").innerHTML = icon("link") + "<span>Copy invite link</span>";
  if (navigator.share) {
    $("btn-native-share").innerHTML = icon("share") + "<span>Share</span>";
    $("btn-native-share").classList.remove("hidden");
    $("share-row").classList.add("two");
  }

  document.addEventListener("keydown", (e) => {
    if (currentState !== "game" || locked || $("q-area").classList.contains("hidden")) return;
    if (/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || "")) return;
    const i = ["1", "2", "3", "4"].indexOf(e.key);
    if (i > -1) handleAnswer(i);
  });

  await QB.load();
  pickSel.subject = QB.SUBJECTS.find((s) => QB.has(s.id))?.id || "all";
  renderTiles($("subjects"), () => pickSel.subject, (id) => (pickSel.subject = id));
  $("btn-start").onclick = startGame;
  $("btn-retry").onclick = () => { genErr = ""; if (lastRoom) showWaiting(lastRoom); };
  $("btn-subject").onclick = openEditSubject;
  $("modal-ok").onclick = () => { const f = modalOnOk, id = modalSel; closeModal(); if (f && id) f(id); };
  $("modal-cancel").onclick = closeModal;
  $("modal").addEventListener("click", (e) => { if (e.target === $("modal")) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("modal").classList.contains("hidden")) closeModal(); });

  const note = $("load-note");
  if (!(await signIn())) { note.textContent = "Could not connect. Check your Firebase config and that Anonymous sign-in is enabled."; note.classList.add("err"); }
  else { note.textContent = ""; ready = true; }
  updateButtons();
  if (!ready) return;

  const codeFromUrl = (new URLSearchParams(location.search).get("room") || "").trim();
  if (/^\d{4}$/.test(codeFromUrl)) {
    if ($("input-name").value.trim()) joinRoom(codeFromUrl);
    else {
      $("input-code").value = codeFromUrl; paintCells(codeFromUrl); updateButtons();
      $("invite-code").textContent = codeFromUrl;
      $("invite-banner").classList.remove("hidden");
      $("state-lobby").classList.add("invited");
      $("input-name").focus();
    }
  }
}

async function signIn() {
  try { myUid = (await signInAnonymously(auth)).user.uid; return true; }
  catch (err) { console.error(err); return false; }
}

// ---------- 8. Create / join ----------
const newPlayer = (seat) => ({
  name: myName, uid: myUid, score: 0, answered: 0, finished: false,
  ...(seat && seat !== "player1" ? { joinedAt: serverTimestamp() } : {})
});

async function createRoom() {
  if (!ready || !readName()) return;
  if (!QB.has(pickSel.subject)) return showError("No questions found. Add the subject's .json file next to friends.html.");
  $("btn-create").disabled = true;
  try {
    let code, tries = 0, taken = true;
    while (taken && tries < 10) {
      code = String(Math.floor(1000 + Math.random() * 9000));
      taken = (await get(ref(db, `Rooms/${code}`))).exists();
      tries++;
    }
    if (taken) throw new Error("no free code");
    await set(ref(db, `Rooms/${code}`), { createdAt: serverTimestamp(), subject: pickSel.subject, players: { player1: newPlayer("player1") } });
    try { sessionStorage.removeItem("pk_round_" + code); } catch {}
    enterRoom(code, "player1");
  } catch (err) {
    console.error(err);
    showError("Could not create the room. Please try again.");
  }
  updateButtons();
}

async function joinRoom(rawCode) {
  if (!ready || !readName()) return;
  const code = String(rawCode).trim();
  const fail = (msg) => { showError(msg); history.replaceState(null, "", location.pathname); updateButtons(); };
  if (!/^\d{4}$/.test(code)) return fail("Enter a valid 4-digit code.");

  $("btn-join").disabled = true;
  try {
    const snap = await get(ref(db, `Rooms/${code}`));
    if (!snap.exists()) return fail("Room not found. Check the code.");
    const v = snap.val(), players = v.players || {};

    const mine = SEATS.find((s) => players[s]?.uid === myUid);
    if (mine) return enterRoom(code, mine);
    if (v.startedAt) return fail("This match has already started.");

    for (const s of SEATS.slice(1)) {
      if (players[s]) continue;
      try {
        await set(ref(db, `Rooms/${code}/players/${s}`), newPlayer(s));
        try { sessionStorage.removeItem("pk_round_" + code); } catch {}
        return enterRoom(code, s);
      } catch {}
    }
    fail("This room is full (4 players).");
  } catch (err) {
    console.error(err);
    fail("Could not join. The room may have just filled up.");
  }
}

function enterRoom(code, role) {
  roomCode = code; myRole = role; gameStarted = false; lastRoom = null;
  seatKeys = {}; gen = false; genErr = ""; lastSeatCount = 0; raceKey = ""; seenSubject = null; closeModal();
  try { round = Number(sessionStorage.getItem("pk_round_" + code)) || 1; } catch { round = 1; }
  renderRoomCode(code);
  history.replaceState(null, "", `?room=${code}`);

  // Start Voice Chat automatically on entering room
  initVoice();

  unsubscribe = onValue(
    ref(db, `Rooms/${code}`),
    (snap) => renderRoom(snap.val()),
    (err) => { console.error(err); showError("Lost connection to the room."); resetToLobby(); }
  );
}

const inviteLink = () => `${location.origin}${location.pathname}?room=${roomCode}`;

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    try {
      const ta = el("textarea"); ta.value = text; ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand("copy"); ta.remove(); return ok;
    } catch { return false; }
  }
}
async function copyInviteLink() {
  const ok = await copyText(inviteLink());
  if (!ok) return toast("Copy this link: " + inviteLink());
  const b = $("btn-share");
  b.innerHTML = icon("check") + "<span>Link copied</span>";
  setTimeout(() => (b.innerHTML = icon("link") + "<span>Copy invite link</span>"), 2000);
}
async function shareInvite() {
  try { await navigator.share({ title: "P. K PRACTICE", text: `Join my Madhyamik quiz match. Room code: ${roomCode}`, url: inviteLink() }); }
  catch (err) { if (err && err.name !== "AbortError") copyInviteLink(); }
}

function resetToLobby() {
  session++;
  stopVoice();
  stopWatchingNext(); moving = false; round = 1;
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  roomCode = null; myRole = null; gameStarted = false; lastRoom = null;
  seatKeys = {}; gen = false; genErr = ""; lastSeatCount = 0; raceKey = ""; seenSubject = null; closeModal();
  $("input-code").value = ""; paintCells(""); updateButtons();
  $("state-lobby").classList.remove("invited"); $("invite-banner").classList.add("hidden");
  history.replaceState(null, "", location.pathname);
  showState("lobby");
}

async function leaveRoom() {
  const code = roomCode, role = myRole, st = currentState;
  resetToLobby();
  if (!code) return;
  try {
    if (role === "player1") await remove(ref(db, `Rooms/${code}`));
    else if (role && st !== "result") await remove(ref(db, `Rooms/${code}/players/${role}`));
  } catch (err) { console.error(err); }
}

// ---------- 9. Real-time handler ----------
function renderRoom(room) {
  if (!room || !room.players || !room.players.player1) {
    if (currentState !== "result") { showError("The room was closed."); resetToLobby(); }
    return;
  }
  lastRoom = room;
  syncVoicePeers(room.players);

  if (currentState === "result") return;

  const players = room.players, seats = seatsOf(players);
  if (!players[myRole]) { showError("You are no longer in this room."); resetToLobby(); return; }

  if (!room.startedAt) { showWaiting(room); return; }
  if (!gameStarted) {
    if (!room.questions) return;
    gameStarted = true; beginMatch(room);
  }
  if (seats.length < lastSeatCount) toast("A player left the match.");
  lastSeatCount = seats.length;

  renderScoreboard(players);
  if (seats.every((s) => players[s].finished) && !pendingFeedback && currentState === "game") showResult(players);
}

// ---------- 10. Room screen ----------
function paintSeat(node, i, player, seat) {
  const side = SIDES[i];
  const key = player ? `${player.uid}|${player.name}|${seat}` : "empty";
  if (seatKeys[i] === key) return;
  const wasEmpty = seatKeys[i] === "empty";
  seatKeys[i] = key;

  node.className = `seat ${side}` + (player ? (wasEmpty ? " joined" : "") : " empty");
  node.replaceChildren();
  if (!player) {
    const a = el("span", "avatar xl unknown"); a.innerHTML = icon("plus", 38); a.setAttribute("aria-hidden", "true");
    node.append(a, el("p", "seat-name", "Empty seat"), el("p", "seat-sub", "Share the code to invite a friend"));
    return;
  }
  const pills = el("div", "seat-pills");
  pills.appendChild(el("span", "pill " + (side === "me" ? "" : side), side === "me" ? "You" : "Friend"));
  if (seat === "player1") { const h = el("span", "pill host"); h.innerHTML = icon("crown", 12) + "<span>Host</span>"; pills.appendChild(h); }
  node.append(makeAvatar(player.name, side, "xl", seat === "player1"), el("p", "seat-name", player.name), pills);
}
function paintSeats(players) {
  const box = $("seats");
  if (box.children.length !== 4) { box.replaceChildren(); for (let i = 0; i < 4; i++) box.appendChild(el("div", "seat empty")); seatKeys = {}; }
  [myRole, ...SEATS.filter((s) => s !== myRole)].forEach((seat, i) => paintSeat(box.children[i], i, players[seat] || null, seat));
}

function showWaiting(room) {
  showState("waiting");
  const players = room.players, seats = seatsOf(players), n = seats.length;
  paintSeats(players);
  const subj = room.subject || "all";
  $("subject-name").textContent = QB.label(subj);
  $("btn-subject").classList.toggle("hidden", myRole !== "player1");
  if (seenSubject && seenSubject !== subj && myRole !== "player1") toast(`Subject changed to ${QB.label(subj)}.`);
  seenSubject = subj;
  $("share-row").classList.toggle("hidden", n >= 4);
  $("countdown").classList.add("hidden");
  $("btn-start").classList.remove("hidden");
  $("btn-cancel").textContent = myRole === "player1" ? "Cancel room" : "Leave room";

  const maker = seats[0] === myRole;
  const status = $("room-status"); status.classList.remove("hidden");
  const dots = '<span class="dots"><span>.</span><span>.</span><span>.</span></span>';
  if (n < 2) status.innerHTML = "Waiting for friends" + dots;
  else if (!room.questions) { if (genErr && maker) status.textContent = genErr; else status.innerHTML = "Getting the questions ready" + dots; }
  else status.textContent = `${n} players in. Anyone can press Start.`;
  $("btn-retry").classList.toggle("hidden", !(genErr && maker && !room.questions));
  $("btn-start").disabled = !(n >= 2 && room.questions);
  maybeGenerate(room);
}

async function maybeGenerate(room) {
  const seats = seatsOf(room.players);
  if (seats.length < 2 || room.questions || gen || genErr || seats[0] !== myRole) return;
  gen = true;
  const sid = session;
  try {
    const qs = pickQuestions(room.subject);
    if (sid !== session) return;
    await set(ref(db, `Rooms/${roomCode}/questions`), qs);
  } catch (err) {
    console.error(err);
    if (sid === session) genErr = err.message || "Could not make the questions.";
  } finally {
    if (sid === session) { gen = false; if (lastRoom && currentState === "waiting" && !gameStarted) showWaiting(lastRoom); }
  }
}

function startGame() {
  $("btn-start").disabled = true;
  set(ref(db, `Rooms/${roomCode}/startedAt`), serverTimestamp())
    .catch((err) => { console.error(err); showError("Could not start. Please try again."); if (lastRoom && !gameStarted) showWaiting(lastRoom); });
}

function beginMatch(room) {
  const me = room.players[myRole];
  questions = toQs(room.questions);
  currentQ = me.answered || 0;
  myScore  = me.score || 0;
  answers  = loadAnswers();
  lastScores = {}; lastSeatCount = seatsOf(room.players).length;

  showState("waiting");
  paintSeats(room.players);
  ["share-row", "btn-start", "btn-retry", "btn-subject"].forEach((id) => $(id).classList.add("hidden"));
  $("btn-cancel").textContent = "Leave room";

  const sid = session;
  if (currentQ > 0 || me.finished) { enterGame(); return; }
  runCountdown(sid).then(() => { if (sid === session) enterGame(); });
}

function runCountdown(sid) {
  return new Promise((resolve) => {
    const status = $("room-status"), cd = $("countdown");
    status.classList.remove("hidden"); cd.classList.add("hidden");
    status.textContent = "Game starting. Get ready!";
    const step = (n) => {
      if (sid !== session) return resolve();
      if (n === 0) { cd.textContent = "Go!"; cd.classList.add("go"); }
      else { cd.textContent = String(n); cd.classList.remove("go"); }
      cd.classList.remove("hidden", "pop"); void cd.offsetWidth; cd.classList.add("pop");
      if (n === 0) setTimeout(resolve, 550); else setTimeout(() => step(n - 1), 900);
    };
    setTimeout(() => { if (sid !== session) return resolve(); status.classList.add("hidden"); step(3); }, 1400);
  });
}

// ---------- 11. Game ----------
const ansKey = () => `pk_fr_${roomCode}_${lastRoom?.createdAt || ""}`;
function loadAnswers() { try { return JSON.parse(sessionStorage.getItem(ansKey())) || []; } catch { return []; } }
function saveAnswers() { try { sessionStorage.setItem(ansKey(), JSON.stringify(answers)); } catch {} }

function enterGame() {
  const room = lastRoom; if (!room) return;
  showState("game");
  renderScoreboard(room.players);
  if (currentQ >= questions.length) showFinishedMessage(); else showQuestion();
}

function showQuestion() {
  locked = false;
  const q = questions[currentQ];
  $("q-area").classList.remove("hidden");
  $("finished-msg").classList.add("hidden");
  $("q-progress").textContent = `${round > 1 ? `Round ${round}, question` : "Question"} ${currentQ + 1} of ${questions.length}`;
  $("q-text").textContent = q.q;
  const fb = $("feedback"); fb.textContent = ""; fb.className = "feedback";

  const box = $("options"); box.innerHTML = "";
  q.options.forEach((text, i) => {
    const b = el("button", "option"); b.type = "button";
    b.append(el("span", "opt-key", String(i + 1)), el("span", "opt-text", text), el("span", "opt-mark"));
    b.onclick = () => handleAnswer(i);
    box.appendChild(b);
  });
}

function handleAnswer(chosen) {
  if (locked) return;
  locked = true; pendingFeedback = true;

  const q = questions[currentQ];
  const correct = chosen === q.answer;
  const buttons = [...$("options").children];
  buttons.forEach((b, i) => { b.disabled = true; if (i !== q.answer && i !== chosen) b.classList.add("dim"); });
  buttons[q.answer].classList.add("is-correct"); buttons[q.answer].querySelector(".opt-mark").innerHTML = icon("check", 18);
  if (!correct) { buttons[chosen].classList.add("is-wrong"); buttons[chosen].querySelector(".opt-mark").innerHTML = icon("x", 18); }

  const fb = $("feedback");
  fb.className = "feedback " + (correct ? "ok" : "no");
  const why = q.explain ? ` ${q.explain}` : "";
  fb.textContent = (correct ? "Correct." : `The answer is "${q.options[q.answer]}".`) + why;

  answers.push({ i: currentQ, chosen }); saveAnswers();
  if (correct) myScore++;
  currentQ++;
  const done = currentQ >= questions.length;

  const changes = { score: myScore, answered: currentQ };
  if (done) { changes.finished = true; changes.finishedAt = serverTimestamp(); }
  update(ref(db, `Rooms/${roomCode}/players/${myRole}`), changes).catch(console.error);

  const sid = session;
  setTimeout(() => {
    if (sid !== session) return;
    pendingFeedback = false;
    if (currentState !== "game") return;
    if (!done) return showQuestion();
    const p = lastRoom?.players;
    if (p && seatsOf(p).every((s) => p[s].finished)) showResult(p);
    else showFinishedMessage();
  }, correct ? 850 : 1500);
}

function showFinishedMessage() {
  $("q-area").classList.add("hidden");
  $("finished-msg").classList.remove("hidden");
  $("finish-score").textContent = myScore;
  $("finish-score").nextElementSibling.textContent = "/" + questions.length;
  $("finish-text").textContent = "You finished. Waiting for the others…";
}

function buildRace(players) {
  const order = [myRole, ...SEATS.filter((s) => s !== myRole)].filter((s) => players[s]);
  const key = order.map((s) => s + players[s].uid).join();
  if (key === raceKey) return order;
  raceKey = key;
  const race = $("race"); race.replaceChildren();
  order.forEach((s) => {
    const side = sideOf(s), p = players[s];
    const lane = el("div", `lane ${side}`); lane.id = "lane-" + s;
    const head = el("div", "lane-head");
    head.appendChild(el("span", "lane-name"));
    if (s === myRole) head.appendChild(el("span", "tag", "You"));
    const sc = el("span", "lane-score"); sc.append(el("b", "", "0"), el("small", "", "pts")); head.appendChild(sc);
    const track = el("div", "track"), rail = el("div", "rail"); rail.appendChild(el("div", "fill"));
    const runner = el("div", "runner");
    runner.appendChild(makeAvatar(p.name, side, ""));
    runner.insertAdjacentHTML("beforeend", `<span class="done">${icon("check", 11)}</span>`);
    track.append(rail, runner);
    lane.append(head, track, el("span", "sr-only"));
    race.appendChild(lane);
  });
  return order;
}
function renderScoreboard(players) {
  const total = questions.length || TOTAL;
  for (const s of buildRace(players)) {
    const p = players[s], lane = $("lane-" + s);
    lane.querySelector(".lane-name").textContent = p.name;
    lane.querySelector(".lane-score b").textContent = p.score;
    lane.style.setProperty("--p", Math.min(1, (p.answered || 0) / total));
    lane.classList.toggle("done", !!p.finished);
    lane.querySelector(".sr-only").textContent = `${p.answered || 0} of ${total} answered`;
    if (p.score > (lastScores[s] || 0)) { const w = lane.querySelector(".lane-score"); w.classList.remove("bump"); void w.offsetWidth; w.classList.add("bump"); }
    lastScores[s] = p.score;
  }
}

// ---------- 12. Result ----------
function showResult(players) {
  const list = seatsOf(players).map((s) => ({ seat: s, side: sideOf(s), ...players[s] }))
    .sort((a, b) => b.score - a.score || (a.finishedAt || 0) - (b.finishedAt || 0));
  const top = list[0], second = list[1];
  const tied = (a, b) => a.score === b.score && a.finishedAt === b.finishedAt;
  const winners = list.filter((p) => tied(p, top));
  const outcome = winners.length > 1 ? (winners.some((p) => p.seat === myRole) ? "draw" : "lose") : (top.seat === myRole ? "win" : "lose");
  const byTime = !!second && top.score === second.score;
  const reason = list.length === 1 ? "Everyone else left the match."
    : outcome === "draw" ? "Same score and same finish time."
    : outcome === "win" ? (byTime ? "Same top score, but you finished first." : "You had the highest score.")
    : (byTime ? `Same top score, but ${top.name} finished first.` : `${top.name} had the highest score.`);
  const title = outcome === "win" ? "You won!" : outcome === "draw" ? "It's a draw" : `${top.name} won this round`;

  const badge = $("result-badge");
  badge.className = "result-badge " + outcome;
  badge.innerHTML = icon(outcome === "win" ? "trophy" : outcome === "draw" ? "rings" : "flag", 42);
  $("result-title").textContent = title;
  $("result-reason").textContent = reason;

  const box = $("result-players"); box.replaceChildren();
  const base = (lastRoom?.startedAt || 0) + 4500;
  list.forEach((p) => {
    const won = list.length > 1 && winners.includes(p);
    const card = el("div", `rp ${p.side}` + (won ? " winner" : ""));
    const av = makeAvatar(p.name, p.side, "lg", won);
    if (won) { const b = av.querySelector(".host-badge"); b.style.background = "var(--gold)"; b.style.borderColor = "var(--surface-2)"; }
    const score = el("p", "score"); score.innerHTML = `${Number(p.score)}<small>/${questions.length}</small>`;
    const time = (p.finishedAt && lastRoom?.startedAt) ? `${Math.max(0, (p.finishedAt - base) / 1000).toFixed(1)} seconds` : "";
    card.append(av, el("p", "name", p.seat === myRole ? `${p.name} (You)` : p.name), score, el("p", "time", time));
    box.appendChild(card);
  });

  renderReview();
  showState("result");
  moving = false; paintNextBtn(false);
  if (typeof lastRoom?.createdAt === "number") watchNextRound(list, lastRoom.createdAt);
  if (outcome === "win" && list.length > 1) confetti();
}

// ---------- Subject popup ----------
let modalSel = null, modalOnOk = null;
function openSubjectModal({ title, sub, current, okText, onOk }) {
  modalSel = current === "all" || QB.has(current) ? current : pickSel.subject;
  modalOnOk = onOk;
  $("modal-title").textContent = title;
  $("modal-sub").textContent = sub;
  $("modal-ok").textContent = okText;
  renderTiles($("modal-tiles"), () => modalSel, (id) => (modalSel = id));
  $("modal").classList.remove("hidden");
  $("modal-ok").focus();
}
function closeModal() { $("modal").classList.add("hidden"); modalOnOk = null; }

function openEditSubject() {
  if (myRole !== "player1" || !lastRoom || lastRoom.startedAt) return;
  openSubjectModal({ title: "Change subject", sub: "Fresh questions are picked from the new subject.", current: lastRoom.subject || "all", okText: "Save subject", onOk: changeSubject });
}
async function changeSubject(id) {
  const room = lastRoom;
  if (myRole !== "player1" || !room || room.startedAt || id === (room.subject || "all")) return;
  try {
    await set(ref(db, `Rooms/${roomCode}/subject`), id);
    if (room.questions) await remove(ref(db, `Rooms/${roomCode}/questions`));
    genErr = "";
  } catch (err) { console.error(err); showError("Could not change the subject. Please try again."); }
}
function openNextRoundPicker() {
  if (moving || currentState !== "result" || !nextCtx) return;
  openSubjectModal({ title: "Next round", sub: "Keep the same subject or pick a new one. If a friend already opened the next round, you will join theirs.", current: nextCtx.subject || "all", okText: "Start next round", onOk: startNextRound });
}

// ---------- 12b. Next round ----------
function nextCodes(oldCode, oldCreatedAt) {
  const out = [];
  for (let k = 0; out.length < 8 && k < 60; k++) {
    const c = String(1000 + (xmur3(`next:${oldCode}:${oldCreatedAt}:${k}`)() % 9000));
    if (c !== oldCode && !out.includes(c)) out.push(c);
  }
  return out;
}
function isNextRoomOf(v, uids, oldCreatedAt) {
  const p = v && v.players;
  return !!(p && p.player1 && uids && uids.includes(p.player1.uid) && !v.startedAt && SEATS.slice(1).some((s) => !p[s]) &&
    typeof v.createdAt === "number" && v.createdAt > oldCreatedAt);
}
function paintNextBtn(busy) {
  const b = $("btn-next");
  b.disabled = busy; $("btn-back").disabled = busy;
  b.innerHTML = icon("replay", 20) + `<span>${busy ? "Starting next round…" : "Next round"}</span>`;
}
function stopWatchingNext() { nextWatchers.forEach((u) => u()); nextWatchers = []; nextCtx = null; }

function watchNextRound(list, oldCreatedAt) {
  stopWatchingNext();
  const others = list.filter((p) => p.uid !== myUid);
  nextCtx = { uids: others.map((p) => p.uid), oldCreatedAt, oldCode: roomCode, subject: lastRoom?.subject };
  for (const c of nextCodes(roomCode, oldCreatedAt)) {
    nextWatchers.push(onValue(ref(db, `Rooms/${c}`),
      (snap) => { if (!moving && nextCtx && isNextRoomOf(snap.val(), nextCtx.uids, oldCreatedAt)) followFriends(c); },
      () => {}));
  }
}

async function takeSeat(code) {
  const v = (await get(ref(db, `Rooms/${code}`))).val();
  for (const s of SEATS.slice(1)) {
    if (v?.players?.[s]) continue;
    try { await set(ref(db, `Rooms/${code}/players/${s}`), newPlayer(s)); return { seat: s, host: v.players.player1.name }; } catch {}
  }
  throw new Error("room full");
}

async function followFriends(code) {
  if (moving || currentState !== "result" || !nextCtx) return;
  moving = true; paintNextBtn(true);
  try {
    const { seat, host } = await takeSeat(code);
    toast(`${host} started the next round.`);
    moveInto(code, seat);
  } catch (err) {
    console.error(err); moving = false; paintNextBtn(false);
    showError("Could not join the next round. Tap Next round to try again.");
  }
}

async function startNextRound(chosen) {
  if (moving || currentState !== "result" || !nextCtx) return;
  moving = true; paintNextBtn(true);
  const { uids, oldCreatedAt, oldCode, subject } = nextCtx;
  try {
    for (const c of nextCodes(oldCode, oldCreatedAt)) {
      let snap = await get(ref(db, `Rooms/${c}`));
      if (!snap.exists()) {
        try {
          await set(ref(db, `Rooms/${c}`), { createdAt: serverTimestamp(), subject: chosen || subject || pickSel.subject, players: { player1: newPlayer("player1") } });
          return moveInto(c, "player1");
        } catch (err) { snap = await get(ref(db, `Rooms/${c}`)); }
      }
      if (snap.exists() && isNextRoomOf(snap.val(), uids, oldCreatedAt)) {
        const { seat } = await takeSeat(c);
        return moveInto(c, seat);
      }
    }
    throw new Error("no free code");
  } catch (err) {
    console.error(err); moving = false; paintNextBtn(false);
    showError("Could not start the next round. Please try again.");
  }
}

function moveInto(code, role) {
  const oldCode = roomCode, oldRole = myRole, nextRound = round + 1;
  stopVoice();
  stopWatchingNext();
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  session++;
  answers = []; questions = []; currentQ = 0; myScore = 0;
  locked = false; pendingFeedback = false; lastScores = {};
  try { sessionStorage.setItem("pk_round_" + code, String(nextRound)); } catch {}
  if (oldRole === "player1" && oldCode) setTimeout(() => remove(ref(db, `Rooms/${oldCode}`)).catch(() => {}), 8000);
  moving = false; paintNextBtn(false);

  showState("waiting");
  $("seats").replaceChildren();
  ["share-row", "countdown", "btn-start", "btn-retry"].forEach((id) => $(id).classList.add("hidden"));
  $("room-status").classList.remove("hidden"); $("room-status").textContent = "Opening the next round…";
  $("btn-cancel").textContent = "Leave room";
  enterRoom(code, role);
}

function renderReview() {
  const wrap = $("review-wrap"); wrap.innerHTML = "";
  const misses = answers.filter((a) => questions[a.i] && a.chosen !== questions[a.i].answer);
  if (!answers.length) return;
  if (!misses.length) {
    const d = el("div", "clean"); d.innerHTML = icon("check", 20) + "<span>No mistakes. Every answer was right.</span>";
    wrap.appendChild(d); return;
  }
  const det = el("details", "card review");
  det.appendChild(el("summary", "", `Review ${misses.length} missed ${misses.length === 1 ? "question" : "questions"}`));
  const ul = el("ul");
  for (const m of misses) {
    const q = questions[m.i];
    const li = el("li");
    li.append(el("p", "bn", q.q), el("p", "right", q.options[q.answer]), el("p", "wrong", `You picked: ${q.options[m.chosen]}`));
    if (q.explain) li.appendChild(el("p", "ex", q.explain));
    ul.appendChild(li);
  }
  det.appendChild(ul); wrap.appendChild(det);
}

// ---------- 13. Confetti ----------
function confetti() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const c = $("confetti"), ctx = c.getContext("2d"), dpr = window.devicePixelRatio || 1;
  c.width = innerWidth * dpr; c.height = innerHeight * dpr; ctx.scale(dpr, dpr);
  const colors = ["#2F4BD8", "#5B7BFF", "#E5484D", "#FFD84D", "#1F9D6B", "#ffffff"];
  const bits = Array.from({ length: 110 }, () => ({
    x: innerWidth / 2 + (Math.random() - .5) * 120, y: innerHeight * .38,
    vx: (Math.random() - .5) * 11, vy: -Math.random() * 11 - 3,
    w: 6 + Math.random() * 6, h: 4 + Math.random() * 5,
    r: Math.random() * 6, vr: (Math.random() - .5) * .4, color: colors[(Math.random() * colors.length) | 0]
  }));
  const t0 = performance.now();
  (function frame(t) {
    const k = t - t0;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const b of bits) {
      b.vy += .26; b.vx *= .992; b.x += b.vx; b.y += b.vy; b.r += b.vr;
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r);
      ctx.globalAlpha = Math.max(0, 1 - k / 2800); ctx.fillStyle = b.color;
      ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); ctx.restore();
    }
    if (k < 2800) requestAnimationFrame(frame); else ctx.clearRect(0, 0, innerWidth, innerHeight);
  })(t0);
}

init();
