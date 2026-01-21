# SoundCloud Music Recommender

An AI-powered Chrome extension that provides intelligent music recommendations while browsing SoundCloud.

## Features

- **Smart Recommendations**: Uses collaborative filtering, content-based, and hybrid algorithms
- **Seamless Integration**: Elegant sidebar interface that integrates with SoundCloud
- **Listening Analytics**: Tracks listening patterns and provides personalized suggestions
- **Auto-play**: Automatically plays recommended tracks
- **Multiple Algorithms**: Choose between collaborative, content-based, or hybrid recommendation modes

## Project Structure

```
MusicRecoExtension/
├── backend/
│   ├── server.py          # Flask API server
│   └── requirements.txt   # Python dependencies
├── frontend/
│   ├── manifest.json      # Chrome extension manifest
│   ├── background.js      # Extension background service worker
│   ├── main.js           # Main controller logic
│   ├── api.js            # Backend API communication
│   ├── adapter.js        # SoundCloud platform adapter
│   ├── ui.js             # User interface components
│   ├── sidebar.js        # Popup interface
│   └── style.css         # Styling
└── README.md
```

## Setup Instructions

### Backend Setup

1. **Install Python dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Initialize the database:**
   The database will be automatically created on first run.

3. **Start the Flask server:**
   ```bash
   python server.py
   ```
   The server will run on `http://localhost:5000`

### Chrome Extension Setup

1. **Open Chrome Extensions page:**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)

2. **Load the extension:**
   - Click "Load unpacked"
   - Select the `frontend` directory
   - The extension should now appear in your extensions list

3. **Usage:**
   - Visit [SoundCloud](https://soundcloud.com)
   - Click the extension icon to toggle the sidebar
   - Click "Start Listening" to begin receiving recommendations
   - Use the settings button to change recommendation algorithms

## API Endpoints

### Health Check
```
GET /health
```

### Get Recommendation
```
GET /recommend/next?userId={userId}&algoType={algoType}
```
- `userId`: Unique user identifier
- `algoType`: 'matriciel', 'content', or 'mix'

### Send Feedback
```
POST /feedback/update
Content-Type: application/json

{
  "userId": "user123",
  "musicId": "Song Title - Artist",
  "listeningTime": 120
}
```

### Get User History
```
GET /user/history?userId={userId}
```

### Sync Data
```
POST /sync
```
Import data from pickle file into the database.

## Configuration

### Backend Configuration
Edit `backend/server.py` to modify:
- `DEFAULT_SONG_DURATION`: Default track duration (210s)
- `MAX_SCORE`: Maximum engagement score (10)
- `COLD_START_THRESHOLD`: Minimum tracks before using collaborative filtering (5)

### Frontend Configuration
Edit `frontend/api.js` to modify:
- `baseUrl`: Backend server URL
- `useMockData`: Enable/disable mock mode for testing

## Algorithm Types

1. **Collaborative Filtering (`matriciel`)**: Recommends music based on similar users' preferences
2. **Content-Based (`content`)**: Recommends music based on track features and metadata
3. **Hybrid (`mix`)**: Combines both collaborative and content-based approaches

## Development

### Running in Mock Mode
To test the extension without a backend:
```javascript
// In frontend/api.js
this.useMockData = true;
```

### Debugging
- Open Chrome DevTools on any SoundCloud page
- Check Console for extension logs (prefixed with `[Controller]`, `[API]`, `[Adapter]`)
- Backend logs appear in the Flask server terminal

## Database Schema

### `songs` table
- `music_id` (TEXT, PRIMARY KEY): Track identifier
- `title` (TEXT): Track title
- `artist` (TEXT): Artist name
- `duration` (REAL): Track duration in seconds

### `listening_history` table
- `user_id` (TEXT): User identifier
- `music_id` (TEXT): Track identifier
- `listening_time` (INTEGER): Engagement score (0-10)
- `algo_type` (TEXT): Algorithm used for recommendation
- `timestamp` (DATETIME): When the entry was created

## Technologies Used

- **Backend**: Python, Flask, Flask-CORS, SQLite, Pandas
- **Frontend**: Vanilla JavaScript (ES6+), Chrome Extension APIs
- **Platform**: SoundCloud Web Player

## Contributing

1. Follow the existing code style and structure
2. Add JSDoc comments for new functions
3. Test changes thoroughly on SoundCloud
4. Update documentation as needed

## License

This project is for educational purposes.
