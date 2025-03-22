"""
Module d'assistant pour l'interaction conversationnelle.
"""

import logging
import numpy as np
from datetime import datetime

logger = logging.getLogger(__name__)

class Assistant:
    """
    Assistant IA pour analyser les données du véhicule et fournir des recommandations
    """
    
    def __init__(self):
        # Paramètres optimaux par mode de conduite
        self.optimal_params = {
            "urbain": {
                "speed_range": (20, 40),          # Vitesse optimale en ville (km/h)
                "acceleration_max": 1.5,          # Accélération max recommandée (m/s²)
                "deceleration_ideal": -0.8,       # Décélération idéale pour la récupération (-m/s²)
                "temperature_range": (20, 40),    # Plage de température optimale (°C)
                "tire_pressure_range": (2.2, 2.6) # Pression des pneus optimale (bar)
            },
            "sport": {
                "speed_range": (50, 120),         # Vitesse optimale sport (km/h)
                "acceleration_max": 3.0,          # Accélération max recommandée (m/s²)
                "deceleration_ideal": -2.0,       # Décélération idéale pour la récupération (-m/s²)
                "temperature_range": (30, 70),    # Plage de température optimale (°C)
                "tire_pressure_range": (2.4, 2.8) # Pression des pneus optimale (bar)
            },
            "autoroute": {
                "speed_range": (90, 120),         # Vitesse optimale autoroute (km/h)
                "acceleration_max": 1.2,          # Accélération max recommandée (m/s²)
                "deceleration_ideal": -1.0,       # Décélération idéale pour la récupération (-m/s²)
                "temperature_range": (25, 55),    # Plage de température optimale (°C)
                "tire_pressure_range": (2.3, 2.7) # Pression des pneus optimale (bar)
            },
            "eco": {
                "speed_range": (40, 70),          # Vitesse optimale éco (km/h)
                "acceleration_max": 0.8,          # Accélération max recommandée (m/s²)
                "deceleration_ideal": -0.6,       # Décélération idéale pour la récupération (-m/s²)
                "temperature_range": (20, 35),    # Plage de température optimale (°C)
                "tire_pressure_range": (2.1, 2.5) # Pression des pneus optimale (bar)
            }
        }
        
        # Historique des données pour analyse de tendances
        self.data_history = []
        self.max_history_size = 100
        
        # Tendances détectées
        self.trends = {
            "energy_consumption": 0,  # Tendance de consommation (-1: diminue, 0: stable, 1: augmente)
            "temperature": 0,         # Tendance de température
            "battery_drain": 0        # Tendance de décharge de la batterie
        }
        
        logger.info("Assistant IA initialisé")
    
    def analyze_data(self, data):
        """
        Analyse les données du véhicule et fournit des recommandations
        
        Args:
            data: dictionnaire contenant les données du véhicule
            
        Returns:
            dictionary: résultats de l'analyse avec recommandations
        """
        try:
            # Ajouter les données à l'historique
            self.data_history.append({
                "timestamp": datetime.now().isoformat(),
                "data": data.copy()
            })
            
            # Limiter la taille de l'historique
            if len(self.data_history) > self.max_history_size:
                self.data_history.pop(0)
            
            # Calculer les tendances si suffisamment de données
            if len(self.data_history) > 5:
                self._calculate_trends()
            
            # Calculer le score d'efficacité
            efficiency_score = self._calculate_efficiency_score(data)
            
            # Détecter les anomalies
            anomalies = self._detect_anomalies(data)
            
            # Générer des recommandations
            recommendations = self._generate_recommendations(data, efficiency_score, anomalies)
            
            # Résultat de l'analyse
            result = {
                "efficiency_score": efficiency_score,
                "anomalies": anomalies,
                "recommendations": recommendations
            }
            
            return result
        
        except Exception as e:
            logger.error(f"Erreur lors de l'analyse des données: {e}")
            
            # Fournir un résultat par défaut en cas d'erreur
            return {
                "efficiency_score": 50,
                "anomalies": [{"type": "system", "severity": "warning", "message": "Erreur d'analyse des données"}],
                "recommendations": ["Vérifiez les systèmes du véhicule"]
            }
    
    def _calculate_efficiency_score(self, data):
        """
        Calcule un score d'efficacité énergétique (0-100) basé sur les données actuelles
        """
        # Récupérer le mode de simulation
        mode = data.get('simulation_mode', 'urbain')
        
        # Récupérer les paramètres optimaux pour ce mode
        optimal = self.optimal_params.get(mode, self.optimal_params['urbain'])
        
        # Initialiser les composantes du score
        score_components = []
        
        # Score pour la vitesse
        speed = data.get('speed', 0)
        min_speed, max_speed = optimal['speed_range']
        
        if speed < min_speed:
            # Vitesse trop basse (moins efficace)
            speed_score = 70 + 30 * (speed / min_speed)
        elif speed > max_speed:
            # Vitesse trop élevée (consommation excessive)
            speed_score = 70 * max(0, 1 - (speed - max_speed) / max_speed)
        else:
            # Vitesse dans la plage optimale
            speed_relative = (speed - min_speed) / (max_speed - min_speed)
            # Forme de cloche avec maximum à ~60% de la plage
            speed_score = 90 + 10 * (1 - abs(speed_relative - 0.6) / 0.6)
        
        score_components.append(speed_score)
        
        # Score pour l'accélération
        acceleration = abs(data.get('acceleration', 0))
        max_accel = optimal['acceleration_max']
        
        if acceleration <= max_accel:
            accel_score = 100 * (1 - acceleration / max_accel / 2)  # Perte modérée pour accélération
        else:
            # Pénalité pour accélération excessive
            accel_score = max(0, 50 * (2 - acceleration / max_accel))
        
        score_components.append(accel_score)
        
        # Score pour la température
        temp = data.get('temperature', 25)
        min_temp, max_temp = optimal['temperature_range']
        
        if temp < min_temp:
            temp_score = 70 + 30 * (temp / min_temp)
        elif temp > max_temp:
            temp_score = 70 * max(0, 1 - (temp - max_temp) / max_temp)
        else:
            temp_score = 100
        
        score_components.append(temp_score)
        
        # Score pour la pression des pneus
        pressure = data.get('tire_pressure', 2.4)
        min_pressure, max_pressure = optimal['tire_pressure_range']
        
        if pressure < min_pressure:
            pressure_score = 60 + 40 * (pressure / min_pressure)
        elif pressure > max_pressure:
            pressure_score = 60 + 40 * (1 - (pressure - max_pressure) / (max_pressure - min_pressure))
        else:
            pressure_score = 100
        
        score_components.append(pressure_score)
        
        # Score pour la consommation d'énergie
        consumption = data.get('energy_consumption', 0)
        base_consumption = 16  # Base de référence (kWh/100km)
        
        if mode == 'urbain':
            reference_consumption = 16
        elif mode == 'autoroute':
            reference_consumption = 21
        elif mode == 'sport':
            reference_consumption = 25
        else:  # eco
            reference_consumption = 13
        
        # Score inversement proportionnel à la consommation par rapport à la référence
        consumption_ratio = consumption / reference_consumption
        
        if consumption_ratio <= 1:
            consumption_score = 100 * (1 - consumption_ratio / 4)
        else:
            consumption_score = max(0, 75 * (2 - consumption_ratio))
        
        score_components.append(consumption_score)
        
        # Facteurs de pondération des composantes
        weights = [0.25, 0.20, 0.15, 0.15, 0.25]
        
        # Score final
        efficiency_score = sum(s * w for s, w in zip(score_components, weights))
        
        # Ajustement selon le mode
        if mode == 'eco':
            # Bonus pour le mode éco
            efficiency_score = min(100, efficiency_score * 1.1)
        elif mode == 'sport':
            # Pénalité pour le mode sport (consommation plus élevée par nature)
            efficiency_score = efficiency_score * 0.85
        
        # Limiter entre 0 et 100
        return round(max(0, min(100, efficiency_score)))
    
    def _detect_anomalies(self, data):
        """
        Détecte les anomalies dans les données du véhicule
        """
        mode = data.get('simulation_mode', 'urbain')
        optimal = self.optimal_params.get(mode, self.optimal_params['urbain'])
        anomalies = []
        
        # Vérifier la température
        temperature = data.get('temperature', 25)
        if temperature > optimal['temperature_range'][1] + 10:
            anomalies.append({
                'type': 'temperature',
                'severity': 'critical',
                'message': 'Température du moteur critique'
            })
        elif temperature > optimal['temperature_range'][1]:
            anomalies.append({
                'type': 'temperature',
                'severity': 'warning',
                'message': 'Température du moteur élevée'
            })
        
        # Vérifier le niveau de batterie
        battery_level = data.get('battery_level', 100)
        if battery_level < 10:
            anomalies.append({
                'type': 'battery',
                'severity': 'critical',
                'message': 'Niveau de batterie critique (<10%)'
            })
        elif battery_level < 20:
            anomalies.append({
                'type': 'battery',
                'severity': 'warning',
                'message': 'Niveau de batterie faible (<20%)'
            })
        
        # Vérifier l'autonomie restante
        autonomy = data.get('autonomy_remaining', 0)
        if autonomy < 30:
            anomalies.append({
                'type': 'autonomy',
                'severity': 'critical',
                'message': 'Autonomie restante critique (<30 km)'
            })
        elif autonomy < 50:
            anomalies.append({
                'type': 'autonomy',
                'severity': 'warning',
                'message': 'Autonomie restante faible (<50 km)'
            })
        
        # Vérifier la pression des pneus
        tire_pressure = data.get('tire_pressure', 2.4)
        min_pressure, max_pressure = optimal['tire_pressure_range']
        
        if tire_pressure < min_pressure - 0.3:
            anomalies.append({
                'type': 'tire_pressure',
                'severity': 'critical',
                'message': 'Pression des pneus dangereusement basse'
            })
        elif tire_pressure < min_pressure:
            anomalies.append({
                'type': 'tire_pressure',
                'severity': 'warning',
                'message': 'Pression des pneus insuffisante'
            })
        elif tire_pressure > max_pressure + 0.3:
            anomalies.append({
                'type': 'tire_pressure',
                'severity': 'warning',
                'message': 'Pression des pneus excessive'
            })
        
        # Vérifier les tendances préoccupantes
        if self.trends['energy_consumption'] > 0.5 and len(self.data_history) > 10:
            # Tendance à l'augmentation de la consommation
            anomalies.append({
                'type': 'trend',
                'severity': 'info',
                'message': 'Tendance à la hausse de la consommation détectée'
            })
        
        if self.trends['temperature'] > 0.7 and temperature > optimal['temperature_range'][0] + 10:
            # Tendance à l'augmentation de la température
            anomalies.append({
                'type': 'trend',
                'severity': 'warning',
                'message': 'Augmentation progressive de la température détectée'
            })
        
        return anomalies
    
    def _generate_recommendations(self, data, efficiency_score, anomalies):
        """
        Génère des recommandations personnalisées en fonction des données
        """
        mode = data.get('simulation_mode', 'urbain')
        optimal = self.optimal_params.get(mode, self.optimal_params['urbain'])
        recommendations = []
        
        # Recommandations de base selon le mode
        if mode == 'urbain':
            recommendations.append("Anticipez les arrêts aux feux pour maximiser la récupération d'énergie")
        elif mode == 'sport':
            recommendations.append("Les accélérations rapides et vitesses élevées réduisent significativement l'autonomie")
        elif mode == 'autoroute':
            recommendations.append("Maintenir une vitesse constante optimise l'autonomie sur longue distance")
        elif mode == 'eco':
            recommendations.append("Les accélérations douces maximisent l'efficacité énergétique")
        
        # Recommandations basées sur les paramètres actuels
        speed = data.get('speed', 0)
        min_speed, max_speed = optimal['speed_range']
        
        if speed > max_speed + 10:
            recommendations.append(f"Réduisez votre vitesse pour optimiser l'autonomie (vitesse optimale: {min_speed}-{max_speed} km/h)")
        
        # Recommandations sur l'accélération
        acceleration = data.get('acceleration', 0)
        if acceleration > optimal['acceleration_max'] * 1.2:
            recommendations.append(f"Accélérations trop brusques: privilégiez les accélérations progressives")
        
        # Recommandations sur la pression des pneus
        tire_pressure = data.get('tire_pressure', 2.4)
        min_pressure, max_pressure = optimal['tire_pressure_range']
        
        if tire_pressure < min_pressure:
            recommendations.append(f"Ajustez la pression des pneus à {min_pressure}-{max_pressure} bar pour une meilleure efficacité")
        
        # Recommandations liées à la température
        temperature = data.get('temperature', 25)
        if temperature > optimal['temperature_range'][1]:
            recommendations.append("Réduisez les phases d'accélération intense pour limiter l'échauffement du moteur")
        
        # Recommandations sur la consommation d'énergie
        consumption = data.get('energy_consumption', 0)
        battery_level = data.get('battery_level', 100)
        
        if battery_level < 30 and consumption > 20:
            recommendations.append("Réduisez votre consommation énergétique pour préserver l'autonomie restante")
        
        # Recommandations basées sur le score d'efficacité
        if efficiency_score < 40:
            recommendations.append("Votre style de conduite est très énergivore, adoptez une conduite plus souple")
        elif efficiency_score < 60:
            recommendations.append("Adoptez une vitesse plus constante pour améliorer l'efficacité énergétique")
        elif efficiency_score > 85:
            recommendations.append("Excellent style de conduite, continuez à optimiser votre autonomie")
        
        # Limiter à 3 recommandations maximum pour ne pas surcharger
        return recommendations[:3]
    
    def _calculate_trends(self):
        """
        Analyse les tendances dans l'historique des données
        """
        if len(self.data_history) < 5:
            return
        
        # Récupérer les 10 dernières entrées ou moins
        recent_entries = self.data_history[-10:]
        
        # Calculer les tendances pour différentes métriques
        
        # Tendance consommation d'énergie
        consumptions = [entry['data'].get('energy_consumption', 0) for entry in recent_entries]
        if all(c > 0 for c in consumptions):
            consumption_trend = np.polyfit(range(len(consumptions)), consumptions, 1)[0]
            # Normaliser la tendance
            self.trends['energy_consumption'] = max(-1, min(1, consumption_trend / 2))
        
        # Tendance température
        temperatures = [entry['data'].get('temperature', 0) for entry in recent_entries]
        if all(t > 0 for t in temperatures):
            temp_trend = np.polyfit(range(len(temperatures)), temperatures, 1)[0]
            # Normaliser la tendance
            self.trends['temperature'] = max(-1, min(1, temp_trend / 5))
        
        # Tendance décharge batterie
        battery_levels = [entry['data'].get('battery_level', 0) for entry in recent_entries]
        if all(b >= 0 for b in battery_levels):
            battery_trend = np.polyfit(range(len(battery_levels)), battery_levels, 1)[0]
            # Normaliser la tendance (négatif = décharge)
            self.trends['battery_drain'] = max(-1, min(1, battery_trend / 5)) 