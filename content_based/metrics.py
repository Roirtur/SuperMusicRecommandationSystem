import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

# Fonction pour calculer Precision@k
def precision_at_k(user_favorites, recommended_songs, k):
    top_k_recommended = recommended_songs[:k]
    true_positives = len(set(top_k_recommended) & user_favorites)
    return true_positives / k

# Fonction pour calculer Recall@k
def recall_at_k(user_favorites, recommended_songs, k):
    top_k_recommended = recommended_songs[:k]
    true_positives = len(set(top_k_recommended) & user_favorites)
    return true_positives / len(user_favorites)

# Exemple de données (à remplacer par vos données réelles)
user_favorites = {1, 3, 5, 7, 9, 11, 13}  # Chansons favorites de l'utilisateur
recommended_songs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]  # Recommandations du modèle

# Valeurs de k à évaluer
k_values = [1, 3, 5, 7, 10]

# Calculer Precision@k et Recall@k pour chaque k
precision_scores = [precision_at_k(user_favorites, recommended_songs, k) for k in k_values]
recall_scores = [recall_at_k(user_favorites, recommended_songs, k) for k in k_values]

# Afficher les résultats
print("Precision@k :", precision_scores)
print("Recall@k :", recall_scores)

# Tracer les courbes
plt.figure(figsize=(10, 6))
sns.set_style("whitegrid")

# Courbe Precision@k
plt.plot(k_values, precision_scores, marker='o', label='Precision@k', color='blue')

# Courbe Recall@k
plt.plot(k_values, recall_scores, marker='o', label='Recall@k', color='green')

# Ajouter des labels et un titre
plt.xlabel('Valeur de k')
plt.ylabel('Score')
plt.title('Precision@k et Recall@k pour différentes valeurs de k')
plt.legend()

# Sauvegarder le graphique
plt.savefig('precision_recall_plot.png', dpi=200, bbox_inches='tight')

# Afficher le graphique
plt.show()


