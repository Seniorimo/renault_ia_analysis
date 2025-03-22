"""
Module de prédiction pour l'analyse des véhicules Renault ZOE.
"""

import logging
import numpy as np
import time
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)

class VehiclePredictor:
    """
    Classe pour analyser et prédire les performances des véhicules Renault ZOE.
    Utilise des modèles simples et des heuristiques pour l'analyse en temps réel.
    """
    
    def __init__(self):
        """Initialise le prédicteur de véhicule."""
        # Modèle de ML pour la prédiction de consommation
        self.model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.scaler = StandardScaler()
        self.is_trained = False
        
        # Paramètres du modèle de consommation d'énergie
        self.consumption_model_params = {
            'base_consumption': 15.0,  # kWh/100km
            'speed_factor': 0.05,      # Augmentation par km/h au-dessus de 50 km/h
            'accel_factor': 2.5,       # Augmentation par m/s²
            'temp_factor': 0.2,        # Augmentation par degré d'écart de 20°C
            'brake_factor': 1.5,       # Augmentation par unité de freinage
        }
        
        # Paramètres du modèle de risque
        self.risk_model_params = {
            'speed_threshold': 90.0,   # km/h
            'accel_threshold': 3.0,    # m/s²
            'brake_threshold': 0.7,    # 0-1
            'battery_threshold': 20.0, # %
            'speed_weight': 0.4,
            'accel_weight': 0.3,
            'brake_weight': 0.2,
            'battery_weight': 0.1,
        }
        
        # Historique des prédictions
        self.prediction_history = []
        
        logger.info("VehiclePredictor initialisé")
    
    def train(self, X, y):
        """
        Entraîne le modèle de prédiction avec les données fournies.
        
        Args:
            X (numpy.ndarray): Features d'entraînement
            y (numpy.ndarray): Cibles d'entraînement (consommation d'énergie)
        """
        try:
            if len(X) == 0 or len(y) == 0:
                logger.warning("Données d'entraînement vides")
                return
            
            logger.info("Début de l'entraînement du modèle...")
            
            # Normalisation des features
            X_scaled = self.scaler.fit_transform(X)
            
            # Entraînement du modèle
            self.model.fit(X_scaled, y)
            
            self.is_trained = True
            logger.info("Modèle entraîné avec succès")
            
        except Exception as e:
            logger.error(f"Erreur lors de l'entraînement du modèle: {e}")
            raise
    
    def predict(self, X):
        """
        Prédit la consommation d'énergie.
        
        Args:
            X (numpy.ndarray): Features du véhicule
            
        Returns:
            numpy.ndarray: Prédiction de consommation d'énergie
        """
        try:
            X_scaled = self.scaler.transform(X)
            return self.model.predict(X_scaled)
        
        except Exception as e:
            logger.error(f"Erreur lors de la prédiction: {e}")
            return np.array([15.0])  # Valeur par défaut
    
    def analyze(self, data):
        """
        Analyse les données du véhicule pour déterminer les risques et performances.
        
        Args:
            data (dict): Données du véhicule
            
        Returns:
            dict: Analyse incluant score d'efficacité, risques, et recommandations
        """
        try:
            # Extraction des features (avec valeurs par défaut si manquantes)
            speed = data.get('speed', 0) * 3.6  # Conversion en km/h
            acceleration = data.get('acceleration', [0])[0] if isinstance(data.get('acceleration'), list) else data.get('acceleration', 0)
            temperature = data.get('temperature', data.get('motor_temperature', 25))
            battery_level = data.get('battery_level', 100)
            braking = data.get('brake', 0)
            
            # Calcul du score d'efficacité (0-100)
            efficiency_score = self._calculate_efficiency_score(speed, acceleration, temperature, braking)
            
            # Analyse des risques
            risk_analysis = self._analyze_risks(speed, acceleration, battery_level, braking)
            
            # Détection d'anomalies
            anomalies = self._detect_anomalies(data)
            
            # Génération de recommandations
            recommendations = self._generate_recommendations(efficiency_score, risk_analysis, anomalies)
            
            # Prédiction de la maintenance
            maintenance_prediction = self._predict_maintenance_needs(data)
            
            analysis = {
                'timestamp': datetime.now().isoformat(),
                'efficiency_score': float(efficiency_score),
                'risk_analysis': risk_analysis,
                'anomalies': anomalies,
                'recommendations': recommendations,
                'maintenance_prediction': maintenance_prediction
            }
            
            return analysis
        
        except Exception as e:
            logger.error(f"Erreur lors de l'analyse: {e}")
            return {
                'timestamp': datetime.now().isoformat(),
                'error': str(e),
                'efficiency_score': 50.0,  # Valeur par défaut
                'risk_analysis': {'overall_risk': 'unknown'},
                'anomalies': [],
                'recommendations': ["Impossible de générer des recommandations en raison d'une erreur."],
                'maintenance_prediction': {'next_maintenance': 'unknown'}
            }
    
    def _calculate_efficiency_score(self, speed, acceleration, temperature, braking):
        """
        Calcule un score d'efficacité basé sur les paramètres du véhicule.
        
        Args:
            speed (float): Vitesse en km/h
            acceleration (float): Accélération en m/s²
            temperature (float): Température en °C
            braking (float): Intensité de freinage (0-1)
            
        Returns:
            float: Score d'efficacité (0-100)
        """
        # Pénalités pour chaque facteur
        speed_penalty = max(0, (speed - 70) * 0.5) if speed > 70 else 0
        accel_penalty = abs(acceleration) * 10
        temp_penalty = abs(temperature - 20) * 0.5
        brake_penalty = braking * 20
        
        # Score de base
        base_score = 100
        
        # Calcul du score final
        score = base_score - speed_penalty - accel_penalty - temp_penalty - brake_penalty
        
        # Limites
        return max(0, min(100, score))
    
    def _analyze_risks(self, speed, acceleration, battery_level, braking):
        """
        Analyse les risques liés à la conduite actuelle.
        
        Args:
            speed (float): Vitesse en km/h
            acceleration (float): Accélération en m/s²
            battery_level (float): Niveau de batterie en pourcentage
            braking (float): Intensité de freinage (0-1)
            
        Returns:
            dict: Analyse des risques
        """
        # Calcul des facteurs de risque individuels (0-1)
        speed_risk = min(1.0, max(0, (speed - self.risk_model_params['speed_threshold']) / 50))
        accel_risk = min(1.0, max(0, abs(acceleration) / self.risk_model_params['accel_threshold']))
        battery_risk = min(1.0, max(0, (self.risk_model_params['battery_threshold'] - battery_level) / 20))
        brake_risk = min(1.0, max(0, braking / self.risk_model_params['brake_threshold']))
        
        # Calcul du risque global (somme pondérée)
        overall_risk = (
            speed_risk * self.risk_model_params['speed_weight'] +
            accel_risk * self.risk_model_params['accel_weight'] +
            battery_risk * self.risk_model_params['battery_weight'] +
            brake_risk * self.risk_model_params['brake_weight']
        )
        
        # Interprétation du risque
        risk_level = "faible"
        if overall_risk > 0.7:
            risk_level = "élevé"
        elif overall_risk > 0.4:
            risk_level = "modéré"
        
        return {
            'overall_risk': risk_level,
            'overall_risk_score': float(overall_risk),
            'speed_risk': float(speed_risk),
            'acceleration_risk': float(accel_risk),
            'battery_risk': float(battery_risk),
            'braking_risk': float(brake_risk),
            'factors': {
                'speed': speed_risk > 0.5,
                'acceleration': accel_risk > 0.5,
                'battery': battery_risk > 0.5,
                'braking': brake_risk > 0.5
            }
        }
    
    def _detect_anomalies(self, data):
        """
        Détecte les anomalies potentielles dans les données du véhicule.
        
        Args:
            data (dict): Données du véhicule
            
        Returns:
            list: Anomalies détectées
        """
        anomalies = []
        
        # Vérification de la température du moteur
        motor_temp = data.get('motor_temperature', 25)
        if motor_temp > 80:
            anomalies.append({
                'type': 'temperature_moteur',
                'severity': 'critique',
                'message': 'Température du moteur anormalement élevée',
                'value': float(motor_temp)
            })
        elif motor_temp > 60:
            anomalies.append({
                'type': 'temperature_moteur',
                'severity': 'avertissement',
                'message': 'Température du moteur élevée',
                'value': float(motor_temp)
            })
        
        # Vérification de la température des freins
        brake_temp = data.get('brake_temperature', 20)
        if brake_temp > 300:
            anomalies.append({
                'type': 'temperature_freins',
                'severity': 'critique',
                'message': 'Température des freins anormalement élevée',
                'value': float(brake_temp)
            })
        elif brake_temp > 200:
            anomalies.append({
                'type': 'temperature_freins',
                'severity': 'avertissement',
                'message': 'Température des freins élevée',
                'value': float(brake_temp)
            })
        
        # Vérification du niveau de batterie
        battery_level = data.get('battery_level', 100)
        if battery_level < 10:
            anomalies.append({
                'type': 'niveau_batterie',
                'severity': 'avertissement',
                'message': 'Niveau de batterie critique',
                'value': float(battery_level)
            })
        
        return anomalies
    
    def _generate_recommendations(self, efficiency_score, risk_analysis, anomalies):
        """
        Génère des recommandations basées sur l'analyse des données.
        
        Args:
            efficiency_score (float): Score d'efficacité
            risk_analysis (dict): Analyse des risques
            anomalies (list): Anomalies détectées
            
        Returns:
            list: Recommandations
        """
        recommendations = []
        
        # Recommandations basées sur le score d'efficacité
        if efficiency_score < 40:
            recommendations.append("Adoptez une conduite plus douce pour améliorer l'efficacité énergétique.")
        elif efficiency_score < 70:
            recommendations.append("Votre style de conduite peut être optimisé pour une meilleure autonomie.")
        
        # Recommandations basées sur les risques
        risk_factors = risk_analysis.get('factors', {})
        if risk_factors.get('speed', False):
            recommendations.append("Réduisez votre vitesse pour une conduite plus sûre et économique.")
        if risk_factors.get('acceleration', False):
            recommendations.append("Évitez les accélérations brusques pour économiser l'énergie.")
        if risk_factors.get('battery', False):
            recommendations.append("Prévoyez une recharge prochainement pour éviter une panne de batterie.")
        if risk_factors.get('braking', False):
            recommendations.append("Anticipez les freinages pour optimiser la récupération d'énergie.")
        
        # Recommandations basées sur les anomalies
        for anomaly in anomalies:
            if anomaly['type'] == 'temperature_moteur' and anomaly['severity'] == 'critique':
                recommendations.append("URGENT: Arrêtez le véhicule dès que possible, la température du moteur est critique.")
            elif anomaly['type'] == 'temperature_freins' and anomaly['severity'] == 'critique':
                recommendations.append("URGENT: Limitez l'utilisation des freins, leur température est critique.")
            elif anomaly['type'] == 'niveau_batterie' and anomaly['severity'] == 'avertissement':
                recommendations.append("Rechargez votre batterie dès que possible.")
        
        return recommendations
    
    def _predict_maintenance_needs(self, data):
        """
        Prédit les besoins en maintenance du véhicule.
        
        Args:
            data (dict): Données du véhicule
            
        Returns:
            dict: Prédiction de maintenance
        """
        # Simulation d'un score de maintenance (0-100)
        maintenance_score = 100
        
        # Facteurs d'usure
        battery_level = data.get('battery_level', 100)
        total_distance = data.get('total_distance', 0)
        motor_temp = data.get('motor_temperature', 25)
        
        # Réduction du score en fonction des facteurs d'usure
        maintenance_score -= max(0, (100 - battery_level) * 0.2)  # Usure de la batterie
        maintenance_score -= min(50, total_distance / 1000)  # Usure liée à la distance
        maintenance_score -= max(0, (motor_temp - 40) * 0.5)  # Usure liée à la température
        
        # Limites
        maintenance_score = max(0, min(100, maintenance_score))
        
        # Détermination de la prochaine date de maintenance
        days_until_maintenance = int((maintenance_score / 100) * 365)  # Max 1 an
        next_maintenance_date = (datetime.now() + timedelta(days=days_until_maintenance)).strftime("%d/%m/%Y")
        
        return {
            'score': float(maintenance_score),
            'next_maintenance': f"Prochaine maintenance recommandée: {next_maintenance_date}",
            'days_until_maintenance': days_until_maintenance,
            'maintenance_items': [
                "Vérification de la batterie",
                "Contrôle des freins",
                "Inspection du système de refroidissement",
                "Mise à jour du logiciel"
            ]
        }
    
    def get_prediction_history(self):
        """
        Récupère l'historique des prédictions.
        
        Returns:
            list: Historique des prédictions
        """
        return self.prediction_history
    
    def clear_history(self):
        """Efface l'historique des prédictions."""
        self.prediction_history = []
        logger.info("Historique des prédictions effacé")

    def analyze_performance(self, X, threshold=0.8):
        """Analyse les performances et détecte les anomalies"""
        predictions = self.predict(X)
        anomalies = predictions > threshold * 20  # 20 kWh/100km comme référence haute
        return {
            'predictions': predictions,
            'anomalies': anomalies,
            'confidence_scores': self.model.feature_importances_ if self.is_trained else None
        } 