/* =========================================
   SELIM'S ABC ADVENTURE — selim-script.js
   Tab switching + done-button persistence
   ========================================= */

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

// ── Done buttons ─────────────────────────────────────────────────
DAYS.forEach(day => {
  const btn   = document.getElementById(`doneBtn-${day}`);
  const stars = document.getElementById(`stars-${day}`);
  const badge = document.getElementById(`done-${day}`);
  if (!btn) return;

  // Restore from localStorage
  if (localStorage.getItem(`selim-done-${day}`) === "true") {
    markDone(day, btn, stars, badge);
  }

  btn.addEventListener("click", () => {
    localStorage.setItem(`selim-done-${day}`, "true");
    markDone(day, btn, stars, badge);
    refreshTabDoneStates();
  });
});

function markDone(day, btn, stars, badge) {
  btn.textContent = "✅ Done — Great job, Selim!";
  btn.disabled = true;
  if (stars) stars.style.display = "block";
  if (badge) badge.style.display = "inline-block";
  refreshTabDoneStates();
}

function refreshTabDoneStates() {
  DAYS.forEach(day => {
    const tab = document.querySelector(`.tab[data-day="${day}"]`);
    if (!tab) return;
    tab.classList.toggle("done", localStorage.getItem(`selim-done-${day}`) === "true");
  });
}

// Restore tab done states on load
refreshTabDoneStates();
