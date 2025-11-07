// Add to watchlist button functionality
function isInWatchlist(movie) {
  try {
    const watchlist = window.currentFeedData?.myList || [];
    if (!watchlist || !watchlist.length) return false;
    const id = String(contentIdFor(movie));
    return watchlist.some((c) => String(c._id || c) === id);
  } catch (err) {
    return false;
  }
}

async function apiAddToWatchlist(profileName, contentId) {
  const res = await fetch(`/api/watchlist/${encodeURIComponent(profileName)}/${encodeURIComponent(contentId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  return res.json();
}

async function apiRemoveFromWatchlist(profileName, contentId) {
  const res = await fetch(`/api/watchlist/${encodeURIComponent(profileName)}/${encodeURIComponent(contentId)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  return res.json();
}

function animateWatchlistIcon(icon, isAdding) {
  if (!icon) return;

  if (isAdding) {
    icon.classList.replace("bi-plus", "bi-check2");
    icon.classList.remove("add-animate");
    void icon.offsetWidth;
    icon.classList.add("add-animate");
    setTimeout(() => icon.classList.remove("add-animate"), 450);
  } else {
    icon.classList.replace("bi-check2", "bi-plus");
    icon.classList.remove("remove-animate");
    void icon.offsetWidth;
    icon.classList.add("remove-animate");
    setTimeout(() => icon.classList.remove("remove-animate"), 300);
  }
}

function updateWatchlistButton(btn, inList) {
  btn.setAttribute("aria-pressed", inList ? "true" : "false");
  btn.setAttribute(
    "aria-label",
    inList ? "Remove from My List" : "Add to My List"
  );
  const newTooltip = inList ? "Remove from My List" : "Add to My List";
  updateTooltip(btn, newTooltip);
}

async function handleWatchlistClick(btn, movie) {
  const contentId = contentIdFor(movie);
  const profileName = window.currentProfileName || localStorage.getItem("selectedProfileName");
  if (!profileName) {
    alert("No profile selected.");
    return;
  }

  const icon = btn.querySelector("i");
  const currentlyInList = isInWatchlist(movie);

  // Optimistic UI update
  if (!currentlyInList) {
    btn.classList.add("in-list");
    animateWatchlistIcon(icon, true);
  } else {
    btn.classList.remove("in-list");
    animateWatchlistIcon(icon, false);
  }

  try {
    let result;
    if (!currentlyInList) {
      result = await apiAddToWatchlist(profileName, contentId);
    } else {
      result = await apiRemoveFromWatchlist(profileName, contentId);
    }

    if (result && result.success) {
      // Update window.currentFeedData.myList
      window.currentFeedData = window.currentFeedData || {};
      window.currentFeedData.myList = window.currentFeedData.myList || [];
      if (result.inWatchlist) {
        if (!window.currentFeedData.myList.some((c) => String(c._id || c) === String(contentId))) {
          window.currentFeedData.myList.push(movie);
        }
      } else {
        window.currentFeedData.myList = window.currentFeedData.myList.filter(
          (c) => String(c._id || c) !== String(contentId)
        );
      }

      // Update button state
      updateWatchlistButton(btn, result.inWatchlist);
    } else {
      // Revert UI on failure
      if (!currentlyInList) {
        btn.classList.remove("in-list");
        animateWatchlistIcon(icon, false);
      } else {
        btn.classList.add("in-list");
        animateWatchlistIcon(icon, true);
      }
      console.error("Watchlist API error:", result);
      alert("Failed to update watchlist. Try again.");
    }
  } catch (err) {
    // Revert UI on error
    if (!currentlyInList) {
      btn.classList.remove("in-list");
      animateWatchlistIcon(icon, false);
    } else {
      btn.classList.add("in-list");
      animateWatchlistIcon(icon, true);
    }
    console.error("Watchlist request failed:", err);
    alert("Failed to update watchlist. Try again.");
  }
}

function createWatchlistButton(movie) {
  const btn = document.createElement("button");
  btn.className = "watchlist-btn";
  btn.setAttribute("data-bs-toggle", "tooltip");

  const inList = isInWatchlist(movie);
  if (inList) btn.classList.add("in-list");

  const icon = document.createElement("i");
  icon.className = `bi ${inList ? "bi-check2" : "bi-plus"}`;
  btn.appendChild(icon);

  btn.setAttribute("aria-pressed", inList ? "true" : "false");
  btn.setAttribute(
    "aria-label",
    inList ? "Remove from My List" : "Add to My List"
  );

  const tooltipText = inList ? "Remove from My List" : "Add to My List";
  updateTooltip(btn, tooltipText);

  btn.addEventListener("click", () => handleWatchlistClick(btn, movie));

  return btn;
}