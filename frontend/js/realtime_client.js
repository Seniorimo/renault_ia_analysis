/**
 * Client en temps réel pour l'application Renault IA Analysis
 * Gère les communications bidirectionnelles avec le serveur
 */
class RealtimeClient {
    /**
     * Constructeur du client en temps réel
     * @param {SocketManager} socketManager - Gestionnaire de socket pour la communication
     */
    constructor(socketManager) {
        this.socketManager = socketManager;
        this.currentMode = 'urbain';
        this.simulationActive = false;
        this.lastUpdate = null;
        this.connectionTimeout = null;
    }
    
    /**
     * Initialise le client en temps réel
     */
    initialize() {
        if (!this.socketManager) {
            console.error('Socket Manager non disponible');
            return false;
        }
        
        // Configuration des écouteurs d'événements
        this.setupEventListeners();
        
        // Configuration de la vérification périodique de connexion
        this.startConnectionCheck();
        
        console.log('Client en temps réel initialisé');
        return true;
    }
    
    /**
     * Configure les écouteurs d'événements
     */
    setupEventListeners() {
        // Événements de connexion
        this.socketManager.on('connect', () => {
            console.log('Client connecté au serveur');
            this.onConnect();
        });
        
        this.socketManager.on('disconnect', () => {
            console.log('Client déconnecté du serveur');
            this.onDisconnect();
        });
        
        this.socketManager.on('connect_error', (error) => {
            console.error('Erreur de connexion:', error);
        });
        
        // Événements de simulation
        this.socketManager.on('simulation_status', (data) => {
            console.log('État de la simulation:', data);
            this.simulationActive = data.status === 'started';
            this.onSimulationStatusChange(data);
        });
        
        // Événements de données
        this.socketManager.on('vehicle_data_update', (data) => {
            this.lastUpdate = new Date();
            this.onDataUpdate(data);
        });
        
        // Événements de mode
        this.socketManager.on('mode_changed', (data) => {
            console.log('Mode changé:', data);
            this.currentMode = data.mode;
            this.onModeChange(data);
        });
    }
    
    /**
     * Démarre la vérification périodique de la connexion
     */
    startConnectionCheck() {
        // Vérifier la connexion toutes les 10 secondes
        this.connectionTimeout = setInterval(() => {
            const now = new Date();
            
            // Si nous sommes en simulation et que nous n'avons pas reçu de données depuis 5 secondes
            if (this.simulationActive && this.lastUpdate && 
                (now - this.lastUpdate) > 5000) {
                console.warn('Aucune donnée reçue depuis plus de 5 secondes');
                this.onConnectionIssue();
            }
        }, 10000);
    }
    
    /**
     * Arrête la vérification périodique de la connexion
     */
    stopConnectionCheck() {
        if (this.connectionTimeout) {
            clearInterval(this.connectionTimeout);
            this.connectionTimeout = null;
        }
    }
    
    /**
     * Appelé lorsque la connexion au serveur est établie
     */
    onConnect() {
        // Mettre à jour l'interface utilisateur
        const statusEl = document.getElementById('status-container');
        if (statusEl) {
            const notification = document.createElement('div');
            notification.className = 'alert alert-success alert-dismissible fade show';
            notification.innerHTML = `
                <strong>Connecté</strong> - Connexion au serveur établie.
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fermer"></button>
            `;
            statusEl.appendChild(notification);
            
            // Auto-supprimer après 5 secondes
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }, 5000);
        }
    }
    
    /**
     * Appelé lorsque la connexion au serveur est perdue
     */
    onDisconnect() {
        // Mettre à jour l'interface utilisateur
        const statusEl = document.getElementById('status-container');
        if (statusEl) {
            const notification = document.createElement('div');
            notification.className = 'alert alert-danger alert-dismissible fade show';
            notification.innerHTML = `
                <strong>Déconnecté</strong> - La connexion au serveur a été perdue. Tentative de reconnexion...
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fermer"></button>
            `;
            statusEl.appendChild(notification);
        }
        
        // Réinitialiser l'état
        this.simulationActive = false;
    }
    
    /**
     * Appelé lorsqu'il y a un problème de connexion pendant la simulation
     */
    onConnectionIssue() {
        // Mettre à jour l'interface utilisateur
        const statusEl = document.getElementById('status-container');
        if (statusEl) {
            const notification = document.createElement('div');
            notification.className = 'alert alert-warning alert-dismissible fade show';
            notification.innerHTML = `
                <strong>Attention</strong> - Aucune donnée reçue récemment. Vérifiez la connexion.
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fermer"></button>
            `;
            statusEl.appendChild(notification);
        }
    }
    
    /**
     * Appelé lorsque l'état de la simulation change
     * @param {Object} data - Données de statut de la simulation
     */
    onSimulationStatusChange(data) {
        // Mettre à jour l'interface utilisateur
        const startBtn = document.getElementById('start-btn');
        const stopBtn = document.getElementById('stop-btn');
        
        if (data.status === 'started') {
            if (startBtn) startBtn.disabled = true;
            if (stopBtn) stopBtn.disabled = false;
        } else if (data.status === 'stopped') {
            if (startBtn) startBtn.disabled = false;
            if (stopBtn) stopBtn.disabled = true;
        }
    }
    
    /**
     * Appelé lorsque de nouvelles données sont reçues
     * @param {Object} data - Données du véhicule et analyses
     */
    onDataUpdate(data) {
        // Les données sont traitées par VehicleControls
    }
    
    /**
     * Appelé lorsque le mode de simulation change
     * @param {Object} data - Données du mode de simulation
     */
    onModeChange(data) {
        // Mettre à jour l'interface utilisateur
        const modeDisplay = document.getElementById('simulation-mode');
        const modeSelector = document.getElementById('mode-selector');
        
        const modes = {
            urbain: { name: "Mode Urbain", color: "#3498db" },
            sport: { name: "Mode Sport", color: "#e74c3c" },
            autoroute: { name: "Mode Autoroute", color: "#f39c12" },
            eco: { name: "Mode Éco", color: "#2ecc71" }
        };
        
        if (data.mode && modes[data.mode]) {
            if (modeDisplay) {
                modeDisplay.textContent = `Mode: ${modes[data.mode].name}`;
                modeDisplay.style.backgroundColor = modes[data.mode].color;
            }
            
            if (modeSelector) {
                modeSelector.innerHTML = `<i class="fas fa-sliders-h"></i> ${modes[data.mode].name}`;
            }
        }
    }
}

// Exemple d'utilisation:
/*
const client = new RealtimeClient();

client.on('onConnect', () => {
    console.log('Connected!');
    client.startSimulation();
});

client.on('onStateUpdate', (state) => {
    console.log('New state:', state);
    // Mettre à jour l'interface utilisateur avec le nouvel état
});

// Envoyer des contrôles
client.sendControls({
    throttle: 0.5,
    brake: 0,
    steering: 0.2,
    gear: 1
});
*/ 