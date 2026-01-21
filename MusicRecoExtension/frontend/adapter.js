class SoundCloudAdapter {
    constructor() {
        // Observers stored to clean up if needed
        this.observers = [];
    }

    /**
     * Navigate to a search query using internal routing if possible,
     * fallback to location assignment.
     */
    search(query) {
        const url = `/search/sounds?q=${encodeURIComponent(query)}`;
        
        // Try to find an internal router or link to hijacking
        // SoundCloud is an SPA. We can try to create a link and click it.
        const link = document.createElement('a');
        link.href = url;
        link.style.display = 'none';
        document.body.appendChild(link);
        
        // This usually triggers the SPA router
        link.click();
        
        // Cleanup
        setTimeout(() => link.remove(), 100);
    }

    /**
     * Wait for the URL to change to contain a specific string
     */
    waitForUrl(part, timeout = 5000) {
        return new Promise((resolve, reject) => {
            if (window.location.href.includes(part)) return resolve();

            const interval = setInterval(() => {
                if (window.location.href.includes(part)) {
                    clearInterval(interval);
                    resolve();
                }
            }, 500);

            setTimeout(() => {
                clearInterval(interval);
                reject(new Error(`Timeout waiting for URL to contain ${part}`));
            }, timeout);
        });
    }

    /**
     * Waitt for a specific element to appear in the DOM
     */
    waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const el = document.querySelector(selector);
            if (el) return resolve(el);

            const observer = new MutationObserver((mutations, obs) => {
                const element = document.querySelector(selector);
                if (element) {
                    obs.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Timeout waiting for ${selector}`));
            }, timeout);
        });
    }

    /**
     * Try to find the play button of the first result and click it.
     */
    async playFirstResult() {
        console.log("[MusicReco] Searching for play button...");
        try {
            // Wait for the list item to appear
            // Note: Selectors on SC can be tricky. 
            // .searchList__item is common, keeping it but adding fallbacks in logic if needed
            const resultSelector = '.searchList__item';
            await this.waitForElement(resultSelector);

            // Now look for the play button within the first few results
            const playBtnSelector = '.sc-button-play'; 
            // We wait a bit more for the button specifically just in case
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
        // SoundCloud footer classes
        const titleEl = document.querySelector('.playControls .playbackSoundBadge__titleLink');
        const artistEl = document.querySelector('.playControls .playbackSoundBadge__lightLink');
        
        if (!titleEl) return null;

        // Use title + artist as a unique-ish signature
        const title = titleEl.getAttribute('title') || titleEl.innerText;
        const artist = artistEl ? (artistEl.getAttribute('title') || artistEl.innerText) : '';
        
        return `${artist} - ${title}`;
    }
}

// Expose to global scope for other scripts
window.SoundCloudAdapter = SoundCloudAdapter;
