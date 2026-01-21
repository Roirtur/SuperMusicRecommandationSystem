class SoundCloudAdapter {
    constructor() {
        this.observers = [];
        this.historyListeners = [];
        this.setupHistoryTracking();
    }

    /**
     * Setup History API tracking to detect SPA navigation
     */
    setupHistoryTracking() {
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        const notifyListeners = (newUrl) => {
            this.historyListeners.forEach(callback => callback(newUrl));
        };

        history.pushState = function(...args) {
            const result = originalPushState.apply(history, args);
            notifyListeners(window.location.href);
            return result;
        };

        history.replaceState = function(...args) {
            const result = originalReplaceState.apply(history, args);
            notifyListeners(window.location.href);
            return result;
        };
    }

    /**
     * Register a callback for URL changes (SPA navigation)
     */
    onUrlChange(callback) {
        this.historyListeners.push(callback);
    }

    /**
     * Navigate to a search query using internal routing
     */
    search(query) {
        const url = `/search/sounds?q=${encodeURIComponent(query)}`;
        
        // SoundCloud is an SPA. Create a link and click it to trigger internal router.
        const link = document.createElement('a');
        link.href = url;
        link.style.display = 'none';
        document.body.appendChild(link);
        
        link.click();
        
        // Cleanup
        setTimeout(() => link.remove(), 100);
    }

    /**
     * Wait for a specific element to appear in the DOM using MutationObserver
     * More efficient than polling setInterval
     */
    waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const el = document.querySelector(selector);
            if (el) return resolve(el);

            const observer = new MutationObserver((mutations) => {
                const element = document.querySelector(selector);
                if (element) {
                    observer.disconnect();
                    this.observers = this.observers.filter(o => o !== observer);
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            this.observers.push(observer);

            setTimeout(() => {
                observer.disconnect();
                this.observers = this.observers.filter(o => o !== observer);
                reject(new Error(`Timeout waiting for ${selector}`));
            }, timeout);
        });
    }

    /**
     * Wait for the URL to change to contain a specific string
     */
    waitForUrl(part, timeout = 5000) {
        return new Promise((resolve, reject) => {
            if (window.location.href.includes(part)) return resolve();

            const checkUrl = (newUrl) => {
                if (newUrl.includes(part)) {
                    this.historyListeners = this.historyListeners.filter(cb => cb !== checkUrl);
                    resolve();
                }
            };

            this.onUrlChange(checkUrl);

            setTimeout(() => {
                this.historyListeners = this.historyListeners.filter(cb => cb !== checkUrl);
                reject(new Error(`Timeout waiting for URL to contain ${part}`));
            }, timeout);
        });
    }

    /**
     * Try to find the play button of the first result and click it.
     */
    async playFirstResult() {
        console.log("[MusicReco] Searching for play button...");
        try {
            const resultSelector = '.searchList__item';
            await this.waitForElement(resultSelector);

            const playBtnSelector = '.sc-button-play'; 
            const playBtn = await this.waitForElement(`${resultSelector} ${playBtnSelector}`);
            
            console.log("[MusicReco] Play button found, clicking.");
            playBtn.click();
            return true;
        } catch (e) {
            console.error("[MusicReco] Failed to autoplay:", e);
            return false;
        }
    }

    /**
     * Check if music is currently playing
     */
    isPlaying() {
        const playControl = document.querySelector('.playControl');
        return playControl && playControl.classList.contains('playing');
    }

    /**
     * Get Progress of current track
     * @returns { current: number, max: number }
     */
    getProgress() {
        const progress = document.querySelector('.playbackTimeline__progressWrapper');
        if (!progress) return null;

        return {
            current: parseInt(progress.getAttribute('aria-valuenow'), 10) || 0,
            max: parseInt(progress.getAttribute('aria-valuemax'), 10) || 0
        };
    }

    /**
     * Get details of the current track from the player footer
     */
    getCurrentTrackDetails() {
        const titleEl = document.querySelector('.playControls .playbackSoundBadge__titleLink');
        const artistEl = document.querySelector('.playControls .playbackSoundBadge__lightLink');
        
        if (!titleEl) return null;

        const title = titleEl.getAttribute('title') || titleEl.innerText;
        const artist = artistEl ? (artistEl.getAttribute('title') || artistEl.innerText) : '';
        
        return `${artist} - ${title}`;
    }

    /**
     * Clean up all observers
     */
    dispose() {
        this.observers.forEach(obs => obs.disconnect());
        this.observers = [];
        this.historyListeners = [];
    }
}

// Expose to global scope for other scripts
window.SoundCloudAdapter = SoundCloudAdapter;
