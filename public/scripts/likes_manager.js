// Gilad-Tidhar-325767929-Rotem-Batstein-325514917-Shani-Bashari-325953743

function getOrCreateLikesData(movieId) {
  const likesDataAll = JSON.parse(localStorage.getItem("likesData")) || {};
  
  let entry = likesDataAll[movieId];
  if (!entry) {
    entry = {
      base: Math.floor(Math.random() * (500 - 50 + 1)) + 50,
      extra: 0,
      liked: false,
    };
    likesDataAll[movieId] = entry;
    localStorage.setItem("likesData", JSON.stringify(likesDataAll));
  }

  entry.base = Number(entry.base);
  entry.extra = Number(entry.extra);
  
  return entry;
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

function updateLikeButton(likeBtn, cur) {
  const newTotal = cur.base + cur.extra;
  const countEl = likeBtn.querySelector(".like-count");
  if (countEl) countEl.textContent = newTotal;

  likeBtn.setAttribute("aria-pressed", cur.liked ? "true" : "false");
  likeBtn.setAttribute("aria-label", cur.liked ? "Unlike this movie" : "Like this movie");
  
  const newTooltip = cur.liked ? `Unlike 💔` : "Like ❤️";
  updateTooltip(likeBtn, newTooltip);
}

function handleLikeClick(likeBtn, movieId, entry) {
  const stored = JSON.parse(localStorage.getItem("likesData")) || {};
  const cur = stored[movieId] || {
    base: entry.base,
    extra: entry.extra,
    liked: entry.liked,
  };

  const icon = likeBtn.querySelector("i");

  if (!cur.liked) {
    cur.liked = true;
    cur.extra = (cur.extra || 0) + 1;
    likeBtn.classList.add("liked");
    animateLikeIcon(icon, true);
  } else {
    cur.liked = false;
    cur.extra = Math.max(0, (cur.extra || 0) - 1);
    likeBtn.classList.remove("liked");
    animateLikeIcon(icon, false);
  }

  stored[movieId] = cur;
  localStorage.setItem("likesData", JSON.stringify(stored));
  updateLikeButton(likeBtn, cur);
}

function createLikeButton(movie) {
  const likeBtn = document.createElement("button");
  likeBtn.className = "like-btn";
  likeBtn.setAttribute("data-bs-toggle", "tooltip");

  const movieId = movie.imdbID || movie.Title;
  const entry = getOrCreateLikesData(movieId);
  const totalLikes = entry.base + entry.extra;

  const icon = document.createElement("i");
  icon.className = `bi ${entry.liked ? "bi-heart-fill" : "bi-heart"} pe-1`;

  const countSpan = document.createElement("span");
  countSpan.className = "like-count";
  countSpan.textContent = totalLikes;

  likeBtn.appendChild(icon);
  likeBtn.appendChild(countSpan);
  likeBtn.setAttribute("aria-pressed", entry.liked ? "true" : "false");
  likeBtn.setAttribute("aria-label", entry.liked ? "Unlike this movie" : "Like this movie");

  const tooltipText = entry.liked ? `Unlike 💔` : "Like ❤️";
  updateTooltip(likeBtn, tooltipText);

  likeBtn.addEventListener("click", () => handleLikeClick(likeBtn, movieId, entry));

  return likeBtn;
}
