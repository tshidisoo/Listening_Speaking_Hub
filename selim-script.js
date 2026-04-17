/* =========================================
   SELIM'S ABC ADVENTURE — selim-script.js
   Tab switching + recorder for all 5 days
   ========================================= */

const DRIVE_UPLOAD_URL = "https://script.google.com/macros/s/AKfycbzlH0BSpCIEBnkjf44tBdD6RFVEM-H8kP3bg2uaa21BJtRMcnFIuFWXiMH-UirBDoIbqA/exec";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];

// ── Tab switching ────────────────────────────────────────────────
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    const day = tab.dataset.day;
    activateTab(day);
    showCard(day);
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

function showCard(day) {
  document.querySelectorAll(".day-card").forEach(c => c.classList.remove("active"));
  const card = document.getElementById(`card-${day}`);
  if (card) card.classList.add("active");
}

// ── Restore done state from localStorage ─────────────────────────
DAYS.forEach(day => {
  if (localStorage.getItem(`selim-submitted-${day}`) === "true") {
    markDone(day);
  }
});

// ── Set up recorders for all 5 days ──────────────────────────────
DAYS.forEach(day => setupRecorder(day));

function setupRecorder(day) {
  const recordBtn = document.getElementById("recordBtn-" + day);
  if (!recordBtn) return;

  const timerEl    = document.getElementById("timer-"    + day);
  const playback   = document.getElementById("playback-" + day);
  const submitBtn  = document.getElementById("submitBtn-" + day);
  const statusMsg  = document.getElementById("status-"   + day);
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
    const filename = `Selim_${capitalise(day)}_${date}.${ext}`;
    try {
      const base64 = await blobToBase64(audioBlob);
      await fetch(DRIVE_UPLOAD_URL, {
        method: "POST", mode: "no-cors",
        body: JSON.stringify({ filename, mimeType: audioBlob.type, data: base64,
                               student: "Selim", day, date })
      });
      statusMsg.className = "status-msg success";
      statusMsg.textContent = "✅ Sent! Amazing singing, Selim! 🚀";
      localStorage.setItem(`selim-submitted-${day}`, "true");
      markDone(day);
    } catch {
      statusMsg.className = "status-msg error";
      statusMsg.textContent = "❌ Could not send. Please check your connection and try again.";
      submitBtn.disabled = false;
    }
  });
}

// ── Mark done ─────────────────────────────────────────────────────
function markDone(day) {
  const badge = document.getElementById(`done-${day}`);
  if (badge) badge.style.display = "inline-block";
  refreshTabDoneStates();
}

function refreshTabDoneStates() {
  DAYS.forEach(day => {
    const tab = document.querySelector(`.tab[data-day="${day}"]`);
    if (!tab) return;
    tab.classList.toggle("done", localStorage.getItem(`selim-submitted-${day}`) === "true");
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
