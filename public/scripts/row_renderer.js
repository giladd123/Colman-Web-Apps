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

// Makes a scroller infinitely loop by cloning first and last few cards
function makeInfiniteScroller(scroller, cloneCount = 3) {
  let cards = Array.from(scroller.children);
  if (!cards.length) return;

  // If there are not enough original items to meaningfully clone, skip infinite behavior
  const originalCountBeforeCloning = cards.length;
  if (originalCountBeforeCloning <= cloneCount) return;

  // Clone cards
  const clonesLeft = cards.slice(-cloneCount).map((c) => c.cloneNode(true));
  const clonesRight = cards.slice(0, cloneCount).map((c) => c.cloneNode(true));

  clonesLeft.forEach((c) => scroller.insertBefore(c, scroller.firstChild));
  clonesRight.forEach((c) => scroller.appendChild(c));

  // Recalculate all cards including clones
  cards = Array.from(scroller.children);

  const cardWidth =
    cards[0].offsetWidth +
    parseInt(getComputedStyle(cards[0]).marginRight || 0);
  const originalCount = cards.length - cloneCount * 2; // exclude clones

  // Start scroll at first original card — set inside rAF to avoid layout/timing races
  requestAnimationFrame(() => {
    scroller.scrollLeft = cardWidth * cloneCount;
  });

  // Continuous scroll with small tolerance to avoid jumping due to fractional pixels
  const tolerance = 1; // pixels
  scroller.addEventListener("scroll", () => {
    requestAnimationFrame(() => {
      if (scroller.scrollLeft < cardWidth * cloneCount - tolerance) {
        scroller.scrollLeft += cardWidth * originalCount;
      } else if (
        scroller.scrollLeft >=
        cardWidth * (cloneCount + originalCount) - tolerance
      ) {
        scroller.scrollLeft -= cardWidth * originalCount;
      }
    });
  });
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

  // Enable infinite scrolling immediately
  if (scroller.scrollWidth > scroller.clientWidth) {
    // Ensure layout is ready
    Promise.all(
      [...scroller.querySelectorAll("img")].map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((res) => (img.onload = res))
      )
    ).then(() => {
      // Initialize infinite scroller after images/layout are ready.
      makeInfiniteScroller(scroller, 3);
    });
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
