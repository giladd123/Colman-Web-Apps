function createNoResultsMessage() {
  const noResult = document.createElement("p");
  noResult.textContent = "No results found";
  noResult.style.color = "white";
  noResult.style.fontSize = "1.5rem";
  noResult.style.textAlign = "center";
  return noResult;
}

function setGridLayout(container) {
  container.style.display = "flex";
  container.style.flexWrap = "wrap";
  container.style.gap = "8px";
  container.style.padding = "0";
}

function loadAndRender() {
  const content = document.getElementById("content");
  content.innerHTML = "";

  const chunks = chunkArray(movies, ROW_SIZE);
  chunks.forEach((chunk, i) => {
    const title = ROW_TITLES[i % ROW_TITLES.length];
    const row = createRow(title, chunk, i);
    content.appendChild(row);
  });
}

function renderContent(filtered) {
  const movieCards = document.getElementById("content");
  movieCards.innerHTML = ""; // clear previous content

  if (filtered.length === 0) {
    movieCards.appendChild(createNoResultsMessage());
    return;
  }

  setGridLayout(movieCards);

  filtered.forEach((movie) => {
    const card = createCard(movie);
    movieCards.appendChild(card);
  });
}
