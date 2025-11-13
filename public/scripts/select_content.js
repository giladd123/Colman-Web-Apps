document.addEventListener('DOMContentLoaded', () => {

    const $ = (sel) => document.querySelector(sel);

    async function loadContent() {
        try {
            const contentId = window.location.pathname.split('/').pop();
            if (!contentId) throw new Error("No content ID in URL");

            // Get session from server instead of localStorage
            const session = await getSession();
            
            if (!session || !session.isAuthenticated) {
                window.location.href = "/login";
                return;
            }
            
            if (!session.selectedProfileId || !session.selectedProfileName) {
                window.location.href = "/profiles";
                return;
            }

            const profileName = session.selectedProfileName;
            const profileId = session.selectedProfileId;


        const response = await fetch(`/select-content/api/data/${contentId}?profileId=${encodeURIComponent(profileId)}`);

            if (!response.ok) {
                const err = await response.json(); 
                throw new Error(err.error || "Failed to fetch content data");
            }

            const { content, similarContent, isLiked, isInWatchlist, isCompleted, watchHabits } = await response.json();

            if (!content) throw new Error("No content returned from API");

            renderHero(content);
            renderDetails(content, watchHabits); 
            renderSimilar(similarContent);

            attachPageListeners(content, isLiked, isInWatchlist, profileId, profileName, isCompleted);
        } catch (err) {
            console.error("Error loading content:", err);
            const mainElement = $('main');
            if (mainElement) {
                mainElement.innerHTML = `<h2 class="text-center text-danger mt-5">${err.message}</h2>`;
            }
        }
    }

    function renderHero(content) {
        $('.hero-background').style.backgroundImage = `url('${content.posterUrl}')`;
        $('#content-title').textContent = content.title;
        $('#content-rating').textContent = content.imdbRating || 'N/A';
        $('#content-type').textContent = content.type;
        $('#content-year').textContent = content.releaseYear;
        $('#content-description').textContent = content.description;
    }

function renderDetails(content, watchHabits = {}) {
        const castEl = $('#content-cast');
        if (content.actors && content.actors.length > 0) {
            castEl.innerHTML = content.actors.map((actor) =>
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

        if (content.type === 'Show' && content.seasons) {
            const episodesSection = $('#episodes-section');
            const seasonNumbers = Object.keys(content.seasons).filter(k => content.seasons[k] && content.seasons[k].length > 0).sort((a, b) => a - b);
            if (seasonNumbers.length === 0) return;

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

            const listContainer = $('#episode-list-container');
            for (const seasonNum of seasonNumbers) {
                const episodes = content.seasons[seasonNum] || [];
                const seasonListEl = document.createElement('div');
                seasonListEl.id = `season-${seasonNum}-list`;
                seasonListEl.className = 'episode-list';
                
                if (seasonNum !== seasonNumbers[0]) {
                    seasonListEl.classList.add('d-none');
                }

                const episodeHtml = episodes.map(episode => {
                const watchedTime = watchHabits[episode._id] || 0;               
                const totalTime = episode.lengthMinutes * 60 || 0; 
                let progressPercent = 0;

                if (totalTime > 0 && watchedTime > 0) {
                    progressPercent = (watchedTime / totalTime) * 100;
                }
                progressPercent = Math.min(100, Math.max(0, progressPercent));

                return `
                <div class="episode-item" data-episode-id="${episode._id}">
                    <div class="episode-number">${episode.episodeNumber}</div>
                    <div class="episode-thumbnail mx-3">
                        <img src="${episode.posterUrl || 'https://placehold.co/300x170/222/FFF?text=No+Image'}" alt="${episode.episodeTitle}">
                        <div class="episode-progress-bar">
                            <div style="width: ${progressPercent}%;"></div>
                        </div>
                    </div>
                    <div class="episode-info">
                        <div class="episode-title">
                            <span>${episode.episodeTitle}</span>
                            <span>${episode.lengthMinutes || '0'} min</span>
                        </div>
                        <p class="episode-description d-none d-md-block">
                            ${episode.description}
                        </p>
                    </div>
                </div>
                `;
            }).join('');
            
            seasonListEl.innerHTML = episodeHtml;
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

    function attachPageListeners(contentData, initialIsLiked, initialIsInWatchlist, profileId, profileName, isCompleted) {

        const mainPlayButton = document.getElementById('playButton');
        const watchAgainButton = document.getElementById('watchAgainButton');
        const playFromBeginningButton = document.getElementById('playFromBeginningButton');

        if (isCompleted) {
            mainPlayButton.style.display = 'none';
            watchAgainButton.style.display = 'inline-block';
        } else {
            mainPlayButton.style.display = 'inline-block';
            watchAgainButton.style.display = 'none';
        }
        
        mainPlayButton.addEventListener('click', async () => {
          const contentId = contentData._id;
          if (contentData.type === 'Movie') {
            window.location.href = `/player/${contentId}?returnId=${contentId}`;
          } 
          else if (contentData.type === 'Show') {
            const showId = contentData._id; 
            try {
                const res = await fetch(`/player/api/next-episode/${showId}/${profileId}`);
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

        playFromBeginningButton.addEventListener('click', () => {
            const showId = (contentData.type === 'Show') ? contentData._id : null;
            
            if (contentData.type === 'Movie') {
                window.location.href = `/player/${contentData._id}?returnId=${contentData._id}&restart=true`;
            } 
            else if (contentData.type === 'Show') {
                const firstSeasonKey = Object.keys(contentData.seasons).sort((a, b) => Number(a) - Number(b))[0];
                if (firstSeasonKey && contentData.seasons[firstSeasonKey] && contentData.seasons[firstSeasonKey].length > 0) {
                    const s1e1 = contentData.seasons[firstSeasonKey][0];
                    const s1e1_id = s1e1._id || s1e1;
                    window.location.href = `/player/${s1e1_id}?showId=${showId}&restart=true`; 
                } else {
                    alert("Error: Could not find Season 1, Episode 1 to restart.");
                }
            }
        });

        watchAgainButton.addEventListener('click', () => {
            playFromBeginningButton.click(); 
        });

        const likeButton = document.getElementById('likeButton');
        if (likeButton) {
            if (typeof apiAddLike !== 'function' || typeof apiRemoveLike !== 'function' || typeof animateLikeIcon !== 'function') {
                console.error("likes_manager.js is not loaded or is missing API/animation functions.");
            } else {
                let isLiked = initialIsLiked; 
                likeButton.innerHTML = isLiked ? '<i class="bi bi-heart-fill"></i>' : '<i class="bi bi-heart"></i>';
                
                likeButton.addEventListener('click', async function () {
                    const icon = this.querySelector('i');
                    isLiked = !isLiked;
                    animateLikeIcon(icon, isLiked);
                    
                    try {
                        if (isLiked) {
                            await apiAddLike(profileName, contentData._id);
                        } else {
                            await apiRemoveLike(profileName, contentData._id);
                        }
                    } catch (err) {
                        console.error("Like failed:", err);
                        isLiked = !isLiked;
                        animateLikeIcon(icon, isLiked);
                    }
                });
            }
        }

        const watchlistButton = document.getElementById('watchlistButton');
        if (watchlistButton) {
            if (typeof apiAddToWatchlist !== 'function' || typeof apiRemoveFromWatchlist !== 'function' || typeof animateWatchlistIcon !== 'function') {
                console.error("watchlist_manager.js is not loaded or is missing API/animation functions.");
            } else {
                let inList = initialIsInWatchlist; 

                watchlistButton.innerHTML = inList ? '<i class="bi bi-check2"></i>' : '<i class="bi bi-plus"></i>';
                watchlistButton.title = inList ? "Remove from My List" : "Add to My List";

                watchlistButton.addEventListener('click', async function () {
                    const icon = this.querySelector('i');
                    inList = !inList;
                    animateWatchlistIcon(icon, inList);
                    this.title = inList ? "Remove from My List" : "Add to My List";

                    try {
                        if (inList) {
                            await apiAddToWatchlist(profileName, contentData._id);
                        } else {
                            await apiRemoveFromWatchlist(profileName, contentData._id);
                        }
                    } catch (err) {
                        console.error("Watchlist failed:", err);
                        inList = !inList;
                        animateWatchlistIcon(icon, inList);
                        this.title = inList ? "Remove from My List" : "Add to My List";
                    }
                });
            }
        }

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

    loadContent();
});