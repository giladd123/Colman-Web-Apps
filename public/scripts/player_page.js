document.addEventListener('DOMContentLoaded', () => {
  const playerContainer = document.getElementById('player-container');
  const backButton = document.getElementById('custom-back-button'); 
  const video = document.getElementById('video-player');
  const loadingSpinner = document.getElementById('player-loading');
  const playPauseBtn = document.getElementById('play-pause-btn');
  const skipBackwardBtn = document.getElementById('skip-backward-btn');
  const skipForwardBtn = document.getElementById('skip-forward-btn');
  const timeDisplay = document.getElementById('time-display');
  const progressBar = document.getElementById('progress-bar');
  const nextEpisodeBtn = document.getElementById('next-episode-btn');
  const episodesBtn = document.getElementById('episodes-btn');
  const fullscreenBtn = document.getElementById('fullscreen-btn');

  let contentId = null;
  let profileName = null;
  let profileId = null;
  let saveInterval = null;
  let currentShowId = null; 
  let controlsTimeout;

  async function initializePlayer() {
    try {
      contentId = window.location.pathname.split('/').pop();
      
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

      profileName = session.selectedProfileName;
      profileId = session.selectedProfileId;
      
      const urlParams = new URLSearchParams(window.location.search);
      currentShowId = urlParams.get('showId'); 
      const returnId = urlParams.get('returnId');
      const restart = urlParams.get('restart'); 

      if (currentShowId) {
        backButton.href = `/select-content/${currentShowId}`;
      } else if (returnId) {
        backButton.href = `/select-content/${returnId}`;
      } else {
        backButton.href = 'javascript:history.back()';
      }

      if (!contentId || !profileId) {
        throw new Error('Could not identify content or profile.');
      }

      let apiUrl = `/player/api/data/${contentId}/${profileId}`;
      if (currentShowId) {
        apiUrl += `?showId=${currentShowId}`;
      }

      const response = await fetch(apiUrl);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to load video data');
      }

      const data = await response.json();
      
      video.src = data.content.videoUrl;
      video.currentTime = (restart === 'true') ? 0 : (data.habit ? data.habit.watchedTimeInSeconds : 0);
      document.title = data.content.episodeTitle || data.content.title || 'Playing';

      video.style.display = 'block';
      loadingSpinner.style.display = 'none';

      if (data.showData) {
        currentShowId = data.showData._id; 
        buildEpisodeDrawer(data.showData, data.content._id);
        episodesBtn.style.display = 'inline-block';
      }
      if (data.nextEpisodeId) {
        nextEpisodeBtn.style.display = 'inline-block';
        const newNextBtn = nextEpisodeBtn.cloneNode(true);
        nextEpisodeBtn.parentNode.replaceChild(newNextBtn, nextEpisodeBtn);
        newNextBtn.addEventListener('click', () => {
          window.location.href = `/player/${data.nextEpisodeId}?showId=${currentShowId}`;
        });
      }

      attachMediaEventListeners();
      attachControlEventListeners();
      startProgressTimer();

    } catch (err) {
      loadingSpinner.innerHTML = `<h3 class="text-danger">${err.message}</h3>`;
    }
  }

  function attachMediaEventListeners() {
    video.addEventListener('play', updatePlayPauseIcon);
    video.addEventListener('pause', updatePlayPauseIcon);
    video.addEventListener('loadedmetadata', updateProgress);
    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('click', togglePlayPause);
  }

  function attachControlEventListeners() {
    playPauseBtn.addEventListener('click', togglePlayPause);
    skipBackwardBtn.addEventListener('click', () => video.currentTime -= 10);
    skipForwardBtn.addEventListener('click', () => video.currentTime += 10);
    
    progressBar.addEventListener('input', (e) => {
      const percent = e.target.value; 
      video.currentTime = (video.duration / 100) * percent;
      progressBar.style.setProperty('--progress-percent', `${percent}%`);
    });

    fullscreenBtn.addEventListener('click', toggleFullscreen);

    playerContainer.addEventListener('mousemove', showControls);
    playerContainer.addEventListener('mouseleave', hideControls);
  }


  function togglePlayPause() {
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }

  function updatePlayPauseIcon() {
    const icon = playPauseBtn.querySelector('i');
    icon.className = video.paused ? 'bi bi-play-fill' : 'bi bi-pause-fill';
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  }

  function updateProgress() {
    const currentTime = formatTime(video.currentTime);
    const duration = isNaN(video.duration) ? '0:00' : formatTime(video.duration);
    timeDisplay.textContent = `${currentTime} / ${duration}`;
    
    if (video.duration) {
      const percent = (video.currentTime / video.duration) * 100;
      progressBar.value = percent;
      progressBar.style.setProperty('--progress-percent', `${percent}%`);
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      playerContainer.requestFullscreen().catch(err => {
        alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
      fullscreenBtn.querySelector('i').className = 'bi bi-fullscreen-exit';
    } else {
      document.exitFullscreen();
      fullscreenBtn.querySelector('i').className = 'bi bi-fullscreen';
    }
  }

  function showControls() {
    playerContainer.classList.add('controls-visible');
    clearTimeout(controlsTimeout);
    controlsTimeout = setTimeout(hideControls, 3000);
  }

  function hideControls() {
    if (video.paused) return; 
    playerContainer.classList.remove('controls-visible');
  }

  function buildEpisodeDrawer(showData, currentEpisodeId) {
    const container = document.getElementById('episode-drawer-content');
    if (!container || !showData.seasons) return;

    container.innerHTML = '';
    document.getElementById('episodeDrawerLabel').textContent = showData.title;
    const sortedSeasonKeys = Object.keys(showData.seasons).sort((a, b) => Number(a) - Number(b));

    for (const key of sortedSeasonKeys) {
      const episodes = showData.seasons[key];
      if (!episodes || episodes.length === 0) continue;

      const seasonHeader = document.createElement('h4');
      seasonHeader.className = 'season-header';
      seasonHeader.textContent = `Season ${key}`;
      container.appendChild(seasonHeader);

      for (const episode of episodes) {
        const isPlaying = (String(episode._id) === String(currentEpisodeId));
        const item = document.createElement('div');
        item.className = 'episode-item-small';
        if (isPlaying) item.classList.add('playing');
        item.dataset.episodeId = episode._id;
        item.innerHTML = `
          <img src="${episode.posterUrl || 'https://placehold.co/300x170/222/FFF?text=No+Image'}" alt="">
          <div class="episode-item-info">
            <div class="episode-item-title">${episode.episodeNumber}. ${episode.episodeTitle}</div>
            <div class="episode-item-desc">${episode.description}</div>
          </div>
        `;
        if (!isPlaying) {
          item.addEventListener('click', () => {
            window.location.href = `/player/${episode._id}?showId=${currentShowId}`;
          });
        }
        container.appendChild(item);
      }
    }
  }

  async function saveProgress(isComplete = false) {
    // Check for profileId, not profileName
    if (!contentId || !profileId || (video.currentTime === 0 && !isComplete)) return;
    
    try {
      await fetch('/player/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: profileId,
          contentId: contentId,
          currentTime: video.currentTime,
          isComplete: isComplete,
        }),
      });
    } catch (err) {
      console.error('Failed to save progress:', err);
    }
  }

  function startProgressTimer() {
    if (saveInterval) clearInterval(saveInterval);
    saveInterval = setInterval(() => {
      let isComplete = false;
      if (video.duration && !isNaN(video.duration)) {
        isComplete = (video.duration - video.currentTime) < 10;
      }
      saveProgress(isComplete);
    }, 5000);
  }

  video.addEventListener('ended', () => {
    saveProgress(true);
    if (saveInterval) clearInterval(saveInterval);
  });

  window.addEventListener('beforeunload', () => {
    let isComplete = false;
    if (video.duration && !isNaN(video.duration)) {
      isComplete = (video.duration - video.currentTime) < 10;
    }
    saveProgress(isComplete);
  });

  initializePlayer();
});