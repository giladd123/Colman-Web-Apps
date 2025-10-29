document.addEventListener('DOMContentLoaded', function() {

    // --- Navbar scroll effect ---
    const navbar = document.querySelector('.navbar');
    window.onscroll = () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    };

    // --- Icon buttons functionality ---
    
    // (Req 4: "Like" button)
    const likeButton = document.getElementById('likeButton');
    likeButton.addEventListener('click', function() {
        const isLiked = this.dataset.liked === 'true';
        this.dataset.liked = !isLiked;
        this.innerHTML = !isLiked ? '<i class="bi bi-heart-fill"></i>' : '<i class="bi bi-heart"></i>';
        console.log(`Profile action: ${!isLiked ? 'Liked' : 'Unliked'}`);
    });
    
    // ("My List" button)
    const myListButton = document.getElementById('myListButton');
    myListButton.addEventListener('click', function() {
        const isAdded = this.dataset.added === 'true';
        this.dataset.added = !isAdded;
        this.innerHTML = !isAdded ? '<i class="bi bi-check-lg"></i>' : '<i class="bi bi-plus-lg"></i>';
        console.log(`Profile action: ${!isAdded ? 'Added to list' : 'Removed from list'}`);
    });

    // --- (Req 7: Episode selection) ---
    const episodeItems = document.querySelectorAll('.episode-item');
    episodeItems.forEach(item => {
        item.addEventListener('click', function(e) {
            episodeItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            const episodeNum = this.querySelector('.episode-number').textContent;
            console.log(`User selected Episode ${episodeNum}.`);
            // In a real app, you would now load this episode's content.
        });
    });

});