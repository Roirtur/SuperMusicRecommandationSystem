// Controller
class RecoController {
    constructor() {
        this.ui = new window.MusicRecoUI();
        this.adapter = new window.SoundCloudAdapter();
        this.api = new window.MusicRecoAPI();
        this.state = {
            userId: null,
            algoType: 'matriciel',
            listeningTime: 0,
            status: 'idle', // idle, playing, loading
            isChangingTrack: false,
            monitoredUrl: null,
            currentTrackSignature: null,
            currentTrackId: null // Store current track being played
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
        this.ui.setEventHandler('onStop', () => this.stopSession());
        
        this.ui.setEventHandler('onClose', () => {
             // Just hide for current session, don't persist
             this.ui.toggleVisibility(false);
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
            'userId', 'algoType', 'sidebarPos', 
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

            // Always show sidebar by default on page load
            this.ui.toggleVisibility(true);

            // State restoration
            // We do NOT restore 'playing' state to ensure fresh sessions on reload,
            // unless we are in the middle of an autoplay sequence we triggered.
            
            // Autoplay Logic
            if (res.music_reco_autoplay) {
                this.handleAutoplay();
            } else {
                 this.changeState('idle');
            }
        });
    }

    toggleSidebar() {
        const isHidden = (this.ui.container.style.display === 'none');
        this.ui.container.style.display = isHidden ? 'block' : 'none';
        // Don't persist visibility state - always show on page reload
    }

    changeState(newState) {
        this.state.status = newState;
        if (newState === 'idle') this.ui.showView('initial');
        if (newState === 'loading') this.ui.showView('loader', { algo: this.state.algoType });
        if (newState === 'playing') this.ui.showView('playing');
    }

    stopSession() {
        console.log("Stopping session...");
        
        // Send feedback before stopping if we have data
        if (this.state.listeningTime > 0 && this.state.currentTrackId) {
            console.log(`Sending feedback: ${this.state.currentTrackId}, listened ${this.state.listeningTime}s`);
            this.api.sendFeedback(
                this.state.userId,
                this.state.currentTrackId,
                this.state.listeningTime
            ).then(result => {
                console.log('[Feedback] Result:', result);
            }).catch(err => {
                console.error('[Feedback] Error:', err);
            });
        }
        
        this.changeState('idle');
        this.state.listeningTime = 0;
        this.state.monitoredUrl = null;
        this.state.currentTrackSignature = null;
        this.state.currentTrackId = null;
        chrome.storage.local.set({ 
            'listeningTime': 0, 
            'music_reco_state': 'idle',
            'currentTrackId': null 
        });
        this.ui.updateTimer(0);
    }

    async triggerRecommendation() {
        console.log("Triggering recommendation...");
        
        // Send feedback for previous session if any
        if (this.state.listeningTime > 0 && this.state.currentTrackId) {
            console.log(`Ending previous session: ${this.state.currentTrackId}, ${this.state.listeningTime}s`);
            try {
                const feedbackResult = await this.api.sendFeedback(
                    this.state.userId,
                    this.state.currentTrackId,
                    this.state.listeningTime
                );
                console.log('[Feedback] Result:', feedbackResult);
            } catch (err) {
                console.error('[Feedback] Error:', err);
            }
            
            this.state.listeningTime = 0;
            chrome.storage.local.set({ 'listeningTime': 0 });
            this.ui.updateTimer(0);
        }

        this.changeState('loading');
        this.state.monitoredUrl = null;
        this.state.currentTrackSignature = null;
        this.state.currentTrackId = null;

        try {
            // Call API to get recommendation
            const recommendation = await this.api.getRecommendation(
                this.state.userId, 
                this.state.algoType
            );
            
            console.log("Recommended:", recommendation.song_title, "via", recommendation.algorithm);
            
            // Store the track ID for feedback later
            const recommendedTrack = recommendation.song_title;
            
            // Set flags for next page load
            chrome.storage.local.set({ 
                'music_reco_autoplay': true, 
                'music_reco_state': 'playing',
                'currentTrackId': recommendedTrack
            }, () => {
                // Navigate
                this.adapter.search(recommendedTrack);
                
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
        } catch (error) {
            console.error("Failed to get recommendation:", error);
            this.ui.showNotification("Failed to get recommendation. Please try again.");
            this.changeState('idle');
        }
    }

    async handleAutoplay() {
        console.log("Autoplay active, trying to play...");
        this.changeState('loading'); // Show loading while finding button
        
        const success = await this.adapter.playFirstResult();
        
        if (success) {
            this.changeState('playing');
            chrome.storage.local.set({ 'music_reco_autoplay': false });
            
            // Wait a moment for the footer to update with the new song details
            setTimeout(() => {
                this.state.currentTrackSignature = this.adapter.getCurrentTrackDetails();
                console.log("Tracking started for:", this.state.currentTrackSignature);
                
                // Restore currentTrackId from storage for feedback
                chrome.storage.local.get(['currentTrackId'], (res) => {
                    if (res.currentTrackId) {
                        this.state.currentTrackId = res.currentTrackId;
                        console.log("Current track ID set:", this.state.currentTrackId);
                    }
                });
            }, 2000);
            
        } else {
            console.log("Autoplay failed.");
            this.changeState('idle');
            chrome.storage.local.set({ 'music_reco_autoplay': false });
        }
    }

    startMonitoring() {
        // Track playing status and song changes using event-driven approach
        let monitoringInterval = null;
        
        // Setup History API listener for URL/navigation changes
        this.adapter.onUrlChange((newUrl) => {
            console.log("[MusicReco] URL changed via SPA navigation:", newUrl);
            if (this.state.status === 'playing') {
                // Check if we navigated away from music
                if (!newUrl.includes('/you/') && !newUrl.includes('/search')) {
                    console.log("Navigated away from playback context");
                }
            }
        });

        // Polling is kept minimal - only tick when playing to update UI timer
        let wasPlayingBefore = false; // Track previous play state
        
        const startTickingInterval = () => {
            if (monitoringInterval) return; // Already running
            
            monitoringInterval = setInterval(() => {
                const isCurrentlyPlaying = this.adapter.isPlaying();

                // Handle pause/unpause
                if (!isCurrentlyPlaying && wasPlayingBefore) {
                    // Just paused - keep ticking but don't increment time
                    wasPlayingBefore = false;
                    return;
                }
                
                if (isCurrentlyPlaying && !wasPlayingBefore) {
                    // Just unpaused - resume ticking
                    wasPlayingBefore = true;
                }

                if (!isCurrentlyPlaying) {
                    // Not playing (paused or stopped)
                    return;
                }

                if (this.state.status === 'playing') {
                    // Update track signature if changed
                    const currentSig = this.adapter.getCurrentTrackDetails();
                    if (this.state.currentTrackSignature && currentSig) {
                        if (currentSig !== this.state.currentTrackSignature) {
                            console.log("Track changed manually! Stopping session.");
                            
                            // Send feedback before stopping
                            if (this.state.listeningTime > 0 && this.state.currentTrackId) {
                                this.api.sendFeedback(
                                    this.state.userId,
                                    this.state.currentTrackId,
                                    this.state.listeningTime
                                ).then(result => {
                                    console.log('[Feedback] Manual stop result:', result);
                                }).catch(err => {
                                    console.error('[Feedback] Manual stop error:', err);
                                });
                            }
                            
                            this.ui.showNotification("Music interrupted! Stopping recommendation process.");
                            this.stopSession();
                            return;
                        }
                    } else if (!this.state.currentTrackSignature && currentSig) {
                        this.state.currentTrackSignature = currentSig;
                    }

                    // Increment listening time
                    this.state.listeningTime++;
                    this.ui.updateTimer(this.state.listeningTime);
                    
                    // Backup to storage every 5s
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
        };

        // Start ticking when we enter 'playing' state
        // We'll hook this via state changes
        const originalChangeState = this.changeState.bind(this);
        this.changeState = (newState) => {
            originalChangeState(newState);
            if (newState === 'playing') {
                wasPlayingBefore = true;
                startTickingInterval();
            } else if (monitoringInterval) {
                clearInterval(monitoringInterval);
                monitoringInterval = null;
                wasPlayingBefore = false;
            }
        };
    }
}

// Start
new RecoController();
