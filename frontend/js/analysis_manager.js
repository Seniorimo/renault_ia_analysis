/**
 * Gestionnaire d'analyse en temps réel pour Renault Diagnostic System
 * Traite et analyse les données des composants du véhicule
 */
class AnalysisManager {
    constructor() {
        this.dataBuffer = {
            battery: [],
            motor: [],
            inverter: [],
            cooling: []
        };

        this.analysisConfig = {
            bufferSize: 100,
            updateInterval: 1000, // ms
            anomalyThreshold: 2.5 // écarts-types
        };

        this.charts = {};
        this.initializeCharts();
    }

    /**
     * Initialise les graphiques Highcharts
     */
    initializeCharts() {
        // Graphique des températures
        this.charts.temperatures = Highcharts.chart('temperature-chart', {
            chart: { type: 'spline', animation: false },
            title: { text: 'Températures des Composants' },
            xAxis: { type: 'datetime' },
            yAxis: { title: { text: 'Température (°C)' } },
            series: [
                { name: 'Batterie', data: [] },
                { name: 'Moteur', data: [] },
                { name: 'Onduleur', data: [] }
            ]
        });

        // Graphique des performances
        this.charts.performance = Highcharts.chart('performance-chart', {
            chart: { type: 'line', animation: false },
            title: { text: 'Performances du Système' },
            xAxis: { type: 'datetime' },
            yAxis: [
                { title: { text: 'Efficacité (%)' } },
                { title: { text: 'Puissance (kW)' }, opposite: true }
            ],
            series: [
                { name: 'Efficacité Onduleur', data: [] },
                { name: 'Puissance Moteur', data: [], yAxis: 1 }
            ]
        });
    }

    /**
     * Traite les nouvelles données reçues
     * @param {Object} data - Données des composants
     */
    processNewData(data) {
        // Ajouter les données aux buffers
        this.updateDataBuffers(data);

        // Analyser les tendances
        const trends = this.analyzeTrends();

        // Détecter les anomalies
        const anomalies = this.detectAnomalies();

        // Mettre à jour les graphiques
        this.updateCharts(data);

        // Générer des recommandations
        const recommendations = this.generateRecommendations(trends, anomalies);

        return {
            trends,
            anomalies,
            recommendations
        };
    }

    /**
     * Met à jour les buffers de données
     * @param {Object} data - Nouvelles données
     */
    updateDataBuffers(data) {
        const timestamp = Date.now();

        // Batterie
        if (data.battery) {
            this.dataBuffer.battery.push({
                timestamp,
                voltage: data.battery.voltage,
                temperature: data.battery.temperature,
                current: data.battery.current
            });
        }

        // Moteur
        if (data.motor) {
            this.dataBuffer.motor.push({
                timestamp,
                temperature: data.motor.temperature,
                speed: data.motor.speed,
                torque: data.motor.torque
            });
        }

        // Onduleur
        if (data.inverter) {
            this.dataBuffer.inverter.push({
                timestamp,
                efficiency: data.inverter.efficiency,
                temperature: data.inverter.temperature,
                power: data.inverter.power
            });
        }

        // Limiter la taille des buffers
        Object.keys(this.dataBuffer).forEach(key => {
            if (this.dataBuffer[key].length > this.analysisConfig.bufferSize) {
                this.dataBuffer[key].shift();
            }
        });
    }

    /**
     * Analyse les tendances dans les données
     * @returns {Object} Tendances détectées
     */
    analyzeTrends() {
        const trends = {};

        // Analyse des tendances de température
        trends.temperatures = {
            battery: this.calculateTrend(this.dataBuffer.battery.map(d => d.temperature)),
            motor: this.calculateTrend(this.dataBuffer.motor.map(d => d.temperature)),
            inverter: this.calculateTrend(this.dataBuffer.inverter.map(d => d.temperature))
        };

        // Analyse des tendances de performance
        trends.performance = {
            motorEfficiency: this.calculateTrend(this.dataBuffer.motor.map(d => d.efficiency)),
            inverterEfficiency: this.calculateTrend(this.dataBuffer.inverter.map(d => d.efficiency))
        };

        return trends;
    }

    /**
     * Calcule la tendance d'une série de données
     * @param {Array} data - Série de données
     * @returns {Object} Informations sur la tendance
     */
    calculateTrend(data) {
        if (data.length < 2) return { direction: 'stable', rate: 0 };

        const recentData = data.slice(-10);
        const differences = [];
        
        for (let i = 1; i < recentData.length; i++) {
            differences.push(recentData[i] - recentData[i-1]);
        }

        const avgChange = differences.reduce((a, b) => a + b, 0) / differences.length;
        
        return {
            direction: avgChange > 0.1 ? 'increasing' :
                      avgChange < -0.1 ? 'decreasing' : 'stable',
            rate: avgChange
        };
    }

    /**
     * Détecte les anomalies dans les données
     * @returns {Array} Anomalies détectées
     */
    detectAnomalies() {
        const anomalies = [];

        // Vérification des températures
        this.checkTemperatureAnomalies(anomalies);

        // Vérification des performances
        this.checkPerformanceAnomalies(anomalies);

        // Vérification des interactions
        this.checkSystemInteractions(anomalies);

        return anomalies;
    }

    /**
     * Vérifie les anomalies de température
     * @param {Array} anomalies - Liste des anomalies
     */
    checkTemperatureAnomalies(anomalies) {
        const components = ['battery', 'motor', 'inverter'];
        
        components.forEach(component => {
            const temperatures = this.dataBuffer[component].map(d => d.temperature);
            const stats = this.calculateStats(temperatures);

            const latestTemp = temperatures[temperatures.length - 1];
            if (Math.abs(latestTemp - stats.mean) > this.analysisConfig.anomalyThreshold * stats.stdDev) {
                anomalies.push({
                    component,
                    type: 'temperature',
                    value: latestTemp,
                    threshold: stats.mean,
                    severity: this.calculateSeverity(latestTemp, stats)
                });
            }
        });
    }

    /**
     * Vérifie les anomalies de performance
     * @param {Array} anomalies - Liste des anomalies
     */
    checkPerformanceAnomalies(anomalies) {
        // Vérification de l'efficacité de l'onduleur
        const inverterEfficiency = this.dataBuffer.inverter.map(d => d.efficiency);
        const efficiencyStats = this.calculateStats(inverterEfficiency);

        const latestEfficiency = inverterEfficiency[inverterEfficiency.length - 1];
        if (latestEfficiency < 0.95) {
            anomalies.push({
                component: 'inverter',
                type: 'efficiency',
                value: latestEfficiency,
                threshold: 0.95,
                severity: 'warning'
            });
        }

        // Vérification de la puissance moteur
        const motorPower = this.dataBuffer.motor.map(d => d.power);
        const powerStats = this.calculateStats(motorPower);

        const latestPower = motorPower[motorPower.length - 1];
        if (Math.abs(latestPower - powerStats.mean) > this.analysisConfig.anomalyThreshold * powerStats.stdDev) {
            anomalies.push({
                component: 'motor',
                type: 'power',
                value: latestPower,
                threshold: powerStats.mean,
                severity: this.calculateSeverity(latestPower, powerStats)
            });
        }
    }

    /**
     * Calcule les statistiques d'une série de données
     * @param {Array} data - Série de données
     * @returns {Object} Statistiques calculées
     */
    calculateStats(data) {
        const mean = data.reduce((a, b) => a + b, 0) / data.length;
        const squareDiffs = data.map(value => Math.pow(value - mean, 2));
        const stdDev = Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / data.length);

        return { mean, stdDev };
    }

    /**
     * Calcule la sévérité d'une anomalie
     * @param {number} value - Valeur actuelle
     * @param {Object} stats - Statistiques de référence
     * @returns {string} Niveau de sévérité
     */
    calculateSeverity(value, stats) {
        const deviation = Math.abs(value - stats.mean) / stats.stdDev;
        
        if (deviation > 4) return 'critical';
        if (deviation > 3) return 'high';
        if (deviation > 2) return 'medium';
        return 'low';
    }

    /**
     * Met à jour les graphiques avec les nouvelles données
     * @param {Object} data - Données du véhicule
     */
    updateCharts(data) {
        if (!data || typeof data !== 'object') return;
        
        const timestamp = data.timestamp ? new Date(data.timestamp * 1000).getTime() : new Date().getTime();
        
        // Mise à jour du graphique des températures
        if (this.charts.temperatures) {
            // Ajouter les points pour chaque série
            const batteryTemp = data.temperature || 25;
            const motorTemp = data.motor_temperature || (batteryTemp + Math.random() * 10);
            const inverterTemp = data.inverter_temperature || (batteryTemp + Math.random() * 5);
            
            // Ajouter les points aux séries
            this.charts.temperatures.series[0].addPoint([timestamp, batteryTemp], false);
            this.charts.temperatures.series[1].addPoint([timestamp, motorTemp], false);
            this.charts.temperatures.series[2].addPoint([timestamp, inverterTemp], false);
            
            // Redessiner le graphique
            this.charts.temperatures.redraw();
            
            // Limiter le nombre de points
            if (this.charts.temperatures.series[0].data.length > this.analysisConfig.bufferSize) {
                this.charts.temperatures.series[0].removePoint(0, false);
                this.charts.temperatures.series[1].removePoint(0, false);
                this.charts.temperatures.series[2].removePoint(0, false);
            }
        }
        
        // Mise à jour du graphique des performances
        if (this.charts.performance) {
            // Calculer les valeurs de performance
            const efficiency = data.efficiency_score || Math.random() * 30 + 60; // 60-90%
            const power = data.power || (data.speed / 10) || Math.random() * 50; // 0-50 kW
            
            // Ajouter les points aux séries
            this.charts.performance.series[0].addPoint([timestamp, efficiency], false);
            this.charts.performance.series[1].addPoint([timestamp, power], false);
            
            // Redessiner le graphique
            this.charts.performance.redraw();
            
            // Limiter le nombre de points
            if (this.charts.performance.series[0].data.length > this.analysisConfig.bufferSize) {
                this.charts.performance.series[0].removePoint(0, false);
                this.charts.performance.series[1].removePoint(0, false);
            }
        }
    }

    /**
     * Génère des recommandations basées sur l'analyse
     * @param {Object} trends - Tendances détectées
     * @param {Array} anomalies - Anomalies détectées
     * @returns {Array} Recommandations générées
     */
    generateRecommendations(trends, anomalies) {
        const recommendations = [];

        // Recommandations basées sur les tendances
        Object.entries(trends.temperatures).forEach(([component, trend]) => {
            if (trend.direction === 'increasing' && trend.rate > 0.5) {
                recommendations.push({
                    component,
                    priority: 'medium',
                    message: `Augmentation rapide de la température ${component}. Vérifier le système de refroidissement.`
                });
            }
        });

        // Recommandations basées sur les anomalies
        anomalies.forEach(anomaly => {
            if (anomaly.severity === 'critical' || anomaly.severity === 'high') {
                recommendations.push({
                    component: anomaly.component,
                    priority: 'high',
                    message: `Intervention requise: ${anomaly.type} anormal sur ${anomaly.component}`
                });
            }
        });

        return recommendations;
    }
    
    /**
     * Met à jour l'affichage des recommandations dans l'interface
     * @param {Array} recommendations - Recommandations à afficher
     */
    updateRecommendations(recommendations) {
        const recommendationsElement = document.getElementById('recommendations');
        if (!recommendationsElement) return;
        
        // Vider la liste actuelle
        recommendationsElement.innerHTML = '';
        
        // Si aucune recommandation, afficher un message par défaut
        if (!recommendations || recommendations.length === 0) {
            const defaultItem = document.createElement('li');
            defaultItem.className = 'list-group-item list-group-item-success';
            defaultItem.innerHTML = '<i class="fas fa-check-circle"></i> Conduite optimale pour maximiser l\'autonomie';
            recommendationsElement.appendChild(defaultItem);
            return;
        }
        
        // Ajouter chaque recommandation à la liste
        recommendations.forEach(recommendation => {
            const item = document.createElement('li');
            
            // Déterminer la classe CSS basée sur la priorité
            let itemClass = 'list-group-item-info';
            let icon = '<i class="fas fa-info-circle"></i>';
            
            if (typeof recommendation === 'string') {
                // Cas simple où la recommandation est juste une chaîne
                item.innerHTML = `${icon} ${recommendation}`;
                item.className = `list-group-item ${itemClass}`;
            } else {
                // Cas avec objet de recommandation structuré
                switch(recommendation.priority) {
                    case 'high':
                        itemClass = 'list-group-item-danger';
                        icon = '<i class="fas fa-exclamation-circle"></i>';
                        break;
                    case 'medium':
                        itemClass = 'list-group-item-warning';
                        icon = '<i class="fas fa-exclamation-triangle"></i>';
                        break;
                    case 'low':
                        itemClass = 'list-group-item-info';
                        icon = '<i class="fas fa-info-circle"></i>';
                        break;
                }
                
                item.innerHTML = `${icon} ${recommendation.message}`;
                item.className = `list-group-item ${itemClass}`;
            }
            
            recommendationsElement.appendChild(item);
        });
    }
} 