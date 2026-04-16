/* =========================================
   ALIYA'S PHONICS HUB — aliya-script.js
   Week navigation + recorder + match game
   ========================================= */

const DRIVE_UPLOAD_URL = "https://script.google.com/macros/s/AKfycbzlH0BSpCIEBnkjf44tBdD6RFVEM-H8kP3bg2uaa21BJtRMcnFIuFWXiMH-UirBDoIbqA/exec";

const WEEKS = [1];
const DAYS  = ["monday", "tuesday", "wednesday", "thursday", "friday"];

let currentWeek = 1;

// ── Landing → Week view ──────────────────────────────────────────
document.querySelectorAll(".week-card").forEach(card => {
  card.addEventListener("click", () => {
    currentWeek = parseInt(card.dataset.week, 10);
    openWeekView(currentWeek);
  });
});

function openWeekView(week) {
  document.getElementById("landing").style.display   = "none";
  document.getElementById("week-view").style.display = "block";
  document.getElementById("week-view-title").textContent = "Week 1 · Short 'a' Phonics Adventure";
  activateTab("monday");
  showCard(week, "monday");
  refreshTabDoneStates();
}

// ── Back button ──────────────────────────────────────────────────
document.getElementById("back-btn").addEventListener("click", () => {
  document.getElementById("week-view").style.display = "none";
  document.getElementById("landing").style.display   = "block";
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// ── Tab switching ────────────────────────────────────────────────
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    const day = tab.dataset.day;
    activateTab(day);
    showCard(currentWeek, day);
  });
});

function activateTab(day) {
  document.querySelectorAll(".tab").forEach(t => {
    t.classList.remove("active");
    t.setAttribute("aria-selected", "false");
  });
  const t = document.querySelector(`.tab[data-day="${day}"]`);
  if (t) { t.classList.add("active"); t.setAttribute("aria-selected", "true"); }
}

function showCard(week, day) {
  document.querySelectorAll(".day-card").forEach(c => c.classList.remove("active"));
  const card = document.getElementById(`card-w${week}-${day}`);
  if (card) card.classList.add("active");
}

// ── Restore done state from localStorage ─────────────────────────
WEEKS.forEach(week => {
  DAYS.forEach(day => {
    if (localStorage.getItem(`aliya-submitted-w${week}-${day}`) === "true") {
      markDone(week, day);
    }
  });
});

// ── Set up recorders (guards handle game-only days) ───────────────
WEEKS.forEach(week => DAYS.forEach(day => setupRecorder(week, day)));

function setupRecorder(week, day) {
  const id        = `w${week}-${day}`;
  const recordBtn = document.getElementById("recordBtn-"  + id);
  if (!recordBtn) return; // game day — no recorder needed

  const timerEl    = document.getElementById("timer-"    + id);
  const playback   = document.getElementById("playback-" + id);
  const submitBtn  = document.getElementById("submitBtn-" + id);
  const statusMsg  = document.getElementById("status-"   + id);
  const timerCount = timerEl.querySelector(".timer-count");

  let mediaRecorder = null, audioChunks = [], audioBlob = null;
  let timerInterval = null, secondsElapsed = 0, isRecording = false;

  recordBtn.addEventListener("click", async () => {
    if (!isRecording) await startRecording(); else stopRecording();
  });

  async function startRecording() {
    playback.style.display = submitBtn.style.display = "none";
    statusMsg.textContent = ""; statusMsg.className = "status-msg";
    audioChunks = []; audioBlob = null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRecorder.ondataavailable = e => { if (e.data?.size > 0) audioChunks.push(e.data); };
      mediaRecorder.onstop = () => {
        audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
        playback.src = URL.createObjectURL(audioBlob);
        playback.style.display = submitBtn.style.display = "block";
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start(250);
      isRecording = true;
      recordBtn.classList.add("recording");
      recordBtn.querySelector(".record-label").textContent = "Tap to Stop";
      timerEl.style.display = "block";
      secondsElapsed = 0; timerCount.textContent = "0:00";
      timerInterval = setInterval(() => { timerCount.textContent = formatTime(++secondsElapsed); }, 1000);
    } catch {
      statusMsg.textContent = "⚠️ Microphone access denied. Please allow microphone in your browser settings.";
      statusMsg.className = "status-msg error";
    }
  }

  function stopRecording() {
    if (mediaRecorder?.state !== "inactive") mediaRecorder.stop();
    isRecording = false; clearInterval(timerInterval);
    recordBtn.classList.remove("recording");
    recordBtn.querySelector(".record-label").textContent = "Tap to Record";
    timerEl.style.display = "none";
  }

  submitBtn.addEventListener("click", async () => {
    if (!audioBlob) return;
    submitBtn.disabled = true;
    statusMsg.className = "status-msg uploading";
    statusMsg.textContent = "⏳ Sending to your teacher…";
    const ext = getExtension(mediaRecorder.mimeType);
    const date = new Date().toISOString().slice(0, 10);
    const filename = `Aliya_W${week}_${capitalise(day)}_${date}.${ext}`;
    try {
      const base64 = await blobToBase64(audioBlob);
      await fetch(DRIVE_UPLOAD_URL, {
        method: "POST", mode: "no-cors",
        body: JSON.stringify({ filename, mimeType: audioBlob.type, data: base64,
                               student: "Aliya", week, day, date })
      });
      statusMsg.className = "status-msg success";
      statusMsg.textContent = "✅ Sent! Great work today, Aliya! 🌈";
      localStorage.setItem(`aliya-submitted-w${week}-${day}`, "true");
      markDone(week, day);
    } catch {
      statusMsg.className = "status-msg error";
      statusMsg.textContent = "❌ Could not send. Please check your connection and try again.";
      submitBtn.disabled = false;
    }
  });
}

// ── Mark done ─────────────────────────────────────────────────────
function markDone(week, day) {
  const badge = document.getElementById(`done-w${week}-${day}`);
  if (badge) badge.style.display = "inline-block";
  refreshTabDoneStates();
}

function refreshTabDoneStates() {
  DAYS.forEach(day => {
    const tab = document.querySelector(`.tab[data-day="${day}"]`);
    if (!tab) return;
    tab.classList.toggle("done", localStorage.getItem(`aliya-submitted-w1-${day}`) === "true");
  });
}

// ── Match Game ────────────────────────────────────────────────────
const TUESDAY_PAIRS = [
  { word: "cat", emoji: "🐈" }, { word: "ant", emoji: "🐜" },
  { word: "yak", emoji: "🐂" }, { word: "ax",  emoji: "🪓" },
  { word: "ram", emoji: "🐏" }, { word: "jam", emoji: "🍯" }
];

const THURSDAY_PAIRS = [
  { word: "cat", emoji: "🐈" }, { word: "ant", emoji: "🐜" },
  { word: "yak", emoji: "🐂" }, { word: "ax",  emoji: "🪓" },
  { word: "ram", emoji: "🐏" }, { word: "jam", emoji: "🍯" },
  { word: "yam", emoji: "🍠" }, { word: "dam", emoji: "🧱" },
  { word: "fan", emoji: "🪭" }, { word: "man", emoji: "👨" },
  { word: "pan", emoji: "🍳" }, { word: "can", emoji: "🥫" }
];

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function initMatchGame(gameId, pairs) {
  const container = document.getElementById(gameId);
  if (!container) return;

  const wordsCol  = container.querySelector(".words-col");
  const emojisCol = container.querySelector(".emojis-col");
  const scoreEl   = container.querySelector(".match-score-count");
  const celebEl   = container.querySelector(".match-celebration");

  // Reset
  wordsCol.innerHTML = emojisCol.innerHTML = "";
  celebEl.style.display = "none";
  if (scoreEl) scoreEl.textContent = "0";

  const total = pairs.length;
  let matched = 0, selectedWord = null, selectedEmoji = null;

  shuffle([...pairs]).forEach(pair => {
    const btn = makeItem("word-item", pair.word, pair.word);
    btn.addEventListener("click", () => handleClick(btn, "word"));
    wordsCol.appendChild(btn);
  });

  shuffle([...pairs]).forEach(pair => {
    const btn = makeItem("emoji-item", pair.word, pair.emoji);
    btn.addEventListener("click", () => handleClick(btn, "emoji"));
    emojisCol.appendChild(btn);
  });

  function makeItem(cls, key, label) {
    const btn = document.createElement("button");
    btn.className = `match-item ${cls}`;
    btn.dataset.key = key;
    btn.textContent = label;
    return btn;
  }

  function handleClick(btn, type) {
    if (btn.classList.contains("matched") || btn.disabled) return;
    if (type === "word") {
      if (selectedWord) selectedWord.classList.remove("selected");
      selectedWord = btn;
    } else {
      if (selectedEmoji) selectedEmoji.classList.remove("selected");
      selectedEmoji = btn;
    }
    btn.classList.add("selected");
    tryMatch();
  }

  function tryMatch() {
    if (!selectedWord || !selectedEmoji) return;
    if (selectedWord.dataset.key === selectedEmoji.dataset.key) {
      [selectedWord, selectedEmoji].forEach(b => {
        b.classList.remove("selected"); b.classList.add("matched"); b.disabled = true;
      });
      selectedWord = selectedEmoji = null;
      if (scoreEl) scoreEl.textContent = ++matched;
      if (matched === total) celebEl.style.display = "block";
    } else {
      [selectedWord, selectedEmoji].forEach(b => b.classList.add("error"));
      const w = selectedWord, e = selectedEmoji;
      selectedWord = selectedEmoji = null;
      setTimeout(() => { w.classList.remove("selected", "error"); e.classList.remove("selected", "error"); }, 600);
    }
  }
}

// Play Again buttons
document.querySelectorAll(".replay-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const gameId = btn.dataset.game;
    const pairs  = btn.dataset.set === "thursday" ? THURSDAY_PAIRS : TUESDAY_PAIRS;
    initMatchGame(gameId, pairs);
  });
});

// Initialize games on load
initMatchGame("game-tuesday",  TUESDAY_PAIRS);
initMatchGame("game-thursday", THURSDAY_PAIRS);

// ── Helpers ───────────────────────────────────────────────────────
function formatTime(s) { return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`; }
function capitalise(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function getSupportedMimeType() {
  return ["audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus","audio/mp4"]
    .find(t => MediaRecorder.isTypeSupported(t)) || "";
}
function getExtension(m) { return m?.includes("mp4") ? "mp4" : m?.includes("ogg") ? "ogg" : "webm"; }
function blobToBase64(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onloadend = () => res(r.result.split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}
