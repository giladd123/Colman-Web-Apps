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
  const res = await fetch(
    `/api/watchlist/${encodeURIComponent(profileName)}/${encodeURIComponent(
      contentId
    )}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }
  );
  return res.json();
}

async function apiRemoveFromWatchlist(profileName, contentId) {
  const res = await fetch(
    `/api/watchlist/${encodeURIComponent(profileName)}/${encodeURIComponent(
      contentId
    )}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    }
  );
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
  const profileName =
    window.currentProfileName || localStorage.getItem("selectedProfileName");
  if (!profileName) {
    alert("No profile selected.");
    return;
  }

  const icon = btn.querySelector("i");
  const currentlyInList = isInWatchlist(movie);

  // Optimistic UI update for all watchlist buttons of this content
  const allWatchlistBtns = document.querySelectorAll(
    `.watchlist-btn[data-id='${contentId}']`
  );
  allWatchlistBtns.forEach((b) => {
    const bIcon = b.querySelector("i");
    if (b !== btn) {
      if (!currentlyInList) {
        b.classList.add("in-list");
        animateWatchlistIcon(bIcon, true);
      } else {
        b.classList.remove("in-list");
        animateWatchlistIcon(bIcon, false);
      }
    }
  });
  // Animate only the clicked button
  if (!currentlyInList) {
    btn.classList.add("in-list");
    animateWatchlistIcon(icon, true);
  } else {
    btn.classList.remove("in-list");
    animateWatchlistIcon(icon, false);
  }

  // Optimistically update global feed data so 'My List' row updates immediately
  window.currentFeedData = window.currentFeedData || {};
  window.currentFeedData.myList = window.currentFeedData.myList || [];
  try {
    const idStr = String(contentIdFor(movie));
    if (!currentlyInList) {
      if (
        !window.currentFeedData.myList.some((c) => String(c._id || c) === idStr)
      ) {
        window.currentFeedData.myList.push(movie);
      }
    } else {
      window.currentFeedData.myList = window.currentFeedData.myList.filter(
        (c) => String(c._id || c) !== idStr
      );
    }
    if (typeof updateRowMovies === "function") {
      const updated = updateRowMovies(
        "My List",
        window.currentFeedData.myList || []
      );
      if (!updated && typeof renderFeed === "function")
        renderFeed(window.currentFeedData, profileName);
    } else if (typeof renderFeed === "function") {
      renderFeed(window.currentFeedData, profileName);
    }
  } catch (err) {
    console.error("Optimistic myList update failed:", err);
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
        if (
          !window.currentFeedData.myList.some(
            (c) => String(c._id || c) === String(contentId)
          )
        ) {
          window.currentFeedData.myList.push(movie);
        }
      } else {
        window.currentFeedData.myList = window.currentFeedData.myList.filter(
          (c) => String(c._id || c) !== String(contentId)
        );
      }

      // Update only the 'My List' row if present
      if (typeof updateRowMovies === "function") {
        const updated = updateRowMovies(
          "My List",
          window.currentFeedData.myList || []
        );
        if (!updated && typeof renderFeed === "function")
          renderFeed(window.currentFeedData, profileName);
      } else if (typeof renderFeed === "function") {
        renderFeed(window.currentFeedData, profileName);
      }
      // Update all watchlist buttons for this content
      const allWatchlistBtns = document.querySelectorAll(
        `.watchlist-btn[data-id='${contentId}']`
      );
      allWatchlistBtns.forEach((b) => {
        const bIcon = b.querySelector("i");
        if (b !== btn) {
          if (result.inWatchlist) {
            b.classList.add("in-list");
            animateWatchlistIcon(bIcon, true);
          } else {
            b.classList.remove("in-list");
            animateWatchlistIcon(bIcon, false);
          }
        }
      });
      // Animate only the clicked button
      if (result.inWatchlist) {
        btn.classList.add("in-list");
        animateWatchlistIcon(icon, true);
      } else {
        btn.classList.remove("in-list");
        animateWatchlistIcon(icon, false);
      }
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
      // Revert optimistic myList state and re-render rows
      try {
        window.currentFeedData = window.currentFeedData || {};
        window.currentFeedData.myList = window.currentFeedData.myList || [];
        const idStr = String(contentIdFor(movie));
        if (!currentlyInList) {
          // we had optimistically added it, remove
          window.currentFeedData.myList = window.currentFeedData.myList.filter(
            (c) => String(c._id || c) !== idStr
          );
        } else {
          // we had optimistically removed it, add back
          if (
            !window.currentFeedData.myList.some(
              (c) => String(c._id || c) === idStr
            )
          ) {
            window.currentFeedData.myList.push(movie);
          }
        }
        if (typeof updateRowMovies === "function") {
          const updated = updateRowMovies(
            "My List",
            window.currentFeedData.myList || []
          );
          if (!updated && typeof renderFeed === "function")
            renderFeed(window.currentFeedData, profileName);
        } else if (typeof renderFeed === "function") {
          renderFeed(window.currentFeedData, profileName);
        }
      } catch (revertErr) {
        console.error("Failed to revert optimistic myList state:", revertErr);
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
    // Revert optimistic myList state and re-render rows
    try {
      window.currentFeedData = window.currentFeedData || {};
      window.currentFeedData.myList = window.currentFeedData.myList || [];
      const idStr = String(contentIdFor(movie));
      if (!currentlyInList) {
        window.currentFeedData.myList = window.currentFeedData.myList.filter(
          (c) => String(c._id || c) !== idStr
        );
      } else {
        if (
          !window.currentFeedData.myList.some(
            (c) => String(c._id || c) === idStr
          )
        ) {
          window.currentFeedData.myList.push(movie);
        }
      }
      if (typeof renderFeed === "function")
        renderFeed(window.currentFeedData, profileName);
    } catch (revertErr) {
      console.error(
        "Failed to revert optimistic myList state after error:",
        revertErr
      );
    }
    console.error("Watchlist request failed:", err);
    alert("Failed to update watchlist. Try again.");
  }
}

function createWatchlistButton(movie) {
  const btn = document.createElement("button");
  btn.className = "watchlist-btn";
  btn.setAttribute("data-bs-toggle", "tooltip");

  const movieId =
    typeof contentIdFor === "function"
      ? contentIdFor(movie)
      : movie._id || null;
  if (movieId) btn.setAttribute("data-id", movieId);

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
