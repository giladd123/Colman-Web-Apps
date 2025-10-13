// Gilad-Tidhar-325767929-Rotem-Batstein-325514917-Shani-Bashari-325953743

function createMovieBadge(movie) {
  const badge = document.createElement("span");
  badge.className = "badge-pill";
  badge.textContent = movie.imdbRating ? `${movie.imdbRating}` : movie.Year || "";
  return badge;
}

function createMovieImage(movie) {
  const img = document.createElement("img");
  img.className = "movie-poster";
  img.alt = movie.Title || "Poster";
  img.src = movie.Poster;
  img.loading = "lazy";
  return img;
}

function createCard(movie) {
  const card = document.createElement("div");
  card.className = "movie-card";

  card.appendChild(createMovieImage(movie));
  card.appendChild(createMovieBadge(movie));
  card.appendChild(createLikeButton(movie));

  return card;
}
