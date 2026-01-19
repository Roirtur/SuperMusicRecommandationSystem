import numpy as np
import pandas as pd

def init_user_matrix(users, feature_count: int) -> pd.DataFrame:
    return pd.DataFrame(
        np.random.rand(len(users), feature_count),
        index=users
    )

def init_music_matrix(music, feature_count: int) -> pd.DataFrame:
    return pd.DataFrame(
        np.random.rand(len(music), feature_count),
        index=music
    )

def predict(user_matrix: pd.DataFrame, music_matrix: pd.DataFrame) -> pd.DataFrame:
    return user_matrix @ music_matrix.T