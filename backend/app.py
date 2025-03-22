import eventlet
eventlet.monkey_patch()

import os
import logging
from flask import Flask, render_template, jsonify, send_from_directory
import json
import time
import threading
import numpy as np

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialisation de l'application Flask
app = Flask(__name__, static_folder='../frontend', template_folder='../frontend')
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'renault_ia_analysis_key')

# Initialisation de Socket.IO
from flask_socketio import SocketIO, emit
socketio = SocketIO(app, async_mode='eventlet', cors_allowed_origins="*")

# Variables globales pour stocker les données
current_data = {
    'speed': 0,
    'acceleration': 0,
    'battery_level': 100,
    'temperature': 25,
    'motor_load': 0,
    'road_grade': 0,
    'tire_pressure': 2.4,
    'wind_speed': 0,
    'road_condition': 0,
    'energy_consumption': 0,
    'timestamp': time.time()
}

current_analysis = {
    'efficiency_score': 80,
    'anomalies': [],
    'recommendations': ['Conduite optimale pour maximiser l\'autonomie']
}

# Variables globales pour la simulation
simulation_active = False
simulation_thread = None

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

def generate_simulated_data():
    global current_data, current_analysis, simulation_active
    
    while simulation_active:
        try:
            # Simuler des changements dans les données
            current_data['speed'] += np.random.uniform(-5, 5)
            current_data['speed'] = max(0, min(130, current_data['speed']))
            
            current_data['acceleration'] = np.random.uniform(-2, 2)
            
            # Simuler la batterie qui diminue
            discharge_rate = 0.01 * (1 + current_data['speed'] / 50)
            current_data['battery_level'] -= discharge_rate
            current_data['battery_level'] = max(0, current_data['battery_level'])
            
            # Varier la température
            current_data['temperature'] += np.random.uniform(-0.5, 0.5)
            current_data['temperature'] = max(15, min(60, current_data['temperature']))
            
            # Calculer la charge moteur
            current_data['motor_load'] = 20 + (current_data['speed'] / 130) * 60
            current_data['motor_load'] = max(0, min(100, current_data['motor_load']))
            
            # Mettre à jour l'horodatage
            current_data['timestamp'] = time.time()
            
            # Simuler une analyse
            anomalies = []
            if current_data['temperature'] > 45:
                anomalies.append({
                    'type': 'temperature',
                    'severity': 'warning',
                    'message': 'Température moteur élevée'
                })
            
            if current_data['battery_level'] < 20:
                anomalies.append({
                    'type': 'battery',
                    'severity': 'critical',
                    'message': 'Niveau batterie critique'
                })
            
            current_analysis['anomalies'] = anomalies
            current_analysis['efficiency_score'] = max(0, min(100, 80 - abs(current_data['acceleration'] * 10)))
            
            # Envoyer les données via Socket.IO
            socketio.emit('vehicle_data_update', {
                'vehicle_data': current_data,
                'analysis': current_analysis
            })
            
        except Exception as e:
            logger.error(f"Error in simulation: {e}")
        
        time.sleep(1)

@socketio.on('connect')
def handle_connect():
    emit('connection_status', {'status': 'connected'})

@socketio.on('start_diagnostic')
def handle_start_diagnostic(data):
    global simulation_active, simulation_thread
    
    if not simulation_active:
        simulation_active = True
        simulation_thread = threading.Thread(target=generate_simulated_data)
        simulation_thread.start()
        emit('diagnostic_status', {'status': 'started'})

@socketio.on('stop_diagnostic')
def handle_stop_diagnostic():
    global simulation_active, simulation_thread
    
    if simulation_active:
        simulation_active = False
        if simulation_thread:
            simulation_thread.join()
        emit('diagnostic_status', {'status': 'stopped'})

@socketio.on('disconnect')
def handle_disconnect():
    global simulation_active
    simulation_active = False 