from datetime import datetime
import os
from pathlib import Path
from typing import Literal
import matplotlib.pyplot as plt
import numpy as np

DEBUG = os.environ.get("DEBUG", "False").lower() in ("true", "1", "t")

USER_MAPPING: dict[str, int] = {}
SONG_MAPPING: dict[str, int] = {}

DATASET_MAX_SIZE = 100_000

# It's a list of tuples (user, song, listenings)
dataset_raw: list[np.ndarray[tuple[Literal[3]], np.dtype[np.int32]]] = []
# Dataset from http://millionsongdataset.com/tasteprofile/
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
l = 1000
# Initial (random) values
# Shape: (#SONGS, l)
q = np.random.random_sample((len(SONG_MAPPING), l))
if DEBUG:
    print(q.shape, q.dtype, q)
# Shape: (#USERS, l)
p = np.random.random_sample((len(USER_MAPPING), l))
if DEBUG:
    print(p.shape, p.dtype, p)


# Training parameters
lbd = 0.01
gamma = 0.01
n_epochs = 20

losses = [np.nan] * n_epochs
losses_validation = [np.nan] * n_epochs

for epoch in range(n_epochs):
    print(f"Epoch {epoch+1}")
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
        p_u = p[user].copy()
        q_i = q[song].copy()
        if DEBUG:
            print(p_u)
            print(q_i)

        listenings_hat = p_u.T @ q_i
        if DEBUG:
            print(f"Prediction: {listenings_hat}")

        # Prediction error
        e_ui = listenings - listenings_hat

        # This is the learning part
        q[song] += gamma * (e_ui * p_u - lbd * q_i)
        p[user] += gamma * (e_ui * q_i - lbd * p_u)

        # Loss
        loss = e_ui**2 + lbd * (np.linalg.norm(q_i) ** 2 + np.linalg.norm(p_u) ** 2)
        if DEBUG:
            print(f"Loss: {loss}")
        loss_sum += loss

    losses[epoch] = loss_sum / len(training_set)

    # Now evaluating on validation data
    loss_validation_sum = 0
    for user, song, listenings in validation_set:
        listenings_hat = p[user].T @ q[song]

        e_ui = listenings - listenings_hat

        # Loss
        loss = e_ui**2 + lbd * (
            np.linalg.norm(q[song]) ** 2 + np.linalg.norm(p[user]) ** 2
        )
        loss_validation_sum += loss

    losses_validation[epoch] = loss_validation_sum / len(training_set)

    print(f"Loss: {losses[epoch]}, validation loss: {losses_validation[epoch]}")

fig, ax = plt.subplots(figsize=(10, 5))

_ = ax.plot(losses, label="Train loss")
_ = ax.plot(losses_validation, label="Validation loss")
_ = ax.set_yscale("log")
_ = ax.set_xlabel("epoch")
_ = ax.set_title("Losses during learning")
_ = fig.legend()
plt.savefig(
    Path(
        __file__
        + f"/../training-{datetime.now().replace(microsecond=0).isoformat()}.png"
    ).resolve()
)
plt.show()
