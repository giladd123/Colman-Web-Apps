// Settings & Profiles Manager + Statistics (Charts)
// Assumptions:
// - Environment variables SERVER_URL and SERVER_PORT exposed via global (window) or replaced at build. We'll fallback to localhost:3000.
// - Backend endpoints (REST):
//    GET    /profiles              -> list [{id,name,image_url}]
//    POST   /profiles              -> create {name,image_url}
//    PUT    /profiles/:id          -> update {name,image_url}
//    DELETE /profiles/:id          -> delete
// (If endpoints differ, adjust fetchProfile* functions.)


(function () {

  // ------------------- Statistics --------------------
  let dailyChartInstance = null;
  let popularityChartInstance = null;

  function generateDailyWatchesData() {
    const days = [...Array(7)].map((_, i) => {
      const d = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
      return d.toLocaleDateString(undefined, { weekday: "short" });
    });
    const stored = JSON.parse(localStorage.getItem('profilesCache') || '[]');
    const datasets = (stored || []).map((p) => ({
      label: p.name,
      data: days.map(() => Math.floor(Math.random() * 11)),
      borderWidth: 1,
    }));
    const palette = ["#e50914", "#e87c03", "#46d369", "#2fb7f5", "#a259ff", "#ffd700"];
    datasets.forEach((ds, i) => {
      const c = palette[i % palette.length];
      ds.backgroundColor = c + "80";
      ds.borderColor = c;
    });
    return { days, datasets };
  }

  function generateContentPopularity() {
    const likesDataAll = JSON.parse(localStorage.getItem("likesData")) || {};
    const totals = Object.entries(likesDataAll).map(([id, entry]) => ({
      id,
      total: Number(entry.base || 0) + Number(entry.extra || 0),
    }));
    totals.sort((a, b) => b.total - a.total);
    const top = totals.slice(0, 6);
    const labels = top.map((t) => t.id);
    const data = top.map((t) => t.total);
    const colors = ["#e50914", "#e87c03", "#46d369", "#2fb7f5", "#a259ff", "#ffd700"];
    return { labels, data, colors };
  }

  function renderStatistics() {
    const dailyCtx = document.getElementById("dailyWatchesChart");
    const popularityCtx = document.getElementById("contentPopularityChart");
    if (!dailyCtx || !popularityCtx) return;

    const { days, datasets } = generateDailyWatchesData();
    if (dailyChartInstance) {
      dailyChartInstance.destroy();
    }
    dailyChartInstance = new Chart(dailyCtx, {
      type: "bar",
      data: { labels: days, datasets },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: "#fff" } } },
        scales: {
          x: { ticks: { color: "#bbb" }, grid: { color: "rgba(255,255,255,0.1)" } },
          y: { ticks: { color: "#bbb" }, grid: { color: "rgba(255,255,255,0.1)" }, beginAtZero: true },
        },
      },
    });

    const { labels, data, colors } = generateContentPopularity();
    if (popularityChartInstance) {
      popularityChartInstance.destroy();
    }
    popularityChartInstance = new Chart(popularityCtx, {
      type: "pie",
      data: { labels, datasets: [{ data, backgroundColor: colors }] },
      options: { plugins: { legend: { labels: { color: "#fff" } } } },
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!document.getElementById("settingsModal")) return;
    // Initialize stats immediately (single-tab modal)
    renderStatistics();
  });
})();
