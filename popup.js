let currentNetflixId = null;
const API_URL = 'http://localhost/api-watchmate/api.php';

let reactionCounts = {
    kiff: 0,
    aime: 0,
    pas_top: 0
};

document.addEventListener('DOMContentLoaded', function() {
    console.log('Popup chargée');
    initializeReactionCounters();

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        console.log('Onglet actuel:', tabs[0]);

        chrome.tabs.sendMessage(tabs[0].id, {action: "getNetflixId"}, function(response) {
            console.log('Réponse obtenue avec l\'ID Netflix:', response);

            if (response && response.id) {
                currentNetflixId = response.id;
                console.log('ID Netflix:', currentNetflixId);
                fetchMovieDetails(response.id);
                loadCommentsAndRatings();
            } else {
                document.getElementById('movieDetails').innerHTML = 'Veuillez naviguer vers une page de vidéo Netflix';
            }
        });
    });
});

function initializeReactionCounters() {
    const ratingSection = document.querySelector('.rating-section');

    document.querySelectorAll('.rating-button').forEach(button => {
        const counter = document.createElement('span');
        counter.className = 'reaction-counter';
        counter.textContent = '0';
        button.appendChild(counter);
    });
}

function updateReactionCounter(type, count) {
    const button = document.querySelector(`[data-rating="${type}"]`);
    const counter = button.querySelector('.reaction-counter');
    const oldCount = parseInt(counter.textContent);
    counter.textContent = count;

    if (count > oldCount) {
        counter.classList.add('counter-increase');
        setTimeout(() => counter.classList.remove('counter-increase'), 500);
    }
}

function displayRatings(ratings) {
    console.log('Affichage des évaluations:', ratings);
    reactionCounts = {
        kiff: ratings.kiff || 0,
        aime: ratings.aime || 0,
        pas_top: ratings.pas_top || 0
    };

    Object.entries(reactionCounts).forEach(([type, count]) => {
        updateReactionCounter(type, count);
    });
}

function displayComments(comments) {
    console.log('Affichage des commentaires:', comments);
    const commentList = document.getElementById('commentList');
    commentList.innerHTML="";
    comments.forEach(comment => {
        const commentElement = document.createElement('div');
        commentElement.className = 'comment new-comment';
        commentElement.innerHTML = `
            <div class="comment-avatar">${comment.username.charAt(0)}</div>
            <div class="comment-content">
                <strong>${comment.username}</strong>
                <p>${comment.comment}</p>
                <small>${timeAgo(comment.created_at)}</small>
            </div>
        `;
        commentList.append(commentElement);

        setTimeout(() => commentElement.classList.remove('new-comment'), 10);
    });
}

function timeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    const intervals = {
        année: 31536000,
        mois: 2592000,
        semaine: 604800,
        jour: 86400,
        heure: 3600,
        minute: 60
    };

    for (let [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);

        if (interval >= 1) {
            return unit === 'heure' || unit === 'minute' ?
                `il y a ${interval} ${unit}${interval > 1 ? 's' : ''}` :
                `il y a ${interval} ${unit}${interval > 1 ? 's' : ''}`;
        }
    }

    return 'il y a un instant';
}

function fetchMovieDetails(id) {
    console.log('Récupération des détails du film pour l\'ID:', id);

    fetch(`https://netflix54.p.rapidapi.com/title/details/?ids=${id}&lang=fr`, {
        method: 'GET',
        headers: {
            'x-rapidapi-key': '',
            'x-rapidapi-host': ''
        }
    })
        .then(response => {
            console.log('Réponse de l\'API Netflix:', response);
            return response.json();
        })
        .then(data => {
            console.log('Données de l\'API Netflix:', data);
            if (data && data.length > 0) {
                displayMovieDetails(data[0].details);
            }
        })
        .catch(error => {
            console.error('Erreur lors de la récupération des détails du film:', error);
            document.getElementById('movieDetails').innerHTML = 'Erreur lors de la récupération des détails du film: ' + error.message;
        });
}

function displayMovieDetails(details) {
    console.log('Affichage des détails du film:', details);
    const logoImageUrl = details.logoImage.url;

    const html = `
    <div style="background-image: url('${details.backgroundImage.url}');
    width: auto;
    height: 200px;
    background-size: contain;
    border-radius: 10px;">
    
        <img class="movie-image-title" src="${logoImageUrl}" alt="${details.title}">

    </div>
    <div class="movie-info">
      <h2>${details.title}</h2>
      <p>${details.contextualSynopsis.text}</p>
      <div class="genres">
        ${details.genres.map(genre => `
          <span class="genre-tag">${genre.name}</span>
        `).join('')}
      </div>
    </div>
  `;
    document.getElementById('movieDetails').innerHTML = html;
}

async function loadCommentsAndRatings() {
    if (!currentNetflixId) {
        console.error('Aucun ID Netflix disponible');
        return;
    }

    console.log('Chargement des commentaires pour l\'ID Netflix:', currentNetflixId);
    try {
        const response = await fetch(`${API_URL}?netflix_id=${currentNetflixId}`);
        console.log('Réponse de l\'API des commentaires:', response);

        const data = await response.json();
        console.log('Données des commentaires:', data);

        displayComments(data.comments);
        displayRatings(data.ratings);
    } catch (error) {
        console.error('Erreur lors du chargement des commentaires:', error);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const commentForm = document.getElementById('commentForm');
    if (commentForm) {
        commentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Formulaire de commentaire soumis');

            const username = document.getElementById('username').value;
            const comment = document.getElementById('commentText').value;

            console.log('Soumission du commentaire:', { username, comment, netflix_id: currentNetflixId });

            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'comment',
                        netflix_id: currentNetflixId,
                        username: username,
                        comment: comment
                    })
                });

                console.log('Réponse de la soumission du commentaire:', response);
                const data = await response.json();
                console.log('Données de la soumission du commentaire:', data);

                if (data.error) {
                    alert(data.error);
                } else {
                    document.getElementById('commentText').value = '';
                    loadCommentsAndRatings();
                }
            } catch (error) {
                console.error('Erreur lors de la soumission du commentaire:', error);
                alert('Erreur lors de la soumission du commentaire: ' + error.message);
            }
        });
    }

    document.querySelectorAll('.rating-button').forEach(button => {
        button.addEventListener('click', async () => {
            console.log('Bouton de notation cliqué:', button.dataset.rating);

            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'rating',
                        netflix_id: currentNetflixId,
                        rating: button.dataset.rating
                    })
                });

                console.log('Réponse de la soumission de la note:', response);
                const data = await response.json();
                console.log('Données de la soumission de la note:', data);

                if (data.error) {
                    alert(data.error);
                } else {
                    loadCommentsAndRatings();
                }
            } catch (error) {
                console.error('Erreur lors de la soumission de la note:', error);
                alert('Erreur lors de la soumission de la note: ' + error.message);
            }
        });
    });
});
