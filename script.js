/* ============================================================
   Theme toggle
   Three states on <html data-theme="...">:
     "auto"  — follow OS preference (default)
     "dark"  — force dark
     "light" — force light
   Persisted in localStorage under key "theme".
   ============================================================ */

(function () {
  const root = document.documentElement;
  const STORAGE_KEY = "theme";
  const CYCLE = { auto: "dark", dark: "light", light: "auto" };

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (_) {}
    const btn = document.getElementById("theme-toggle");
    if (btn) {
      btn.setAttribute(
        "aria-label",
        theme === "dark" ? "Switch to light mode"
          : theme === "light" ? "Switch to auto mode"
          : "Switch to dark mode"
      );
    }
  }

  // Restore saved preference immediately (before paint) to avoid flash
  let saved = "auto";
  try { saved = localStorage.getItem(STORAGE_KEY) || "auto"; } catch (_) {}
  applyTheme(saved);

  document.addEventListener("DOMContentLoaded", function () {
    const btn = document.getElementById("theme-toggle");
    if (btn) {
      btn.addEventListener("click", function () {
        const current = root.getAttribute("data-theme") || "auto";
        applyTheme(CYCLE[current] || "auto");
      });
    }
  });
})();

/* ============================================================
   Publications
   ============================================================ */

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderPub(pub) {
  const titleHtml = pub.url
    ? `<a href="${escapeHtml(pub.url)}" target="_blank" rel="noopener">${escapeHtml(pub.title)}</a>`
    : escapeHtml(pub.title);

  const metaParts = [];
  if (pub.authors) metaParts.push(escapeHtml(pub.authors));
  if (pub.journal) metaParts.push(`<em>${escapeHtml(pub.journal)}</em>`);

  return `
    <div class="pub-item">
      <div class="pub-title">${titleHtml}</div>
      ${metaParts.length ? `<div class="pub-meta">${metaParts.join(". ")}</div>` : ""}
    </div>`;
}

async function loadPublications() {
  const container = document.getElementById("publications-list");
  if (!container) return;

  try {
    const res = await fetch("publications.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const pubs = await res.json();

    if (!Array.isArray(pubs) || pubs.length === 0) {
      container.innerHTML = '<p class="pub-error">No publications found.</p>';
      return;
    }

    // Group by year
    const byYear = {};
    pubs.forEach(function (p) {
      const y = p.year || "n.d.";
      if (!byYear[y]) byYear[y] = [];
      byYear[y].push(p);
    });

    // Sort years descending; "n.d." always last
    const years = Object.keys(byYear).sort(function (a, b) {
      if (a === "n.d.") return 1;
      if (b === "n.d.") return -1;
      return Number(b) - Number(a);
    });

    container.innerHTML = years
      .map(function (year) {
        return `<div class="pub-year-group">
          <h3 class="pub-year-heading">${escapeHtml(String(year))}</h3>
          ${byYear[year].map(renderPub).join("")}
        </div>`;
      })
      .join("");
  } catch (err) {
    container.innerHTML = `
      <p class="pub-error">
        Could not load publications.
        <a href="https://orcid.org/0000-0002-0544-6533" target="_blank" rel="noopener">
          View on ORCID
        </a>
      </p>`;
    console.error("Publications load failed:", err);
  }
}

/* ============================================================
   Init
   ============================================================ */

document.addEventListener("DOMContentLoaded", function () {
  // Fill current year in footer
  const yearEl = document.getElementById("current-year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Load publications
  loadPublications();
});
