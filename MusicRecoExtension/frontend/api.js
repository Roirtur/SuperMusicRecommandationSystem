// API Configuration and Service
class MusicRecoAPI {
    constructor() {
        // Backend API Configuration
        this.baseUrl = 'http://localhost:5000';
        this.useMockData = false; // Set to true to use mock data instead of backend
        
        // Mock data for testing without backend
        this.mockSongs = [
            "Hello - Cardi B",
            "Blinding Lights - The Weeknd",
            "Bad Guy - Billie Eilish",
            "Shape of You - Ed Sheeran",
            "Levitating - Dua Lipa",
            "Watermelon Sugar - Harry Styles",
            "Peaches - Justin Bieber",
            "Save Your Tears - The Weeknd",
            "Good 4 U - Olivia Rodrigo",
            "Montero - Lil Nas X"
        ];
    }

    /**
     * Check if backend is available
     * @returns {Promise<boolean>}
     */
    async checkBackendHealth() {
        try {
            const response = await fetch(`${this.baseUrl}/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('[API] Backend health check:', data);
                return data.status === 'healthy';
            }
            return false;
        } catch (error) {
            console.error('[API] Backend health check failed:', error);
            return false;
        }
    }

    /**
     * Get next track recommendation
     * @param {string} userId - User ID
     * @param {string} algoType - Algorithm type ('matriciel', 'content', 'mix')
     * @returns {Promise<{song_title: string, algorithm: string, status: string}>}
     */
    async getRecommendation(userId, algoType = 'matriciel') {
        // Force mock mode if enabled
        if (this.useMockData) {
            return this._getMockRecommendation(algoType);
        }

        try {
            const url = `${this.baseUrl}/recommend/next?userId=${encodeURIComponent(userId)}&algoType=${encodeURIComponent(algoType)}`;
            
            console.log('[API] Requesting recommendation:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('[API] Recommendation received:', data);
            
            return data;
        } catch (error) {
            console.error('[API] Failed to get recommendation, falling back to mock:', error);
            // Fallback to mock data on error
            return this._getMockRecommendation(algoType);
        }
    }

    /**
     * Send feedback about listening session
     * @param {string} userId - User ID
     * @param {string} musicId - Music ID (title)
     * @param {number} listeningTime - Time listened in seconds
     * @returns {Promise<{status: string, message: string, score_computed?: number}>}
     */
    async sendFeedback(userId, musicId, listeningTime) {
        // Skip feedback in mock mode
        if (this.useMockData) {
            console.log('[API] Mock mode - skipping feedback:', { userId, musicId, listeningTime });
            return { status: 'success', message: 'Mock feedback (not sent)' };
        }

        try {
            const url = `${this.baseUrl}/feedback/update`;
            const payload = {
                userId: userId,
                musicId: musicId,
                listeningTime: listeningTime
            };

            console.log('[API] Sending feedback:', payload);

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('[API] Feedback response:', data);
            
            return data;
        } catch (error) {
            console.error('[API] Failed to send feedback:', error);
            return { 
                status: 'error', 
                message: `Failed to send feedback: ${error.message}` 
            };
        }
    }

    /**
     * Get mock recommendation (internal helper)
     * @private
     */
    _getMockRecommendation(algoType) {
        console.log('[API] Using mock recommendation');
        
        const randomSong = this.mockSongs[Math.floor(Math.random() * this.mockSongs.length)];
        
        // Simulate different recommendations per algorithm
        let song = randomSong;
        if (algoType === 'content') {
            song = "Stairway to Heaven - Led Zeppelin";
        } else if (algoType === 'matriciel') {
            song = "Bohemian Rhapsody - Queen";
        } else if (algoType === 'mix') {
            song = "Hotel California - Eagles";
        }
        
        return {
            song_title: song,
            algorithm: algoType + '_mock',
            status: 'success'
        };
    }

    /**
     * Enable or disable mock mode
     * @param {boolean} enabled
     */
    setMockMode(enabled) {
        this.useMockData = enabled;
        console.log(`[API] Mock mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Update base URL for backend
     * @param {string} url - New base URL
     */
    setBaseUrl(url) {
        this.baseUrl = url;
        console.log('[API] Base URL updated to:', url);
    }
}

// Expose to global scope
window.MusicRecoAPI = MusicRecoAPI;
