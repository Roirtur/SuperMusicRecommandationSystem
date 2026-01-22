# SoundCloud Music Recommender (v1.2)

An AI-powered Chrome extension that provides intelligent music recommendations while browsing SoundCloud. It seamlessly integrates a side-panel into the SoundCloud interface, tracking your listening habits to suggest new tracks you'll love.

## Features

- **Smart Recommendations**: 
  - **Collaborative Filtering**: Suggests tracks based on similar user listening patterns.
  - **Content-Based**: Uses pre-computed audio embeddings to find songs with similar acoustic features.
  - **Hybrid Mode**: A balanced mix of both discovery methods.
- **Auto-Play & Navigation**: Automatically navigates to and plays recommended tracks.
- **Smart Skipping**: Detects and skips "Go+" exclusive tracks (subscription-only) to ensure uninterrupted playback.
- **Seamless Integration**: Non-intrusive sidebar UI that blends with SoundCloud's design.
- **Listening Analytics**: Tracks engagement (listening duration) to refine future recommendations.
- **Cold Start Handling**: Provides popular track suggestions for new users until sufficient history is gathered.

## Project Structure

```
MusicRecoExtension/
├── backend/
│   ├── server.py             # Flask API server, endpoints, and DB logic
│   ├── content_recommender_utils.py # Adapter for content-based model
│   └── requirements.txt      # Python dependencies
├── frontend/
│   ├── manifest.json         # Chrome Extension V3 manifest
│   ├── background.js         # Service worker
│   ├── main.js               # Core controller (State, Navigation, Logic)
│   ├── api.js                # API client (Mock & Production modes)
│   ├── adapter.js            # SoundCloud DOM interaction & Event tracking
│   ├── ui.js                 # UI Component renderer
│   ├── sidebar.js            # Popup/Sidebar toggle logic
│   └── style.css             # Extension styling
└── README.md
```

## Setup Instructions

### 1. Backend Setup

The backend requires a Python environment and access to the project's data files (pickles).

1. **Install Dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Prepare Data:**
   Ensure the following files exist in the `data/` directory (at the project root):
   - `songs_metadata.pkl`: Song metadata (Artist, Title, ID).
   - `song_embeddings.pkl`: Audio embeddings for content-based recommendations.
   - `merged_data.pkl`: User listening history for collaborative filtering.

3. **Start the Server:**
   ```bash
   python server.py
   ```
   The server will start on `http://localhost:5000`.
   
   *Note: On first run, the server will automatically create `music_reco.db`.*

4. **Initialize Data (Optional but Recommended):**
   To populate the SQLite database with the pickle data, make a POST request to:
   `http://localhost:5000/sync`
   
   *You can do this via Postman or curl:*
   ```bash
   curl -X POST http://localhost:5000/sync
   ```

### 2. Frontend Setup (Chrome Extension)

1. **Open Chrome Extensions:**
   - Go to `chrome://extensions/`
   - Enable **Developer mode** (top right toggle).

2. **Load Extension:**
   - Click **Load unpacked**.
   - Select the `frontend` directory inside `MusicRecoExtension`.

3. **Verify:**
   - The "SoundCloud Music Recommender" icon should appear in your toolbar.

## Usage

1. **Navigate to SoundCloud**: Open [soundcloud.com](https://soundcloud.com).
2. **Open Sidebar**: Click the extension icon or the toggle button to reveal the recommendation sidebar.
3. **Start Session**: Click **"Start Listening"**.
4. **Enjoy**: The extension will analyze your current track and suggest the next one.
   - It will automatically play the next track when the current one finishes.
   - If a recommended track is "Go+" (restricted), it will automatically skip to a new suggestion.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Server status check. |
| `GET` | `/recommend/next` | Get next track recommendation. |
| `POST` | `/feedback/update` | Send listening duration/score for a track. |
| `GET` | `/user/history` | Retrieve user's listening history. |
| `POST` | `/sync` | Import data from pickle files into SQLite. |

## Configuration

- **Frontend**: 
  - Edit `frontend/api.js` to enable `useMockData = true` for testing without a backend.
- **Backend**:
  - Edit `backend/server.py` to change `DEFAULT_SONG_DURATION` (default: 210s) or `COLD_START_THRESHOLD` (default: 5 tracks).

## Development Notes

- **Version 1.2 (2026-01-22)**:
  - Added robust detection for SoundCloud "Go+" restrictions.
  - Improved auto-play reliability with DOM stability checks.
  - Enhanced error handling for empty search results.

- **Mock Mode**: 
  If the backend is offline, you can enable `this.useMockData = true` in `frontend/api.js` to simulate recommendations using a static list of popular songs.

## License
Educational Project - Super Music Recommendation System (M2).
