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

            // 2. Get profile name
            const profileName = localStorage.getItem('selectedProfileName');
            if (!profileName) {
                throw new Error("No profile selected. Please return to the profile page.");
            }

            // 3. Fetch data from our API endpoint (now with profileName)
            const response = await fetch(`/select-content/api/data/${contentId}?profileName=${encodeURIComponent(profileName)}`);
            
            // 4. Check for server errors
            if (!response.ok) {
                const err = await response.json(); // Get error message from server
                throw new Error(err.error || "Failed to fetch content data");
            }

            // 5. Get the JSON data (including our new properties)
            const { content, similarContent, isLiked, isInWatchlist } = await response.json();

            if (!content) {
                throw new Error("No content returned from API");
            }

            // 6. Call render functions
            renderHero(content);
            renderDetails(content);
            renderSimilar(similarContent);

            // 7. Pass all data to listeners
            attachPageListeners(content, isLiked, isInWatchlist, profileName);

        } catch (err) {
            // Log the error
            if (typeof logErrorToServer === 'function') {
                logErrorToServer(err, 'loadContent');
            } else {
                console.error("Error loading content:", err);
            }
            // Show a friendly error message
            const mainElement = $('main');
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
    function attachPageListeners(contentData, initialIsLiked, initialIsInWatchlist, profileName) {
        
        // --- HERO PLAY BUTTON ---
      const playButton = document.querySelector('.btn-play');
      if (playButton) {
        playButton.addEventListener('click', async () => {
          const contentId = contentData._id;
          
          if (contentData.type === 'Movie') {
            window.location.href = `/player/${contentId}?returnId=${contentId}`;
          } 
          else if (contentData.type === 'Show') {
            const showId = contentData._id; 
            try {
              const res = await fetch(`/player/api/next-episode/${showId}/${profileName}`);
              const data = await res.json();
              if (data.episodeId) {
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

      // --- LIKE BUTTON (Self-contained logic) ---
      const likeButton = document.getElementById('likeButton');
      if (likeButton) {
          if (typeof apiAddLike !== 'function' || typeof apiRemoveLike !== 'function' || typeof animateLikeIcon !== 'function') {
              console.error("likes_manager.js is not loaded or is missing API/animation functions.");
          } else {
              let isLiked = initialIsLiked; // Use local state from API
              
              // Set initial appearance
              likeButton.innerHTML = isLiked ? '<i class="bi bi-heart-fill"></i>' : '<i class="bi bi-heart"></i>';
              
              likeButton.addEventListener('click', async function () {
                  const icon = this.querySelector('i');
                  
                  // 1. Optimistic UI Update
                  isLiked = !isLiked; // Toggle state
                  animateLikeIcon(icon, isLiked);
                  
                  try {
                      // 2. Call API
                      if (isLiked) {
                          await apiAddLike(profileName, contentData._id);
                      } else {
                          await apiRemoveLike(profileName, contentData._id);
                      }
                      // 3. Update global data (if it exists) for other pages
                      if (window.currentFeedData) {
                          if (isLiked) {
                              window.currentFeedData.likedBy.push(contentData);
                          } else {
                              window.currentFeedData.likedBy = window.currentFeedData.likedBy.filter(c => c._id !== contentData._id);
                          }
                      }
                  } catch (err) {
                      // 4. Revert UI on failure
                      console.error("Like failed:", err);
                      isLiked = !isLiked; // Revert state
                      animateLikeIcon(icon, isLiked); // Revert icon
                  }
              });
          }
      }

      // --- WATCHLIST BUTTON (Self-contained logic) ---
      const watchlistButton = document.getElementById('watchlistButton');
      if (watchlistButton) {
          if (typeof apiAddToWatchlist !== 'function' || typeof apiRemoveFromWatchlist !== 'function' || typeof animateWatchlistIcon !== 'function') {
              console.error("watchlist_manager.js is not loaded or is missing API/animation functions.");
          } else {
              let inList = initialIsInWatchlist; // Use local state from API

              // Set initial appearance
              watchlistButton.innerHTML = inList ? '<i class="bi bi-check2"></i>' : '<i class="bi bi-plus"></i>';
              watchlistButton.title = inList ? "Remove from My List" : "Add to My List";

              watchlistButton.addEventListener('click', async function () {
                  const icon = this.querySelector('i');
                  
                  // 1. Optimistic UI Update
                  inList = !inList; // Toggle state
                  animateWatchlistIcon(icon, inList);
                  this.title = inList ? "Remove from My List" : "Add to My List";

                  try {
                      // 2. Call API
                      if (inList) {
                          await apiAddToWatchlist(profileName, contentData._id);
                      } else {
                          await apiRemoveFromWatchlist(profileName, contentData._id);
                      }
                      // 3. Update global data (if it exists)
                      if (window.currentFeedData) {
                          if (inList) {
                              window.currentFeedData.myList.push(contentData);
                          } else {
                              window.currentFeedData.myList = window.currentFeedData.myList.filter(c => c._id !== contentData._id);
                          }
                      }
                  } catch (err) {
                      // 4. Revert UI on failure
                      console.error("Watchlist failed:", err);
                      inList = !inList; // Revert state
                      animateWatchlistIcon(icon, inList);
                      this.title = inList ? "Remove from My List" : "Add to My List";
                  }
              });
          }
      }

      // --- EPISODE ITEM CLICK ---
      document.body.addEventListener('click', (ev) => {
          const item = ev.target.closest('.episode-item');
          if (item) {
              const episodeId = item.dataset.episodeId;
              const showId = contentData._id; 
              if (episodeId && showId) {
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
    } // End of attachPageListeners

    // --- 4. GO! ---
    loadContent();

    
});
