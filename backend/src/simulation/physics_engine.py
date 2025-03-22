import numpy as np
import time
import math
from dataclasses import dataclass
from typing import Dict, Tuple, Optional
import threading
import logging
from datetime import datetime
import sys

logger = logging.getLogger(__name__)

@dataclass
class VehicleState:
    position: Tuple[float, float, float]  # x, y, z in meters
    velocity: Tuple[float, float, float]  # vx, vy, vz in m/s
    acceleration: Tuple[float, float, float]  # ax, ay, az in m/s²
    orientation: Tuple[float, float, float]  # roll, pitch, yaw in radians
    angular_velocity: Tuple[float, float, float]  # wx, wy, wz in rad/s
    wheel_rotations: Tuple[float, float, float, float]  # rotation angles of each wheel
    battery_level: float  # percentage (0-100)
    motor_temperature: float  # degrees Celsius
    brake_temperature: float  # degrees Celsius
    tire_pressure: Tuple[float, float, float, float]  # PSI for each tire

class VehiclePhysicsSimulation:
    def __init__(self):
        # Constantes du véhicule
        self.mass = 1500  # kg
        self.wheelbase = 2.588  # m
        self.track_width = 1.788  # m
        self.cg_height = 0.5  # m
        self.wheel_radius = 0.31  # m
        self.drag_coefficient = 0.29
        self.frontal_area = 2.43  # m²
        self.air_density = 1.225  # kg/m³
        self.rolling_resistance = 0.015
        
        # État initial du véhicule
        self.state = VehicleState(
            position=(0.0, 0.0, 0.0),
            velocity=(0.0, 0.0, 0.0),
            acceleration=(0.0, 0.0, 0.0),
            orientation=(0.0, 0.0, 0.0),
            angular_velocity=(0.0, 0.0, 0.0),
            wheel_rotations=(0.0, 0.0, 0.0, 0.0),
            battery_level=100.0,
            motor_temperature=20.0,
            brake_temperature=20.0,
            tire_pressure=(36.0, 36.0, 36.0, 36.0)
        )
        
        self.last_update_time = None
        self.total_distance = 0.0
        
    def update(self, controls: Dict) -> None:
        """
        Met à jour l'état du véhicule en fonction des contrôles
        
        Args:
            controls: Dict contenant:
                - throttle: float [-1, 1]
                - brake: float [0, 1]
                - steering: float [-1, 1]
                - gear: int (-1: reverse, 0: neutral, 1: drive)
        """
        current_time = time.time()
        if self.last_update_time is None:
            self.last_update_time = current_time
            return
            
        dt = current_time - self.last_update_time
        self.last_update_time = current_time
        
        # Extraction des contrôles
        throttle = np.clip(controls.get('throttle', 0.0), -1.0, 1.0)
        brake = np.clip(controls.get('brake', 0.0), 0.0, 1.0)
        steering = np.clip(controls.get('steering', 0.0), -1.0, 1.0)
        gear = np.clip(controls.get('gear', 0), -1, 1)
        
        # Calcul des forces
        # 1. Force de propulsion
        max_engine_force = 20000  # N
        engine_force = max_engine_force * throttle * gear
        
        # 2. Force de freinage
        max_brake_force = 30000  # N
        brake_force = max_brake_force * brake
        
        # 3. Force aérodynamique
        speed = np.linalg.norm(self.state.velocity)
        drag_force = (0.5 * self.air_density * self.drag_coefficient * 
                     self.frontal_area * speed * speed)
        
        # 4. Résistance au roulement
        rolling_force = self.mass * 9.81 * self.rolling_resistance
        
        # Force totale
        total_force = (engine_force - brake_force - drag_force - 
                      rolling_force * np.sign(speed))
        
        # Mise à jour de l'accélération
        acceleration = total_force / self.mass
        self.state.acceleration = (acceleration, 0.0, 0.0)
        
        # Mise à jour de la vitesse
        new_velocity = (
            self.state.velocity[0] + acceleration * dt,
            self.state.velocity[1],
            self.state.velocity[2]
        )
        self.state.velocity = new_velocity
        
        # Mise à jour de la position
        new_position = (
            self.state.position[0] + new_velocity[0] * dt,
            self.state.position[1] + new_velocity[1] * dt,
            self.state.position[2] + new_velocity[2] * dt
        )
        self.state.position = new_position
        
        # Mise à jour de l'orientation (yaw) en fonction du steering
        max_steering_angle = np.radians(35)  # 35 degrés max
        steering_angle = steering * max_steering_angle
        turning_radius = self.wheelbase / np.tan(steering_angle) if abs(steering_angle) > 0.001 else float('inf')
        
        if turning_radius != float('inf'):
            angular_velocity = speed / turning_radius
            new_yaw = self.state.orientation[2] + angular_velocity * dt
            self.state.orientation = (
                self.state.orientation[0],
                self.state.orientation[1],
                new_yaw
            )
        
        # Mise à jour des roues
        wheel_angular_velocity = speed / self.wheel_radius
        wheel_rotation = wheel_angular_velocity * dt
        self.state.wheel_rotations = tuple(
            r + wheel_rotation for r in self.state.wheel_rotations
        )
        
        # Mise à jour de la batterie
        power_consumption = abs(engine_force * speed) / 1000  # kW
        battery_drain = power_consumption * dt / 3600  # kWh
        self.state.battery_level = max(0.0, self.state.battery_level - battery_drain)
        
        # Mise à jour des températures
        # Moteur
        base_motor_temp = 20.0  # température ambiante
        max_motor_temp = 120.0
        motor_heat_rate = abs(engine_force) / max_engine_force
        target_motor_temp = base_motor_temp + (max_motor_temp - base_motor_temp) * motor_heat_rate
        motor_temp_change_rate = 0.1  # °C par seconde
        self.state.motor_temperature += (target_motor_temp - self.state.motor_temperature) * motor_temp_change_rate * dt
        
        # Freins
        base_brake_temp = 20.0
        max_brake_temp = 800.0
        brake_heat_rate = brake * speed / 100
        target_brake_temp = base_brake_temp + (max_brake_temp - base_brake_temp) * brake_heat_rate
        brake_temp_change_rate = 0.2
        self.state.brake_temperature += (target_brake_temp - self.state.brake_temperature) * brake_temp_change_rate * dt
        
        # Mise à jour de la distance totale
        self.total_distance += speed * dt
        
    def get_vehicle_state(self) -> Dict:
        """
        Retourne l'état actuel du véhicule
        """
        return {
            'position': self.state.position,
            'velocity': self.state.velocity,
            'acceleration': self.state.acceleration,
            'orientation': self.state.orientation,
            'angular_velocity': self.state.angular_velocity,
            'wheel_rotations': self.state.wheel_rotations,
            'battery_level': self.state.battery_level,
            'motor_temperature': self.state.motor_temperature,
            'brake_temperature': self.state.brake_temperature,
            'tire_pressure': self.state.tire_pressure,
            'total_distance': self.total_distance
        }
        
    def cleanup(self):
        """
        Nettoie les ressources utilisées par la simulation
        """
        self.last_update_time = None 

class RealTimeSimulator:
    """Simulateur de véhicule en temps réel"""
    
    # Constantes des modes de conduite
    MODE_URBAIN = "urbain"
    MODE_SPORT = "sport"
    MODE_AUTOROUTE = "autoroute"
    MODE_ECO = "eco"
    
    # Paramètres spécifiques à chaque mode
    MODE_PARAMS = {
        MODE_URBAIN: {
            "vitesse_max": 50,        # Vitesse maximale en ville (km/h)
            "vitesse_moyenne": 30,     # Vitesse moyenne du trafic urbain (km/h)
            "acceleration_max": 2.0,   # Accélération maximale typique en ville (m/s²)
            "variation_vitesse": 15,   # Variations fréquentes dues aux feux/stops
            "conso_base": 16,         # kWh/100km - consommation de base en ville (arrêts fréquents)
            "temps_factor": 1.0,       # Facteur de temps réel
            "regeneration": 0.4        # Fort potentiel de récupération d'énergie au freinage
        },
        MODE_SPORT: {
            "vitesse_max": 150,        # Vitesse maximale en mode sport (km/h)
            "vitesse_moyenne": 90,     # Vitesse moyenne maintenue (km/h)
            "acceleration_max": 4.0,   # Accélération plus agressive (m/s²)
            "variation_vitesse": 25,   # Grandes variations de vitesse
            "conso_base": 25,         # kWh/100km - haute consommation due à l'accélération agressive
            "temps_factor": 1.5,       # Simulation plus rapide
            "regeneration": 0.2        # Moins de récupération (conduite agressive)
        },
        MODE_AUTOROUTE: {
            "vitesse_max": 130,        # Limitation sur autoroute (km/h)
            "vitesse_moyenne": 110,    # Vitesse de croisière (km/h)
            "acceleration_max": 1.5,   # Accélération plus douce (m/s²)
            "variation_vitesse": 10,   # Faibles variations (vitesse constante)
            "conso_base": 21,         # kWh/100km - consommation à vitesse élevée constante
            "temps_factor": 1.2,       # Simulation légèrement plus rapide
            "regeneration": 0.1        # Peu d'occasions de récupérer l'énergie
        },
        MODE_ECO: {
            "vitesse_max": 90,         # Vitesse limitée pour économiser (km/h)
            "vitesse_moyenne": 60,     # Vitesse économique (km/h)
            "acceleration_max": 1.0,   # Accélération très douce (m/s²)
            "variation_vitesse": 5,    # Très faibles variations (conduite fluide)
            "conso_base": 13,         # kWh/100km - consommation optimisée
            "temps_factor": 0.8,       # Simulation plus lente (conduite calme)
            "regeneration": 0.5        # Maximisation de la récupération d'énergie
        }
    }
    
    def __init__(self):
        self.is_running = False
        self.simulation_thread = None
        self.data_update_callbacks = []
        
        # Paramètres du véhicule basés sur une Renault Megane E-Tech
        self.vehicle_data = {
            'speed': 0,                 # km/h
            'acceleration': 0,          # m/s²
            'temperature': 25,          # °C
            'battery_level': 100,       # %
            'battery_capacity': 60,     # kWh - capacité totale de la batterie
            'motor_load': 0,            # %
            'road_grade': 0,            # % - inclinaison de la route
            'tire_pressure': 2.4,       # bar
            'vehicle_weight': 1800,     # kg
            'wind_speed': 0,            # m/s
            'road_condition': 0,        # 0=sec, 0.5=humide, 1=mouillé
            'total_distance': 0,        # m
            'energy_consumption': 0,    # kWh/100km
            'instant_consumption': 0,   # kW - consommation instantanée 
            'simulation_mode': self.MODE_URBAIN,  # Mode de simulation par défaut
            'autonomy_remaining': 390   # km
        }
        
        # Paramètres de simulation
        self.update_interval = 0.2  # secondes 
        self.current_mode = self.MODE_URBAIN  # Mode par défaut
        
        # Paramètres des événements aléatoires
        self.event_probability = 0.01   # Probabilité d'un événement par mise à jour
        self.current_event = None       # Événement en cours
        self.event_duration = 0         # Durée restante de l'événement en cycles
        
        logger.info("RealTimeSimulator initialized")
    
    def start(self, mode=None):
        """Démarre la simulation en temps réel avec le mode spécifié"""
        if mode and mode in self.MODE_PARAMS:
            self.current_mode = mode
            self.vehicle_data['simulation_mode'] = mode
            logger.info(f"Simulation started in {mode} mode")
        else:
            logger.info("Simulation started with default mode")
            
        if self.is_running:
            return
        
        self.is_running = True
        self.simulation_thread = threading.Thread(target=self._simulation_loop)
        self.simulation_thread.daemon = True
        self.simulation_thread.start()
    
    def stop(self):
        """Arrête la simulation en temps réel"""
        self.is_running = False
        if self.simulation_thread:
            self.simulation_thread.join(timeout=1.0)
        logger.info("RealTimeSimulator stopped")
    
    def change_mode(self, new_mode):
        """Change le mode de simulation"""
        if new_mode in self.MODE_PARAMS:
            self.current_mode = new_mode
            self.vehicle_data['simulation_mode'] = new_mode
            logger.info(f"Simulation mode changed to {new_mode}")
            return True
        return False
    
    def _simulation_loop(self):
        """Boucle principale de simulation"""
        try:
            last_update = time.time()
            
            while self.is_running:
                current_time = time.time()
                elapsed = current_time - last_update
                
                # Mettre à jour l'état du véhicule
                self._update_vehicle_state(elapsed)
                
                # Calculer la consommation d'énergie
                self._calculate_energy_consumption()
                
                # Notifier les callbacks
                self._notify_callbacks()
                
                # Attendre pour le prochain cycle
                sleep_time = max(0, self.update_interval - (time.time() - current_time))
                # Utiliser eventlet.sleep pour ne pas bloquer les WebSockets
                if 'eventlet' in sys.modules:
                    import eventlet
                    eventlet.sleep(sleep_time)
                else:
                    time.sleep(sleep_time)
                    
                last_update = current_time
                
        except Exception as e:
            logger.error(f"Error in simulation loop: {e}")
            self.is_running = False
    
    def _update_vehicle_state(self, elapsed_time):
        """Met à jour l'état du véhicule selon le temps écoulé"""
        # Récupérer les paramètres du mode actuel
        mode_params = self.MODE_PARAMS[self.current_mode]
        vitesse_max = mode_params["vitesse_max"]
        vitesse_moyenne = mode_params["vitesse_moyenne"]
        acceleration_max = mode_params["acceleration_max"]
        variation_vitesse = mode_params["variation_vitesse"]
        time_factor = mode_params["temps_factor"]
        regeneration = mode_params["regeneration"]
        
        # Gérer les événements aléatoires
        self._handle_random_events()
        
        # Appliquer les effets des événements en cours
        if self.current_event:
            self._apply_event_effects()
        
        # Tendance vers la vitesse moyenne du mode avec hysteresis
        if self.vehicle_data['speed'] < vitesse_moyenne - 5:
            # Accélération progressive vers la vitesse moyenne
            tendance_vitesse = min(acceleration_max * 0.5, (vitesse_moyenne - self.vehicle_data['speed']) * 0.1)
        elif self.vehicle_data['speed'] > vitesse_moyenne + 5:
            # Décélération progressive vers la vitesse moyenne
            tendance_vitesse = max(-acceleration_max * 0.3, (vitesse_moyenne - self.vehicle_data['speed']) * 0.1)
        else:
            # Maintien autour de la vitesse moyenne avec micro-variations
            tendance_vitesse = (vitesse_moyenne - self.vehicle_data['speed']) * 0.05
        
        # Influence de la pente de la route sur l'accélération
        road_effect = -self.vehicle_data['road_grade'] * 0.2  # Une pente positive ralentit, négative accélère
        
        # Influence du vent (résistance aérodynamique)
        wind_effect = -self.vehicle_data['wind_speed'] * 0.05
        
        # Changement de vitesse avec composantes réalistes
        speed_change = ((tendance_vitesse + road_effect + wind_effect) * time_factor + 
                      np.random.normal(0, variation_vitesse/10))  # Petites variations aléatoires
                      
        # Limitation de l'accélération selon le mode
        self.vehicle_data['acceleration'] = min(acceleration_max, 
                                              max(-acceleration_max, 
                                              speed_change / (3.6 * max(0.1, elapsed_time))))
                                              
        # Mise à jour de la vitesse
        new_speed = self.vehicle_data['speed'] + self.vehicle_data['acceleration'] * 3.6 * elapsed_time
        self.vehicle_data['speed'] = max(0, min(vitesse_max, new_speed))
        
        # Mise à jour de la distance parcourue
        distance_km = (self.vehicle_data['speed'] * elapsed_time * time_factor) / 3600  # en km
        self.vehicle_data['total_distance'] += distance_km * 1000  # conversion en mètres
        
        # Calcul de la consommation instantanée en kW
        # Base: puissance nécessaire pour maintenir la vitesse (résistance aérodynamique et au roulement)
        aero_resistance = 0.5 * 1.225 * 0.30 * 2.5 * (self.vehicle_data['speed']/3.6)**2  # 1/2 * rho * Cd * A * v²
        rolling_resistance = 0.013 * self.vehicle_data['vehicle_weight'] * 9.81  # Cr * m * g
        grade_resistance = self.vehicle_data['vehicle_weight'] * 9.81 * math.sin(math.atan(self.vehicle_data['road_grade']/100))
        
        # Puissance (W) = Force (N) * Vitesse (m/s)
        road_power = (aero_resistance + rolling_resistance + grade_resistance) * (self.vehicle_data['speed']/3.6)
        
        # Puissance d'accélération: m * a * v
        accel_power = max(0, self.vehicle_data['vehicle_weight'] * self.vehicle_data['acceleration'] * (self.vehicle_data['speed']/3.6))
        
        # Puissance en kW avec rendement moteur/transmission
        motor_efficiency = 0.9 - 0.1 * (self.vehicle_data['temperature'] - 25) / 60  # Baisse avec température
        total_power = (road_power + accel_power) / 1000 / max(0.7, motor_efficiency)
        
        # Récupération d'énergie au freinage
        if self.vehicle_data['acceleration'] < -0.2:  # Freinage significatif
            regen_power = min(0, self.vehicle_data['vehicle_weight'] * self.vehicle_data['acceleration'] * 
                           (self.vehicle_data['speed']/3.6) * regeneration / 1000)
            total_power += regen_power  # Valeur négative = récupération
        
        # Pertes fixes (chauffage, électronique, etc.)
        idle_power = 0.8 if self.vehicle_data['temperature'] < 15 else 0.5  # kW (plus élevé par temps froid)
        
        # Consommation instantanée finale
        self.vehicle_data['instant_consumption'] = max(0, total_power + idle_power)
        
        # Convertir en kWh/100km pour l'affichage
        if self.vehicle_data['speed'] > 5:  # Éviter division par zéro ou valeurs extrêmes à basse vitesse
            self.vehicle_data['energy_consumption'] = self.vehicle_data['instant_consumption'] / (self.vehicle_data['speed']) * 100
        else:
            # À l'arrêt ou très basse vitesse, utiliser une valeur fixe ou la dernière valeur valide
            self.vehicle_data['energy_consumption'] = mode_params["conso_base"]
        
        # Calculer la consommation d'énergie en kWh
        energy_used = (self.vehicle_data['instant_consumption'] * elapsed_time) / 3600  # kWh
        
        # Consommer la batterie en fonction de l'énergie utilisée
        battery_percentage_used = (energy_used / self.vehicle_data['battery_capacity']) * 100
        self.vehicle_data['battery_level'] = max(0, self.vehicle_data['battery_level'] - battery_percentage_used)
        
        # Calculer l'autonomie restante de façon réaliste
        # Consommation moyenne sur les 100 derniers km en kWh/100km
        avg_consumption = mode_params["conso_base"] * (1 + 0.1 * (self.vehicle_data['speed'] / vitesse_moyenne - 1))
        remaining_energy = (self.vehicle_data['battery_level'] / 100) * self.vehicle_data['battery_capacity']
        self.vehicle_data['autonomy_remaining'] = (remaining_energy / avg_consumption) * 100
        
        # Température du moteur varie en fonction de la charge et de la vitesse
        temp_ambient = 20  # Température ambiante
        # Montée en température proportionnelle à la charge moteur
        temp_target = temp_ambient + (self.vehicle_data['motor_load'] / 100) * 60
        # Vitesse de variation proportionnelle à l'écart
        temp_delta = (temp_target - self.vehicle_data['temperature']) * 0.1 * time_factor
        self.vehicle_data['temperature'] = max(temp_ambient, min(90, self.vehicle_data['temperature'] + temp_delta))
        
        # Charge moteur fonction de la vitesse, accélération et masse
        base_load = 20  # Charge minimale
        speed_load = 40 * (self.vehicle_data['speed'] / vitesse_max)  # Contribution de la vitesse
        accel_load = 40 * abs(self.vehicle_data['acceleration'] / acceleration_max)  # Contribution de l'accélération
        
        self.vehicle_data['motor_load'] = min(100, max(0, base_load + speed_load + accel_load))
        
        # Variation de pression des pneus - plus réaliste
        if np.random.random() < 0.005 * time_factor:  # Changements très occasionnels
            # Légère perte de pression avec le temps et la distance
            pressure_loss = 0.001 * elapsed_time  # Perte normale
            if np.random.random() < 0.1:  # 10% de chance d'avoir une perte plus importante
                pressure_loss += np.random.uniform(0, 0.05)
            self.vehicle_data['tire_pressure'] = max(1.5, self.vehicle_data['tire_pressure'] - pressure_loss)
    
    def _handle_random_events(self):
        """Gère les événements aléatoires qui influencent la simulation"""
        # Si aucun événement en cours, possibilité d'en déclencher un nouveau
        if not self.current_event and np.random.random() < self.event_probability:
            events = [
                {"name": "trafic_dense", "duration": 50, "description": "Trafic dense"},
                {"name": "route_degagee", "duration": 40, "description": "Route dégagée"},
                {"name": "pluie", "duration": 60, "description": "Pluie modérée"},
                {"name": "vent_lateral", "duration": 30, "description": "Vent latéral fort"},
                {"name": "montee", "duration": 25, "description": "Montée importante"}
            ]
            
            # En mode urbain, plus de chances d'avoir du trafic dense
            if self.current_mode == self.MODE_URBAIN:
                events.append({"name": "trafic_dense", "duration": 50, "description": "Trafic dense"})
                events.append({"name": "feu_rouge", "duration": 15, "description": "Feu rouge"})
            
            # En mode autoroute, plus de chances d'avoir des variations de vitesse
            elif self.current_mode == self.MODE_AUTOROUTE:
                events.append({"name": "peage", "duration": 10, "description": "Passage de péage"})
                events.append({"name": "route_degagee", "duration": 70, "description": "Route dégagée"})
            
            # Sélectionner un événement aléatoire
            self.current_event = np.random.choice(events)
            self.event_duration = self.current_event["duration"]
            logger.info(f"Nouvel événement: {self.current_event['description']}")
    
    def _apply_event_effects(self):
        """Applique les effets de l'événement en cours sur la simulation"""
        event = self.current_event["name"]
        
        if event == "trafic_dense":
            # Réduire la vitesse moyenne
            self.vehicle_data['speed'] = max(0, self.vehicle_data['speed'] * 0.95)
            
        elif event == "route_degagee":
            # Légère augmentation de la vitesse
            mode_params = self.MODE_PARAMS[self.current_mode]
            max_speed = mode_params["vitesse_max"]
            self.vehicle_data['speed'] = min(max_speed, self.vehicle_data['speed'] * 1.05)
            
        elif event == "pluie":
            # Route mouillée et résistance accrue
            self.vehicle_data['road_condition'] = 1.0
            self.vehicle_data['energy_consumption'] *= 1.1
            
        elif event == "vent_lateral":
            # Vent fort impactant la consommation
            self.vehicle_data['wind_speed'] = np.random.uniform(8, 15)
            
        elif event == "montee":
            # Pente positive
            self.vehicle_data['road_grade'] = np.random.uniform(3, 8)
            
        elif event == "feu_rouge":
            # Arrêt complet
            self.vehicle_data['speed'] = max(0, self.vehicle_data['speed'] - 5)
            
        elif event == "peage":
            # Ralentissement pour le péage
            self.vehicle_data['speed'] = max(0, self.vehicle_data['speed'] - 10)
        
        # Décrémenter la durée de l'événement
        self.event_duration -= 1
        
        # Si l'événement est terminé, le réinitialiser
        if self.event_duration <= 0:
            logger.info(f"Fin de l'événement: {self.current_event['description']}")
            
            # Réinitialiser les variables modifiées par l'événement
            if event == "pluie":
                self.vehicle_data['road_condition'] = 0
            elif event == "vent_lateral":
                self.vehicle_data['wind_speed'] = np.random.uniform(-2, 2)
            elif event == "montee":
                self.vehicle_data['road_grade'] = np.random.uniform(-2, 2)
            
            self.current_event = None
    
    def _calculate_energy_consumption(self):
        """Calcule la consommation d'énergie instantanée"""
        # Facteurs qui influencent la consommation
        mode_params = self.MODE_PARAMS[self.current_mode]
        base_consumption = mode_params["conso_base"]
        
        speed_factor = 0.01 * self.vehicle_data['speed']**2
        accel_factor = 2 * abs(self.vehicle_data['acceleration'])
        temp_factor = 0.1 * abs(self.vehicle_data['temperature'] - 20)
        battery_factor = 0.05 * (100 - self.vehicle_data['battery_level'])
        motor_factor = 0.02 * self.vehicle_data['motor_load']
        grade_factor = 0.5 * abs(self.vehicle_data['road_grade'])
        wind_factor = 0.2 * abs(self.vehicle_data['wind_speed'])
        road_factor = 1 * self.vehicle_data['road_condition']
        
        # Facteurs spécifiques au mode
        mode_factor = {
            self.MODE_URBAIN: 1.0,
            self.MODE_SPORT: 1.5,
            self.MODE_AUTOROUTE: 1.1,
            self.MODE_ECO: 0.8
        }
        
        # Consommation totale
        self.vehicle_data['energy_consumption'] = (
            base_consumption * mode_factor[self.current_mode] +
            speed_factor +
            accel_factor +
            temp_factor +
            battery_factor +
            motor_factor +
            grade_factor +
            wind_factor +
            road_factor
        )
    
    def on_data_update(self, callback):
        """Enregistre un callback pour les mises à jour de données"""
        if callback not in self.data_update_callbacks:
            self.data_update_callbacks.append(callback)
    
    def _notify_callbacks(self):
        """Notifie tous les callbacks enregistrés"""
        data = self.get_current_data()
        for callback in self.data_update_callbacks:
            try:
                callback(data)
            except Exception as e:
                logger.error(f"Error in callback: {e}")
    
    def get_current_data(self):
        """Renvoie les données actuelles"""
        data = self.vehicle_data.copy()
        data['timestamp'] = datetime.now().isoformat()
        return data 