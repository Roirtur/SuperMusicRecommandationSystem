from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import os
import sqlite3
import random
import math

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

DB_NAME = "music_reco.db"

def compute_score(listened_seconds, total_duration=None):
    """
    Calcule un score entier entre 0 et 10 basé sur le TAUX de complétion.
    Formule Linéaire : ceil(Ratio * 10)
    
    Exemples demandés :
    - Écoute 10% -> 1 pt
    - Écoute 50% -> 5 pts
    - Écoute 100% -> 10 pts
    
    Si duration inconnue, on suppose une moyenne de 210s (3m30).
    """
    MAX_SCORE = 10
    default_duration = 210 # 3m30
    
    duration = total_duration if (total_duration and total_duration > 0) else default_duration
    
    # Cap le temps écouté à la durée (pas plus de 100%)
    actual_listened = min(listened_seconds, duration)
    
    # Ratio entre 0.0 et 1.0
    completion_ratio = actual_listened / duration
    
    # Formule linéaire : Ratio * MaxScore
    # Utilisation de ceil pour arrondir à l'entier supérieur (ex: 5% -> 0.5 -> 1)
    score = math.ceil(completion_ratio * MAX_SCORE)
    
    return int(score)

def init_db():
    """Initialise la base de données SQLite si elle n'existe pas."""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    
    # Table des métadonnées musiques (pour stocker la durée notamment)
    c.execute('''
        CREATE TABLE IF NOT EXISTS songs (
            music_id TEXT PRIMARY KEY,
            title TEXT,
            artist TEXT,
            duration REAL
        )
    ''')

    # Création de la table historique
    c.execute('''
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
    print(f"Base de données '{DB_NAME}' initialisée/vérifiée.")


# --- Placeholder Data / Logic ---
# In a real scenario, you would load your models and datasets here.
# e.g., model = load_model('model.pkl')
# df = pd.read_csv('clean_dataset.csv')

@app.route('/')
def home():
    return "SoundCloud Recommender API is running!"

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "music-reco-api"})

@app.route('/recommend/next', methods=['GET'])
def recommend_next_track():
    """
    Endpoint principal pour obtenir la PROCHAINE musique.
    Permet l'appel via Query Params (GET standard) ou JSON (si besoin).
    Exemple URL: /recommend/next?userId=toto&algoType=matriciel
    """
    # Supporte request.args (URL) ou request.json (Body)
    user_id = request.args.get('userId') or (request.json.get('userId') if request.json else None)
    algo_type = request.args.get('algoType') or (request.json.get('algoType') if request.json else 'matriciel')
    
    print(f"[RECOMMANDATION] ID: {user_id} | Algo: {algo_type}")

    suggestion = "Default Track"
    algo_used = algo_type

    try:
        conn = sqlite3.connect(DB_NAME)
        c = conn.cursor()
        
        # 2. CHECK COLD START : L'utilisateur a-t-il assez d'historique ?
        c.execute("SELECT COUNT(*) FROM listening_history WHERE user_id = ?", (user_id,))
        count_history = c.fetchone()[0]

        if count_history < 10:
            algo_used = "cold_start_top50"
            
            # Récupère les 50 musiques les plus écoutées (somme des temps d'écoute/play_counts)
            c.execute('''
                SELECT music_id FROM listening_history
                GROUP BY music_id
                ORDER BY SUM(listening_time) DESC
                LIMIT 50
            ''')
            top_tracks = [row[0] for row in c.fetchall()]
            
            if top_tracks:
                suggestion = random.choice(top_tracks)
            else:
                suggestion = "Shape of You - Ed Sheeran" # Fallback si base vide
        
        else:
            # LOGIQUE MOCKÉE DES ALGOS (Si historique suffisant)
            if algo_type == 'content':
                suggestion = "Stairway to Heaven - Led Zeppelin"
            elif algo_type == 'matriciel':
                suggestion = "Bohemian Rhapsody - Queen"
            elif algo_type == 'mix':
                suggestion = "Hotel California - Eagles"
            else:
                suggestion = "Billie Jean - Michael Jackson"

        conn.close()

    except Exception as e:
        print(f"[ERROR] Erreur BDD dans /recommend/next : {e}")
        suggestion = "Error Track"

    return jsonify({
        "song_title": suggestion,
        "algorithm": algo_used,
        "status": "success"
    })

@app.route('/feedback/update', methods=['POST', 'GET'])
def update_user_feedback():
    """
    Endpoint appelé à la FIN d'une écoute (ou skip).
    Input JSON: { "userId": "...", "musicId": "...", "listeningTime": 120 }
    """
    data = request.json if request.is_json else {}
    
    user_id = data.get('userId') or request.args.get('userId')
    music_id = data.get('musicId') or request.args.get('musicId') or data.get('songTitle') or request.args.get('songTitle')
    time_listened = float(data.get('listeningTime') or request.args.get('listeningTime') or 0)
    
    # 1. Sauvegarde SQL et Récupération Durée
    try:
        conn = sqlite3.connect(DB_NAME)
        c = conn.cursor()

        # A. Récupérer la durée de la chanson depuis la table 'songs'
        c.execute("SELECT duration FROM songs WHERE music_id = ?", (music_id,))
        row = c.fetchone()
        
        total_duration = 0
        if row:
            total_duration = row[0]
            print(f"[FEEDBACK] Durée trouvée en BDD pour '{music_id}': {total_duration}s")
        else:
            total_duration = 210 # Fallback 3m30
            print(f"[FEEDBACK] Durée NON trouvée pour '{music_id}'. Utilisation defaut: 210s")

        print(f"[FEEDBACK] User {user_id} a écouté '{music_id}' pendant {time_listened}s (sur {total_duration}s)")

        # B. Calcul du SCORE
        interest_score = compute_score(time_listened, total_duration)
        print(f"   -> Score (Ratio): {interest_score} / 10")

        # C. UPSERT dans listening_history
        c.execute('''
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
            "message": "Données sauvegardées.",
            "score_computed": interest_score
        })
        
    except Exception as e:
        print(f"Erreur SQL: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/sync', methods=['POST', 'GET'])
def sync_data():
    """
    Route pour importer les données du fichier merged_data.pkl dans la base SQLite.
    Cherche le fichier dans ../../data/merged_data.pkl (relatif à server.py).
    """
    try:
        # 1. Localiser le fichier pkl
        base_dir = os.path.dirname(os.path.abspath(__file__))
        # Remonter de 2 niveaux : Back -> MusicRecoExtension -> SuperMusicRecommandationSystem
        # Puis descendre dans data/
        pkl_path = os.path.join(base_dir, '..', '..', 'data', 'merged_data.pkl')
        
        # Fallback naming (mixed_data.pkl comme demandé, ou merged_data.pkl comme dans le notebook)
        if not os.path.exists(pkl_path):
            pkl_path = os.path.join(base_dir, '..', '..', 'data', 'mixed_data.pkl')

        print(f"[SYNC] Recherche du fichier : {pkl_path}")
        if not os.path.exists(pkl_path):
            return jsonify({"error": f"Fichier non trouvé. Attendu ici : {pkl_path}"}), 404

        # 2. Charger le DataFrame
        print("[SYNC] Chargement du DataFrame (cela peut prendre un moment)...")
        df = pd.read_pickle(pkl_path)
        print(f"[SYNC] DataFrame chargé. {len(df)} lignes.")
        
        # 3. Préparer les données pour l'insertion
        # On a besoin de : user_id, music_id, listening_time, algo_type
        # mapping : 
        #   user_id -> user_id
        #   music_id -> title + " - " + artist_name
        #   listening_time -> play_count * duration
        #   algo_type -> 'import_msd'

        # Vérification des colonnes nécessaires
        required_cols = ['user_id', 'title', 'artist_name', 'play_count', 'duration']
        missing_cols = [c for c in required_cols if c not in df.columns]
        if missing_cols:
             return jsonify({"error": f"Colonnes manquantes dans le pkl: {missing_cols}"}), 400

        print("[SYNC] Transformation des données...")
        df['db_music_id'] = df['title'] + ' - ' + df['artist_name']
        
        # Modification demandée : listening_time = play_count (car duration souvent manquante/nulle)
        # df['db_listening_time'] = (df['play_count'] * df['duration']).fillna(0).astype(int) 
        df['db_listening_time'] = df['play_count'].fillna(0).astype(int)
        
        df['db_algo_type'] = 'import_msd'

        # A. Insertion des SONGS (Metadata)
        print("[SYNC] Insertion des métadonnées Songs...")
        songs_df = df[['db_music_id', 'title', 'artist_name', 'duration']].drop_duplicates(subset=['db_music_id'])
        songs_data = songs_subset = songs_df.to_records(index=False).tolist()
        
        conn = sqlite3.connect(DB_NAME)
        c = conn.cursor()
        
        c.executemany('''
            INSERT OR IGNORE INTO songs (music_id, title, artist, duration)
            VALUES (?, ?, ?, ?)
        ''', songs_data)
        
        # B. Insertion de l'HISTORIQUE
        print("[SYNC] Insertion de l'historique User...")
        # Sélectionner les colonnes pour l'insertion
        insert_data = df[['user_id', 'db_music_id', 'db_listening_time', 'db_algo_type']].to_records(index=False)
        data_list = list(insert_data) # Convertir en liste de tuples

        # 4. Insertion en BDD
        # On cumule le listening_time si collision
        c.executemany('''
            INSERT INTO listening_history (user_id, music_id, listening_time, algo_type) 
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, music_id) 
            DO UPDATE SET 
                listening_time = listening_history.listening_time + excluded.listening_time,
                algo_type = 'import_msd_update'
        ''', data_list)

        conn.commit()
        conn.close()
        
        print("[SYNC] Import terminé avec succès.")
        return jsonify({
            "status": "success",
            "message": f"Importé {len(data_list)} lignes depuis {os.path.basename(pkl_path)}",
            "sample_music_id": data_list[0][1] if data_list else "None"
        })

    except Exception as e:
        print(f"[SYNC ERROR] {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)
