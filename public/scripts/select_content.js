document.addEventListener('DOMContentLoaded', () => {

  const $ = (sel) => document.querySelector(sel);

  const likeButton = document.getElementById('likeButton');
  if (likeButton) {
    likeButton.addEventListener('click', function () {
      const isLiked = this.dataset.liked === 'true';
      this.dataset.liked = (!isLiked).toString();
      this.innerHTML = !isLiked ? '<i class="bi bi-heart-fill"></i>' : '<i class="bi bi-heart"></i>';
    });
  } else {
    console.log('no like button found');
  }


  const episodeItems = document.querySelectorAll('.episode-item');
  if (episodeItems.length) {
    episodeItems.forEach(item => {
      item.addEventListener('click', function () {
        episodeItems.forEach(i => i.classList.remove('active'));
        this.classList.add('active');
        const epNum = this.querySelector('.episode-number')?.textContent?.trim();
        console.log('Episode clicked ->', epNum);
      });
    });
  } else {
    console.log('no episode elements found');
  }

  const seasonDropdownButton = document.getElementById('seasonDropdownButton');
  const episodeLists = document.querySelectorAll('.episode-list');

  document.addEventListener('click', (ev) => {
    const el = ev.target.closest && ev.target.closest('.season-select-btn');
    if (!el) return; 

    ev.preventDefault(); 
    const selectedSeason = (el.dataset.season || '').toString().trim();
    console.log('season item clicked ->', selectedSeason);

    if (!selectedSeason) {
      console.warn('clicked season element missing data-season');
      return;
    }


    if (seasonDropdownButton) {
      seasonDropdownButton.textContent = `Season ${selectedSeason}`;
    }

    episodeLists.forEach(list => list.classList.add('d-none'));
    const activeList = document.getElementById(`season-${selectedSeason}-list`);
    if (activeList) {
      activeList.classList.remove('d-none');
      console.log('showing:', activeList.id);
    } else {
      console.warn(`Could not find season ${selectedSeason} list`);
    }

    try {
      if (seasonDropdownButton && typeof bootstrap !== 'undefined') {
        let inst = bootstrap.Dropdown.getInstance(seasonDropdownButton);
        if (!inst) inst = new bootstrap.Dropdown(seasonDropdownButton);
        inst.hide();
      }
    } catch (err) {
      console.warn('bootstrap dropdown hide failed', err);
    }
  });

  const visible = document.querySelector('.episode-list:not(.d-none)');
  if (visible && seasonDropdownButton) {
    const visibleSeasonNum = visible.id.replace(/^season-/, '').replace(/-list$/, '');
    if (visibleSeasonNum) {
      seasonDropdownButton.textContent = `Season ${visibleSeasonNum}`;
    }
  }
  async function getWikipediaUrl(actorName) {
  const endpoint = "https://en.wikipedia.org/w/api.php";
  
  const params = new URLSearchParams({
    action: "query",      
    list: "search",        
    srsearch: actorName,   
    format: "json",        
    origin: "*"            
  });

  try {
    const response = await fetch(`${endpoint}?${params}`);
    const data = await response.json();

    if (data.query.search.length > 0) {
      const pageTitle = data.query.search[0].title;
      
      return `https://en.wikipedia.org/wiki/${pageTitle.replace(/ /g, "_")}`;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching Wikipedia data:", error);
    return null;
  }
}
});