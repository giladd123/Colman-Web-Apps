// Statistics tab logic for the settings page
// Fetches aggregated habits data and renders Chart.js visuals

(function () {
  const palette = [
    "#e50914",
    "#e87c03",
    "#46d369",
    "#2fb7f5",
    "#a259ff",
    "#ffd700",
    "#4cc9f0",
    "#ff66c4",
  ];

  const selectors = {
    loading: "#statsLoadingState",
    content: "#statsContent",
    empty: "#statsEmptyState",
    popularityCanvas: "#contentPopularityChart",
    dailyCanvas: "#dailyWatchesChart",
  };

  const elements = {};
  let genreChart = null;
  let dailyChart = null;
  let hasLoaded = false;

  function initElements() {
    Object.entries(selectors).forEach(([key, selector]) => {
      elements[key] = document.querySelector(selector);
    });
  }

  function formatDateKey(date) {
    const working = new Date(date);
    working.setHours(0, 0, 0, 0);
    const year = working.getFullYear();
    const month = `${working.getMonth() + 1}`.padStart(2, "0");
    const day = `${working.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getLastNDaysKeys(days) {
    const keys = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let offset = days - 1; offset >= 0; offset -= 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - offset);
      keys.push(formatDateKey(d));
    }
    return keys;
  }

  function formatDateLabel(key) {
    const parts = key.split("-");
    if (parts.length !== 3) return key;
    const [year, month, day] = parts.map((part) => Number(part));
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  function hideAllStates() {
    elements.loading?.classList.add("d-none");
    elements.content?.classList.add("d-none");
    elements.empty?.classList.add("d-none");
  }

  function showLoadingState(message = "Loading statistics...") {
    if (!elements.loading) return;
    const spinner = elements.loading.querySelector(".spinner-border");
    spinner?.classList.remove("d-none");
    const text = elements.loading.querySelector("p");
    if (text) {
      text.textContent = message;
      text.classList.remove("text-danger");
      text.classList.add("text-secondary");
    }
    const retry = elements.loading.querySelector("#statsRetryBtn");
    retry?.remove();
    elements.loading.classList.remove("d-none");
    elements.content?.classList.add("d-none");
    elements.empty?.classList.add("d-none");
  }

  function showErrorState(message) {
    if (!elements.loading) return;
    const spinner = elements.loading.querySelector(".spinner-border");
    spinner?.classList.add("d-none");
    const text = elements.loading.querySelector("p");
    if (text) {
      text.textContent = message;
      text.classList.remove("text-secondary");
      text.classList.add("text-danger");
    }
    let retry = elements.loading.querySelector("#statsRetryBtn");
    if (!retry) {
      retry = document.createElement("button");
      retry.id = "statsRetryBtn";
      retry.type = "button";
      retry.className = "btn btn-outline-light btn-sm mt-3";
      retry.textContent = "Retry";
      elements.loading.appendChild(retry);
    }
    retry.onclick = () => {
      showLoadingState("Retrying...");
      fetchSummary();
    };
    elements.loading.classList.remove("d-none");
    elements.content?.classList.add("d-none");
    elements.empty?.classList.add("d-none");
  }

  function showContentState() {
    hideAllStates();
    elements.content?.classList.remove("d-none");
  }

  function showEmptyState() {
    hideAllStates();
    elements.empty?.classList.remove("d-none");
  }

  function destroyCharts() {
    if (genreChart) {
      genreChart.destroy();
      genreChart = null;
    }
    if (dailyChart) {
      dailyChart.destroy();
      dailyChart = null;
    }
  }

  function prepareDailyDataset(summary) {
    const { dailyWatches = [], profiles = [] } = summary;

    const dateKeys = getLastNDaysKeys(7);
    const watchMap = new Map();
    dailyWatches.forEach((entry) => {
      const key = `${entry.profileId}-${entry.date}`;
      watchMap.set(key, entry.total);
      if (!dateKeys.includes(entry.date)) {
        dateKeys.push(entry.date);
      }
    });

    dateKeys.sort();

    const datasets = profiles.map((profile, index) => {
      const color = palette[index % palette.length];
      return {
        label: profile.name,
        data: dateKeys.map((day) => watchMap.get(`${profile.id}-${day}`) || 0),
        backgroundColor: `${color}dd`,
        borderColor: color,
        borderWidth: 1,
        borderRadius: 6,
        maxBarThickness: 46,
      };
    });

    const labels = dateKeys.map((key) => formatDateLabel(key));
    return { labels, datasets };
  }

  function renderDailyChart(summary) {
    const ctx = elements.dailyCanvas?.getContext("2d");
    if (!ctx) return;

    const { labels, datasets } = prepareDailyDataset(summary);

    if (
      !datasets.length ||
      datasets.every((set) => set.data.every((value) => value === 0))
    ) {
      return false;
    }

    dailyChart = new Chart(ctx, {
      type: "bar",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: "#fff" },
          },
        },
        scales: {
          x: {
            stacked: true,
            ticks: { color: "#bbb" },
            grid: { color: "rgba(255,255,255,0.08)" },
          },
          y: {
            stacked: true,
            beginAtZero: true,
            ticks: { color: "#bbb" },
            grid: { color: "rgba(255,255,255,0.08)" },
          },
        },
      },
    });

    return true;
  }

  function renderGenreChart(summary) {
    const ctx = elements.popularityCanvas?.getContext("2d");
    if (!ctx) return;

    const entries = summary.genrePopularity || [];
    if (!entries.length) {
      return false;
    }

    const labels = entries.map((entry) => entry.genre || "Unknown");
    const data = entries.map((entry) => entry.total || 0);
    const colors = labels.map((_, index) => palette[index % palette.length]);

    genreChart = new Chart(ctx, {
      type: "pie",
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: colors,
            borderColor: colors.map(() => "rgba(0,0,0,0.4)"),
            borderWidth: 1,
          },
        ],
      },
      options: {
        plugins: {
          legend: {
            labels: { color: "#fff" },
          },
        },
      },
    });

    return true;
  }

  function handleSummaryResponse(summary) {
    destroyCharts();

    const hasDaily = renderDailyChart(summary);
    const hasGenre = renderGenreChart(summary);

    if (!hasDaily && !hasGenre) {
      showEmptyState();
    } else {
      showContentState();
    }
  }

  async function fetchSummary() {
    const session = await getSession()
    const userId = session?.userId;
    if (!userId) {
      showErrorState("Sign in to view statistics.");
      return;
    }

    try {
      showLoadingState();
      const response = await fetch(`/api/habits/user/${userId}/summary`);
      if (!response.ok) {
        throw new Error(`Failed to load statistics (${response.status})`);
      }
      const summary = await response.json();
      handleSummaryResponse(summary);
    } catch (error) {
      console.error(error);
      showErrorState("We couldn't load statistics. Please try again later.");
    }
  }

  function handleLoadStats() {
    if (hasLoaded) return;
    hasLoaded = true;
    initElements();
    fetchSummary();
  }

  document.addEventListener("settings:load-stats", handleLoadStats);
})();
