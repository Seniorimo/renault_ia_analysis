// Configuration globale
const config = {
    isGitHubPages: window.location.hostname.includes('github.io'),
    apiBaseUrl: window.location.hostname.includes('github.io') ? 
        'https://renault-diagnostic-api.netlify.app' : 
        ''
};

// Configuration des gestionnaires
let diagnosticManager = null;
let analysisManager = null;
let chartsManager = null;
let vehicleControls = null;

// Variables pour la simulation
let simulationInterval = null;
const UPDATE_INTERVAL = 1000; // 1 seconde

// Initialiser l'application lorsque le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initialisation du système de diagnostic Renault...');
    
    try {
        // Attendre un peu avant d'initialiser pour s'assurer que le DOM est bien chargé
        setTimeout(() => {
            initializeSystem();
        }, 1000);
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de l\'application:', error);
        addLogMessage('error', 'Erreur de démarrage du système: ' + error.message);
    }
});

// Fonction principale d'initialisation du système
async function initializeSystem() {
    try {
        // Initialiser les gestionnaires de composants dans l'ordre correct
        chartsManager = new ChartsManager();
        diagnosticManager = new DiagnosticManager();
        
        // Initialiser l'analyseur si les graphiques requis existent
        if (document.getElementById('temperature-chart') && 
            document.getElementById('performance-chart')) {
            analysisManager = new AnalysisManager();
        } else {
            console.warn('Les graphiques requis pour AnalysisManager sont manquants.');
        }
        
        // Initialiser les contrôles du véhicule
        vehicleControls = new VehicleControls();
        
        // Si nous sommes sur GitHub Pages, utiliser des données simulées
        if (config.isGitHubPages) {
            initializeWithMockData();
        } else {
            // Sinon, récupérer les données depuis l'API
            await fetchInitialData();
        }
        
    } catch (error) {
        console.error('Erreur lors de l\'initialisation des gestionnaires:', error);
    }
    
    // Configurer les écouteurs d'événements pour l'interface utilisateur
    setupUIEventListeners();
    
    console.log('Initialisation du système terminée');
    addLogMessage('success', 'Système de diagnostic prêt');
}

// Fonction pour initialiser avec des données simulées pour GitHub Pages
function initializeWithMockData() {
    const mockData = {
        vehicleStatus: {
            speed: 0,
            batteryLevel: 100,
            temperature: 25,
            range: 380
        },
        diagnosticResults: {
            battery: { status: 'normal', value: '100%' },
            motor: { status: 'normal', value: '35°C' },
            brakes: { status: 'normal', value: 'OK' },
            suspension: { status: 'normal', value: 'OK' }
        }
    };

    updateSystemStatus(mockData);
}

// Fonction pour récupérer les données initiales depuis l'API
async function fetchInitialData() {
    try {
        const response = await fetch(`${config.apiBaseUrl}/.netlify/functions/simulation`);
        if (!response.ok) {
            throw new Error('Erreur serveur');
        }
        const data = await response.json();
        updateSystemStatus(data);
    } catch (error) {
        console.error('Erreur lors de la récupération des données initiales:', error);
        throw new Error('Erreur réseau');
    }
}

// Mise à jour du statut du système
function updateSystemStatus(data) {
    // Mise à jour des valeurs affichées
    document.querySelector('#speed-info .display-6').textContent = `${data.vehicleStatus.speed} km/h`;
    document.querySelector('#battery-info .display-6').textContent = `${data.vehicleStatus.batteryLevel}%`;
    document.querySelector('#temp-info .display-6').textContent = `${data.vehicleStatus.temperature}°C`;
    document.querySelector('#range-info .display-6').textContent = `${data.vehicleStatus.range} km`;

    // Mise à jour des statuts des composants
    updateComponentStatus('battery', data.diagnosticResults.battery);
    updateComponentStatus('motor', data.diagnosticResults.motor);
    updateComponentStatus('brakes', data.diagnosticResults.brakes);
    updateComponentStatus('suspension', data.diagnosticResults.suspension);
}

// Mise à jour du statut d'un composant
function updateComponentStatus(component, status) {
    const statusIndicator = document.querySelector(`.${component}-status-indicator`);
    const statusText = document.querySelector(`.${component}-status`);
    
    if (statusIndicator && statusText) {
        statusIndicator.className = `status-indicator status-${status.status}`;
        statusText.textContent = status.value;
    }
}

// Fonction pour démarrer la simulation
async function startSimulation(mode = 'city') {
    if (simulationInterval) {
        clearInterval(simulationInterval);
    }
    
    // Activer les contrôles du véhicule
    if (vehicleControls) {
        vehicleControls.setDiagnosticActive(true);
    }
    
    // Démarrer la boucle de mise à jour
    simulationInterval = setInterval(async () => {
        try {
            const response = await fetch('/.netlify/functions/simulation?mode=' + mode);
            if (!response.ok) throw new Error('Erreur réseau');
            
            const data = await response.json();
            
            // Mettre à jour l'interface
            updateDashboardUI(data);
            
            // Mettre à jour les graphiques
            if (chartsManager) {
                if (typeof chartsManager.updateSpeedChart === 'function') {
                    chartsManager.updateSpeedChart(data.speed || 0);
                }
                if (typeof chartsManager.updateBatteryChart === 'function') {
                    chartsManager.updateBatteryChart(data.battery_level || 100);
                }
            }
            
            // Mettre à jour l'analyse
            if (analysisManager && typeof analysisManager.updateCharts === 'function') {
                analysisManager.updateCharts(data);
            }
            
        } catch (error) {
            console.error('Erreur lors de la mise à jour:', error);
            addLogMessage('error', 'Erreur de communication: ' + error.message);
        }
    }, UPDATE_INTERVAL);
}

// Fonction pour arrêter la simulation
function stopSimulation() {
    if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
    }
    
    // Désactiver les contrôles du véhicule
    if (vehicleControls) {
        vehicleControls.setDiagnosticActive(false);
    }
    
    addLogMessage('info', 'Simulation arrêtée');
}

// Configuration des écouteurs d'événements pour l'interface utilisateur
function setupUIEventListeners() {
    const startButton = document.getElementById('start-diagnostic');
    const stopButton = document.getElementById('stop-diagnostic');
    const modeSelect = document.getElementById('diagnostic-type');
    
    if (startButton) {
        startButton.addEventListener('click', () => {
            const mode = modeSelect ? modeSelect.value : 'full';
            console.log('Démarrage du diagnostic en mode:', mode);
            
            // Désactiver le bouton start et activer le bouton stop
            startButton.disabled = true;
            if (stopButton) stopButton.disabled = false;
            
            // Démarrer la simulation
            startSimulation(mode);
            
            // Ajouter un message au journal
            addLogMessage('info', 'Démarrage du diagnostic en mode ' + mode);
        });
    }
    
    if (stopButton) {
        stopButton.addEventListener('click', () => {
            console.log('Arrêt du diagnostic');
            
            // Désactiver le bouton stop et activer le bouton start
            stopButton.disabled = true;
            if (startButton) startButton.disabled = false;
            
            // Arrêter la simulation
            stopSimulation();
            
            // Ajouter un message au journal
            addLogMessage('info', 'Arrêt du diagnostic');
        });
    }
}

// Fonction pour mettre à jour l'interface utilisateur du tableau de bord
function updateDashboardUI(vehicleData) {
    // Vérifier si les données sont valides
    if (typeof vehicleData !== 'object') return;
    
    // Obtenir le statut des composants du système ou initialiser avec des valeurs par défaut
    const componentStatuses = vehicleData.component_statuses || {
        'batterie': 'normal',
        'moteur': 'normal',
        'onduleur': 'normal',
        'refroidissement': 'normal',
        'freins': 'normal',
        'suspension': 'normal'
    };
    
    // =========================================
    // 1. MISE À JOUR DES INDICATEURS DE STATUT
    // =========================================
    
    // Batterie
    updateComponentStatus('battery', 'battery-status', 'battery-status-indicator', 
        vehicleData.battery_level, '%', 
        [10, 30], componentStatuses.batterie);
    
    // Moteur
    updateComponentStatus('motor', 'motor-status', 'motor-status-indicator', 
        vehicleData.motor_load, '% charge', 
        [75, 90], componentStatuses.moteur);
    
    // Freins
    updateComponentStatus('brakes', 'brakes-status', 'brakes-status-indicator', 
        null, '', 
        [0, 0], componentStatuses.freins);
    
    // Suspension
    updateComponentStatus('suspension', 'suspension-status', 'suspension-status-indicator', 
        null, '', 
        [0, 0], componentStatuses.suspension);
    
    // =============================================
    // 2. MISE À JOUR DES PARAMÈTRES CRITIQUES
    // =============================================
    
    // Mise à jour des valeurs dans les cartes d'information
    updateInfoCard('speed-info', 'Vitesse', `${Math.round(vehicleData.speed || 0)} km/h`);
    updateInfoCard('battery-info', 'Batterie', `${Math.round(vehicleData.battery_level || 0)}%`);
    updateInfoCard('temp-info', 'Température', `${Math.round(vehicleData.temperature || 0)}°C`);
    updateInfoCard('range-info', 'Autonomie', `${Math.round(vehicleData.range || 0)} km`);
    
    // Mise à jour du compteur de vitesse si présent
    const speedMeterNeedle = document.getElementById('speed-meter-needle');
    const speedMeterValue = document.getElementById('speed-meter-value');
    
    if (speedMeterNeedle && typeof vehicleData.speed !== 'undefined') {
        // Calculer l'angle de rotation pour l'aiguille (de -90° à 90°)
        const angle = -90 + (180 * vehicleData.speed / 140);
        speedMeterNeedle.style.transform = `rotate(${angle}deg)`;
    }
    
    if (speedMeterValue && typeof vehicleData.speed !== 'undefined') {
        speedMeterValue.textContent = `${Math.round(vehicleData.speed)} km/h`;
    }
    
    // =============================================
    // 3. MISE À JOUR DES SECTIONS SPÉCIFIQUES
    // =============================================
    
    // Mise à jour des températures si la section existe
    updateTemperatureSection(vehicleData);
    
    // Mise à jour des performances si la section existe
    updatePerformanceSection(vehicleData);
}

// Fonction pour mettre à jour la section de températures
function updateTemperatureSection(data) {
    const tempSection = document.getElementById('temperature-chart');
    if (!tempSection) return;
    
    // Si le graphique existe, mettre à jour les données
    if (analysisManager && typeof analysisManager.updateTemperatureChart === 'function') {
        analysisManager.updateTemperatureChart(data);
    }
    
    // Mettre à jour les valeurs textuelles dans la section
    const motorTempElement = document.getElementById('motor-temp-value');
    const batteryTempElement = document.getElementById('battery-temp-value');
    const inverterTempElement = document.getElementById('inverter-temp-value');
    
    if (motorTempElement && typeof data.motor_temperature !== 'undefined') {
        motorTempElement.textContent = `${Math.round(data.motor_temperature)}°C`;
        colorizeElement(motorTempElement, data.motor_temperature, [60, 70]);
    }
    
    if (batteryTempElement && typeof data.battery_temperature !== 'undefined') {
        batteryTempElement.textContent = `${Math.round(data.battery_temperature)}°C`;
        colorizeElement(batteryTempElement, data.battery_temperature, [50, 60]);
    }
    
    if (inverterTempElement && typeof data.inverter_temperature !== 'undefined') {
        inverterTempElement.textContent = `${Math.round(data.inverter_temperature)}°C`;
        colorizeElement(inverterTempElement, data.inverter_temperature, [55, 65]);
    }
}

// Fonction pour mettre à jour la section de performances
function updatePerformanceSection(data) {
    const perfSection = document.getElementById('performance-chart');
    if (!perfSection) return;
    
    // Si le graphique existe, mettre à jour les données
    if (analysisManager && typeof analysisManager.updatePerformanceChart === 'function') {
        analysisManager.updatePerformanceChart(data);
    }
    
    // Mettre à jour les valeurs textuelles dans la section
    const efficiencyElement = document.getElementById('efficiency-value');
    const consumptionElement = document.getElementById('consumption-value');
    const rangeElement = document.getElementById('range-value');
    
    if (efficiencyElement && typeof data.energy_efficiency !== 'undefined') {
        efficiencyElement.textContent = `${Math.round(data.energy_efficiency)}%`;
        colorizeElement(efficiencyElement, data.energy_efficiency, [70, 85], true);
    }
    
    if (consumptionElement && typeof data.energy_consumption !== 'undefined') {
        consumptionElement.textContent = `${data.energy_consumption.toFixed(1)} kWh/100km`;
        colorizeElement(consumptionElement, data.energy_consumption, [15, 20]);
    }
    
    if (rangeElement && typeof data.range !== 'undefined') {
        rangeElement.textContent = `${Math.round(data.range)} km`;
        colorizeElement(rangeElement, data.range, [100, 50], true);
    }
}

// Fonction d'aide pour colorier un élément en fonction de sa valeur
function colorizeElement(element, value, thresholds, isInverted = false) {
    const [warningThreshold, criticalThreshold] = thresholds;
    
    // Réinitialiser les classes
    element.classList.remove('text-success', 'text-warning', 'text-danger');
    
    if (isInverted) {
        // Logique inversée (plus c'est haut, mieux c'est)
        if (value >= warningThreshold) {
            element.classList.add('text-success');
        } else if (value >= criticalThreshold) {
            element.classList.add('text-warning');
        } else {
            element.classList.add('text-danger');
        }
    } else {
        // Logique standard (plus c'est bas, mieux c'est)
        if (value <= warningThreshold) {
            element.classList.add('text-success');
        } else if (value <= criticalThreshold) {
            element.classList.add('text-warning');
        } else {
            element.classList.add('text-danger');
        }
    }
}

// Fonction pour mettre à jour le tableau des composants
function updateComponentsTable(data) {
    if (!data || typeof data !== 'object') return;
    
    const componentsTable = document.getElementById('components-table');
    if (!componentsTable) return;
    
    const tbody = componentsTable.querySelector('tbody');
    if (!tbody) return;
    
    // Vider le tableau existant
    tbody.innerHTML = '';
    
    // Ajouter les lignes pour chaque composant
    
    // 1. Batterie
    const batteryRow = document.createElement('tr');
    const batteryHealth = data.battery_health || 100;
    let batteryStatus = 'Normal';
    let batteryStatusClass = 'status-normal';
    let batteryRecommendation = 'Aucune action requise';
    
    if (batteryHealth < 75) {
        batteryStatus = 'Attention';
        batteryStatusClass = 'status-warning';
        batteryRecommendation = 'Vérification recommandée';
    } else if (batteryHealth < 60) {
        batteryStatus = 'Critique';
        batteryStatusClass = 'status-critical';
        batteryRecommendation = 'Remplacement nécessaire';
    }
    
    batteryRow.innerHTML = `
        <td>Cellules Batterie</td>
        <td><span class="status-indicator ${batteryStatusClass}"></span> ${batteryStatus}</td>
        <td>Tension: ${Math.round(data.voltage || 380)}V | Temp: ${Math.round(data.battery_temperature || data.temperature || 25)}°C</td>
        <td>${batteryRecommendation}</td>
    `;
    tbody.appendChild(batteryRow);
    
    // 2. Onduleur
    const inverterRow = document.createElement('tr');
    const inverterEfficiency = data.energy_efficiency || 92;
    const inverterTemp = data.inverter_temperature || (data.temperature ? data.temperature + 5 : 30);
    let inverterStatus = 'Normal';
    let inverterStatusClass = 'status-normal';
    let inverterRecommendation = 'Aucune action requise';
    
    if (inverterTemp > 65 || inverterEfficiency < 85) {
        inverterStatus = 'Attention';
        inverterStatusClass = 'status-warning';
        inverterRecommendation = 'Inspection recommandée';
    } else if (inverterTemp > 75 || inverterEfficiency < 75) {
        inverterStatus = 'Critique';
        inverterStatusClass = 'status-critical';
        inverterRecommendation = 'Maintenance urgente requise';
    }
    
    inverterRow.innerHTML = `
        <td>Onduleur Principal</td>
        <td><span class="status-indicator ${inverterStatusClass}"></span> ${inverterStatus}</td>
        <td>Efficacité: ${Math.round(inverterEfficiency)}% | Temp: ${Math.round(inverterTemp)}°C</td>
        <td>${inverterRecommendation}</td>
    `;
    tbody.appendChild(inverterRow);
    
    // 3. Système de refroidissement
    const coolingRow = document.createElement('tr');
    const coolingStatus = 'Normal';
    const coolingStatusClass = 'status-normal';
    const coolingRecommendation = 'Aucune action requise';
    
    coolingRow.innerHTML = `
        <td>Système de Refroidissement</td>
        <td><span class="status-indicator ${coolingStatusClass}"></span> ${coolingStatus}</td>
        <td>Débit: ${(data.speed / 50 + 1.5).toFixed(1)}L/min | Temp: ${Math.round(data.temperature || 25) + 5}°C</td>
        <td>${coolingRecommendation}</td>
    `;
    tbody.appendChild(coolingRow);
    
    // 4. Moteur électrique
    const motorRow = document.createElement('tr');
    const motorHealth = data.motor_health || 90;
    const motorTemp = data.motor_temperature || (data.temperature ? data.temperature + 10 : 35);
    let motorStatus = 'Normal';
    let motorStatusClass = 'status-normal';
    let motorRecommendation = 'Aucune action requise';
    
    if (motorTemp > 70 || motorHealth < 80) {
        motorStatus = 'Attention';
        motorStatusClass = 'status-warning';
        motorRecommendation = 'Vérification conseillée';
    } else if (motorTemp > 80 || motorHealth < 70) {
        motorStatus = 'Critique';
        motorStatusClass = 'status-critical';
        motorRecommendation = 'Maintenance urgente!';
    }
    
    motorRow.innerHTML = `
        <td>Moteur Électrique</td>
        <td><span class="status-indicator ${motorStatusClass}"></span> ${motorStatus}</td>
        <td>Rendement: ${Math.round(motorHealth)}% | Temp: ${Math.round(motorTemp)}°C</td>
        <td>${motorRecommendation}</td>
    `;
    tbody.appendChild(motorRow);
}

// Fonction pour mettre à jour le graphique principal
function updateMainChart(data) {
    if (!data || typeof data !== 'object') return;
    
    // Obtenir l'instance du graphique
    const chart = Highcharts.charts.find(chart => chart && chart.renderTo.id === 'realtime-analysis');
    if (!chart) return;
    
    const now = (data.timestamp ? new Date(data.timestamp * 1000) : new Date()).getTime();
    
    // Ajouter des points aux séries
    chart.series[0].addPoint([now, data.temperature || 0], false);
    chart.series[1].addPoint([now, data.voltage || 0], true);
    
    // Limiter les points si nécessaire
    if (chart.series[0].data.length > 100) {
        chart.series[0].data[0].remove(false);
        chart.series[1].data[0].remove(false);
    }
}

// Fonction pour ajouter un message au journal
function addLogMessage(type, message) {
    const errorLog = document.getElementById('error-log');
    if (!errorLog) return;
    
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    
    const messageElement = document.createElement('div');
    messageElement.className = `text-${type === 'error' ? 'danger' : type === 'warning' ? 'warning' : type === 'success' ? 'success' : 'info'}`;
    
    let icon = 'ℹ️';
    if (type === 'error') icon = '❌';
    else if (type === 'warning') icon = '⚠️';
    else if (type === 'success') icon = '✓';
    
    messageElement.innerHTML = `${icon} [${timeString}] ${message}`;
    
    // Ajouter le nouveau message au début
    errorLog.insertBefore(messageElement, errorLog.firstChild);
    
    // Limiter le nombre de messages
    while (errorLog.children.length > 100) {
        errorLog.removeChild(errorLog.lastChild);
    }
} 