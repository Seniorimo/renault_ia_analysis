# Renault IA Analysis - Application de Diagnostic

Cette application combine un frontend en JavaScript et un backend en Python pour analyser les données de véhicules Renault en temps réel.

## Prérequis

- Python 3.8 ou supérieur
- pip (gestionnaire de paquets Python)

## Installation

1. Installer les dépendances Python :
```bash
pip install -r requirements.txt
```

2. Configuration des variables d'environnement (optionnel) :
```bash
export SECRET_KEY=votre_clé_secrète
export PORT=5000  # Port par défaut
```

## Démarrage de l'application

1. Méthode simple :
```bash
python backend/wsgi.py
```

2. Avec Gunicorn (recommandé pour la production) :
```bash
gunicorn --worker-class eventlet -w 1 backend.wsgi:app
```

L'application sera accessible à l'adresse : http://localhost:5000

## Structure des fichiers

```
dist/
├── frontend/          # Fichiers statiques (HTML, CSS, JS)
├── backend/           # Code Python du serveur
│   ├── app.py        # Application Flask principale
│   └── wsgi.py       # Point d'entrée WSGI
├── requirements.txt   # Dépendances Python
└── Procfile          # Configuration pour le déploiement
```

## Fonctionnalités

- Affichage en temps réel des données du véhicule
- Analyse de la performance et de l'efficacité
- Diagnostic des anomalies
- Recommandations pour optimiser la conduite 