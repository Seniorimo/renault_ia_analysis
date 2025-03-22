"""
Module de simulation physique pour Renault ZOE.
Gère la physique du véhicule, les forces, accélérations, et l'état.
"""

import numpy as np
import time
import json
import logging
from collections import deque
import threading

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VehicleSimulation:
    """Classe simulant un véhicule électrique Renault"""
    
    def __init__(self):
        # État initial du véhicule
        self.current_speed = 0
        self.current_acceleration = 0
        self.battery_level = 100
        self.temperature = 25
        self.motor_load = 0
        self.tire_pressure = 2.4
        self.vehicle_weight = 1800
        self.road_grade = 0
        self.road_condition = 0
        self.wind_speed = 0
        
        # Variables de simulation
        self.is_running = False
        self.simulation_thread = None
        self.data_update_callbacks = []
        
        logger.info("Vehicle simulation initialized")
    
    def start(self):
        """Démarre la simulation du véhicule"""
        if self.is_running:
            return
        
        self.is_running = True
        self.simulation_thread = threading.Thread(target=self._simulation_loop)
        self.simulation_thread.daemon = True
        self.simulation_thread.start()
        logger.info("Vehicle simulation started")
    
    def stop(self):
        """Arrête la simulation du véhicule"""
        self.is_running = False
        if self.simulation_thread:
            self.simulation_thread.join(timeout=1.0)
        logger.info("Vehicle simulation stopped")
    
    def _simulation_loop(self):
        """Boucle principale de simulation"""
        logger.info("Simulation loop started")
        
        update_interval = 0.5  # secondes
        
        while self.is_running:
            # Simuler les changements dans le véhicule
            self._update_vehicle_state()
            
            # Notifier les callbacks enregistrés
            self._notify_callbacks()
            
            # Pause pour la prochaine mise à jour
            time.sleep(update_interval)
    
    def _update_vehicle_state(self):
        """Met à jour l'état du véhicule"""
        # Simuler des changements réalistes
        
        # Changement aléatoire de vitesse entre -5 et +5 km/h
        speed_change = np.random.normal(0, 2)
        self.current_speed = max(0, min(130, self.current_speed + speed_change))
        
        # Calculer l'accélération actuelle
        self.current_acceleration = speed_change / 3.6  # m/s²
        
        # Diminuer la batterie selon la vitesse
        battery_drain = 0.01 * (1 + self.current_speed / 50)
        self.battery_level = max(0, self.battery_level - battery_drain)
        
        # Température varie légèrement
        self.temperature += np.random.normal(0, 0.2)
        
        # Charge moteur dépend de la vitesse et de l'accélération
        self.motor_load = min(100, max(0, 
            20 + (self.current_speed / 130) * 60 + abs(self.current_acceleration) * 20))
        
        # Variations aléatoires
        self.tire_pressure = max(1.8, min(2.8, self.tire_pressure + np.random.normal(0, 0.01)))
        self.wind_speed = max(-10, min(10, self.wind_speed + np.random.normal(0, 0.5)))
        self.road_grade = max(-8, min(8, self.road_grade + np.random.normal(0, 0.1)))
        
        # Route aléatoire (sec, humide, mouillé)
        if np.random.random() < 0.01:  # 1% de chance de changer l'état de la route
            self.road_condition = np.random.choice([0, 0.5, 1])
    
    def _notify_callbacks(self):
        """Notifie tous les callbacks enregistrés avec les données actuelles"""
        data = self.get_current_data()
        for callback in self.data_update_callbacks:
            try:
                callback(data)
            except Exception as e:
                logger.error(f"Error in callback: {e}")
    
    def on_data_update(self, callback):
        """Enregistre un callback à appeler lors des mises à jour"""
        if callback not in self.data_update_callbacks:
            self.data_update_callbacks.append(callback)
    
    def get_current_data(self):
        """Renvoie les données actuelles du véhicule"""
        return {
            'speed': self.current_speed,
            'acceleration': self.current_acceleration,
            'battery_level': self.battery_level,
            'temperature': self.temperature,
            'motor_load': self.motor_load,
            'tire_pressure': self.tire_pressure,
            'vehicle_weight': self.vehicle_weight,
            'road_grade': self.road_grade,
            'road_condition': self.road_condition,
            'wind_speed': self.wind_speed,
            'timestamp': time.time()
        }

class VehiclePhysicsSimulation:
    """
    Simulation physique pour Renault ZOE.
    Gère la dynamique du véhicule et l'état de la batterie.
    """
    
    def __init__(self):
        # Caractéristiques du véhicule
        self.mass = 1500.0  # kg
        self.max_power = 80.0  # kW
        self.battery_capacity = 52.0  # kWh
        self.max_speed = 140.0 / 3.6  # m/s (140 km/h)
        self.drag_coefficient = 0.31
        self.frontal_area = 2.43  # m²
        self.rolling_resistance = 0.013
        self.brake_efficiency = 0.8
        self.regenerative_braking_efficiency = 0.6
        
        # État du véhicule
        self.position = np.array([0.0, 0.0, 0.0])  # Position (x, y, z) en mètres
        self.velocity = np.array([0.0, 0.0, 0.0])  # Vitesse (vx, vy, vz) en m/s
        self.acceleration = np.array([0.0, 0.0, 0.0])  # Accélération (ax, ay, az) en m/s²
        self.orientation = np.array([0.0, 0.0, 0.0])  # Angles (pitch, yaw, roll) en radians
        
        # État de la batterie et du moteur
        self.battery_level = 100.0  # Pourcentage
        self.motor_temperature = 25.0  # °C
        self.brake_temperature = 20.0  # °C
        self.total_distance = 0.0  # mètres
        self.total_energy_consumed = 0.0  # kWh
        
        # Contrôles du véhicule
        self.throttle = 0.0  # 0.0 - 1.0
        self.brake = 0.0  # 0.0 - 1.0
        self.steering = 0.0  # -1.0 (gauche) à 1.0 (droite)
        
        # Temps et historique
        self.last_update_time = None
        self.history = deque(maxlen=600)  # 10 minutes d'historique à 1Hz
        
        # Modèle énergétique
        self.energy_model = {
            'idle_consumption': 0.5,  # kW
            'motor_efficiency': 0.85,
            'accessories_power': 1.2,  # kW (clim, éclairage, etc.)
            'thermal_loss_factor': 0.1,  # Perte thermique
        }
        
        # Modèle thermique
        self.thermal_model = {
            'motor_heating_rate': 0.05,  # °C par kW de puissance utilisée
            'motor_cooling_rate': 0.02,  # °C par seconde en idle
            'brake_heating_rate': 10.0,  # °C par unité de force de freinage
            'brake_cooling_rate': 0.05,  # °C par seconde
            'ambient_temperature': 20.0  # °C
        }
        
        logger.info("Simulation de Renault ZOE initialisée")
    
    def reset(self):
        """Réinitialise la simulation."""
        # Réinitialisation de l'état du véhicule
        self.position = np.array([0.0, 0.0, 0.0])
        self.velocity = np.array([0.0, 0.0, 0.0])
        self.acceleration = np.array([0.0, 0.0, 0.0])
        self.orientation = np.array([0.0, 0.0, 0.0])
        
        # Réinitialisation de la batterie et du moteur
        self.battery_level = 100.0
        self.motor_temperature = 25.0
        self.brake_temperature = 20.0
        self.total_distance = 0.0
        self.total_energy_consumed = 0.0
        
        # Réinitialisation des contrôles
        self.throttle = 0.0
        self.brake = 0.0
        self.steering = 0.0
        
        # Réinitialisation du temps
        self.last_update_time = None
        self.history.clear()
        
        logger.info("Simulation réinitialisée")
    
    def update_controls(self, throttle=None, brake=None, steering=None):
        """
        Met à jour les contrôles du véhicule.
        
        Args:
            throttle (float): Accélération entre 0.0 et 1.0
            brake (float): Freinage entre 0.0 et 1.0
            steering (float): Direction entre -1.0 (gauche) et 1.0 (droite)
        """
        if throttle is not None:
            self.throttle = max(0.0, min(1.0, float(throttle)))
        
        if brake is not None:
            self.brake = max(0.0, min(1.0, float(brake)))
        
        if steering is not None:
            self.steering = max(-1.0, min(1.0, float(steering)))
    
    def update(self, dt=None):
        """
        Met à jour la simulation pour un pas de temps donné.
        
        Args:
            dt (float): Pas de temps en secondes. Si None, le temps réel écoulé est utilisé.
        
        Returns:
            dict: État actuel du véhicule après mise à jour
        """
        # Gestion du temps
        current_time = time.time()
        if dt is None:
            if self.last_update_time is None:
                dt = 1.0 / 30.0  # Première mise à jour, 30 FPS par défaut
            else:
                dt = current_time - self.last_update_time
        
        self.last_update_time = current_time
        
        # Calcul des forces et de la dynamique du véhicule
        self._update_physics(dt)
        
        # Mise à jour de la batterie et des températures
        self._update_energy(dt)
        self._update_thermal(dt)
        
        # Enregistrement de l'état actuel dans l'historique
        state = self.get_current_state()
        self.history.append((current_time, state))
        
        return state
    
    def _update_physics(self, dt):
        """
        Met à jour la physique du véhicule.
        
        Args:
            dt (float): Pas de temps en secondes
        """
        # Vitesse actuelle
        speed = np.linalg.norm(self.velocity)
        
        # Force de traction (basée sur l'accélération)
        traction_force = 0.0
        if self.throttle > 0 and self.battery_level > 0:
            # Force de traction proportionnelle à l'accélération et à la puissance disponible
            max_power_available = self.max_power * (self.battery_level / 100.0)
            power_used = max_power_available * self.throttle
            
            # Conversion de puissance en force (P = F * v)
            if speed > 0.5:
                traction_force = power_used * 1000 / speed  # kW to W, F = P/v
            else:
                # À faible vitesse, force maximale
                traction_force = power_used * 1000 / 0.5
        
        # Force de freinage
        brake_force = 0.0
        if self.brake > 0:
            # Force de freinage proportionnelle à la vitesse
            brake_force = self.mass * 9.81 * self.brake_efficiency * self.brake
        
        # Force de traînée aérodynamique
        air_density = 1.225  # kg/m³
        drag_force = 0.5 * air_density * self.drag_coefficient * self.frontal_area * speed * speed
        if speed > 0:
            drag_direction = -self.velocity / speed
        else:
            drag_direction = np.array([0.0, 0.0, 0.0])
        
        # Force de résistance au roulement
        rolling_force = self.mass * 9.81 * self.rolling_resistance
        if speed > 0:
            rolling_direction = -self.velocity / speed
        else:
            rolling_direction = np.array([0.0, 0.0, 0.0])
        
        # Calcul de la force totale
        force_direction = np.array([1.0, 0.0, 0.0])  # Direction avant
        
        # Rotation de la direction selon le volant (yaw)
        steering_angle = self.steering * np.pi / 4  # Max ±45 degrés
        yaw_rotation = np.array([
            [np.cos(steering_angle), -np.sin(steering_angle), 0],
            [np.sin(steering_angle), np.cos(steering_angle), 0],
            [0, 0, 1]
        ])
        force_direction = np.dot(yaw_rotation, force_direction)
        
        # Force totale = traction - freinage - traînée - résistance au roulement
        total_force = (traction_force * force_direction -
                      brake_force * (self.velocity / max(0.1, speed)) -
                      drag_force * drag_direction -
                      rolling_force * rolling_direction)
        
        # Calcul de l'accélération (F = m * a)
        self.acceleration = total_force / self.mass
        
        # Mise à jour de la vitesse
        self.velocity += self.acceleration * dt
        
        # Limite de vitesse maximale
        current_speed = np.linalg.norm(self.velocity)
        if current_speed > self.max_speed:
            self.velocity = self.velocity * (self.max_speed / current_speed)
        
        # Si la voiture est presque à l'arrêt, on la stoppe complètement
        if current_speed < 0.1:
            self.velocity = np.array([0.0, 0.0, 0.0])
        
        # Mise à jour de la position
        self.position += self.velocity * dt
        
        # Mise à jour de la distance totale
        self.total_distance += current_speed * dt
    
    def _update_energy(self, dt):
        """
        Met à jour la consommation d'énergie et le niveau de batterie.
        
        Args:
            dt (float): Pas de temps en secondes
        """
        # Vitesse actuelle
        speed = np.linalg.norm(self.velocity)
        
        # Puissance utilisée pour la traction
        traction_power = 0.0
        if self.throttle > 0 and speed > 0:
            max_power_available = self.max_power * (self.battery_level / 100.0)
            traction_power = max_power_available * self.throttle
        
        # Puissance récupérée par le freinage régénératif
        regen_power = 0.0
        if self.brake > 0 and speed > 1.0:
            # La puissance récupérée dépend de la vitesse et de la force de freinage
            kinetic_energy_rate = 0.5 * self.mass * speed * self.brake * self.regenerative_braking_efficiency
            regen_power = min(kinetic_energy_rate / 1000, self.max_power * 0.3)  # kW, max 30% de la puissance max
        
        # Puissance des accessoires et consommation de base
        accessories_power = self.energy_model['accessories_power']
        idle_power = self.energy_model['idle_consumption']
        
        # Puissance totale (positive = consommation, négative = récupération)
        total_power = traction_power + accessories_power + idle_power - regen_power
        
        # Efficacité du moteur
        if total_power > 0:
            # Consommation avec pertes
            effective_power = total_power / self.energy_model['motor_efficiency']
        else:
            # Récupération avec pertes
            effective_power = total_power * self.energy_model['motor_efficiency']
        
        # Énergie consommée pendant ce pas de temps (kWh)
        energy_consumed = effective_power * (dt / 3600.0)
        
        # Mise à jour du compteur d'énergie totale
        if energy_consumed > 0:
            self.total_energy_consumed += energy_consumed
        
        # Mise à jour du niveau de batterie
        energy_percentage = energy_consumed / self.battery_capacity * 100
        self.battery_level = max(0.0, min(100.0, self.battery_level - energy_percentage))
    
    def _update_thermal(self, dt):
        """
        Met à jour les températures du moteur et des freins.
        
        Args:
            dt (float): Pas de temps en secondes
        """
        # Calcul de la température du moteur
        speed = np.linalg.norm(self.velocity)
        motor_power = self.max_power * self.throttle
        
        # Chauffage du moteur basé sur la puissance utilisée
        motor_heating = motor_power * self.thermal_model['motor_heating_rate'] * dt
        
        # Refroidissement du moteur (proportionnel à la différence avec l'ambient)
        motor_cooling = (self.thermal_model['ambient_temperature'] - self.motor_temperature) * self.thermal_model['motor_cooling_rate'] * dt
        
        # Mise à jour de la température du moteur
        self.motor_temperature += motor_heating + motor_cooling
        self.motor_temperature = max(self.thermal_model['ambient_temperature'], self.motor_temperature)
        
        # Calcul de la température des freins
        brake_force = self.mass * 9.81 * self.brake_efficiency * self.brake
        
        # Chauffage des freins basé sur la force de freinage et la vitesse
        brake_heating = brake_force * speed * self.thermal_model['brake_heating_rate'] * dt * 0.001
        
        # Refroidissement des freins
        brake_cooling = (self.thermal_model['ambient_temperature'] - self.brake_temperature) * self.thermal_model['brake_cooling_rate'] * dt
        
        # Mise à jour de la température des freins
        self.brake_temperature += brake_heating + brake_cooling
        self.brake_temperature = max(self.thermal_model['ambient_temperature'], self.brake_temperature)
    
    def get_current_state(self):
        """
        Récupère l'état actuel du véhicule.
        
        Returns:
            dict: État actuel du véhicule
        """
        # Vitesse en m/s
        speed = np.linalg.norm(self.velocity)
        
        return {
            'time': time.time(),
            'position': self.position.tolist(),
            'velocity': self.velocity.tolist(),
            'speed': float(speed),  # Scalaire en m/s
            'acceleration': self.acceleration.tolist(),
            'orientation': self.orientation.tolist(),
            'battery_level': float(self.battery_level),
            'motor_temperature': float(self.motor_temperature),
            'brake_temperature': float(self.brake_temperature),
            'total_distance': float(self.total_distance),
            'total_energy_consumed': float(self.total_energy_consumed),
            'throttle': float(self.throttle),
            'brake': float(self.brake),
            'steering': float(self.steering)
        }
    
    def get_history(self, start_time=None, end_time=None):
        """
        Récupère l'historique des états du véhicule dans une plage de temps.
        
        Args:
            start_time (float): Temps de début (timestamp)
            end_time (float): Temps de fin (timestamp)
        
        Returns:
            list: Liste des états du véhicule
        """
        if not self.history:
            return []
        
        if start_time is None:
            start_time = self.history[0][0]
        
        if end_time is None:
            end_time = self.history[-1][0]
        
        # Filtrer les états dans la plage de temps
        filtered_history = [(t, state) for t, state in self.history if start_time <= t <= end_time]
        
        # Retourner uniquement les états
        return [state for _, state in filtered_history] 