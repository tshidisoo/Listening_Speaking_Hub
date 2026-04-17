/* =========================================
   SPEAKING HUB — speaking-script.js
   Shared JS for all 4 boys.
   Reads student name from sessionStorage.
   ========================================= */

// ── Session guard ─────────────────────────────────────────────────
//  If someone navigates directly to speaking-app.html without
//  logging in via speaking-hub.html, redirect them back.
const STUDENT = sessionStorage.getItem("speakingStudent");
if (!STUDENT) {
  window.location.href = "speaking-hub.html";
}

// ── Config ────────────────────────────────────────────────────────
const DRIVE_UPLOAD_URL = "https://script.google.com/macros/s/AKfycbzlH0BSpCIEBnkjf44tBdD6RFVEM-H8kP3bg2uaa21BJtRMcnFIuFWXiMH-UirBDoIbqA/exec";

const UNLOCKED_DAYS  = [1, 2, 3];
const UNITS          = ["a", "b"];
// Day 3 Unit B is content-locked (no recorder — just coming-soon)
const LOCKED_UNITS   = ["d3-ub"];

const DAY_TITLES = {
  1: "Day 1 · The Classroom & Feelings",
  2: "Day 2 · Prepositions & The Fruit Shop",
  3: "Day 3 · School Places"
};

let currentDay = 1;

// ── Personalise header ────────────────────────────────────────────
document.getElementById("student-name").textContent = STUDENT + "'s Speaking Hub";

// ── Day card navigation ───────────────────────────────────────────
document.querySelectorAll(".speaking-day-card:not(.locked)").forEach(card => {
  card.addEventListener("click", () => {
    currentDay = parseInt(card.dataset.day, 10);
    openDayView(currentDay);
  });
});

function openDayView(day) {
  document.getElementById("day-landing").style.display = "none";
  document.getElementById("day-view").style.display    = "block";
  document.getElementById("day-view-title").textContent = DAY_TITLES[day] || `Day ${day}`;
  activateUnit("a");
  showUnitCard(day, "a");
  refreshUnitDoneStates(day);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ── Back button ───────────────────────────────────────────────────
document.getElementById("back-btn").addEventListener("click", () => {
  document.getElementById("day-view").style.display    = "none";
  document.getElementById("day-landing").style.display = "block";
  refreshDayDoneChips();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// ── Unit tab switching ────────────────────────────────────────────
document.querySelectorAll(".unit-tabs .tab").forEach(tab => {
  tab.addEventListener("click", () => {
    const unit = tab.dataset.unit;
    activateUnit(unit);
    showUnitCard(currentDay, unit);
  });
});

function activateUnit(unit) {
  document.querySelectorAll(".unit-tabs .tab").forEach(t => {
    t.classList.remove("active");
    t.setAttribute("aria-selected", "false");
  });
  const t = document.querySelector(`.unit-tabs .tab[data-unit="${unit}"]`);
  if (t) { t.classList.add("active"); t.setAttribute("aria-selected", "true"); }
}

function showUnitCard(day, unit) {
  document.querySelectorAll(".day-card").forEach(c => c.classList.remove("active"));
  const card = document.getElementById(`card-d${day}-u${unit}`);
  if (card) card.classList.add("active");
}

// ── Restore done states from localStorage ────────────────────────
UNLOCKED_DAYS.forEach(day => {
  UNITS.forEach(unit => {
    const key = lsKey(day, unit);
    if (localStorage.getItem(key) === "true") {
      markDone(day, unit, false); // silent — don't re-refresh during init
    }
  });
});
refreshDayDoneChips();

// ── Set up recorders ──────────────────────────────────────────────
UNLOCKED_DAYS.forEach(day => {
  UNITS.forEach(unit => {
    if (!LOCKED_UNITS.includes(`d${day}-u${unit}`)) {
      setupRecorder(day, unit);
    }
  });
});

function setupRecorder(day, unit) {
  const id         = `d${day}-u${unit}`;
  const recordBtn  = document.getElementById("recordBtn-"  + id);
  if (!recordBtn) return;

  const timerEl   = document.getElementById("timer-"    + id);
  const playback  = document.getElementById("playback-" + id);
  const submitBtn = document.getElementById("submitBtn-" + id);
  const statusMsg = document.getElementById("status-"   + id);
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
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      mediaRecorder  = new MediaRecorder(stream, mimeType ? { mimeType } : {});
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
    const ext      = getExtension(mediaRecorder.mimeType);
    const date     = new Date().toISOString().slice(0, 10);
    const unitUp   = unit.toUpperCase();
    const filename = `${STUDENT}_Day${day}_Unit${unitUp}_${date}.${ext}`;
    try {
      const base64 = await blobToBase64(audioBlob);
      await fetch(DRIVE_UPLOAD_URL, {
        method: "POST", mode: "no-cors",
        body: JSON.stringify({
          filename, mimeType: audioBlob.type, data: base64,
          student: STUDENT, day, unit, date
        })
      });
      statusMsg.className = "status-msg success";
      statusMsg.textContent = `✅ Sent! Great work, ${STUDENT}! 💪`;
      localStorage.setItem(lsKey(day, unit), "true");
      markDone(day, unit, true);
    } catch {
      statusMsg.className = "status-msg error";
      statusMsg.textContent = "❌ Could not send. Please check your connection and try again.";
      submitBtn.disabled = false;
    }
  });
}

// ── Mark done ─────────────────────────────────────────────────────
function markDone(day, unit, refresh) {
  const badge = document.getElementById(`done-d${day}-u${unit}`);
  if (badge) badge.style.display = "inline-block";
  if (refresh) {
    refreshUnitDoneStates(day);
    refreshDayDoneChips();
  }
}

function refreshUnitDoneStates(day) {
  UNITS.forEach(unit => {
    const tab = document.querySelector(`.unit-tabs .tab[data-unit="${unit}"]`);
    if (!tab) return;
    tab.classList.toggle("done", localStorage.getItem(lsKey(day, unit)) === "true");
  });
}

function refreshDayDoneChips() {
  UNLOCKED_DAYS.forEach(day => {
    const chip = document.getElementById(`chip-d${day}`);
    if (!chip) return;
    // A day is "done" when all its non-locked units are submitted
    const isDone = UNITS.every(unit => {
      if (LOCKED_UNITS.includes(`d${day}-u${unit}`)) return true; // locked = skip
      return localStorage.getItem(lsKey(day, unit)) === "true";
    });
    chip.style.display = isDone ? "inline-block" : "none";
    const card = document.querySelector(`.speaking-day-card[data-day="${day}"]`);
    if (card) card.classList.toggle("done", isDone);
  });
}

// ── Helpers ───────────────────────────────────────────────────────
function lsKey(day, unit) {
  return `${STUDENT.toLowerCase()}-speaking-d${day}-u${unit}`;
}
function formatTime(s) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }
function getSupportedMimeType() {
  return ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"]
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
