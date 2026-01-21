// Créer l'interface de l'extension
const sidebar = document.createElement('div');
sidebar.id = 'music-reco-container';
sidebar.innerHTML = `
  <div id="reco-panel" style="
    position: fixed; 
    top: 80px; right: 20px; 
    width: 320px; height: 500px;
    background-color: #1a1a1a;
    border: 1px solid #333;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    border-radius: 8px;
    z-index: 2147483647;
    color: #e0e0e0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-size: 14px;
  ">
    <!-- Header / Top Bar -->
    <div id="reco-header" style="
      padding: 12px 16px;
      background-color: #252525;
      border-bottom: 1px solid #333;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: grab;
      user-select: none;
    ">
      <div style="font-weight: 600; color: #fff; display: flex; align-items: center; gap: 8px;">
        <span>🎵</span> Music Assistant 
      </div>
      <div style="display: flex; gap: 10px; align-items: center;">
        <button id="reco-settings" style="
          background: transparent;
          border: none;
          color: #888;
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s, color 0.2s;
        " onmouseover="this.style.background='#333'; this.style.color='#fff'" 
          onmouseout="this.style.background='transparent'; this.style.color='#888'">
          ⚙️
        </button>
        <button id="reco-close" style="
          background: transparent;
          border: none;
          color: #888;
          cursor: pointer;
          font-size: 20px;
          line-height: 1;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s, color 0.2s;
        " onmouseover="this.style.background='#333'; this.style.color='#fff'" 
          onmouseout="this.style.background='transparent'; this.style.color='#888'">
          ×
        </button>
      </div>
    </div>
    
    <!-- Settings Panel (Hidden by default) -->
    <div id="reco-settings-panel" style="
      display: none;
      background: #222;
      padding: 15px;
      border-bottom: 1px solid #333;
    ">
        <label style="color: #ccc; font-size: 12px; display: block; margin-bottom: 5px;">Algorithme de recommandation :</label>
        <select id="algo-selector" style="
            width: 100%;
            padding: 8px;
            background: #333;
            color: white;
            border: 1px solid #444;
            border-radius: 4px;
            outline: none;
        ">
            <option value="matriciel">Matriciel (Collaborative)</option>
            <option value="content">Contenu (Audio features)</option>
            <option value="mix">Mix / Hybride</option>
        </select>
        <div style="color: #666; font-size: 10px; margin-top: 5px;">User ID: <span id="user-id-display">...</span></div>
    </div>
    
    <!-- Content -->
    <div id="reco-content" style="
      padding: 20px;
      flex: 1;
      overflow-y: auto;
      background-color: #1a1a1a;
      display: flex;
      flex-direction: column;
      align-items: center;
    ">
       <div id="initial-view" style="text-align: center; color: #888; margin-top: 50px;">
         <div style="font-size: 40px; margin-bottom: 15px;">🎧</div>
         <h3 style="color: #fff; margin: 0 0 8px 0; font-size: 16px;">Prêt à recommander</h3>
         <button id="start-listening-btn" style="
            background-color: #f50; 
            color: white; 
            border: none; 
            padding: 10px 20px; 
            border-radius: 4px; 
            cursor: pointer; 
            font-size: 14px; 
            margin-top: 10px;
            font-weight: bold;
            width: 100%;
         ">
           ▶ Commencer l'écoute
         </button>
       </div>
       
       <div id="playing-view" style="display: none; width: 100%; text-align: center;">
         <h3 style="color: #f50; margin-bottom: 10px;">En lecture 🎶</h3>
         <div id="reco-timer" style="font-size:24px; color:#fff; font-family:monospace; margin-bottom: 20px; font-weight: bold;">00:00</div>
         
         <button id="next-track-btn" title="Générer une nouvelle recommandation via notre algorithme IA" style="
            background-color: transparent; 
            color: #ccc; 
            border: 1px solid #444; 
            padding: 10px; 
            border-radius: 4px; 
            cursor: pointer; 
            font-size: 14px; 
            width: 100%;
            transition: 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
         " onmouseover="this.style.borderColor='#fff'; this.style.color='#fff'" 
           onmouseout="this.style.borderColor='#444'; this.style.color='#ccc'">
           <span>⏭</span> Passer (Algo)
         </button>
       </div>
    </div>
  </div>
`;

// Injecter dans la page
document.body.appendChild(sidebar);

// Logique de Drag & Drop
const panel = sidebar.querySelector('#reco-panel');
const header = sidebar.querySelector('#reco-header');
const closeBtn = sidebar.querySelector('#reco-close');
const settingsBtn = sidebar.querySelector('#reco-settings');
const settingsPanel = sidebar.querySelector('#reco-settings-panel');
const algoSelector = sidebar.querySelector('#algo-selector');
const userIdDisplay = sidebar.querySelector('#user-id-display');

const startBtn = sidebar.querySelector('#start-listening-btn');
const nextBtn = sidebar.querySelector('#next-track-btn');
const timerEl = sidebar.querySelector('#reco-timer');

const initialView = sidebar.querySelector('#initial-view');
const playingView = sidebar.querySelector('#playing-view');

// Initialisation au lancement, gestion ID User et Algo
chrome.storage.local.get(['userId', 'algoType'], (result) => {
    // 1. User ID Logic
    let currentUserId = result.userId;
    if (!currentUserId) {
        currentUserId = 'user_' + Math.random().toString(36).substr(2, 9);
        chrome.storage.local.set({ 'userId': currentUserId });
        console.log("Nouvel utilisateur créé :", currentUserId);
    }
    if (userIdDisplay) userIdDisplay.textContent = currentUserId;

    // 2. Algorithm Logic
    let currentAlgo = result.algoType;
    if (!currentAlgo) {
        currentAlgo = 'matriciel'; // Default
        chrome.storage.local.set({ 'algoType': currentAlgo });
    }
    if (algoSelector) algoSelector.value = currentAlgo;
    console.log("Algorithme actif :", currentAlgo);
});

// Toggle Settings Panel
if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
        if (settingsPanel.style.display === 'none') {
            settingsPanel.style.display = 'block';
        } else {
            settingsPanel.style.display = 'none';
        }
    });
}

// Change Algorithm Handler
if (algoSelector) {
    algoSelector.addEventListener('change', (e) => {
        const newAlgo = e.target.value;
        chrome.storage.local.set({ 'algoType': newAlgo });
        console.log("Algorithme changé pour :", newAlgo);
        
        // Petit feedback visuel
        settingsPanel.style.display = 'none'; // Fermer après choix
        
        // Simuler un rechargement contextuel ou juste notifier
        const contentDiv = sidebar.querySelector('#reco-content');
        // Optionnel: afficher un toast "Paramètres sauvegardés"
    });
}

// Fonction commune pour lancer une recommandation
const triggerRecommendation = () => {
    // Récupérer l'algo en cours
    chrome.storage.local.get(['algoType'], (res) => {
        const algo = res.algoType || 'matriciel';
        console.log("Lancement recommandation avec l'algo :", algo);
        
        // Si une musique était déjà en cours, on loggue la session
        if (totalSeconds > 0) {
            console.log(`[MusicReco] Session terminée. Durée d'écoute : ${totalSeconds} secondes.`);
            // Reset timer pour la prochaine
            totalSeconds = 0;
            chrome.storage.local.set({ 'listeningTime': 0 });
            updateTimerDisplay();
        }

        const contentDiv = sidebar.querySelector('#reco-content');
        // On met un overlay de chargement temporaire ou on change le texte
        // Pour faire simple, on cache tout et on met chargement
        initialView.style.display = 'none';
        playingView.style.display = 'none';
        
        // Créer un loader temporaire
        const loader = document.createElement('div');
        loader.id = 'temp-loader';
        loader.innerHTML = `<div style="text-align:center; color:white; margin-top:50px;">🎧 Analyse en cours...<br><span style="font-size:10px;color:#888;">(Algorithme: ${algo})</span></div>`;
        contentDiv.appendChild(loader);

        // MOCK API : Choix aléatoire pour simuler l'algo
        const mockSongs = ["Hello - CardiB", "Blinding Lights - The Weeknd", "Bad Guy - Billie Eilish", "Shape of You - Ed Sheeran", "Levitating - Dua Lipa"];
        const randomSong = mockSongs[Math.floor(Math.random() * mockSongs.length)];

        new Promise(resolve => setTimeout(() => resolve(randomSong), 1500))
          .then(songName => {
            console.log("Mock API Returns:", songName);
            
            // Sauvegarder l'intention d'écouter le premier résultat
            // Et sauver l'état "playing" pour qu'au reload on affiche la bonne vue
            chrome.storage.local.set({ 'music_reco_autoplay': true, 'music_reco_state': 'playing' }, () => {
                 // Redirection vers la recherche SoundCloud
                 window.location.href = `https://soundcloud.com/search/sounds?q=${encodeURIComponent(songName)}`;
            });
          });
    });
};

if (startBtn) startBtn.addEventListener('click', triggerRecommendation);
if (nextBtn) nextBtn.addEventListener('click', triggerRecommendation);

// === Persistance & Autoplay Logic ===

// Restaurer l'état au chargement
chrome.storage.local.get(['sidebarPos', 'sidebarVisible', 'listeningTime', 'music_reco_autoplay', 'music_reco_state'], (result) => {
    // 1. Restaurer la position
    if (result.sidebarPos) {
        panel.style.top = result.sidebarPos.top;
        panel.style.left = result.sidebarPos.left;
        panel.style.right = 'auto'; // Important override
    }

    // 2. Restaurer la visibilité
    if (result.sidebarVisible === false) {
        sidebar.style.display = 'none';
    } else {
        sidebar.style.display = 'block'; // Par défaut visible
    }

    // 3. Restaurer la vue (Playing vs Initial)
    if (result.music_reco_state === 'playing') {
        initialView.style.display = 'none';
        playingView.style.display = 'block';
    } else {
        initialView.style.display = 'block';
        playingView.style.display = 'none';
    }

    // 4. Restaurer le timer
    if (result.listeningTime) {
        totalSeconds = result.listeningTime;
        updateTimerDisplay();
    }

    // 5. Gérer l'Autoplay (Launch First Music)
    if (result.music_reco_autoplay) {
        console.log("Autoplay detecté. Recherche du premier résultat...");
        // Essayer de cliquer toutes les 500ms pendant 10s max
        let attempts = 0;
        const autoClicker = setInterval(() => {
            attempts++;
            // Sélecteur pour le bouton play des résultats de recherche SoundCloud
            // Note: les classes SC changent souvent, on vise générique
            const playBtn = document.querySelector('.searchList__item .sc-button-play');
            
            if (playBtn) {
                console.log("Bouton Play trouvé ! Clic et activation de la vue Playing !");
                playBtn.click();
                clearInterval(autoClicker);
                chrome.storage.local.set({ 'music_reco_autoplay': false });
                
                // S'assurer que la vue playing est active
                const loader = sidebar.querySelector('#temp-loader');
                if(loader) loader.remove();
                initialView.style.display = 'none';
                playingView.style.display = 'block';
                chrome.storage.local.set({ 'music_reco_state': 'playing' });

            } else if (attempts > 20) { // 10 secondes timeout
                console.log("Timeout autoplay : pas de bouton play trouvé.");
                clearInterval(autoClicker);
                chrome.storage.local.set({ 'music_reco_autoplay': false });
                
                // Retour à l'état initial si échec
                const loader = sidebar.querySelector('#temp-loader');
                if(loader) loader.remove();
                initialView.style.display = 'block';
                playingView.style.display = 'none';
            }
        }, 500);
    }
});

// Sauvegarder la position à la fin du drag
function savePosition() {
    chrome.storage.local.set({
        'sidebarPos': {
            top: panel.style.top,
            left: panel.style.left
        }
    });
}

// === Timer Logic ===
let totalSeconds = 0;

function updateTimerDisplay() {
    if(!timerEl) return;
    const min = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const sec = (totalSeconds % 60).toString().padStart(2, '0');
    timerEl.textContent = `${min}:${sec}`;
}

// Vérifier si musique joue toutes les secondes
// Et détecter la FIN de la musique pour auto-skip
setInterval(() => {
    // Astuce SoundCloud : regarder si le bouton Play global a la classe 'playing'
    const playControl = document.querySelector('.playControl');
    const isPlaying = playControl && playControl.classList.contains('playing');

    if (isPlaying) {
        totalSeconds++;
        updateTimerDisplay();
        
        // Sauvegarder toutes les 5s pour pas spammer le storage
        if (totalSeconds % 5 === 0) {
            chrome.storage.local.set({ 'listeningTime': totalSeconds });
        }
        
        // Check progress bar pour voir si c'est la fin
        // class="playbackTimeline__progressWrapper" aria-valuenow="123" aria-valuemax="300"
        const progress = document.querySelector('.playbackTimeline__progressWrapper');
        if (progress) {
            const current = parseInt(progress.getAttribute('aria-valuenow'), 10);
            const max = parseInt(progress.getAttribute('aria-valuemax'), 10);
            
            // Si on est à moins de 2 secondes de la fin et que ça joue encore
            // On considère que c'est fini et on déclenche le suivant
            // Note: on vérifie aussi que 'current > 1' pour éviter le déclenchement au tout début si bug de stats
            if (max > 0 && current >= max - 2 && current > 1) {
                 // Vérifier qu'on est pas déjà en train de changer de morceau pour éviter boucle
                 if(!window.isChangingTrack) {
                    window.isChangingTrack = true;
                    console.log("Fin de musique détectée ! Lancement auto du suivant...");
                    triggerRecommendation();
                 }
            } else {
                window.isChangingTrack = false;
            }
        }
        
    }
}, 1000);


let isDragging = false;
let startX, startY, initialLeft, initialTop;

header.addEventListener('mousedown', (e) => {
  // Ignorer si on clique sur le bouton fermer
  if (e.target.closest('#reco-close')) return;

  isDragging = true;
  header.style.cursor = 'grabbing';
  
  // Calculer la position initiale
  const rect = panel.getBoundingClientRect();
  startX = e.clientX;
  startY = e.clientY;
  initialLeft = rect.left;
  initialTop = rect.top;
  
  // Passer en positionnement absolu par rapport au viewport si nécessaire
  // Note: fixed utilise left/top par rapport à la fenêtre
  panel.style.right = 'auto'; // Désactiver le 'right' initial
  panel.style.left = `${initialLeft}px`;
  panel.style.top = `${initialTop}px`;
});

document.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  
  e.preventDefault();
  const dx = e.clientX - startX;
  const dy = e.clientY - startY;
  
  let newTop = initialTop + dy;
  let newLeft = initialLeft + dx;
  
  const width = panel.offsetWidth;
  const height = panel.offsetHeight;
  const winWidth = window.innerWidth;
  const winHeight = window.innerHeight;

  // Limites (Haut / Bas / Gauche / Droite)
  if (newTop < 0) newTop = 0;
  if (newTop + height > winHeight) newTop = winHeight - height;
  
  if (newLeft < 0) newLeft = 0;
  if (newLeft + width > winWidth) newLeft = winWidth - width;

  panel.style.left = `${newLeft}px`;
  panel.style.top = `${newTop}px`;
});

document.addEventListener('mouseup', () => {
  if (isDragging) {
      savePosition(); // Sauvegarder quand on lache
  }
  isDragging = false;
  if(header) header.style.cursor = 'grab';
});

// Logique de fermeture
closeBtn.onclick = () => {
  sidebar.style.display = 'none';
  chrome.storage.local.set({ 'sidebarVisible': false });
};

// Ecouter les messages du background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleSidebar') {
    if (sidebar.style.display === 'none') {
      sidebar.style.display = 'block';
      chrome.storage.local.set({ 'sidebarVisible': true });
      
      // Reset position si jamais perdue (optionnel)
      /* 
      const p = sidebar.querySelector('#reco-panel');
      if (p && !p.style.top) {
        p.style.top = '80px';
        p.style.right = '20px';
        p.style.left = 'auto';
      }
      */
    } else {
      sidebar.style.display = 'none';
      chrome.storage.local.set({ 'sidebarVisible': false });
    }
  }
});
