/**
 * Gestionnaire de graphiques pour l'application Renault IA Analysis
 * Gère les visualisations de données
 */
class ChartsManager {
    /**
     * Constructeur du gestionnaire de graphiques
     */
    constructor() {
        // Références aux graphiques
        this.charts = {};
        
        // Données historiques
        this.historyData = {
            speed: [],
            energy: [],
            battery: [],
            efficiency: []
        };
        
        // Limite du nombre de points dans l'historique
        this.historyLimit = 60;
        
        // Initialiser les graphiques
        this.initialize();
    }
    
    /**
     * Initialise les graphiques de l'application
     */
    initialize() {
        console.log('Initialisation des graphiques...');
        
        try {
            // Identifier les conteneurs de graphiques
            const speedChartContainer = document.getElementById('speed-chart');
            const energyChartContainer = document.getElementById('energy-chart');
            const batteryChartContainer = document.getElementById('battery-chart');
            const efficiencyChartContainer = document.getElementById('efficiency-chart');
            
            // Initialiser les graphiques seulement s'ils existent
            if (speedChartContainer) {
                this.initSpeedChart(speedChartContainer);
            }
            
            if (energyChartContainer) {
                this.initEnergyChart(energyChartContainer);
            }
            
            if (batteryChartContainer) {
                this.initBatteryChart(batteryChartContainer);
            }
            
            if (efficiencyChartContainer) {
                this.initEfficiencyChart(efficiencyChartContainer);
            }
            
            console.log('Graphiques initialisés avec succès');
        } catch (error) {
            console.warn('Certains graphiques n\'ont pas pu être initialisés:', error);
        }
    }
    
    /**
     * Initialise le graphique de vitesse
     * @param {HTMLElement} container - Élément HTML conteneur du graphique
     */
    initSpeedChart(container) {
        const ctx = container.getContext('2d');
        
        this.charts.speed = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(this.historyLimit).fill(''),
                datasets: [{
                    label: 'Vitesse (km/h)',
                    data: Array(this.historyLimit).fill(null),
                    borderColor: '#2C4BAD',
                    backgroundColor: 'rgba(44, 75, 173, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointHoverBackgroundColor: '#2C4BAD',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 0
                },
                scales: {
                    x: {
                        display: false
                    },
                    y: {
                        beginAtZero: true,
                        max: 140,
                        ticks: {
                            stepSize: 20
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: true,
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: () => 'Vitesse',
                            label: (context) => `${context.raw || 0} km/h`
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Initialise le graphique de consommation d'énergie
     * @param {HTMLElement} container - Élément HTML conteneur du graphique
     */
    initEnergyChart(container) {
        const ctx = container.getContext('2d');
        
        this.charts.energy = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(this.historyLimit).fill(''),
                datasets: [{
                    label: 'Consommation (kWh/100km)',
                    data: Array(this.historyLimit).fill(null),
                    borderColor: '#E5222A',
                    backgroundColor: 'rgba(229, 34, 42, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointHoverBackgroundColor: '#E5222A',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 0
                },
                scales: {
                    x: {
                        display: false
                    },
                    y: {
                        beginAtZero: true,
                        max: 30,
                        ticks: {
                            stepSize: 5
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: true,
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: () => 'Consommation',
                            label: (context) => `${context.raw || 0} kWh/100km`
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Initialise le graphique de niveau de batterie
     * @param {HTMLElement} container - Élément HTML conteneur du graphique
     */
    initBatteryChart(container) {
        const ctx = container.getContext('2d');
        
        this.charts.battery = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(this.historyLimit).fill(''),
                datasets: [{
                    label: 'Niveau de batterie (%)',
                    data: Array(this.historyLimit).fill(null),
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointHoverBackgroundColor: '#28a745',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 0
                },
                scales: {
                    x: {
                        display: false
                    },
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            stepSize: 20
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: true,
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: () => 'Batterie',
                            label: (context) => `${context.raw || 0}%`
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Initialise le graphique d'efficacité
     * @param {HTMLElement} container - Élément HTML conteneur du graphique
     */
    initEfficiencyChart(container) {
        const ctx = container.getContext('2d');
        
        this.charts.efficiency = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(this.historyLimit).fill(''),
                datasets: [{
                    label: 'Score d\'efficacité',
                    data: Array(this.historyLimit).fill(null),
                    borderColor: '#FFCC33',
                    backgroundColor: 'rgba(255, 204, 51, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointHoverBackgroundColor: '#FFCC33',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 0
                },
                scales: {
                    x: {
                        display: false
                    },
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            stepSize: 20
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: true,
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: () => 'Efficacité',
                            label: (context) => `${context.raw || 0}%`
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Met à jour les graphiques avec les nouvelles données
     * @param {Object} data - Données du véhicule et analyses
     */
    updateCharts(data) {
        // Mise à jour de l'historique des données
        this.updateHistoryData(data);
        
        // Mise à jour des graphiques individuels
        this.updateSpeedChart();
        this.updateEnergyChart();
        this.updateBatteryChart();
        this.updateEfficiencyChart();
    }
    
    /**
     * Met à jour l'historique des données
     * @param {Object} data - Données du véhicule et analyses
     */
    updateHistoryData(data) {
        // Récupérer les données du véhicule si disponibles
        const vehicleData = data.vehicle_data || data;
        const analysisData = data.analysis || {};
        
        // Ajouter les nouvelles valeurs à l'historique
        if (vehicleData.speed !== undefined) {
            this.historyData.speed.push(vehicleData.speed);
            if (this.historyData.speed.length > this.historyLimit) {
                this.historyData.speed.shift();
            }
        }
        
        if (vehicleData.energy_consumption !== undefined) {
            this.historyData.energy.push(vehicleData.energy_consumption);
            if (this.historyData.energy.length > this.historyLimit) {
                this.historyData.energy.shift();
            }
        }
        
        if (vehicleData.battery_level !== undefined) {
            this.historyData.battery.push(vehicleData.battery_level);
            if (this.historyData.battery.length > this.historyLimit) {
                this.historyData.battery.shift();
            }
        }
        
        if (analysisData.efficiency_score !== undefined) {
            this.historyData.efficiency.push(analysisData.efficiency_score);
            if (this.historyData.efficiency.length > this.historyLimit) {
                this.historyData.efficiency.shift();
            }
        }
    }
    
    /**
     * Met à jour le graphique de vitesse
     */
    updateSpeedChart() {
        if (!this.charts.speed) return;
        
        // Remplir avec des valeurs nulles si l'historique est trop court
        const data = [...this.historyData.speed];
        while (data.length < this.historyLimit) {
            data.unshift(null);
        }
        
        this.charts.speed.data.datasets[0].data = data;
        this.charts.speed.update();
    }
    
    /**
     * Met à jour le graphique de consommation d'énergie
     */
    updateEnergyChart() {
        if (!this.charts.energy) return;
        
        // Remplir avec des valeurs nulles si l'historique est trop court
        const data = [...this.historyData.energy];
        while (data.length < this.historyLimit) {
            data.unshift(null);
        }
        
        this.charts.energy.data.datasets[0].data = data;
        this.charts.energy.update();
    }
    
    /**
     * Met à jour le graphique de niveau de batterie
     */
    updateBatteryChart() {
        if (!this.charts.battery) return;
        
        // Remplir avec des valeurs nulles si l'historique est trop court
        const data = [...this.historyData.battery];
        while (data.length < this.historyLimit) {
            data.unshift(null);
        }
        
        this.charts.battery.data.datasets[0].data = data;
        this.charts.battery.update();
    }
    
    /**
     * Met à jour le graphique d'efficacité
     */
    updateEfficiencyChart() {
        if (!this.charts.efficiency) return;
        
        // Remplir avec des valeurs nulles si l'historique est trop court
        const data = [...this.historyData.efficiency];
        while (data.length < this.historyLimit) {
            data.unshift(null);
        }
        
        this.charts.efficiency.data.datasets[0].data = data;
        this.charts.efficiency.update();
    }
}

// Initialisation des graphiques au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    window.charts = new ChartsManager();
}); 