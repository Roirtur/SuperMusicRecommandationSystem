class MusicRecoUI {
    constructor() {
        this.container = null;
        this.shadowRoot = null;
        this.panel = null;
        this.views = {};
        this.elements = {};
        this.handlers = {};
    }

    init() {
        this.createSidebar();
        this.attachDragAndDrop();
    }

    createSidebar() {
        // Create host container
        const host = document.createElement('div');
        host.id = 'music-reco-host';
        document.body.appendChild(host);

        // Attach Shadow DOM
        this.shadowRoot = host.attachShadow({ mode: 'open' });

        // Create styles for Shadow DOM
        const style = document.createElement('style');
        style.textContent = this.getShadowStyles();
        this.shadowRoot.appendChild(style);

        // Create HTML structure inside Shadow DOM
        const wrapper = document.createElement('div');
        wrapper.innerHTML = this.getShadowHTML();
        this.shadowRoot.appendChild(wrapper);

        // Store references to key elements
        this.container = host;
        this.panel = this.shadowRoot.querySelector('#reco-panel');
        this.views.initial = this.shadowRoot.querySelector('#initial-view');
        this.views.playing = this.shadowRoot.querySelector('#playing-view');
        this.views.loader = this.shadowRoot.querySelector('#temp-loader');

        this.elements.header = this.shadowRoot.querySelector('#reco-header');
        this.elements.settingsPanel = this.shadowRoot.querySelector('#reco-settings-panel');
        this.elements.algoSelector = this.shadowRoot.querySelector('#algo-selector');
        this.elements.userIdDisplay = this.shadowRoot.querySelector('#user-id-display');
        this.elements.timer = this.shadowRoot.querySelector('#reco-timer');
        this.elements.loaderText = this.shadowRoot.querySelector('#loader-algo-text');

        // Attach event listeners
        this.attachEventListeners();
    }

    getShadowHTML() {
        return `
            <div id="reco-panel">
                <div id="reco-header">
                    <div class="reco-header-title">
                        <span>🎵</span> Music Assistant
                    </div>
                    <div class="reco-header-actions">
                        <button class="reco-icon-btn reco-settings-btn" id="settings-btn">⚙️</button>
                        <button class="reco-icon-btn reco-close-btn" id="close-btn">×</button>
                    </div>
                </div>

                <div id="reco-settings-panel">
                    <label class="setting-label">Algorithme de recommandation :</label>
                    <select id="algo-selector">
                        <option value="matriciel">Matriciel (Collaborative)</option>
                        <option value="content">Contenu (Audio features)</option>
                        <option value="mix">Mix / Hybride</option>
                    </select>
                    <div class="user-id-info">User ID: <span id="user-id-display">...</span></div>
                </div>

                <div id="reco-content">
                    <div id="initial-view" class="view-section active">
                        <div class="big-icon">🎧</div>
                        <h3 class="view-title">Prêt à recommander</h3>
                        <button class="primary-btn" id="start-btn">▶ Commencer l'écoute</button>
                    </div>

                    <div id="playing-view" class="view-section">
                        <h3>En lecture 🎶</h3>
                        <div id="reco-timer">00:00</div>
                        <button class="secondary-btn" id="next-btn"><span>⏭</span> Passer (Algo)</button>
                        <button class="secondary-btn" id="stop-btn" style="margin-top: 10px; background-color: #d63031;">
                            <span>⏹</span> Stop
                        </button>
                    </div>

                    <div id="temp-loader" class="view-section">
                        <div>🎧 Analyse en cours...<br>
                        <span class="loader-subtext" id="loader-algo-text"></span></div>
                    </div>
                </div>
            </div>
        `;
    }

    getShadowStyles() {
        return `
            * {
                box-sizing: border-box;
            }

            :host {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                --z-index: 2147483647;
            }

            #reco-panel {
                position: fixed;
                top: 80px;
                right: 20px;
                width: 320px;
                height: 500px;
                background-color: #1a1a1a;
                border: 1px solid #333;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
                border-radius: 8px;
                color: #e0e0e0;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                z-index: var(--z-index);
            }

            #reco-header {
                padding: 12px 16px;
                background-color: #252525;
                border-bottom: 1px solid #333;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: grab;
                user-select: none;
            }

            #reco-header:active {
                cursor: grabbing;
            }

            .reco-header-title {
                font-weight: 600;
                color: #fff;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .reco-header-actions {
                display: flex;
                gap: 10px;
                align-items: center;
            }

            .reco-icon-btn {
                background: transparent;
                border: none;
                color: #888;
                cursor: pointer;
                line-height: 1;
                padding: 4px;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s, color 0.2s;
                font-size: 16px;
            }

            .reco-icon-btn:hover {
                background: #333;
                color: #fff;
            }

            .reco-close-btn {
                font-size: 20px;
            }

            #reco-settings-panel {
                display: none;
                background: #222;
                padding: 15px;
                border-bottom: 1px solid #333;
            }

            #reco-settings-panel.visible {
                display: block;
            }

            .setting-label {
                color: #ccc;
                font-size: 12px;
                display: block;
                margin-bottom: 5px;
            }

            #algo-selector {
                width: 100%;
                padding: 8px;
                background: #333;
                color: white;
                border: 1px solid #444;
                border-radius: 4px;
                outline: none;
            }

            .user-id-info {
                color: #666;
                font-size: 10px;
                margin-top: 5px;
            }

            #reco-content {
                padding: 20px;
                flex: 1;
                overflow-y: auto;
                background-color: #1a1a1a;
                display: flex;
                flex-direction: column;
                align-items: center;
            }

            .view-section {
                width: 100%;
                text-align: center;
                display: none;
            }

            .view-section.active {
                display: block;
            }

            #initial-view {
                margin-top: 50px;
                color: #888;
            }

            .big-icon {
                font-size: 40px;
                margin-bottom: 15px;
            }

            .view-title {
                color: #fff;
                margin: 0 0 8px 0;
                font-size: 16px;
            }

            .primary-btn {
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
            }

            .primary-btn:hover {
                background-color: #f30;
            }

            #playing-view h3 {
                color: #f50;
                margin-bottom: 10px;
            }

            #reco-timer {
                font-size: 24px;
                color: #fff;
                font-family: monospace;
                margin-bottom: 20px;
                font-weight: bold;
            }

            .secondary-btn {
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
            }

            .secondary-btn:hover {
                border-color: #666;
                color: #fff;
            }
        `;
    }

    attachEventListeners() {
        const startBtn = this.shadowRoot.querySelector('#start-btn');
        const nextBtn = this.shadowRoot.querySelector('#next-btn');
        const stopBtn = this.shadowRoot.querySelector('#stop-btn');
        const settingsBtn = this.shadowRoot.querySelector('#settings-btn');
        const closeBtn = this.shadowRoot.querySelector('#close-btn');
        const algoSelector = this.elements.algoSelector;

        if (startBtn) startBtn.addEventListener('click', () => {
            if (this.handlers.onStart) this.handlers.onStart();
        });

        if (nextBtn) nextBtn.addEventListener('click', () => {
            if (this.handlers.onNext) this.handlers.onNext();
        });

        if (stopBtn) stopBtn.addEventListener('click', () => {
            if (this.handlers.onStop) this.handlers.onStop();
        });

        if (settingsBtn) settingsBtn.addEventListener('click', () => this.toggleSettings());

        if (closeBtn) closeBtn.addEventListener('click', () => {
            this.toggleVisibility(false);
            if (this.handlers.onClose) this.handlers.onClose();
        });

        if (algoSelector) {
            algoSelector.addEventListener('change', (e) => {
                if (this.handlers.onAlgoChange) this.handlers.onAlgoChange(e.target.value);
                this.toggleSettings(false);
            });
        }
    }

    // --- Actions ---

    toggleVisibility(show) {
        this.container.style.display = show ? 'block' : 'none';
    }

    toggleSettings(force) {
        const p = this.elements.settingsPanel;
        const show = force !== undefined ? force : !p.classList.contains('visible');
        if (show) p.classList.add('visible');
        else p.classList.remove('visible');
    }

    showView(viewName, data = {}) {
        Object.values(this.views).forEach(v => v.classList.remove('active'));
        
        if (viewName === 'initial') this.views.initial.classList.add('active');
        if (viewName === 'playing') this.views.playing.classList.add('active');
        if (viewName === 'loader') {
            this.views.loader.classList.add('active');
            if(data.algo) this.elements.loaderText.textContent = `(Algo: ${data.algo})`;
        }
    }

    updateTimer(seconds) {
        if (!this.elements.timer) return;
        const min = Math.floor(seconds / 60).toString().padStart(2, '0');
        const sec = (seconds % 60).toString().padStart(2, '0');
        this.elements.timer.textContent = `${min}:${sec}`;
    }

    setUserId(id) {
        if (this.elements.userIdDisplay) this.elements.userIdDisplay.textContent = id;
    }

    setAlgo(algo) {
        if (this.elements.algoSelector) this.elements.algoSelector.value = algo;
    }

    setEventHandler(event, fn) {
        this.handlers[event] = fn;
    }

    // --- Drag & Drop ---
    attachDragAndDrop() {
        const header = this.elements.header;
        const panel = this.panel;
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return; // Ignore buttons

            isDragging = true;
            header.style.cursor = 'grabbing';

            const rect = panel.getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;
            initialLeft = rect.left;
            initialTop = rect.top;

            // Reset right to auto to allow left positioning
            panel.style.right = 'auto';
            panel.style.left = `${initialLeft}px`;
            panel.style.top = `${initialTop}px`;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            let newTop = initialTop + dy;
            let newLeft = initialLeft + dx;

            // Boundaries
            const width = panel.offsetWidth;
            const height = panel.offsetHeight;
            const winWidth = window.innerWidth;
            const winHeight = window.innerHeight;

            if (newTop < 0) newTop = 0;
            if (newTop + height > winHeight) newTop = winHeight - height;
            if (newLeft < 0) newLeft = 0;
            if (newLeft + width > winWidth) newLeft = winWidth - width;

            panel.style.left = `${newLeft}px`;
            panel.style.top = `${newTop}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isDragging && this.handlers.onPositionChange) {
                this.handlers.onPositionChange({
                    top: panel.style.top,
                    left: panel.style.left
                });
            }
            isDragging = false;
            header.style.cursor = 'grab';
        });
    }

    restorePosition(pos) {
        if (pos && pos.top && pos.left) {
            this.panel.style.top = pos.top;
            this.panel.style.left = pos.left;
            this.panel.style.right = 'auto';
        }
    }
}

// Expose
window.MusicRecoUI = MusicRecoUI;
