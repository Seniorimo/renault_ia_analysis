/**
 * Gestionnaire de Socket.IO pour le système de diagnostic Renault
 * Centralise toutes les communications temps réel avec le serveur
 */
class SocketManager {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.listeners = {};
        this.retryCount = 0;
        this.maxRetries = 5;
        this.componentEventMap = {
            'vehicle_data_update': ['charts', 'analysis', 'dashboard', 'controls'],
            'status': ['dashboard', 'log'],
            'anomaly_detected': ['log', 'dashboard', 'analysis'],
            'analysis_update': ['analysis', 'log'],
            'simulation_status': ['controls', 'dashboard'],
            'mode_changed': ['controls', 'dashboard']
        };
    }
    
    /**
     * Initialise la connexion Socket.IO
     * @returns {boolean} - Indique si l'initialisation a réussi
     */
    initialize() {
        try {
            console.log('Initialisation de Socket.IO...');
            
            // Construire l'URL basée sur l'origine actuelle pour éviter les problèmes CORS
            const socketURL = window.location.origin;
            
            // Options de connexion Socket.IO
            const options = {
                reconnection: true,
                reconnectionAttempts: this.maxRetries,
                reconnectionDelay: 1000,
                timeout: 5000
            };
            
            // Initialiser la connexion Socket.IO
            this.socket = io(socketURL, options);
            
            // Configurer les gestionnaires d'événements de base
            this.socket.on('connect', () => {
                console.log('Connexion Socket.IO établie');
                this.connected = true;
                this.retryCount = 0;
                
                // Informer les composants qui écoutent l'événement 'connect'
                this.notify('connect', { status: 'connected' });
            });
            
            this.socket.on('disconnect', () => {
                console.log('Connexion Socket.IO perdue');
                this.connected = false;
                
                // Informer les composants qui écoutent l'événement 'disconnect'
                this.notify('disconnect', { status: 'disconnected' });
            });
            
            this.socket.on('connect_error', (error) => {
                this.retryCount++;
                console.warn(`Erreur de connexion Socket.IO (${this.retryCount}/${this.maxRetries}):`, error);
                
                if (this.retryCount >= this.maxRetries) {
                    console.error('Nombre maximum de tentatives atteint. Abandon de la connexion Socket.IO.');
                    this.socket.disconnect();
                }
                
                // Informer les composants qui écoutent l'événement 'connect_error'
                this.notify('connect_error', { error: error.toString(), retry: this.retryCount });
            });
            
            // Enregistrer les gestionnaires d'événements pour tous les types de données
            Object.keys(this.componentEventMap).forEach(eventName => {
                this.socket.on(eventName, (data) => {
                    // Notifier tous les composants intéressés par cet événement
                    this.notify(eventName, data);
                });
            });
            
            return true;
        } catch (error) {
            console.error('Erreur lors de l\'initialisation de Socket.IO:', error);
            return false;
        }
    }
    
    /**
     * Vérifie si la connexion Socket.IO est établie
     * @returns {boolean} État de la connexion
     */
    isConnected() {
        return this.connected && this.socket && this.socket.connected;
    }
    
    /**
     * Enregistre un écouteur pour un type d'événement spécifique
     * @param {string} event - Nom de l'événement à écouter
     * @param {function} callback - Fonction à appeler lorsque l'événement est reçu
     * @param {string} componentType - Type de composant (charts, analysis, dashboard, controls, log)
     */
    on(event, callback, componentType = 'general') {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        
        this.listeners[event].push({ callback, componentType });
        console.log(`Écouteur ajouté pour l'événement '${event}' (${componentType})`);
    }
    
    /**
     * Envoie un événement au serveur
     * @param {string} event - Nom de l'événement
     * @param {object} data - Données à envoyer
     */
    emit(event, data) {
        if (!this.isConnected()) {
            console.warn(`Tentative d'envoi de l'événement '${event}' alors que Socket.IO n'est pas connecté`);
            return false;
        }
        
        try {
            this.socket.emit(event, data);
            return true;
        } catch (error) {
            console.error(`Erreur lors de l'envoi de l'événement '${event}':`, error);
            return false;
        }
    }
    
    /**
     * Notifie tous les écouteurs enregistrés pour un événement
     * @param {string} event - Nom de l'événement
     * @param {object} data - Données de l'événement
     * @private
     */
    notify(event, data) {
        if (!this.listeners[event]) return;
        
        // Récupérer les types de composants intéressés par cet événement
        const interestedComponents = this.componentEventMap[event] || ['general'];
        
        // Notifier tous les écouteurs enregistrés pour cet événement
        this.listeners[event].forEach(listener => {
            // Vérifier si le composant est intéressé par cet événement
            if (interestedComponents.includes(listener.componentType) || listener.componentType === 'general') {
                try {
                    listener.callback(data);
                } catch (error) {
                    console.error(`Erreur dans l'écouteur pour l'événement '${event}':`, error);
                }
            }
        });
    }
    
    /**
     * Déconnecte la connexion Socket.IO
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.connected = false;
            console.log('Déconnexion Socket.IO');
        }
    }
}