/* =========================================
   ZEYNEP'S ENGLISH HUB — zeynep-script.js
   Multi-week navigation + recording logic
   =========================================

   SETUP: Replace the URL below with your
   Google Apps Script Web App URL.
   See README.md for full instructions.
   ========================================= */

const DRIVE_UPLOAD_URL = "https://script.google.com/macros/s/AKfycbzlH0BSpCIEBnkjf44tBdD6RFVEM-H8kP3bg2uaa21BJtRMcnFIuFWXiMH-UirBDoIbqA/exec";

const WEEKS = [1, 2, 3];
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

  const titles = {
    1: "Week 1 · The Global Food Critic",
    2: "Week 2 · The City Mayor",
    3: "Week 3 · The Art Detective"
  };
  document.getElementById("week-view-title").textContent = titles[week];

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
  const activeTab = document.querySelector(`.tab[data-day="${day}"]`);
  if (activeTab) {
    activeTab.classList.add("active");
    activeTab.setAttribute("aria-selected", "true");
  }
}

function showCard(week, day) {
  document.querySelectorAll(".day-card").forEach(c => c.classList.remove("active"));
  const card = document.getElementById(`card-w${week}-${day}`);
  if (card) card.classList.add("active");
}

// ── Restore done state from localStorage ─────────────────────────
WEEKS.forEach(week => {
  DAYS.forEach(day => {
    const key = `zeynep-submitted-w${week}-${day}`;
    if (localStorage.getItem(key) === "true") {
      markDone(week, day);
    }
  });
});

// ── Set up recorder for every week × day combination ─────────────
WEEKS.forEach(week => {
  DAYS.forEach(day => setupRecorder(week, day));
});

function setupRecorder(week, day) {
  const id = `w${week}-${day}`;

  const recordBtn  = document.getElementById("recordBtn-"  + id);
  const timerEl    = document.getElementById("timer-"      + id);
  const playback   = document.getElementById("playback-"   + id);
  const submitBtn  = document.getElementById("submitBtn-"  + id);
  const statusMsg  = document.getElementById("status-"     + id);

  if (!recordBtn) return;

  const timerCount = timerEl.querySelector(".timer-count");

  let mediaRecorder  = null;
  let audioChunks    = [];
  let audioBlob      = null;
  let timerInterval  = null;
  let secondsElapsed = 0;
  let isRecording    = false;

  recordBtn.addEventListener("click", async () => {
    if (!isRecording) {
      await startRecording();
    } else {
      stopRecording();
    }
  });

  async function startRecording() {
    playback.style.display  = "none";
    submitBtn.style.display = "none";
    statusMsg.textContent   = "";
    statusMsg.className     = "status-msg";
    audioChunks = [];
    audioBlob   = null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeType = getSupportedMimeType();
      const options  = mimeType ? { mimeType } : {};
      mediaRecorder  = new MediaRecorder(stream, options);

      mediaRecorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
        const url = URL.createObjectURL(audioBlob);
        playback.src            = url;
        playback.style.display  = "block";
        submitBtn.style.display = "block";
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start(250);
      isRecording = true;

      recordBtn.classList.add("recording");
      recordBtn.querySelector(".record-label").textContent = "Tap to Stop";
      timerEl.style.display = "block";
      secondsElapsed        = 0;
      timerCount.textContent = "0:00";
      timerInterval = setInterval(() => {
        secondsElapsed++;
        timerCount.textContent = formatTime(secondsElapsed);
      }, 1000);

    } catch (err) {
      statusMsg.textContent = "⚠️ Microphone access denied. Please allow microphone in your browser settings.";
      statusMsg.className   = "status-msg error";
    }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    isRecording = false;
    clearInterval(timerInterval);
    recordBtn.classList.remove("recording");
    recordBtn.querySelector(".record-label").textContent = "Tap to Record";
    timerEl.style.display = "none";
  }

  submitBtn.addEventListener("click", async () => {
    if (!audioBlob) return;

    submitBtn.disabled      = true;
    statusMsg.className     = "status-msg uploading";
    statusMsg.textContent   = "⏳ Sending to your teacher…";

    const ext      = getExtension(mediaRecorder.mimeType);
    const date     = new Date().toISOString().slice(0, 10);
    const filename = `Zeynep_W${week}_${capitalise(day)}_${date}.${ext}`;

    try {
      const base64 = await blobToBase64(audioBlob);

      const payload = JSON.stringify({
        filename: filename,
        mimeType: audioBlob.type,
        data:     base64,
        student:  "Zeynep",
        week:     week,
        day:      day,
        date:     date
      });

      await fetch(DRIVE_UPLOAD_URL, {
        method: "POST",
        mode:   "no-cors",
        body:   payload
      });

      statusMsg.className   = "status-msg success";
      statusMsg.textContent = "✅ Sent! Great work today, Zeynep! ⚡";
      localStorage.setItem(`zeynep-submitted-w${week}-${day}`, "true");
      markDone(week, day);

    } catch (err) {
      statusMsg.className   = "status-msg error";
      statusMsg.textContent = "❌ Could not send. Please check your connection and try again.";
      submitBtn.disabled    = false;
    }
  });
}

// ── Mark a day as done ────────────────────────────────────────────
function markDone(week, day) {
  const id = `w${week}-${day}`;
  const doneBadge = document.getElementById("done-" + id);
  if (doneBadge) doneBadge.style.display = "inline-block";
  refreshTabDoneStates();
}

function refreshTabDoneStates() {
  DAYS.forEach(day => {
    const tab = document.querySelector(`.tab[data-day="${day}"]`);
    if (!tab) return;
    const key = `zeynep-submitted-w${currentWeek}-${day}`;
    if (localStorage.getItem(key) === "true") {
      tab.classList.add("done");
    } else {
      tab.classList.remove("done");
    }
  });
}

// ── Helpers ───────────────────────────────────────────────────────
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function capitalise(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getSupportedMimeType() {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4"
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

function getExtension(mimeType) {
  if (!mimeType)                  return "webm";
  if (mimeType.includes("mp4"))   return "mp4";
  if (mimeType.includes("ogg"))   return "ogg";
  return "webm";
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
