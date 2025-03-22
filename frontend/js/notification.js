/**
 * Gestionnaire de notifications pour l'application Renault IA Analysis
 * Permet d'afficher des messages de statut à l'utilisateur
 */
class NotificationManager {
    /**
     * Constructeur du gestionnaire de notifications
     * @param {string} containerId - L'ID du conteneur HTML pour les notifications
     */
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        
        // Créer le conteneur s'il n'existe pas
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = containerId;
            document.querySelector('.dashboard').prepend(this.container);
        }
        
        // Tableau pour stocker les notifications actives
        this.activeNotifications = [];
        this.notificationCounter = 0;
    }
    
    /**
     * Affiche un message de notification
     * @param {string} message - Le message à afficher
     * @param {string} type - Le type de notification (success, info, warning, danger)
     * @param {number} duration - Durée d'affichage en ms (0 pour permanent)
     * @returns {string} - ID de la notification
     */
    showMessage(message, type = 'info', duration = 0) {
        // Générer un ID unique pour la notification
        const notificationId = `notification-${++this.notificationCounter}`;
        
        // Créer l'élément de notification
        const notification = document.createElement('div');
        notification.id = notificationId;
        notification.className = `alert alert-${type} alert-dismissible fade show`;
        notification.role = 'alert';
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fermer"></button>
        `;
        
        // Ajouter la notification au conteneur
        this.container.prepend(notification);
        
        // Stocker la référence
        this.activeNotifications.push(notificationId);
        
        // Supprimer automatiquement après la durée spécifiée
        if (duration > 0) {
            setTimeout(() => {
                this.removeMessage(notificationId);
            }, duration);
        }
        
        return notificationId;
    }
    
    /**
     * Supprime une notification par son ID
     * @param {string} notificationId - L'ID de la notification à supprimer
     */
    removeMessage(notificationId) {
        const notification = document.getElementById(notificationId);
        if (notification) {
            // Supprimer l'élément du DOM
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
            
            // Supprimer de la liste des notifications actives
            this.activeNotifications = this.activeNotifications.filter(id => id !== notificationId);
        }
    }
    
    /**
     * Supprime toutes les notifications
     */
    clearAllMessages() {
        // Copier le tableau pour éviter des problèmes lors de la suppression
        const notificationsToRemove = [...this.activeNotifications];
        
        // Supprimer chaque notification
        notificationsToRemove.forEach(id => {
            this.removeMessage(id);
        });
    }
    
    /**
     * Affiche un message de succès
     * @param {string} message - Le message à afficher
     * @param {number} duration - Durée d'affichage en ms
     * @returns {string} - ID de la notification
     */
    showSuccess(message, duration = 5000) {
        return this.showMessage(message, 'success', duration);
    }
    
    /**
     * Affiche un message d'information
     * @param {string} message - Le message à afficher
     * @param {number} duration - Durée d'affichage en ms
     * @returns {string} - ID de la notification
     */
    showInfo(message, duration = 7000) {
        return this.showMessage(message, 'info', duration);
    }
    
    /**
     * Affiche un message d'avertissement
     * @param {string} message - Le message à afficher
     * @param {number} duration - Durée d'affichage en ms
     * @returns {string} - ID de la notification
     */
    showWarning(message, duration = 10000) {
        return this.showMessage(message, 'warning', duration);
    }
    
    /**
     * Affiche un message d'erreur
     * @param {string} message - Le message à afficher
     * @param {number} duration - Durée d'affichage en ms (0 pour permanent)
     * @returns {string} - ID de la notification
     */
    showError(message, duration = 0) {
        return this.showMessage(message, 'danger', duration);
    }
}

// Instance globale du gestionnaire de notifications
let notificationManager = null;

// Initialiser le gestionnaire de notifications au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    // Créer un conteneur pour les notifications s'il n'existe pas
    if (!document.getElementById('notification-container')) {
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'position-fixed top-0 end-0 p-3';
        container.style.zIndex = '1050';
        document.body.appendChild(container);
    }
    
    notificationManager = new NotificationManager('notification-container');
});

/**
 * Fonction globale pour afficher une notification
 * @param {string} type - Type de notification (success, info, warning, error)
 * @param {string} title - Titre de la notification
 * @param {string} message - Message de la notification
 * @param {number} duration - Durée d'affichage en ms (0 pour permanent)
 */
function showNotification(type, title, message, duration) {
    // Si le gestionnaire n'est pas encore initialisé, le faire maintenant
    if (!notificationManager) {
        // Créer un conteneur pour les notifications s'il n'existe pas
        if (!document.getElementById('notification-container')) {
            const container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'position-fixed top-0 end-0 p-3';
            container.style.zIndex = '1050';
            document.body.appendChild(container);
        }
        
        notificationManager = new NotificationManager('notification-container');
    }
    
    // Composer le message avec titre si fourni
    const formattedMessage = title ? `<strong>${title}</strong><br>${message}` : message;
    
    // Afficher la notification selon le type
    switch(type) {
        case 'success':
            return notificationManager.showSuccess(formattedMessage, duration || 5000);
        case 'info':
            return notificationManager.showInfo(formattedMessage, duration || 7000);
        case 'warning':
            return notificationManager.showWarning(formattedMessage, duration || 10000);
        case 'error':
            return notificationManager.showError(formattedMessage, duration || 0);
        default:
            return notificationManager.showInfo(formattedMessage, duration || 7000);
    }
}