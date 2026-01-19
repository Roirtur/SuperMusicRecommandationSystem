import numpy as np

from src.data import load_data
from src.model import init_user_matrix, init_music_matrix, predict

train_data, test_data = load_data()

users = train_data['user_id'].unique()
music = train_data['song_id'].unique()

U = init_user_matrix(users, feature_count=32)
M = init_music_matrix(music, feature_count=32)

# TODO What should loss take as params?
def loss(U, M):
    predictions = predict(U, M)

    pred_values = np.array([
        predictions.loc[user, song] 
        for user, song in zip(train_data['user_id'], train_data['song_id'])
    ])
    actual_values = train_data['like_index'].values

    return ((actual_values - pred_values) ** 2).sum()

# TODO
def dLoss():
    return None