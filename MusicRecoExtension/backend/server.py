from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import os
import sqlite3
import random
import math

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# =============================================================================
# CONFIGURATION
# =============================================================================

DB_NAME = "music_reco.db"
DEFAULT_SONG_DURATION = 210  # Default duration in seconds (3m 30s)
MAX_SCORE = 10
COLD_START_THRESHOLD = 5  # Minimum tracks needed before using collaborative filtering

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def compute_score(listened_seconds, total_duration=None):
    """
    Calculate an engagement score between 0 and 10 based on completion ratio.
    
    Formula: ceil(completion_ratio * 10)
    
    Examples:
        - 10% listened  -> 1 point
        - 50% listened  -> 5 points
        - 100% listened -> 10 points
    
    Args:
        listened_seconds (float): Number of seconds the user listened to the track
        total_duration (float, optional): Total duration of the track in seconds.
                                         Defaults to 210s (3m 30s) if not provided.
    
    Returns:
        int: Engagement score between 0 and 10
    """
    duration = total_duration if (total_duration and total_duration > 0) else DEFAULT_SONG_DURATION
    
    # Cap listened time at total duration (max 100% completion)
    actual_listened = min(listened_seconds, duration)
    
    # Calculate completion ratio (0.0 to 1.0)
    completion_ratio = actual_listened / duration
    
    # Linear formula: ratio * max_score, rounded up
    score = math.ceil(completion_ratio * MAX_SCORE)
    
    return int(score)

def init_db():
    """
    Initialize SQLite database if it doesn't exist.
    
    Creates two tables:
        - songs: Store song metadata (title, artist, duration)
        - listening_history: Track user listening sessions and engagement scores
    """
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Songs metadata table (stores duration and track information)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS songs (
            music_id TEXT PRIMARY KEY,
            title TEXT,
            artist TEXT,
            duration REAL
        )
    ''')

    # Listening history table (tracks user engagement)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS listening_history (
            user_id TEXT NOT NULL,
            music_id TEXT NOT NULL,
            listening_time INTEGER,
            algo_type TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, music_id)
        )
    ''')
    conn.commit()
    conn.close()
    print(f"Database '{DB_NAME}' initialized successfully.")


# =============================================================================
# API ENDPOINTS
# =============================================================================

@app.route('/')
def home():
    """Root endpoint - API status check."""
    return jsonify({
        "service": "SoundCloud Music Recommender API",
        "status": "running",
        "version": "1.0"
    })

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for monitoring."""
    return jsonify({
        "status": "healthy",
        "service": "music-reco-api"
    })

@app.route('/recommend/next', methods=['GET'])
def recommend_next_track():
    """
    Get next recommended track for a user.
    
    Supports both query parameters (preferred) and JSON body.
    
    Query Parameters:
        userId (str): Unique user identifier
        algoType (str): Algorithm type - 'matriciel', 'content', or 'mix'
                       Defaults to 'matriciel'
    
    Returns:
        JSON: {
            "song_title": str,
            "algorithm": str,
            "status": "success"
        }
    
    Example:
        GET /recommend/next?userId=user123&algoType=matriciel
    """
    # Support both query parameters and JSON body
    user_id = request.args.get('userId') or (request.json.get('userId') if request.json else None)
    algo_type = request.args.get('algoType') or (request.json.get('algoType') if request.json else 'matriciel')
    
    print(f"[RECOMMENDATION] User: {user_id} | Algorithm: {algo_type}")

    suggestion = "Default Track"
    algo_used = algo_type

    try:
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        
        # Check for cold start: Does user have sufficient listening history?
        cursor.execute("SELECT COUNT(*) FROM listening_history WHERE user_id = ?", (user_id,))
        history_count = cursor.fetchone()[0]

        # Cold start scenario: Less than required tracks in history
        if history_count < COLD_START_THRESHOLD:
            algo_used = "cold_start_top50"
            
            # Get top 50 most popular tracks (by total listening time)
            cursor.execute('''
                SELECT music_id FROM listening_history
                GROUP BY music_id
                ORDER BY SUM(listening_time) DESC
                LIMIT 50
            ''')
            top_tracks = [row[0] for row in cursor.fetchall()]
            
            if top_tracks:
                suggestion = random.choice(top_tracks)
            else:
                # No tracks in database at all - use fallback
                suggestion = "Bohemian Rhapsody - Queen"
                algo_used = "fallback_default"
        else:
            # User has sufficient history - use algorithm-specific logic
            # TODO: Replace with actual ML models
            if algo_type == 'content':
                suggestion = "Stairway to Heaven - Led Zeppelin"
            elif algo_type == 'matriciel':
                suggestion = "Bohemian Rhapsody - Queen"
            elif algo_type == 'mix':
                suggestion = "Hotel California - The Eagles"
            else:
                suggestion = "Billie Jean - Michael Jackson"

        conn.close()

    except Exception as e:
        print(f"[ERROR] Database error in /recommend/next: {e}")
        suggestion = "Bohemian Rhapsody - Queen"  # Fallback track
        algo_used = "error_fallback"

    return jsonify({
        "song_title": suggestion,
        "algorithm": algo_used,
        "status": "success"
    })

@app.route('/user/history', methods=['GET'])
def get_user_history():
    """
    Get user's listening history with engagement scores.
    
    Query Parameters:
        userId (str, required): User identifier
    
    Returns:
        JSON: {
            "status": "success",
            "user_id": str,
            "total_songs_listened": int,
            "unique_songs": int,
            "total_score": int,
            "history": [list of listening sessions]
        }
    
    Example:
        GET /user/history?userId=user_abc123
    """
    user_id = request.args.get('userId')
    
    if not user_id:
        return jsonify({"error": "userId parameter is required"}), 400
    
    try:
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        
        # Retrieve listening history with scores
        cursor.execute('''
            SELECT 
                lh.music_id,
                lh.listening_time as score,
                lh.algo_type,
                lh.timestamp,
                s.title,
                s.artist,
                s.duration
            FROM listening_history lh
            LEFT JOIN songs s ON lh.music_id = s.music_id
            WHERE lh.user_id = ?
            ORDER BY lh.timestamp DESC
        ''', (user_id,))
        
        rows = cursor.fetchall()
        
        # Format results
        history = []
        for row in rows:
            history.append({
                "music_id": row[0],
                "score": row[1],
                "algo_type": row[2],
                "timestamp": row[3],
                "title": row[4],
                "artist": row[5],
                "duration": row[6]
            })
        
        # Calculate statistics
        total_score = sum(item['score'] for item in history)
        unique_songs = len(set(item['music_id'] for item in history))
        
        conn.close()
        
        return jsonify({
            "status": "success",
            "user_id": user_id,
            "total_songs_listened": len(history),
            "unique_songs": unique_songs,
            "total_score": total_score,
            "history": history
        })
        
    except Exception as e:
        print(f"[ERROR] Error in /user/history: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/feedback/update', methods=['POST', 'GET'])
def update_user_feedback():
    """
    Record user listening session feedback.
    
    Called when user finishes listening to a track (or skips).
    Calculates engagement score based on listening duration.
    
    Request Body (JSON) or Query Parameters:
        userId (str): User identifier
        musicId (str): Track identifier (or songTitle)
        listeningTime (float): Seconds listened
    
    Returns:
        JSON: {
            "status": "success",
            "message": str,
            "score_computed": int
        }
    
    Example:
        POST /feedback/update
        {"userId": "user123", "musicId": "Song - Artist", "listeningTime": 120}
    """
    data = request.json if request.is_json else {}
    
    user_id = data.get('userId') or request.args.get('userId')
    music_id = data.get('musicId') or request.args.get('musicId') or data.get('songTitle') or request.args.get('songTitle')
    time_listened = float(data.get('listeningTime') or request.args.get('listeningTime') or 0)
    
    try:
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()

        # Retrieve track duration from database
        cursor.execute("SELECT duration FROM songs WHERE music_id = ?", (music_id,))
        row = cursor.fetchone()
        
        if row and row[0]:
            total_duration = row[0]
            print(f"[FEEDBACK] Duration found in DB for '{music_id}': {total_duration}s")
        else:
            total_duration = DEFAULT_SONG_DURATION
            print(f"[FEEDBACK] Duration not found for '{music_id}'. Using default: {DEFAULT_SONG_DURATION}s")

        print(f"[FEEDBACK] User {user_id} listened to '{music_id}' for {time_listened}s (out of {total_duration}s)")

        # Calculate engagement score
        interest_score = compute_score(time_listened, total_duration)
        print(f"   -> Computed score: {interest_score} / {MAX_SCORE}")

        # Insert or update listening history (cumulative score)
        cursor.execute('''
            INSERT INTO listening_history (user_id, music_id, listening_time) 
            VALUES (?, ?, ?)
            ON CONFLICT(user_id, music_id) 
            DO UPDATE SET 
                listening_time = listening_history.listening_time + excluded.listening_time,
                timestamp = CURRENT_TIMESTAMP
        ''', (user_id, music_id, interest_score))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            "status": "success", 
            "message": "Feedback recorded successfully",
            "score_computed": interest_score
        })
        
    except Exception as e:
        print(f"[ERROR] SQL error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/sync', methods=['POST', 'GET'])
def sync_data():
    """
    Import data from merged_data.pkl file into SQLite database.
    
    Searches for the file at: ../../data/merged_data.pkl (relative to server.py)
    Falls back to mixed_data.pkl if merged_data.pkl not found.
    
    Returns:
        JSON: {
            "status": "success",
            "message": str,
            "sample_music_id": str
        }
    
    Note: This endpoint is typically called once during initial setup.
    """
    try:
        # Locate pickle file
        base_dir = os.path.dirname(os.path.abspath(__file__))
        # Navigate: backend -> MusicRecoExtension -> SuperMusicRecommandationSystem -> data
        pkl_path = os.path.join(base_dir, '..', '..', 'data', 'merged_data.pkl')
        
        # Fallback to alternative filename
        if not os.path.exists(pkl_path):
            pkl_path = os.path.join(base_dir, '..', '..', 'data', 'mixed_data.pkl')

        print(f"[SYNC] Searching for file: {pkl_path}")
        if not os.path.exists(pkl_path):
            return jsonify({"error": f"File not found. Expected at: {pkl_path}"}), 404

        # Load DataFrame
        print("[SYNC] Loading DataFrame (this may take a moment)...")
        df = pd.read_pickle(pkl_path)
        print(f"[SYNC] DataFrame loaded. {len(df)} rows.")
        
        # Validate required columns
        required_cols = ['user_id', 'title', 'artist_name', 'play_count', 'duration']
        missing_cols = [c for c in required_cols if c not in df.columns]
        if missing_cols:
             return jsonify({"error": f"Missing columns in pickle file: {missing_cols}"}), 400

        # Transform data for database
        print("[SYNC] Transforming data...")
        df['db_music_id'] = df['title'] + ' - ' + df['artist_name']
        df['db_listening_time'] = df['play_count'].fillna(0).astype(int)
        df['db_algo_type'] = 'import_msd'

        # Insert song metadata
        print("[SYNC] Inserting song metadata...")
        songs_df = df[['db_music_id', 'title', 'artist_name', 'duration']].drop_duplicates(subset=['db_music_id'])
        songs_data = songs_df.to_records(index=False).tolist()
        
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        
        cursor.executemany('''
            INSERT OR IGNORE INTO songs (music_id, title, artist, duration)
            VALUES (?, ?, ?, ?)
        ''', songs_data)
        
        # Insert listening history
        print("[SYNC] Inserting user listening history...")
        insert_data = df[['user_id', 'db_music_id', 'db_listening_time', 'db_algo_type']].to_records(index=False)
        data_list = list(insert_data)

        # Upsert: cumulative listening time on conflict
        cursor.executemany('''
            INSERT INTO listening_history (user_id, music_id, listening_time, algo_type) 
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, music_id) 
            DO UPDATE SET 
                listening_time = listening_history.listening_time + excluded.listening_time,
                algo_type = 'import_msd_update'
        ''', data_list)

        conn.commit()
        conn.close()
        
        print("[SYNC] Import completed successfully.")
        return jsonify({
            "status": "success",
            "message": f"Imported {len(data_list)} rows from {os.path.basename(pkl_path)}",
            "sample_music_id": data_list[0][1] if data_list else "None"
        })

    except Exception as e:
        print(f"[SYNC ERROR] {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# =============================================================================
# APPLICATION STARTUP
# =============================================================================

if __name__ == '__main__':
    init_db()
    print("\n" + "="*60)
    print(" SoundCloud Music Recommender API")
    print(" Server starting on http://localhost:5000")
    print("="*60 + "\n")
    app.run(debug=True, port=5000)
