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
  card.appendChild(createLikeButton(movie));
  const id = movie.imdbID;
  card.addEventListener('click', () => {
      if (movie && movie.imdbID) {
        window.location.href = `/select-content/${movie.imdbID}`; 
      } else {
        console.error("Movie data or imdbID missing, cannot redirect."); 
      }
    });

  return card;
}
