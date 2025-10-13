// Gilad-Tidhar-325767929-Rotem-Batstein-325514917-Shani-Bashari-325953743

const ROW_SIZE = 12;
const ROW_TITLES = [
  "Popular",
  "Trending", 
  "Because you watched",
  "Watch it Again",
  "Top Rated",
  "Action",
];

function updateTooltip(el, text) {
  try {
    const inst = bootstrap.Tooltip.getInstance(el);
    if (inst) inst.dispose();
  } catch (e) {}
  el.setAttribute("title", text);
  el.setAttribute("data-bs-original-title", text);
  new bootstrap.Tooltip(el);
}

function chunkArray(items, chunkSize) {
  const chunks = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}
