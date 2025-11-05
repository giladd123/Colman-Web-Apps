function createRowTitle(title) {
  const h3 = document.createElement("h3");
  h3.className = "row-title";
  h3.textContent = title;
  return h3;
}

function createScrollButton(direction, iconClass) {
  const button = document.createElement("button");
  button.className = `scroll-btn ${direction}`;
  button.innerHTML = `<i class="bi ${iconClass} fs-3"></i>`;
  return button;
}

function createScrollContainer(movies, rowIndex) {
  const scroller = document.createElement("div");
  scroller.className = "scroll-container";
  scroller.id = `row-${rowIndex}`;

  movies.forEach((movie) => {
    const card = createCard(movie);
    scroller.appendChild(card);
  });

  return scroller;
}

function addScrollListeners(leftBtn, rightBtn, scroller) {
  leftBtn.addEventListener("click", () =>
    scroller.scrollBy({ left: -600, behavior: "smooth" })
  );
  rightBtn.addEventListener("click", () =>
    scroller.scrollBy({ left: 600, behavior: "smooth" })
  );
}

function createRow(title, movies, rowIndex) {
  const section = document.createElement("section");
  section.className = "row-section";

  const wrapper = document.createElement("div");
  wrapper.className = "scroll-wrapper";

  const leftBtn = createScrollButton("left", "bi-chevron-left");
  const rightBtn = createScrollButton("right", "bi-chevron-right");
  const scroller = createScrollContainer(movies, rowIndex);

  addScrollListeners(leftBtn, rightBtn, scroller);

  wrapper.appendChild(leftBtn);
  wrapper.appendChild(scroller);
  wrapper.appendChild(rightBtn);

  section.appendChild(createRowTitle(title));
  section.appendChild(wrapper);
  return section;
}
