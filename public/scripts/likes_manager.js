// Helper: get content id (prefer Mongo _id) used for server calls
function contentIdFor(movie) {
  return movie._id || movie.imdbID || movie.Title;
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
  const res = await fetch(`/api/likes/${encodeURIComponent(profileName)}/${encodeURIComponent(contentId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  return res.json();
}

async function apiRemoveLike(profileName, contentId) {
  const res = await fetch(`/api/likes/${encodeURIComponent(profileName)}/${encodeURIComponent(contentId)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  return res.json();
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
  const profileName = window.currentProfileName || localStorage.getItem("selectedProfileName");
  if (!profileName) {
    // not logged in or profile not set
    alert("No profile selected.");
    return;
  }

  const icon = likeBtn.querySelector("i");
  const currentlyLiked = isLikedInProfile(movie);

  // Optimistic UI: toggle immediately
  if (!currentlyLiked) {
    likeBtn.classList.add("liked");
    animateLikeIcon(icon, true);
  } else {
    likeBtn.classList.remove("liked");
    animateLikeIcon(icon, false);
  }

  try {
    let result;
    if (!currentlyLiked) {
      result = await apiAddLike(profileName, contentId);
    } else {
      result = await apiRemoveLike(profileName, contentId);
    }

    if (result && result.success) {
      // Update window.currentFeedData.likedBy so other cards know the new state
      window.currentFeedData = window.currentFeedData || {};
      window.currentFeedData.likedBy = window.currentFeedData.likedBy || [];
      if (result.liked) {
        // if server added, push a minimal representation if it's not present
        if (!window.currentFeedData.likedBy.some((c) => String(c._id || c) === String(contentId))) {
          // push the movie object (server will provide id match)
          window.currentFeedData.likedBy.push(movie);
        }
      } else {
        window.currentFeedData.likedBy = window.currentFeedData.likedBy.filter(
          (c) => String(c._id || c) !== String(contentId)
        );
      }

      // Update button aria/tooltip
      const fakeEntry = { base: entry.base || 0, extra: entry.extra || 0, liked: result.liked };
      updateLikeButton(likeBtn, fakeEntry);
    } else {
      // revert UI on failure
      if (!currentlyLiked) {
        likeBtn.classList.remove("liked");
        animateLikeIcon(icon, false);
      } else {
        likeBtn.classList.add("liked");
        animateLikeIcon(icon, true);
      }
      console.error("Like API error:", result);
      alert("Failed to update like. Try again.");
    }
  } catch (err) {
    // revert UI on error
    if (!currentlyLiked) {
      likeBtn.classList.remove("liked");
      animateLikeIcon(icon, false);
    } else {
      likeBtn.classList.add("liked");
      animateLikeIcon(icon, true);
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
  // entry shape is only used for count display; keep compatibility with existing logic
  const entry = { base: movie.popularity || 0, extra: 0, liked: isLikedInProfile(movie) };
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
