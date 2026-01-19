import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split

def sample_lines(filepath, n=None, random_state=73):
    df = pd.read_csv(filepath, sep='\t', header=None, 
                     names=['user_id', 'song_id', 'play_count'])
    return df.sample(n=n, random_state=random_state) if n else df

def normalize_column(df, column, new_column, min_val=0, max_val=100):
    col_min = df[column].min()
    col_max = df[column].max()
    df[new_column] = (max_val - min_val) * (df[column] - col_min) / (col_max - col_min) + min_val
    return df

data = sample_lines('/train_triplets.txt', 1000)
data = normalize_column(data, 'play_count', 'like_index')

train_data, test_data = train_test_split(data, test_size=0.2, random_state=73)

print(f"Train size: {len(train_data)}")
print(f"Test size: {len(test_data)}")

def load_data() -> tuple[np.ndarray, np.ndarray]:
    return train_data, test_data