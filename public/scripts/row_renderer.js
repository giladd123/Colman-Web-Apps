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

// Helper: render cards for an array of movies into a given scroller
function renderCardsFor(scroller, movies) {
  movies.forEach((movie) => scroller.appendChild(createCard(movie)));
}

// Enable per-row horizontal infinite effect by tripling content and looping scrollLeft
function enableRowInfinite(scroller, movies) {
  try {
    if (!scroller || scroller.dataset.infinite === "1") return;
    if (!movies || !movies.length) return;

    // Rebuild content as [segment][segment][segment]
    scroller.innerHTML = "";
    renderCardsFor(scroller, movies);
    renderCardsFor(scroller, movies);
    renderCardsFor(scroller, movies);

    scroller.dataset.infinite = "1";

    // Position at middle segment after layout paints
    requestAnimationFrame(() => {
      const segment = scroller.scrollWidth / 3;
      scroller.dataset.segment = String(segment);
      scroller.scrollLeft = segment;
    });

    let rafId = null;
    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const segment = parseFloat(scroller.dataset.segment || "0") ||
          scroller.scrollWidth / 3;
        const left = scroller.scrollLeft;
        const tolerance = Math.max(2, segment * 0.02); // 2% tolerance or 2px
        const min = segment - tolerance;
        const max = segment * 2 + tolerance;

        if (left < min) {
          // Jump forward by one segment (disable smooth temporarily)
          const prev = scroller.style.scrollBehavior;
          scroller.style.scrollBehavior = "auto";
          scroller.scrollLeft = left + segment;
          scroller.style.scrollBehavior = prev;
        } else if (left > max) {
          const prev = scroller.style.scrollBehavior;
          scroller.style.scrollBehavior = "auto";
          scroller.scrollLeft = left - segment;
          scroller.style.scrollBehavior = prev;
        }
      });
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });

    // Recompute segment on resize
    const onResize = () => {
      const segment = scroller.scrollWidth / 3;
      scroller.dataset.segment = String(segment);
      // Keep user in middle band when resizing to reduce edge jumps
      const prev = scroller.style.scrollBehavior;
      scroller.style.scrollBehavior = "auto";
      scroller.scrollLeft = segment;
      scroller.style.scrollBehavior = prev;
    };
    window.addEventListener("resize", onResize);
  } catch (e) {
    console.error("enableRowInfinite failed:", e);
  }
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
    // Enable per-row horizontal infinite effect for overflowing rows
    // Recreate middle-after-paint to ensure widths are measured
    requestAnimationFrame(() => enableRowInfinite(scroller, movies));
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

  // Return the next rowIndex so callers can keep IDs unique across batches
  return rowIndex + 1;
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
      requestAnimationFrame(() => enableRowInfinite(newScroller, movies));
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
