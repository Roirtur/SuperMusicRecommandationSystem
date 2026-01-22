from typing import Any
import numpy as np

# Model is a pair (q,p) of shapes (#SONGS, l) and (#USERS, l)
Model = tuple[
    np.ndarray[tuple[Any, ...], np.dtype[np.float64]],
    np.ndarray[tuple[Any, ...], np.dtype[np.float64]],
]


def init(n_songs: int, n_users: int) -> Model:
    l = 100
    # Initial (random) values
    # Shape: (#SONGS, l)
    q = np.random.random_sample((n_songs, l))
    # Shape: (#USERS, l)
    p = np.random.random_sample((n_users, l))

    return q, p


def export(prefix: str, model: Model):
    q, p = model
    np.save(prefix + "_q.npy", q)
    np.save(prefix + "_p.npy", p)


def import_(prefix: str) -> Model:
    q = np.load(prefix + "_q.npy")
    p = np.load(prefix + "_p.npy")

    return (q, p)
