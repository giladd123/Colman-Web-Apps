document.addEventListener('DOMContentLoaded', () => {
    // Helper to find elements
    const $ = (sel) => document.querySelector(sel);

    // --- 1. MAIN FUNCTION: LOAD CONTENT ---
    async function loadContent() {
        try {
            // 1. Get the content ID from the page's URL
            const contentId = window.location.pathname.split('/').pop();
            if (!contentId) {
                throw new Error("No content ID in URL");
            }

            // 2. Fetch data from our API endpoint
            const response = await fetch(`/select-content/api/data/${contentId}`);
            
            // 3. Check for server errors (like 404 or 500)
            if (!response.ok) {
                const err = await response.json(); // Get error message from server
                throw new Error(err.error || "Failed to fetch content data");
            }

            // 4. Get the JSON data
            const { content, similarContent } = await response.json();

            if (!content) {
                throw new Error("No content returned from API");
            }

            // 5. Call render functions
            renderHero(content);
            renderDetails(content);
            renderSimilar(similarContent);

            // 6. Pass the 'content' object to your listeners
            //    (This was the next bug we were about to hit)
            attachPageListeners(content);

        } catch (err) {
            // Log the error to the server (if you implemented this)
            if (typeof logErrorToServer === 'function') {
                logErrorToServer(err, 'loadContent');
            } else {
                // Fallback to browser console
                console.error("Error loading content:", err);
            }

            // Show a friendly error message to the user
            const mainElement = document.querySelector('main');
            if (mainElement) {
                mainElement.innerHTML = `<h2 class="text-center text-danger mt-5">${err.message}</h2>`;
            }
        }
    }

    // --- 2. RENDER FUNCTIONS ---

    function renderHero(content) {
        $('.hero-background').style.backgroundImage = `url('${content.posterUrl}')`;
        $('#content-title').textContent = content.title;
        $('#content-rating').textContent = content.imdbRating || 'N/A';
        $('#content-type').textContent = content.type;
        $('#content-year').textContent = content.releaseYear;
        $('#content-description').textContent = content.description;
    }

    function renderDetails(content) {
        // Render Cast and Genres
        const castEl = $('#content-cast');
        if (content.actors && content.actors.length > 0) {
            castEl.innerHTML = content.actors.map((actor, index) =>
                `<a href="https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(actor)}" target="_blank">${actor}</a>`
            ).join(', ');
        } else {
            castEl.textContent = 'N/A';
        }

        const genresEl = $('#content-genres');
        if (content.genres && content.genres.length > 0) {
            genresEl.innerHTML = content.genres.map(genre => `<a>${genre}</a>`).join(', ');
        } else {
            genresEl.textContent = 'N/A';
        }

        // --- Render Episodes (if it's a Show) ---
        if (content.type === 'Show' && content.seasons) {
            const episodesSection = $('#episodes-section');
            // Make sure seasons is not just an empty object
            const seasonNumbers = Object.keys(content.seasons).filter(k => content.seasons[k] && content.seasons[k].length > 0).sort((a, b) => a - b);
            if (seasonNumbers.length === 0) return;

            // 1. Create Episode Header
            episodesSection.innerHTML = `
                <div class="episodes-header mb-3">
                    <h3>Episodes</h3>
                    <div class="dropdown">
                        <a class="btn btn-dark dropdown-toggle" href="#" role="button" id="seasonDropdownButton" data-bs-toggle="dropdown" aria-expanded="false">
                            Season ${seasonNumbers[0]}
                        </a>
                        <ul class="dropdown-menu dropdown-menu-dark" aria-labelledby="seasonDropdownButton">
                            ${seasonNumbers.map(num => `
                                <li><a class="dropdown-item season-select-btn" data-season="${num}" href="#">Season ${num}</a></li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
                <div id="episode-list-container"></div>
            `;

            // 2. Create Episode Lists for each season
            const listContainer = $('#episode-list-container');
            for (const seasonNum of seasonNumbers) {
                const episodes = content.seasons[seasonNum] || [];
                const seasonListEl = document.createElement('div');
                seasonListEl.id = `season-${seasonNum}-list`;
                seasonListEl.className = 'episode-list';
                
                // Hide all but the first season
                if (seasonNum !== seasonNumbers[0]) {
                    seasonListEl.classList.add('d-none');
                }

                seasonListEl.innerHTML = episodes.map(episode => `
                    <div class="episode-item" data-episode-id="${episode._id}">
                        <div class="episode-number">${episode.episodeNumber}</div>
                        <div class="episode-thumbnail mx-3">
                            <img src="${episode.posterUrl || 'https://placehold.co/300x170/222/FFF?text=No+Image'}" alt="${episode.episodeTitle}">
                            <div class="episode-progress-bar"><div style="width: 0%;"></div></div>
                        </div>
                        <div class="episode-info">
                            <div class="episode-title">
                                <span>${episode.episodeTitle}</span>
                                <span>${episode.lengthMinutes || ''} min</span>
                            </div>
                            <p class="episode-description d-none d-md-block">
                                ${episode.description}
                            </p>
                        </div>
                    </div>
                `).join('');
                listContainer.appendChild(seasonListEl);
            }
        }
    }

    function renderSimilar(similarContent) {
        const container = $('#similar-content-container');
        if (!similarContent || similarContent.length === 0) {
            container.innerHTML = '<p style="color: #808080;">No similar content found.</p>';
            return;
        }

        if (typeof createCard !== 'function') {
            console.error('card_renderer.js is not loaded');
            return;
        }

        const scrollWrapper = document.createElement('div');
        scrollWrapper.className = 'scroll-wrapper';
        
        const scrollContainer = document.createElement('div');
        scrollContainer.className = 'scroll-container';

        similarContent.forEach(item => {
            const card = createCard(item); 
            scrollContainer.appendChild(card);
        });

        scrollWrapper.appendChild(scrollContainer);
        container.appendChild(scrollWrapper);
    }


    // --- 3. EVENT LISTENERS ---
    function attachPageListeners(contentData) {
        // --- HERO PLAY BUTTON ---
      const playButton = document.querySelector('.btn-play');
      if (playButton) {
        playButton.addEventListener('click', async () => {
          // contentData is now defined because we passed it in
          const contentId = contentData._id;
          const profileName = localStorage.getItem('selectedProfileName');
          
          if (contentData.type === 'Movie') {
            // Pass the movie's own ID as the returnId
            window.location.href = `/player/${contentId}?returnId=${contentId}`;
          }
          else if (contentData.type === 'Show') {
            const showId = contentData._id; // Get the Show's ID
            // If it's a show, ask the server for the *next episode*
            try {
              const res = await fetch(`/player/api/next-episode/${showId}/${profileName}`);
              const data = await res.json();
              if (data.episodeId) {
                // --- THIS IS THE FIX ---
                window.location.href = `/player/${data.episodeId}?showId=${showId}`;
              } else {
                throw new Error('Could not find an episode to play.');
              }
            } catch (err) {
              console.error(err);
              alert(err.message);
            }
          }
        });
      }

      // --- LIKE BUTTON ---
      const likeButton = document.getElementById('likeButton');
      if (likeButton) {
          likeButton.addEventListener('click', function () {
              const isLiked = this.dataset.liked === 'true';
              this.dataset.liked = (!isLiked).toString();
              this.innerHTML = !isLiked ? '<i class="bi bi-heart-fill"></i>' : '<i class="bi bi-heart"></i>';
              // Note: This like button is not fully functional
              // It needs to be wired up to likes_manager.js
              console.warn("Like button on hero is cosmetic. Needs API call.");
          });
      }

      document.body.addEventListener('click', (ev) => {
          const item = ev.target.closest('.episode-item');
          if (item) {
              const episodeId = item.dataset.episodeId;
              const showId = contentData._id; // Get the Show's ID
              if (episodeId && showId) {
                  // Navigate to the player with BOTH IDs
                  window.location.href = `/player/${episodeId}?showId=${showId}`;
              }
          }
      });

        // --- SEASON DROPDOWN CLICK ---
      document.body.addEventListener('click', (ev) => {
              const el = ev.target.closest('.season-select-btn');
              if (!el) return;
              
              ev.preventDefault();
              const selectedSeason = (el.dataset.season || '').toString().trim();
              if (!selectedSeason) return;

              $('#seasonDropdownButton').textContent = `Season ${selectedSeason}`;
              document.querySelectorAll('.episode-list').forEach(list => list.classList.add('d-none'));
              $(`#season-${selectedSeason}-list`).classList.remove('d-none');
          });
      }

    // --- 4. GO! ---
    // This line was missing, which is why nothing loaded
    loadContent();
});