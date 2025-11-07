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
  if (!scroller) return;

  const scrollAmount = Math.round(scroller.clientWidth * 0.6);

  if (leftBtn) {
    leftBtn.onclick = null;
    leftBtn.addEventListener("click", () => {
      scroller.scrollBy({ left: -scrollAmount, behavior: "smooth" });
    });
  }

  if (rightBtn) {
    rightBtn.onclick = null;
    rightBtn.addEventListener("click", () => {
      scroller.scrollBy({ left: scrollAmount, behavior: "smooth" });
    });
  }
}

function createRow(title, movies, rowIndex) {
  const section = document.createElement("section");
  section.className = "row-section";

  const wrapper = document.createElement("div");
  wrapper.className = "scroll-wrapper";

  const leftBtn = createScrollButton("left", "bi-chevron-left");
  const rightBtn = createScrollButton("right", "bi-chevron-right");

  const scroller = document.createElement("div");
  scroller.className = "scroll-container";
  scroller.id = `row-${rowIndex}`;

  movies.forEach((movie) => scroller.appendChild(createCard(movie)));

  wrapper.appendChild(leftBtn);
  wrapper.appendChild(scroller);
  wrapper.appendChild(rightBtn);

  section.appendChild(createRowTitle(title));
  section.appendChild(wrapper);

  document.getElementById("content").appendChild(section);

  addScrollListeners(leftBtn, rightBtn, scroller);

  // Show/hide arrows based on overflow
  if (scroller.scrollWidth > scroller.clientWidth) {
    leftBtn.style.display = "";
    rightBtn.style.display = "";
  } else {
    leftBtn.style.display = "none";
    rightBtn.style.display = "none";
  }

  // Update arrows on resize
  window.addEventListener("resize", () => {
    if (scroller.scrollWidth <= scroller.clientWidth) {
      leftBtn.style.display = "none";
      rightBtn.style.display = "none";
    } else {
      leftBtn.style.display = "";
      rightBtn.style.display = "";
    }
  });

  return section;
}

// Replace the movies inside an existing row matching the given title.
// Returns true if the row was found and updated, false otherwise.
function updateRowMovies(title, movies) {
  try {
    const titles = Array.from(document.querySelectorAll(".row-title"));
    const match = titles.find((h3) => h3.textContent.trim() === title);
    if (!match) return false;

    const section = match.closest("section.row-section");
    if (!section) return false;

    // If there are no movies, remove the entire section so the title doesn't remain
    if (!movies || !movies.length) {
      section.remove();
      return true;
    }

    const wrapper = section.querySelector(".scroll-wrapper");
    if (!wrapper) return false;

    const leftBtn = wrapper.querySelector(".scroll-btn.left");
    const rightBtn = wrapper.querySelector(".scroll-btn.right");
    const oldScroller = wrapper.querySelector(".scroll-container");
    const scrollerId = oldScroller
      ? oldScroller.id
      : `row-updated-${Date.now()}`;

    // Create fresh scroller and populate
    const newScroller = document.createElement("div");
    newScroller.className = "scroll-container";
    newScroller.id = scrollerId;

    movies.forEach((movie) => newScroller.appendChild(createCard(movie)));

    // Replace the old scroller with the new one (preserve button positions)
    if (oldScroller) wrapper.replaceChild(newScroller, oldScroller);
    else if (rightBtn) wrapper.insertBefore(newScroller, rightBtn);
    else wrapper.appendChild(newScroller);

    // Reattach listeners
    addScrollListeners(leftBtn, rightBtn, newScroller);

    // Show/hide arrows based on overflow
    if (newScroller.scrollWidth > newScroller.clientWidth) {
      if (leftBtn) leftBtn.style.display = "";
      if (rightBtn) rightBtn.style.display = "";
    } else {
      if (leftBtn) leftBtn.style.display = "none";
      if (rightBtn) rightBtn.style.display = "none";
    }

    return true;
  } catch (err) {
    console.error("updateRowMovies failed:", err);
    return false;
  }
}
