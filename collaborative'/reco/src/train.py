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
    return Nonelist

    
import os
import numpy as np

from src.data import load_data
from src.model import init_user_matrix, init_music_matrix, predict

DEBUG = os.environ.get("DEBUG", "False").lower() in ("true", "1", "t")

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
    
    
# Training parameters
lbd = 0.01
gamma = 0.01
n_epochs = 20

for epoch in range(n_epochs):
    if DEBUG:
        print(f"Epoch {epoch}")
    loss_sum: float = 0
    
    for i, (user_id, song_id, like_index) in enumerate(train_data):
        U_user = U[user_id].copy()
        M_song = M[song_id].copy()

        like_index_predicted = U_user.T @ M_song

        loss = like_index - like_index_predicted
        loss_sum += loss

        M[song_id] += gamma * (loss * U_user - lbd * M_song)
        U[user_id] += gamma * (loss * M_song - lbd * U_user)

    loss_validation_sum = 0
    for user_id, song_id, like_index in test_data:
        like_index_predicted = U[user_id].T @ M[song_id]

        loss = like_index - like_index_predicted
        loss_validation_sum += loss
        
    
    print(
        "loss: ",
        loss_sum / len(train_data),
        "validation loss:",
        loss_validation_sum / len(test_data),
    )