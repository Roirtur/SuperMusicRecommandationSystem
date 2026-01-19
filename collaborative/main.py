import os
from typing import Literal
import numpy as np

DEBUG = os.environ.get("DEBUG", "False").lower() in ("true", "1", "t")

USER_MAPPING: dict[str, int] = {}
SONG_MAPPING: dict[str, int] = {}

DATASET_MAX_SIZE = 10_000

# It's a list of tuples (user, song, listenings)
dataset_raw: list[np.ndarray[tuple[Literal[3]], np.dtype[np.int32]]] = []
with open("../train_triplets.txt", "r") as dataset_file:
    for line in dataset_file:
        user_id, song_id, listenings = line.split("\t")

        line_vec = np.array(
            [
                USER_MAPPING.setdefault(user_id, len(USER_MAPPING)),
                SONG_MAPPING.setdefault(song_id, len(SONG_MAPPING)),
                int(listenings),
            ]
        )
        dataset_raw.append(line_vec)

        if len(dataset_raw) >= DATASET_MAX_SIZE:
            break

dataset = np.array(dataset_raw)


dataset_perm = np.random.permutation(len(dataset))
dataset_shuffled = dataset[dataset_perm]
# Training dataset size = 2/3
training_set_size = int(len(dataset_shuffled) * 0.66)
training_set = dataset_shuffled[:training_set_size]
validation_set = dataset_shuffled[training_set_size:]

# (Hyperparameter) Size of latent space to make the embeddings
l = 100
# Initial (random) values
# Shape: (#SONGS, l)
q_i = np.random.random_sample((len(SONG_MAPPING), l))
if DEBUG:
    print(q_i.shape, q_i.dtype, q_i)
# Shape: (#USERS, l)
p_u = np.random.random_sample((len(USER_MAPPING), l))
if DEBUG:
    print(p_u.shape, p_u.dtype, p_u)


# Training parameters
lbd = 0.01
gamma = 0.01
n_epochs = 20

for epoch in range(n_epochs):
    if DEBUG:
        print(f"Epoch {epoch}")
    loss_sum: float = 0

    np.random.shuffle(training_set)  # Reorder examples at each epoch
    # user \in [0, #USERS - 1]
    # song \in [0, #SONGS - 1]
    # listenings \in N (r_ui, "true" value)
    for i, (user, song, listenings) in enumerate(training_set):
        if DEBUG:
            print(
                f"Training value {i}/{len(training_set)}: ({user},{song},{listenings})"
            )

        # Predicted value
        if DEBUG:
            print(p_u[user])
            print(q_i[song])
        listenings_hat = p_u[user].T @ q_i[song]
        if DEBUG:
            print(f"Prediction: {listenings_hat}")

        # Prediction error (loss)
        loss = listenings - listenings_hat
        if DEBUG:
            print(f"Loss: {loss}")
        loss_sum += loss

        # This is the learning part
        q_i[song] += gamma * (loss * p_u[user] - lbd * q_i[song])
        p_u[user] += gamma * (loss * q_i[song] - lbd * p_u[user])

    # Now evaluating on validation data
    loss_validation_sum = 0
    for user, song, listenings in validation_set:
        listenings_hat = p_u[user].T @ q_i[song]

        loss = listenings - listenings_hat
        loss_validation_sum += loss

    print(
        "loss: ",
        loss_sum / len(training_set),
        "validation loss:",
        loss_validation_sum / len(training_set),
    )
