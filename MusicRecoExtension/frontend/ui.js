class MusicRecoUI {
    constructor() {
        this.container = null;
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
        // Container
        const container = document.createElement('div');
        container.id = 'music-reco-container';

        // Panel
        const panel = document.createElement('div');
        panel.id = 'reco-panel';
        
        // Header
        const header = this.createHeader();
        panel.appendChild(header);

        // Settings
        const settings = this.createSettingsPanel();
        panel.appendChild(settings);

        // Content Area
        const content = document.createElement('div');
        content.id = 'reco-content';

        // Views
        this.views.initial = this.createInitialView();
        content.appendChild(this.views.initial);

        this.views.playing = this.createPlayingView();
        content.appendChild(this.views.playing);

        this.views.loader = this.createLoaderView();
        content.appendChild(this.views.loader);

        panel.appendChild(content);
        container.appendChild(panel);
        document.body.appendChild(container);

        this.container = container;
        this.panel = panel;
    }

    createHeader() {
        const header = document.createElement('div');
        header.id = 'reco-header';

        const title = document.createElement('div');
        title.className = 'reco-header-title';
        title.innerHTML = '<span>🎵</span> Music Assistant';

        const actions = document.createElement('div');
        actions.className = 'reco-header-actions';

        const settingsBtn = document.createElement('button');
        settingsBtn.className = 'reco-icon-btn reco-settings-btn';
        settingsBtn.textContent = '⚙️';
        settingsBtn.onclick = () => this.toggleSettings();

        const closeBtn = document.createElement('button');
        closeBtn.className = 'reco-icon-btn reco-close-btn';
        closeBtn.textContent = '×';
        closeBtn.onclick = () => {
            this.toggleVisibility(false);
            if (this.handlers.onClose) this.handlers.onClose();
        };

        actions.appendChild(settingsBtn);
        actions.appendChild(closeBtn);

        header.appendChild(title);
        header.appendChild(actions);
        
        this.elements.header = header;
        return header;
    }

    createSettingsPanel() {
        const panel = document.createElement('div');
        panel.id = 'reco-settings-panel';

        const label = document.createElement('label');
        label.className = 'setting-label';
        label.textContent = 'Algorithme de recommandation :';

        const select = document.createElement('select');
        select.id = 'algo-selector';
        const opts = [
            {v: 'matriciel', t: 'Matriciel (Collaborative)'},
            {v: 'content', t: 'Contenu (Audio features)'},
            {v: 'mix', t: 'Mix / Hybride'}
        ];
        opts.forEach(o => {
            const opt = document.createElement('option');
            opt.value = o.v;
            opt.textContent = o.t;
            select.appendChild(opt);
        });
        select.onchange = (e) => {
            if (this.handlers.onAlgoChange) this.handlers.onAlgoChange(e.target.value);
            this.toggleSettings(false);
        };

        const userInfo = document.createElement('div');
        userInfo.className = 'user-id-info';
        userInfo.innerHTML = 'User ID: <span id="user-id-display">...</span>';

        panel.appendChild(label);
        panel.appendChild(select);
        panel.appendChild(userInfo);

        this.elements.settingsPanel = panel;
        this.elements.algoSelector = select;
        this.elements.userIdDisplay = userInfo.querySelector('#user-id-display');
        return panel;
    }

    createInitialView() {
        const div = document.createElement('div');
        div.id = 'initial-view';
        div.className = 'view-section active';

        div.innerHTML = `
            <div class="big-icon">🎧</div>
            <h3 class="view-title">Prêt à recommander</h3>
        `;

        const btn = document.createElement('button');
        btn.className = 'primary-btn';
        btn.textContent = '▶ Commencer l\'écoute';
        btn.onclick = () => {
             if (this.handlers.onStart) this.handlers.onStart();
        };

        div.appendChild(btn);
        return div;
    }

    createPlayingView() {
        const div = document.createElement('div');
        div.id = 'playing-view';
        div.className = 'view-section';

        div.innerHTML = `
            <h3>En lecture 🎶</h3>
            <div id="reco-timer">00:00</div>
        `;

        const btn = document.createElement('button');
        btn.className = 'secondary-btn';
        btn.innerHTML = '<span>⏭</span> Passer (Algo)';
        btn.onclick = () => {
            if (this.handlers.onNext) this.handlers.onNext();
        };

        div.appendChild(btn);
        
        this.elements.timer = div.querySelector('#reco-timer');
        return div;
    }

    createLoaderView() {
        const div = document.createElement('div');
        div.id = 'temp-loader';
        div.className = 'view-section';
        div.innerHTML = `
            <div>🎧 Analyse en cours...<br>
            <span class="loader-subtext" id="loader-algo-text"></span></div>
        `;
        this.elements.loaderText = div.querySelector('#loader-algo-text');
        return div;
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
            e.preventDefault();

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
