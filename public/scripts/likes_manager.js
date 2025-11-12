// Helper: get content id (prefer Mongo _id) used for server calls
function contentIdFor(movie) {
  if (!movie) {
    console.error("No movie object provided to contentIdFor");
    return null;
  }
  // Always use Mongo _id for API calls
  return movie._id || null;
}

// Helper: check if this movie is liked in current profile's feedData
function isLikedInProfile(movie) {
  try {
    const likedArr = window.currentFeedData?.likedBy || [];
    if (!likedArr || !likedArr.length) return false;
    const id = String(contentIdFor(movie));
    return likedArr.some((c) => String(c._id || c) === id);
  } catch (err) {
    return false;
  }
}

function animateLikeIcon(icon, isLiking) {
  if (!icon) return;

  if (isLiking) {
    icon.classList.replace("bi-heart", "bi-heart-fill");
    icon.classList.remove("like-animate");
    void icon.offsetWidth;
    icon.classList.add("like-animate");
    setTimeout(() => icon.classList.remove("like-animate"), 450);
  } else {
    icon.classList.replace("bi-heart-fill", "bi-heart");
    icon.classList.remove("unlike-animate");
    void icon.offsetWidth;
    icon.classList.add("unlike-animate");
    setTimeout(() => icon.classList.remove("unlike-animate"), 300);
  }
}

// Server API helpers for likes
async function apiAddLike(profileName, contentId) {
  try {
    const res = await fetch(
      `/api/likes/${encodeURIComponent(profileName)}/${encodeURIComponent(
        contentId
      )}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to add like");
    }

    return res.json();
  } catch (err) {
    console.error("Error in apiAddLike:", err);
    throw err;
  }
}

async function apiRemoveLike(profileName, contentId) {
  try {
    const res = await fetch(
      `/api/likes/${encodeURIComponent(profileName)}/${encodeURIComponent(
        contentId
      )}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to remove like");
    }

    return res.json();
  } catch (err) {
    console.error("Error in apiRemoveLike:", err);
    throw err;
  }
}

function updateLikeButton(likeBtn, cur) {
  const newTotal = cur.base + cur.extra;
  const countEl = likeBtn.querySelector(".like-count");
  if (countEl) countEl.textContent = newTotal;

  likeBtn.setAttribute("aria-pressed", cur.liked ? "true" : "false");
  likeBtn.setAttribute(
    "aria-label",
    cur.liked ? "Unlike this movie" : "Like this movie"
  );

  const newTooltip = cur.liked ? `Unlike 💔` : "Like ❤️";
  updateTooltip(likeBtn, newTooltip);
}

async function handleLikeClick(likeBtn, movie, entry) {
  // Determine content id used by server
  const contentId = contentIdFor(movie);
  if (!contentId) {
    console.error("Invalid content ID for movie:", movie);
    alert("Could not determine content ID. Please try again.");
    return;
  }

  const profileName =
    window.currentProfile?.name || localStorage.getItem("selectedProfileName");
  if (!profileName) {
    // not logged in or profile not set
    alert("No profile selected.");
    return;
  }

  const icon = likeBtn.querySelector("i");
  const currentlyLiked = isLikedInProfile(movie);

  // Get current count and update optimistically
  const countEl = likeBtn.querySelector(".like-count");
  const currentCount = parseInt(countEl.textContent) || 0;

  // Optimistic UI: toggle immediately and update count for all like buttons of this content
  const allLikeBtns = document.querySelectorAll(
    `.like-btn[data-id='${contentId}']`
  );
  allLikeBtns.forEach((btn) => {
    const btnIcon = btn.querySelector("i");
    const btnCountEl = btn.querySelector(".like-count");
    const btnCurrentCount = parseInt(btnCountEl.textContent) || 0;
    // Only animate if not the button that was directly clicked
    if (btn !== likeBtn) {
      if (!currentlyLiked) {
        btn.classList.add("liked");
        animateLikeIcon(btnIcon, true);
        btnCountEl.textContent = btnCurrentCount + 1;
      } else {
        btn.classList.remove("liked");
        animateLikeIcon(btnIcon, false);
        btnCountEl.textContent = Math.max(0, btnCurrentCount - 1);
      }
    }
  });
  // Animate only the clicked button
  if (!currentlyLiked) {
    likeBtn.classList.add("liked");
    animateLikeIcon(icon, true);
    countEl.textContent = currentCount + 1;
  } else {
    likeBtn.classList.remove("liked");
    animateLikeIcon(icon, false);
    countEl.textContent = Math.max(0, currentCount - 1);
  }

  // Optimistically update global feed data so rows update immediately
  window.currentFeedData = window.currentFeedData || {};
  window.currentFeedData.likedBy = window.currentFeedData.likedBy || [];
  try {
    const idStr = String(contentIdFor(movie));
    if (!currentlyLiked) {
      if (
        !window.currentFeedData.likedBy.some(
          (c) => String(c._id || c) === idStr
        )
      ) {
        window.currentFeedData.likedBy.push(movie);
      }
    } else {
      window.currentFeedData.likedBy = window.currentFeedData.likedBy.filter(
        (c) => String(c._id || c) !== idStr
      );
    }
    // Try to update only the 'Liked by' row; fall back to full re-render
    const rowTitle = `Liked by ${profileName}`;
    if (typeof updateRowMovies === "function") {
      const updated = updateRowMovies(
        rowTitle,
        window.currentFeedData.likedBy || []
      );
      if (!updated && typeof renderFeed === "function")
        renderFeed(window.currentFeedData, profileName);
    } else if (typeof renderFeed === "function") {
      renderFeed(window.currentFeedData, profileName);
    }
  } catch (err) {
    console.error("Optimistic likedBy update failed:", err);
  }

  try {
    let result;
    if (!currentlyLiked) {
      result = await apiAddLike(profileName, contentId);
    } else {
      result = await apiRemoveLike(profileName, contentId);
    }

    if (result && result.success) {
      // Update movie with latest data from server
      if (result.content) {
        Object.assign(movie, result.content);
      }

      // Ensure server state matches client state (idempotent)
      window.currentFeedData = window.currentFeedData || {};
      window.currentFeedData.likedBy = window.currentFeedData.likedBy || [];
      if (result.liked) {
        if (
          !window.currentFeedData.likedBy.some(
            (c) => String(c._id || c) === String(contentId)
          )
        ) {
          window.currentFeedData.likedBy.push(movie);
        }
      } else {
        window.currentFeedData.likedBy = window.currentFeedData.likedBy.filter(
          (c) => String(c._id || c) !== String(contentId)
        );
      }

      // Update the like count and heart for all like buttons of this content
      if (result.content) {
        const allLikeBtns = document.querySelectorAll(
          `.like-btn[data-id='${contentId}']`
        );
        allLikeBtns.forEach((btn) => {
          const btnIcon = btn.querySelector("i");
          const btnCountEl = btn.querySelector(".like-count");
          btnCountEl.textContent = result.content.popularity || 0;
          // Only animate if not the button that was directly clicked
          if (btn !== likeBtn) {
            if (result.liked) {
              btn.classList.add("liked");
              animateLikeIcon(btnIcon, true);
            } else {
              btn.classList.remove("liked");
              animateLikeIcon(btnIcon, false);
            }
          } else {
            // Only update state, skip animation for clicked button
            if (result.liked) {
              btn.classList.add("liked");
            } else {
              btn.classList.remove("liked");
            }
          }
        });
      }

      // Update only the 'Liked by' row if possible
      const rowTitle = `Liked by ${profileName}`;
      if (typeof updateRowMovies === "function") {
        const updated = updateRowMovies(
          rowTitle,
          window.currentFeedData.likedBy || []
        );
        if (!updated && typeof renderFeed === "function")
          renderFeed(window.currentFeedData, profileName);
      } else if (typeof renderFeed === "function") {
        renderFeed(window.currentFeedData, profileName);
      }
      const fakeEntry = {
        base: result.content?.popularity || 0,
        extra: 0,
        liked: result.liked,
      };
      updateLikeButton(likeBtn, fakeEntry);
    } else {
      // revert UI and count on failure
      const countEl = likeBtn.querySelector(".like-count");
      const currentCount = parseInt(countEl.textContent) || 0;
      if (!currentlyLiked) {
        likeBtn.classList.remove("liked");
        animateLikeIcon(icon, false);
        countEl.textContent = Math.max(0, currentCount - 1);
      } else {
        likeBtn.classList.add("liked");
        animateLikeIcon(icon, true);
        countEl.textContent = currentCount + 1;
      }
      // Revert optimistic global state and re-render rows
      try {
        window.currentFeedData = window.currentFeedData || {};
        window.currentFeedData.likedBy = window.currentFeedData.likedBy || [];
        const idStr = String(contentIdFor(movie));
        if (!currentlyLiked) {
          // we had optimistically added it, remove
          window.currentFeedData.likedBy =
            window.currentFeedData.likedBy.filter(
              (c) => String(c._id || c) !== idStr
            );
        } else {
          // we had optimistically removed it, add back
          if (
            !window.currentFeedData.likedBy.some(
              (c) => String(c._id || c) === idStr
            )
          ) {
            window.currentFeedData.likedBy.push(movie);
          }
        }
        if (typeof updateRowMovies === "function") {
          const updated = updateRowMovies(
            `Liked by ${profileName}`,
            window.currentFeedData.likedBy || []
          );
          if (!updated && typeof renderFeed === "function")
            renderFeed(window.currentFeedData, profileName);
        } else if (typeof renderFeed === "function") {
          renderFeed(window.currentFeedData, profileName);
        }
      } catch (revertErr) {
        console.error("Failed to revert optimistic likedBy state:", revertErr);
      }
      console.error("Like API error:", result);
      alert("Failed to update like. Try again.");
    }
  } catch (err) {
    // revert UI and count on error
    const countEl = likeBtn.querySelector(".like-count");
    const currentCount = parseInt(countEl.textContent) || 0;
    if (!currentlyLiked) {
      likeBtn.classList.remove("liked");
      animateLikeIcon(icon, false);
      countEl.textContent = Math.max(0, currentCount - 1);
    } else {
      likeBtn.classList.add("liked");
      animateLikeIcon(icon, true);
      countEl.textContent = currentCount + 1;
    }
    // Revert optimistic global state and re-render rows
    try {
      window.currentFeedData = window.currentFeedData || {};
      window.currentFeedData.likedBy = window.currentFeedData.likedBy || [];
      const idStr = String(contentIdFor(movie));
      if (!currentlyLiked) {
        window.currentFeedData.likedBy = window.currentFeedData.likedBy.filter(
          (c) => String(c._id || c) !== idStr
        );
      } else {
        if (
          !window.currentFeedData.likedBy.some(
            (c) => String(c._id || c) === idStr
          )
        ) {
          window.currentFeedData.likedBy.push(movie);
        }
      }
      if (typeof renderFeed === "function")
        renderFeed(window.currentFeedData, profileName);
    } catch (revertErr) {
      console.error(
        "Failed to revert optimistic likedBy state after error:",
        revertErr
      );
    }
    console.error("Like request failed:", err);
    alert("Failed to update like. Try again.");
  }
}

function createLikeButton(movie) {
  const likeBtn = document.createElement("button");
  likeBtn.className = "like-btn";
  likeBtn.setAttribute("data-bs-toggle", "tooltip");

  const movieId = contentIdFor(movie);
  if (movieId) likeBtn.setAttribute("data-id", movieId);

  // entry shape is only used for count display; keep compatibility with existing logic
  const entry = {
    base: movie.popularity || 0,
    extra: 0,
    liked: isLikedInProfile(movie),
  };
  const totalLikes = movie.popularity || 0;

  const icon = document.createElement("i");
  icon.className = `bi ${entry.liked ? "bi-heart-fill" : "bi-heart"} pe-1`;

  if (entry.liked) likeBtn.classList.add("liked");

  const countSpan = document.createElement("span");
  countSpan.className = "like-count";
  countSpan.textContent = totalLikes;

  likeBtn.appendChild(icon);
  likeBtn.appendChild(countSpan);
  likeBtn.setAttribute("aria-pressed", entry.liked ? "true" : "false");
  likeBtn.setAttribute(
    "aria-label",
    entry.liked ? "Unlike this movie" : "Like this movie"
  );

  const tooltipText = entry.liked ? `Unlike 💔` : "Like ❤️";
  updateTooltip(likeBtn, tooltipText);

  likeBtn.addEventListener("click", () =>
    handleLikeClick(likeBtn, movie, entry)
  );

  return likeBtn;
}
