function createMovieBadge(movie) {
  const badge = document.createElement("span");
  badge.className = "badge-pill";
  badge.textContent = movie.imdbRating
    ? `${movie.imdbRating}`
    : movie.releaseYear || "";
  return badge;
}

function createMovieImage(movie) {
  const img = document.createElement("img");
  img.className = "movie-poster";
  img.alt = movie.title || "Poster";
  img.src = movie.posterUrl;
  img.loading = "lazy";
  return img;
}

function createCard(movie) {
  const card = document.createElement("div");
  card.className = "movie-card";

  card.appendChild(createMovieImage(movie));
  card.appendChild(createMovieBadge(movie));

  // Create container for like and watchlist buttons
  const actionsContainer = document.createElement("div");
  actionsContainer.className = "actions-container";
  actionsContainer.appendChild(createWatchlistButton(movie));
  actionsContainer.appendChild(createLikeButton(movie));
  card.appendChild(actionsContainer);

  return card;
}
