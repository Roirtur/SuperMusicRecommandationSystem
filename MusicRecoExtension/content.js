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
    
    <!-- Content -->
    <div id="reco-content" style="
      padding: 20px;
      flex: 1;
      overflow-y: auto;
      background-color: #1a1a1a;
    ">
       <div style="text-align: center; color: #888; margin-top: 50px;">
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
         ">
           ▶ Commencer l'écoute
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
const startBtn = sidebar.querySelector('#start-listening-btn');

if (startBtn) {
  startBtn.addEventListener('click', () => {
    console.log("SuperMusicRecommandationSystem : Bouton 'Commencer l'écoute' cliqué !");
  });
}

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
  isDragging = false;
  if(header) header.style.cursor = 'grab';
});

// Logique de fermeture
closeBtn.onclick = () => {
  sidebar.style.display = 'none';
};

// Ecouter les messages du background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleSidebar') {
    if (sidebar.style.display === 'none') {
      sidebar.style.display = 'block';
      // Reset position initiale
      const p = sidebar.querySelector('#reco-panel');
      if (p) {
        p.style.top = '80px';
        p.style.right = '20px';
        p.style.left = 'auto';
      }
    } else {
      sidebar.style.display = 'none';
    }
  }
});
