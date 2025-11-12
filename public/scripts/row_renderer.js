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

// Render cards for an array of movies into a given scroller
function renderCardsFor(scroller, movies) {
  movies.forEach((movie) => scroller.appendChild(createCard(movie)));
}

// Disable infinite effect and restore original content
function disableRowInfinite(scroller, movies) {
  try {
    if (!scroller || scroller.dataset.infinite !== "1") return;

    // Restore original single set of content
    scroller.innerHTML = "";
    renderCardsFor(scroller, movies);
    scroller.scrollLeft = 0;
    scroller.dataset.infinite = "0";
    delete scroller.dataset.segment;
  } catch (e) {
    console.error("disableRowInfinite failed:", e);
  }
}

// Enable per-row horizontal infinite scrolling by creating multiple content segments
function enableRowInfinite(scroller, movies) {
  try {
    if (!scroller || scroller.dataset.infinite === "1") return;
    if (!movies || !movies.length) return;

    // Create 5 identical segments to provide smooth infinite scrolling
    scroller.innerHTML = "";
    renderCardsFor(scroller, movies); // segment 1
    renderCardsFor(scroller, movies); // segment 2
    renderCardsFor(scroller, movies); // segment 3 (center)
    renderCardsFor(scroller, movies); // segment 4
    renderCardsFor(scroller, movies); // segment 5

    scroller.dataset.infinite = "1";

    // Start viewing from the center segment to allow scrolling in both directions
    requestAnimationFrame(() => {
      const segment = scroller.scrollWidth / 5;
      scroller.dataset.segment = String(segment);
      scroller.scrollLeft = segment * 2; // Position at center segment
    });

    let rafId = null;
    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const segment =
          parseFloat(scroller.dataset.segment || "0") ||
          scroller.scrollWidth / 5;
        const left = scroller.scrollLeft;
        const tolerance = Math.max(2, segment * 0.02);
        const min = segment - tolerance; // Boundary near first segment
        const max = segment * 4 + tolerance; // Boundary near last segment

        if (left < min) {
          // User scrolled too far left, jump to equivalent position further right
          const prev = scroller.style.scrollBehavior;
          scroller.style.scrollBehavior = "auto";
          scroller.scrollLeft = left + segment * 2;
          scroller.style.scrollBehavior = prev;
        } else if (left > max) {
          // User scrolled too far right, jump to equivalent position further left
          const prev = scroller.style.scrollBehavior;
          scroller.style.scrollBehavior = "auto";
          scroller.scrollLeft = left - segment * 2;
          scroller.style.scrollBehavior = prev;
        }
      });
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });

    // Recalculate segment size when window is resized
    const onResize = () => {
      const segment = scroller.scrollWidth / 5;
      scroller.dataset.segment = String(segment);
      // Maintain center position after resize
      const prev = scroller.style.scrollBehavior;
      scroller.style.scrollBehavior = "auto";
      scroller.scrollLeft = segment * 2; // Keep at center segment
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

  // Show/hide scroll arrows based on content overflow
  if (scroller.scrollWidth > scroller.clientWidth) {
    leftBtn.style.display = "";
    rightBtn.style.display = "";
    // Enable infinite scroll for rows that have more content than fits
    requestAnimationFrame(() => enableRowInfinite(scroller, movies));
  } else {
    leftBtn.style.display = "none";
    rightBtn.style.display = "none";
  }

  // Handle arrow visibility and infinite scroll when window is resized
  window.addEventListener("resize", () => {
    const wasInfinite = scroller.dataset.infinite === "1";

    // Determine if content overflows based on current scroll state
    let hasOverflow;
    if (wasInfinite) {
      // When infinite scroll is active, check against individual segment width
      const segment = scroller.scrollWidth / 5;
      hasOverflow = segment > scroller.clientWidth;
    } else {
      // Normal overflow check against total content width
      hasOverflow = scroller.scrollWidth > scroller.clientWidth;
    }
    if (hasOverflow) {
      // Show scroll arrows when content exceeds container width
      leftBtn.style.display = "";
      rightBtn.style.display = "";
      // Enable infinite scrolling if not already active
      if (!wasInfinite) {
        requestAnimationFrame(() => enableRowInfinite(scroller, movies));
      }
    } else {
      // Hide scroll arrows when all content fits within container
      leftBtn.style.display = "none";
      rightBtn.style.display = "none";
      // Disable infinite scrolling if it was active
      if (wasInfinite) {
        disableRowInfinite(scroller, movies);
      }
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

    // Attach scroll button event listeners
    addScrollListeners(leftBtn, rightBtn, newScroller);

    // Configure arrow visibility and infinite scroll based on content overflow
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
