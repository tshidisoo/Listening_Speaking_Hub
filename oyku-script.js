/* =========================================
   ÖYKÜ'S SPEAKING HUB — oyku-script.js
   Week navigation + recorder (18 sessions)
   Mon / Wed / Thu only · 6 weeks
   ========================================= */

const DRIVE_UPLOAD_URL = "https://script.google.com/macros/s/AKfycbzlH0BSpCIEBnkjf44tBdD6RFVEM-H8kP3bg2uaa21BJtRMcnFIuFWXiMH-UirBDoIbqA/exec";

const WEEKS = [1, 2, 3, 4, 5, 6];
const DAYS  = ["monday", "wednesday", "thursday"];

const WEEK_TITLES = {
  1: "Week 1 · Hello Again! · To Be & Personal Info",
  2: "Week 2 · My World · Home, Food & Daily Routines",
  3: "Week 3 · Can Do! · Abilities, Places & Shopping",
  4: "Week 4 · Real Life · Ordering, Meeting & Describing",
  5: "Week 5 · Then & Now · Routines, Family & the Past",
  6: "Week 6 · Grand Finale · Free Speaking & Life Story"
};

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
  document.getElementById("week-view-title").textContent = WEEK_TITLES[week];
  activateTab("monday");
  showCard(week, "monday");
  refreshTabDoneStates(week);
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
    if (localStorage.getItem(`oyku-submitted-w${week}-${day}`) === "true") {
      markDone(week, day);
    }
  });
});

// ── Set up recorders for all 18 sessions ─────────────────────────
WEEKS.forEach(week => DAYS.forEach(day => setupRecorder(week, day)));

function setupRecorder(week, day) {
  const id        = `w${week}-${day}`;
  const recordBtn = document.getElementById("recordBtn-"  + id);
  if (!recordBtn) return;

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
    const filename = `Oyku_W${week}_${capitalise(day)}_${date}.${ext}`;
    try {
      const base64 = await blobToBase64(audioBlob);
      await fetch(DRIVE_UPLOAD_URL, {
        method: "POST", mode: "no-cors",
        body: JSON.stringify({ filename, mimeType: audioBlob.type, data: base64,
                               student: "Oyku", week, day, date })
      });
      statusMsg.className = "status-msg success";
      statusMsg.textContent = "✅ Sent! Wonderful speaking, Öykü! 💬";
      localStorage.setItem(`oyku-submitted-w${week}-${day}`, "true");
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
  refreshTabDoneStates(week);
}

function refreshTabDoneStates(week) {
  if (!week) week = currentWeek;
  DAYS.forEach(day => {
    const tab = document.querySelector(`.tab[data-day="${day}"]`);
    if (!tab) return;
    tab.classList.toggle("done", localStorage.getItem(`oyku-submitted-w${week}-${day}`) === "true");
  });
}

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
