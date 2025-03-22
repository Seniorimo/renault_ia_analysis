import os
import sys

# Ajouter les répertoires nécessaires au PYTHONPATH
current_dir = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.join(current_dir, 'src')
sys.path.insert(0, current_dir)
sys.path.insert(0, src_dir)

from app import app, socketio

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Démarrage du serveur sur le port {port}...")
    socketio.run(app, host='0.0.0.0', port=port, debug=False) 