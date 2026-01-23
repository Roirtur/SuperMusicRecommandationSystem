import numpy as np

from .dataset import load as load_dataset, normalize
from .model import load as load_model
from .test_train import DATASET_SIZE, l

# Should load full dataset!
dataset, USER_MAPPING, SONG_MAPPING = load_dataset(DATASET_SIZE)
average_listening_count = dataset["Listening count"].mean()
dataset = normalize(dataset)

print("[COLLABORATIVE] Dataset ready")

SONG_MAPPING_REVERT = {
    song_index: song_id for song_id, song_index in SONG_MAPPING.items()
}

q, p, b_song, b_user = load_model(f"model-{DATASET_SIZE}-{l}")

print("[COLLABORATIVE] Model loaded")


def get_recommendations(users_listenings: list[tuple[str, int]]) -> list[str]:
    # User songs as indexes w.r.t. song mapping
    user_song_indexes = {
        SONG_MAPPING[song_id]: listening_count
        for song_id, listening_count in users_listenings
    }

    # Restrict q to songs listened by the given user
    user_songs_selector = [
        True if idx in user_song_indexes else False for idx in range(len(q))
    ]
    q_user_songs = q[user_songs_selector]
    b_song_user_songs = b_song[user_songs_selector]

    p_user_songs = (
        # Shape: (#USERS, len(users_listenings))
        (p @ q_user_songs.T)
        + average_listening_count
        # Shape: (#USERs, 1)
        + b_user[:, np.newaxis]
        # Shape: (len(users_listenings))
        + b_song_user_songs
    )
    user_vector = normalize(
        np.array(
            [
                listening_count
                for _, listening_count in
                # Sort by song index
                sorted(user_song_indexes.items(), key=lambda key_value: key_value[0])
            ],
            dtype=[("Listening count", np.float64)],
        )
    )

    # Similarity (L2) of predictions of given songs for users in the dataset
    p_user_songs_dist = ((p_user_songs - user_vector["Listening count"]) ** 2).sum(
        axis=1
    )

    # Keep the most similar one
    most_similar_user_index = p_user_songs_dist.argsort()[0]

    # Compute predictions of this most similar user for all songs
    most_similar_user_predictions = (
        (p[most_similar_user_index] @ q.T)
        + average_listening_count
        + b_user[most_similar_user_index]
        + b_song
    )

    # Keep the best 5 songs for this most similar user
    return [
        SONG_MAPPING_REVERT[song]
        for song in most_similar_user_predictions.argsort()[:5]
    ]
