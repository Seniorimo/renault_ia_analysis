/**
 * Gestionnaire des contrôles du véhicule pour Renault ZOE Diagnostic System
 * Version automatique: vitesse et accélération gérées dynamiquement selon le mode
 */
class VehicleControls {
    /**
     * Constructeur du gestionnaire de contrôles
     * @param {SocketManager} socketManager - Instance du gestionnaire de socket
     */
    constructor(socketManager) {
        this.socketManager = socketManager;
        
        // Valeurs des paramètres du véhicule
        this.parameters = {
            speed: 0,
            acceleration: 0,
            mode: 'city'  // Mode par défaut: ville
        };
        
        // Éléments DOM pour les contrôles
        this.elements = {
            speedValue: document.getElementById('speed-value'),
            speedMeterNeedle: document.getElementById('speed-meter-needle'),
            speedMeterValue: document.getElementById('speed-meter-value'),
            accelerationValue: document.getElementById('acceleration-value'),
            modeSelect: document.getElementById('mode-select'),
            regenerationIndicator: document.getElementById('regeneration-indicator'),
            regenerationPower: document.getElementById('regeneration-power'),
            drivingStyle: document.getElementById('driving-style')
        };
        
        // Configuration des modes de conduite ZOE avec les profils de conduite
        this.drivingModes = {
            eco: {
                name: 'Éco',
                description: 'Optimise l\'autonomie et réduit la consommation',
                color: '#28a745',
                targetSpeed: {min: 40, max: 90, ideal: 60},
                acceleration: {min: -1.0, max: 1.0, smooth: 0.3},
                drivingStyle: 'Économique',
                styleClass: 'text-success',
                speedTransition: 0.7,  // Transitions plus douces
                accelerationPattern: [0.3, 0.5, 0.2, -0.3, 0.1]  // Profil d'accélération douce
            },
            city: {
                name: 'Ville',
                description: 'Équilibre entre performance et autonomie',
                color: '#17a2b8',
                targetSpeed: {min: 0, max: 60, ideal: 35},
                acceleration: {min: -1.5, max: 1.5, smooth: 0.5},
                drivingStyle: 'Équilibré',
                styleClass: 'text-info',
                speedTransition: 1.0,  // Transitions modérées
                accelerationPattern: [0.8, 1.2, -1.0, -0.7, 0, 0.5, -0.8]  // Stop-and-go urbain
            },
            sport: {
                name: 'Sport',
                description: 'Performance maximale, réactivité accrue',
                color: '#dc3545',
                targetSpeed: {min: 30, max: 130, ideal: 90},
                acceleration: {min: -2.5, max: 2.7, smooth: 0.8},
                drivingStyle: 'Sportif',
                styleClass: 'text-danger',
                speedTransition: 1.5,  // Transitions rapides
                accelerationPattern: [2.0, 1.5, 0.5, -1.0, -2.0, 2.5, 1.0]  // Profil d'accélération agressive
            }
        };
        
        // Variables pour la simulation automatique
        this.simulationActive = false;
        this.currentPatternIndex = 0;
        this.targetSpeedVariance = 0;
        this.currentTargetSpeed = 0;
        this.simulationCounter = 0;
        this.simulationInterval = null;
        
        // Initialiser les contrôles
        this.initialize();
    }
    
    /**
     * Initialise les contrôles et les écouteurs d'événements
     */
    initialize() {
        console.log('Initialisation des contrôles dynamiques de la Renault ZOE');
        
        // Initialiser le sélecteur de mode
        this.initializeModeSelector();
        
        // Appliquer les valeurs initiales 
        this.setMode(this.parameters.mode, true);
        
        // Mettre à jour l'affichage initial
        this.updateDisplay();
        
        // S'abonner aux événements Socket.IO pour les mises à jour
        if (this.socketManager) {
            this.socketManager.on('vehicle_data_update', (data) => {
                // Mise à jour des indicateurs spéciaux comme la régénération
                this.updateSpecialIndicators(data);
            }, 'controls');
        }
    }
    
    /**
     * Démarre la simulation automatique des paramètres de conduite
     */
    startSimulation() {
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
        }
        
        this.simulationActive = true;
        this.currentPatternIndex = 0;
        this.simulationCounter = 0;
        
        // Initial target speed based on mode
        const modeConfig = this.drivingModes[this.parameters.mode];
        this.currentTargetSpeed = modeConfig.targetSpeed.ideal;
        this.targetSpeedVariance = Math.random() * 10 - 5; // -5 to +5 variance
        
        // Update the UI to show automated control
        const manualIndicator = document.getElementById('manual-control-indicator');
        if (manualIndicator) {
            manualIndicator.style.display = 'none';
        }
        
        // Interval for dynamic speed/acceleration changes - runs every 200ms
        this.simulationInterval = setInterval(() => this.updateSimulation(), 200);
        console.log(`Simulation dynamique démarrée en mode ${this.parameters.mode}`);
    }
    
    /**
     * Arrête la simulation automatique
     */
    stopSimulation() {
        this.simulationActive = false;
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
            this.simulationInterval = null;
        }
        
        // Reset values
        this.parameters.acceleration = 0;
        this.updateDisplay();
        console.log('Simulation dynamique arrêtée');
    }
    
    /**
     * Met à jour la simulation à chaque cycle
     */
    updateSimulation() {
        if (!this.simulationActive) return;
        
        const modeConfig = this.drivingModes[this.parameters.mode];
        this.simulationCounter++;
        
        // Adjust target speed occasionally
        if (this.simulationCounter % 25 === 0) { // Every ~5 seconds
            this.targetSpeedVariance = Math.random() * 20 - 10; // -10 to +10 variance
            
            // Change target speed with some randomness but within mode constraints
            const baseTarget = modeConfig.targetSpeed.ideal;
            const minTarget = modeConfig.targetSpeed.min;
            const maxTarget = modeConfig.targetSpeed.max;
            this.currentTargetSpeed = Math.max(minTarget, 
                                       Math.min(maxTarget, 
                                                baseTarget + this.targetSpeedVariance));
        }
        
        // Calculate acceleration based on pattern and current position vs target
        const speedDiff = this.currentTargetSpeed - this.parameters.speed;
        
        // Get the acceleration pattern for the current mode
        const accelPattern = modeConfig.accelerationPattern;
        
        // Advance pattern index occasionally
        if (this.simulationCounter % 10 === 0) { // Every ~2 seconds
            this.currentPatternIndex = (this.currentPatternIndex + 1) % accelPattern.length;
        }
        
        // Base acceleration on pattern but adjust toward target speed
        let baseAccel = accelPattern[this.currentPatternIndex];
        
        // If we're far from target speed, adjust accordingly
        if (Math.abs(speedDiff) > 10) {
            // Add acceleration to reach target (stronger effect when further away)
            const targetAccel = speedDiff * 0.05;
            baseAccel = baseAccel * 0.3 + targetAccel * 0.7;
        }
        
        // Apply smoothing based on driving mode
        const smoothFactor = modeConfig.acceleration.smooth;
        const currentAccel = this.parameters.acceleration;
        const newAccel = currentAccel * (1 - smoothFactor) + baseAccel * smoothFactor;
        
        // Apply acceleration limits from the mode
        this.parameters.acceleration = Math.max(
            modeConfig.acceleration.min,
            Math.min(modeConfig.acceleration.max, newAccel)
        );
        
        // Update speed based on acceleration and mode's transition rate
        const speedChange = this.parameters.acceleration * modeConfig.speedTransition;
        this.parameters.speed = Math.max(0, 
                                Math.min(modeConfig.targetSpeed.max, 
                                         this.parameters.speed + speedChange));
        
        // Update display and send to server
        this.updateDisplay();
        this.sendParametersUpdate();
    }
    
    /**
     * Initialise le sélecteur de mode avec les options pour la Renault ZOE
     */
    initializeModeSelector() {
        if (!this.elements.modeSelect) return;
        
        // Vider le sélecteur
        this.elements.modeSelect.innerHTML = '';
        
        // Ajouter les options de mode
        Object.entries(this.drivingModes).forEach(([modeId, modeConfig]) => {
            const option = document.createElement('option');
            option.value = modeId;
            option.textContent = modeConfig.name;
            option.dataset.color = modeConfig.color;
            option.title = modeConfig.description;
            
            // Sélectionner le mode par défaut
            if (modeId === this.parameters.mode) {
                option.selected = true;
            }
            
            this.elements.modeSelect.appendChild(option);
        });
        
        // Add event listener for mode changes
        this.elements.modeSelect.addEventListener('change', () => {
            this.setMode(this.elements.modeSelect.value);
        });
        
        // Appliquer la couleur du mode sélectionné
        this.updateModeStyle();
    }
    
    /**
     * Met à jour le style du sélecteur en fonction du mode
     */
    updateModeStyle() {
        if (!this.elements.modeSelect) return;
        
        const selectedMode = this.parameters.mode;
        const modeConfig = this.drivingModes[selectedMode] || this.drivingModes.city;
        
        // Mettre à jour la bordure avec la couleur du mode
        this.elements.modeSelect.style.borderColor = modeConfig.color;
        
        // Mettre à jour le texte descriptif si présent
        const modeDescription = document.getElementById('mode-description');
        if (modeDescription) {
            modeDescription.textContent = modeConfig.description;
            modeDescription.style.color = modeConfig.color;
        }
        
        // Update driving style indicator
        if (this.elements.drivingStyle) {
            this.elements.drivingStyle.textContent = modeConfig.drivingStyle;
            this.elements.drivingStyle.className = '';
            this.elements.drivingStyle.classList.add(modeConfig.styleClass);
        }
    }
    
    /**
     * Définit le mode de conduite
     * @param {string} mode - Mode de conduite (eco, city, sport)
     * @param {boolean} skipReset - Si true, ne réinitialise pas la simulation
     */
    setMode(mode, skipReset = false) {
        if (!this.drivingModes[mode]) {
            console.warn(`Mode de conduite inconnu: ${mode}, utilisation du mode Ville`);
            mode = 'city';
        }
        
        // Record previous mode
        const prevMode = this.parameters.mode;
        
        // Set new mode
        this.parameters.mode = mode;
        
        // Update mode selector if it doesn't match
        if (this.elements.modeSelect && this.elements.modeSelect.value !== mode) {
            this.elements.modeSelect.value = mode;
        }
        
        // Update mode styling
        this.updateModeStyle();
        
        // If simulation is active, restart it for the new mode
        if (this.simulationActive && !skipReset) {
            // If changing between modes, gradually transition speed rather than reset
            if (prevMode !== mode) {
                // Keep current speed but adjust acceleration pattern
                this.currentPatternIndex = 0;
                
                // Set an appropriate target based on new mode
                const modeConfig = this.drivingModes[mode];
                this.currentTargetSpeed = modeConfig.targetSpeed.ideal;
                
                // Log the mode change
                console.log(`Mode conduite changé: ${prevMode} -> ${mode}`);
            }
        }
        
        // Envoyer les données au serveur
        this.sendParametersUpdate();
    }
    
    /**
     * Met à jour l'affichage des contrôles
     */
    updateDisplay() {
        // Mettre à jour les valeurs affichées
        if (this.elements.speedValue) {
            this.elements.speedValue.textContent = Math.round(this.parameters.speed);
        }
        
        if (this.elements.speedMeterValue) {
            this.elements.speedMeterValue.textContent = `${Math.round(this.parameters.speed)} km/h`;
        }
        
        if (this.elements.speedMeterNeedle) {
            // Calculer l'angle de rotation pour l'aiguille (de -90° à 90°)
            const angle = -90 + (180 * this.parameters.speed / 140);
            this.elements.speedMeterNeedle.style.transform = `rotate(${angle}deg)`;
        }
        
        if (this.elements.accelerationValue) {
            const formattedAcceleration = this.parameters.acceleration > 0 
                ? `+${this.parameters.acceleration.toFixed(1)}` 
                : this.parameters.acceleration.toFixed(1);
            this.elements.accelerationValue.textContent = formattedAcceleration;
            
            // Coloration selon l'accélération (positif=vert, négatif=rouge)
            if (this.parameters.acceleration > 0) {
                this.elements.accelerationValue.classList.remove('text-danger');
                this.elements.accelerationValue.classList.add('text-success');
            } else if (this.parameters.acceleration < 0) {
                this.elements.accelerationValue.classList.remove('text-success');
                this.elements.accelerationValue.classList.add('text-danger');
            } else {
                this.elements.accelerationValue.classList.remove('text-success', 'text-danger');
            }
        }
        
        // Mettre à jour l'indicateur visuel d'accélération si présent
        const accelerationIndicator = document.getElementById('acceleration-indicator');
        if (accelerationIndicator) {
            // Convertir l'accélération (-3 à +3) en pourcentage (0 à 100%)
            // Où 0 = -3 (freinage maximum), 50% = 0 (neutre), 100% = +3 (accélération maximum)
            const percentage = ((this.parameters.acceleration + 3) / 6) * 100;
            accelerationIndicator.style.width = `${percentage}%`;
            
            // Ajuster la classe selon l'accélération
            accelerationIndicator.classList.remove('bg-success', 'bg-danger', 'bg-warning');
            if (this.parameters.acceleration > 0.5) {
                accelerationIndicator.classList.add('bg-success');
            } else if (this.parameters.acceleration < -0.5) {
                accelerationIndicator.classList.add('bg-danger');
            } else {
                accelerationIndicator.classList.add('bg-warning');
            }
        }
    }
    
    /**
     * Met à jour les indicateurs spéciaux, comme la régénération d'énergie
     * @param {Object} data - Données du véhicule
     */
    updateSpecialIndicators(data) {
        // Indicateur de régénération d'énergie (spécifique à la Renault ZOE)
        if (this.elements.regenerationIndicator && typeof data.regeneration_active !== 'undefined') {
            const regenerationInactive = document.getElementById('regeneration-inactive');
            
            if (data.regeneration_active) {
                this.elements.regenerationIndicator.style.display = 'inline-block';
                if (regenerationInactive) regenerationInactive.style.display = 'none';
                
                if (this.elements.regenerationPower) {
                    this.elements.regenerationPower.textContent = `+${data.regeneration_power.toFixed(1)} kW`;
                }
            } else {
                this.elements.regenerationIndicator.style.display = 'none';
                if (regenerationInactive) regenerationInactive.style.display = 'inline-block';
            }
        }
    }
    
    /**
     * Envoie les paramètres mis à jour au serveur
     */
    sendParametersUpdate() {
        if (!this.socketManager) return;
        
        this.socketManager.emit('manual_control_update', this.parameters);
    }
    
    /**
     * Active ou désactive la simulation en fonction de l'état du diagnostic
     * @param {boolean} active - État d'activation du diagnostic
     */
    setDiagnosticActive(active) {
        if (active) {
            // Activer le sélecteur de mode
            if (this.elements.modeSelect) {
                this.elements.modeSelect.disabled = false;
            }
            
            // Démarrer la simulation
            this.startSimulation();
        } else {
            // Désactiver le sélecteur de mode
            if (this.elements.modeSelect) {
                this.elements.modeSelect.disabled = true;
            }
            
            // Arrêter la simulation
            this.stopSimulation();
        }
    }
} 