// Controller
class RecoController {
    constructor() {
        this.ui = new window.MusicRecoUI();
        this.adapter = new window.SoundCloudAdapter();
        this.state = {
            userId: null,
            algoType: 'matriciel',
            listeningTime: 0,
            status: 'idle', // idle, playing, loading
            isChangingTrack: false
        };

        this.init();
    }

    init() {
        // Initialize UI
        this.ui.init();
        this.bindEvents();
        this.loadStorage();
        this.startMonitoring();
    }

    bindEvents() {
        // UI Events
        this.ui.setEventHandler('onStart', () => this.triggerRecommendation());
        this.ui.setEventHandler('onNext', () => this.triggerRecommendation());
        
        this.ui.setEventHandler('onClose', () => {
             chrome.storage.local.set({ 'sidebarVisible': false });
        });

        this.ui.setEventHandler('onAlgoChange', (newAlgo) => {
            this.state.algoType = newAlgo;
            chrome.storage.local.set({ 'algoType': newAlgo });
            console.log("Algo changed to:", newAlgo);
        });

        this.ui.setEventHandler('onPositionChange', (pos) => {
            chrome.storage.local.set({ 'sidebarPos': pos });
        });

        // Runtime Messages (from background/popup)
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'toggleSidebar') {
                this.toggleSidebar();
            }
        });
    }

    loadStorage() {
        chrome.storage.local.get([
            'userId', 'algoType', 'sidebarPos', 'sidebarVisible', 
            'listeningTime', 'music_reco_autoplay', 'music_reco_state'
        ], (res) => {
            // User ID
            if (res.userId) {
                this.state.userId = res.userId;
            } else {
                this.state.userId = 'user_' + Math.random().toString(36).substr(2, 9);
                chrome.storage.local.set({ 'userId': this.state.userId });
            }
            this.ui.setUserId(this.state.userId);

            // Algo
            if (res.algoType) {
                this.state.algoType = res.algoType;
                this.ui.setAlgo(res.algoType);
            }

            // Position
            this.ui.restorePosition(res.sidebarPos);

            // Visibility
            if (res.sidebarVisible === false) {
                this.ui.toggleVisibility(false);
            }

            // State restoration
            if (res.listeningTime) this.state.listeningTime = res.listeningTime;
            
            if (res.music_reco_state === 'playing') {
                this.changeState('playing');
                this.ui.updateTimer(this.state.listeningTime);
            } else {
                this.changeState('idle');
            }

            // Autoplay Logic
            if (res.music_reco_autoplay) {
                this.handleAutoplay();
            }
        });
    }

    toggleSidebar() {
        const isHidden = (this.ui.container.style.display === 'none');
        this.ui.container.style.display = isHidden ? 'block' : 'none';
        chrome.storage.local.set({ 'sidebarVisible': isHidden });
    }

    changeState(newState) {
        this.state.status = newState;
        if (newState === 'idle') this.ui.showView('initial');
        if (newState === 'loading') this.ui.showView('loader', { algo: this.state.algoType });
        if (newState === 'playing') this.ui.showView('playing');
    }

    async triggerRecommendation() {
        console.log("Triggering recommendation...");
        
        // Log previous session if any
        if (this.state.listeningTime > 0) {
            console.log(`Ended session: ${this.state.listeningTime}s`);
            this.state.listeningTime = 0;
            chrome.storage.local.set({ 'listeningTime': 0 });
            this.ui.updateTimer(0);
        }

        this.changeState('loading');

        // MOCK API CAIL
        // In real world, fetch(API_URL, { method: 'POST', body: ... })
        const mockSongs = ["Hello - CardiB", "Blinding Lights - The Weeknd", "Bad Guy - Billie Eilish", "Shape of You - Ed Sheeran", "Levitating - Dua Lipa"];
        const randomSong = mockSongs[Math.floor(Math.random() * mockSongs.length)];

        // Simulate delay
        await new Promise(r => setTimeout(r, 1500));
        
        console.log("Recommended:", randomSong);

        // Set flags for next page load
        chrome.storage.local.set({ 
            'music_reco_autoplay': true, 
            'music_reco_state': 'playing' 
        }, () => {
            // Navigate
            this.adapter.search(randomSong);
            
            // Handle SPA Navigation case (page doesn't reload)
            this.adapter.waitForUrl('/search')
                .then(() => {
                    console.log("[MusicReco] URL changed, triggering autoplay logic for SPA");
                    // Wait a bit for DOM to be stale/cleared before searching for new buttons
                    return new Promise(r => setTimeout(r, 1000));
                })
                .then(() => this.handleAutoplay())
                .catch(err => console.log("[MusicReco] SPA Navigation check timeout/error:", err));
        });
    }

    async handleAutoplay() {
        console.log("Autoplay active, trying to play...");
        this.changeState('loading'); // Show loading while finding button
        
        const success = await this.adapter.playFirstResult();
        
        if (success) {
            this.changeState('playing');
            chrome.storage.local.set({ 'music_reco_autoplay': false });
        } else {
            console.log("Autoplay failed.");
            this.changeState('idle');
            chrome.storage.local.set({ 'music_reco_autoplay': false });
        }
    }

    startMonitoring() {
        setInterval(() => {
            if (this.adapter.isPlaying()) {
                this.state.listeningTime++;
                this.ui.updateTimer(this.state.listeningTime);
                
                // Backup every 5s
                if (this.state.listeningTime % 5 === 0) {
                    chrome.storage.local.set({ 'listeningTime': this.state.listeningTime });
                }

                // Check for end of track
                const progress = this.adapter.getProgress();
                if (progress && progress.max > 0) {
                     // If less than 2s remaining
                     if (progress.current >= progress.max - 2 && progress.current > 1) {
                         if (!this.state.isChangingTrack) {
                             this.state.isChangingTrack = true;
                             console.log("Track finished. Autoplaying next...");
                             this.triggerRecommendation();
                         }
                     } else {
                         this.state.isChangingTrack = false;
                     }
                }
            }
        }, 1000);
    }
}

// Start
new RecoController();
