import numpy as np

from .dataset import load as load_dataset, normalize
from .model import init, save
from .train import train

dataset, USER_MAPPING, SONG_MAPPING = load_dataset(1_000_000)
dataset = normalize(dataset)

print("Dataset ready")

training_set_size = int(len(dataset) * 0.66)

dataset_perm = np.random.permutation(len(dataset))
dataset_shuffled = dataset[dataset_perm]

train_set = dataset_shuffled[:training_set_size]
validation_set = dataset_shuffled[training_set_size:]

model, stats = train(
    40,
    0.001,
    0.0005,
    20,
    train_set,
    validation_set,
    init(len(SONG_MAPPING), len(USER_MAPPING)),
)

print("Training done")

save("model", model)

print("Model saved")
