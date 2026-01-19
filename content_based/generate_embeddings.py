"""
Song Embedding Generator for Content-Based Recommendation
==========================================================

This module transforms song metadata into high-dimensional embeddings
for content-based recommendation using nearest neighbor search.

Author: Music Recommendation System
Date: January 2026
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.impute import SimpleImputer
import pickle
import os
from typing import Dict, Tuple, Optional
import warnings
warnings.filterwarnings('ignore')


# ============================================================================
# FEATURE CONFIGURATION
# ============================================================================
# Toggle features on (1) or off (0) to control which columns are used
# in the embedding generation
# ============================================================================

FEATURE_CONFIG = {
    # === TEMPORAL FEATURES ===
    'year': 1,                  # Release year
    
    # === ACOUSTIC FEATURES ===
    'duration': 1,              # Song length in seconds
    'tempo': 1,                 # Beats per minute (BPM)
    'loudness': 1,              # Overall loudness in dB
    'energy': 1,                # Intensity and activity measure (0.0 to 1.0)
    'danceability': 1,          # How suitable for dancing (0.0 to 1.0)
    
    # === MUSICAL CHARACTERISTICS ===
    'key': 1,                   # Musical key (0-11, C=0, C#=1, D=2, etc.)
    'mode': 1,                  # Major (1) or Minor (0)
    'time_signature': 1,        # Beats per bar (e.g., 4 for 4/4 time)
    
    # === POPULARITY METRICS ===
    'song_hotttnesss': 1,       # Song popularity score (0.0 to 1.0)
    'artist_hotttnesss': 1,     # Artist popularity score (0.0 to 1.0)
    
    # === IDENTIFIER COLUMNS (DO NOT USE FOR EMBEDDINGS) ===
    # These are excluded automatically and listed here for reference:
    # 'song_id': Unique song identifier
    # 'title': Song title
    # 'artist_name': Artist name
    # 'artist_id': Unique artist identifier
    # 'release': Album/release name
}


# ============================================================================
# CONFIGURATION
# ============================================================================

class EmbeddingConfig:
    """Configuration for embedding generation"""
    
    # Input/Output paths
    INPUT_DATA_PATH = '../data/songs_metadata.pkl'
    OUTPUT_EMBEDDINGS_PATH = '../data/song_embeddings.pkl'
    OUTPUT_SCALER_PATH = '../data/embedding_scaler.pkl'
    OUTPUT_METADATA_PATH = '../data/embedding_metadata.pkl'
    
    # Processing parameters
    MISSING_VALUE_STRATEGY = 'median'  # 'mean', 'median', or 'most_frequent'
    SCALING_METHOD = 'standard'        # 'standard' (z-score) or 'minmax' (0-1)
    
    # Feature engineering
    HANDLE_OUTLIERS = True
    OUTLIER_THRESHOLD = 3.0  # Standard deviations from mean


# ============================================================================
# EMBEDDING GENERATOR CLASS
# ============================================================================

class SongEmbeddingGenerator:
    """
    Generates embeddings from song metadata for content-based recommendation.
    
    This class handles:
    - Feature selection based on configuration
    - Missing value imputation
    - Feature scaling/normalization
    - Outlier handling
    - Embedding generation and storage
    """
    
    def __init__(self, config: EmbeddingConfig = EmbeddingConfig()):
        """
        Initialize the embedding generator.
        
        Args:
            config: Configuration object with paths and parameters
        """
        self.config = config
        self.scaler = None
        self.imputer = None
        self.feature_names = []
        self.songs_metadata = None
        self.embeddings = None
        
    def get_active_features(self) -> list:
        """
        Get list of features that are active (set to 1) in FEATURE_CONFIG.
        
        Returns:
            List of active feature names
        """
        return [feature for feature, active in FEATURE_CONFIG.items() if active == 1]
    
    def load_data(self) -> pd.DataFrame:
        """
        Load song metadata from pickle file.
        
        Returns:
            DataFrame containing song metadata
        """
        print(f"Loading data from {self.config.INPUT_DATA_PATH}...")
        
        if not os.path.exists(self.config.INPUT_DATA_PATH):
            raise FileNotFoundError(
                f"Data file not found: {self.config.INPUT_DATA_PATH}\n"
                "Please run data_cleaning_script.ipynb first to generate the data."
            )
        
        self.songs_metadata = pd.read_pickle(self.config.INPUT_DATA_PATH)
        print(f"✓ Loaded {len(self.songs_metadata):,} songs")
        
        return self.songs_metadata
    
    def select_features(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, list]:
        """
        Select features based on FEATURE_CONFIG.
        
        Args:
            df: Input DataFrame
            
        Returns:
            Tuple of (selected features DataFrame, list of missing features)
        """
        active_features = self.get_active_features()
        available_features = [f for f in active_features if f in df.columns]
        missing_features = [f for f in active_features if f not in df.columns]
        
        if missing_features:
            print(f"⚠ Warning: {len(missing_features)} features not found in data: {missing_features}")
        
        print(f"✓ Selected {len(available_features)} features: {available_features}")
        self.feature_names = available_features
        
        return df[available_features].copy(), missing_features
    
    def handle_missing_values(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Impute missing values in the feature matrix.
        
        Args:
            df: Feature DataFrame
            
        Returns:
            DataFrame with imputed values
        """
        missing_counts = df.isnull().sum()
        if missing_counts.sum() > 0:
            print(f"⚠ Found missing values in {(missing_counts > 0).sum()} features")
            for feature, count in missing_counts[missing_counts > 0].items():
                pct = count / len(df) * 100
                print(f"  - {feature}: {count:,} ({pct:.1f}%)")
        
        self.imputer = SimpleImputer(strategy=self.config.MISSING_VALUE_STRATEGY)
        df_imputed = pd.DataFrame(
            self.imputer.fit_transform(df),
            columns=df.columns,
            index=df.index
        )
        
        print(f"✓ Imputed missing values using '{self.config.MISSING_VALUE_STRATEGY}' strategy")
        return df_imputed
    
    def handle_outliers(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Handle outliers by clipping to threshold standard deviations.
        
        Args:
            df: Feature DataFrame
            
        Returns:
            DataFrame with outliers handled
        """
        if not self.config.HANDLE_OUTLIERS:
            return df
        
        df_clean = df.copy()
        threshold = self.config.OUTLIER_THRESHOLD
        outliers_count = 0
        
        for col in df.columns:
            mean = df[col].mean()
            std = df[col].std()
            
            if std > 0:  # Avoid division by zero
                lower_bound = mean - threshold * std
                upper_bound = mean + threshold * std
                
                outliers_mask = (df[col] < lower_bound) | (df[col] > upper_bound)
                outliers_count += outliers_mask.sum()
                
                df_clean[col] = df[col].clip(lower_bound, upper_bound)
        
        if outliers_count > 0:
            print(f"✓ Clipped {outliers_count:,} outlier values (>{threshold} std devs)")
        
        return df_clean
    
    def scale_features(self, df: pd.DataFrame) -> np.ndarray:
        """
        Scale features using specified scaling method.
        
        Args:
            df: Feature DataFrame
            
        Returns:
            Scaled feature matrix as numpy array
        """
        if self.config.SCALING_METHOD == 'standard':
            self.scaler = StandardScaler()
            print("✓ Applying StandardScaler (z-score normalization)")
        elif self.config.SCALING_METHOD == 'minmax':
            self.scaler = MinMaxScaler()
            print("✓ Applying MinMaxScaler (0-1 normalization)")
        else:
            raise ValueError(f"Unknown scaling method: {self.config.SCALING_METHOD}")
        
        scaled_features = self.scaler.fit_transform(df)
        return scaled_features
    
    def generate_embeddings(self) -> np.ndarray:
        """
        Complete pipeline to generate embeddings from song metadata.
        
        Returns:
            Embedding matrix (n_songs x n_features)
        """
        print("\n" + "="*70)
        print("SONG EMBEDDING GENERATION")
        print("="*70 + "\n")
        
        # Step 1: Load data
        df = self.load_data()
        
        # Step 2: Select features
        features_df, missing = self.select_features(df)
        
        if len(features_df.columns) == 0:
            raise ValueError("No valid features selected! Check FEATURE_CONFIG.")
        
        # Step 3: Handle missing values
        features_df = self.handle_missing_values(features_df)
        
        # Step 4: Handle outliers
        features_df = self.handle_outliers(features_df)
        
        # Step 5: Scale features
        self.embeddings = self.scale_features(features_df)
        
        print(f"\n✓ Generated embeddings: {self.embeddings.shape}")
        print(f"  - {self.embeddings.shape[0]:,} songs")
        print(f"  - {self.embeddings.shape[1]} dimensions")
        
        return self.embeddings
    
    def save_embeddings(self):
        """
        Save embeddings, scaler, and metadata to disk.
        """
        print("\n" + "-"*70)
        print("SAVING RESULTS")
        print("-"*70 + "\n")
        
        # Create output directory if needed
        os.makedirs(os.path.dirname(self.config.OUTPUT_EMBEDDINGS_PATH), exist_ok=True)
        
        # Prepare metadata
        metadata = {
            'song_ids': self.songs_metadata['song_id'].values,
            'titles': self.songs_metadata['title'].values,
            'artists': self.songs_metadata['artist_name'].values,
            'feature_names': self.feature_names,
            'feature_config': FEATURE_CONFIG.copy(),
            'shape': self.embeddings.shape,
            'n_songs': len(self.songs_metadata),
            'n_dimensions': len(self.feature_names)
        }
        
        # Save embeddings
        embeddings_data = {
            'embeddings': self.embeddings,
            'song_ids': self.songs_metadata['song_id'].values
        }
        with open(self.config.OUTPUT_EMBEDDINGS_PATH, 'wb') as f:
            pickle.dump(embeddings_data, f)
        print(f"✓ Saved embeddings to: {self.config.OUTPUT_EMBEDDINGS_PATH}")
        
        # Save scaler (for transforming new songs later)
        with open(self.config.OUTPUT_SCALER_PATH, 'wb') as f:
            pickle.dump({
                'scaler': self.scaler,
                'imputer': self.imputer,
                'feature_names': self.feature_names
            }, f)
        print(f"✓ Saved scaler to: {self.config.OUTPUT_SCALER_PATH}")
        
        # Save metadata
        with open(self.config.OUTPUT_METADATA_PATH, 'wb') as f:
            pickle.dump(metadata, f)
        print(f"✓ Saved metadata to: {self.config.OUTPUT_METADATA_PATH}")
        
        print(f"\n{'='*70}")
        print("EMBEDDING GENERATION COMPLETE!")
        print(f"{'='*70}\n")
    
    def get_summary_stats(self) -> Dict:
        """
        Get summary statistics about the generated embeddings.
        
        Returns:
            Dictionary with summary statistics
        """
        if self.embeddings is None:
            raise ValueError("Embeddings not generated yet. Call generate_embeddings() first.")
        
        stats = {
            'n_songs': self.embeddings.shape[0],
            'n_dimensions': self.embeddings.shape[1],
            'features_used': self.feature_names,
            'mean_per_dim': self.embeddings.mean(axis=0),
            'std_per_dim': self.embeddings.std(axis=0),
            'min_per_dim': self.embeddings.min(axis=0),
            'max_per_dim': self.embeddings.max(axis=0)
        }
        
        return stats
    
    def print_summary(self):
        """Print a summary of the embedding generation."""
        stats = self.get_summary_stats()
        
        print("\n" + "="*70)
        print("EMBEDDING SUMMARY")
        print("="*70)
        print(f"Total songs: {stats['n_songs']:,}")
        print(f"Embedding dimensions: {stats['n_dimensions']}")
        print(f"\nFeatures used ({len(stats['features_used'])}):")
        for i, feature in enumerate(stats['features_used'], 1):
            mean = stats['mean_per_dim'][i-1]
            std = stats['std_per_dim'][i-1]
            print(f"  {i:2d}. {feature:20s} (μ={mean:7.3f}, σ={std:7.3f})")
        print("="*70 + "\n")


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def load_embeddings(embeddings_path: str = EmbeddingConfig.OUTPUT_EMBEDDINGS_PATH) -> Dict:
    """
    Load previously generated embeddings.
    
    Args:
        embeddings_path: Path to embeddings pickle file
        
    Returns:
        Dictionary with embeddings and song_ids
    """
    with open(embeddings_path, 'rb') as f:
        data = pickle.load(f)
    return data


def load_metadata(metadata_path: str = EmbeddingConfig.OUTPUT_METADATA_PATH) -> Dict:
    """
    Load embedding metadata.
    
    Args:
        metadata_path: Path to metadata pickle file
        
    Returns:
        Dictionary with metadata information
    """
    with open(metadata_path, 'rb') as f:
        metadata = pickle.load(f)
    return metadata


# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    """
    Main function to generate embeddings.
    
    Usage:
        python generate_embeddings.py
    """
    # Initialize generator
    generator = SongEmbeddingGenerator()
    
    # Generate embeddings
    embeddings = generator.generate_embeddings()
    
    # Print summary
    generator.print_summary()
    
    # Save results
    generator.save_embeddings()
    
    return generator


if __name__ == "__main__":
    generator = main()