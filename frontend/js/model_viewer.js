/**
 * Gestionnaire de modèle 3D pour la visualisation de la Renault ZOE
 * Utilise Three.js pour créer une visualisation 3D interactive
 */

// Variables globales pour la scène 3D
let scene, camera, renderer, carModel;
let isRotating = true;
let currentSpeed = 0;
let wheelAngle = 0;

// Configuration des couleurs
const COLORS = {
    background: 0x1e293b,
    ambient: 0xffffff,
    directional: 0xffffff,
    ground: 0x334155
};

// Configuration du modèle
const MODEL_CONFIG = {
    rotationSpeed: 0.005, // Vitesse de rotation automatique
    wheelRadius: 0.35,    // Rayon approximatif des roues
    cameraDistance: 5,    // Distance de la caméra
    cameraHeight: 2.5,    // Hauteur de la caméra
    modelScale: 1.5       // Échelle du modèle
};

// Initialisation de la visualisation 3D
function initModelViewer() {
    // Conteneur pour le modèle 3D
    const container = document.getElementById('vehicle-model');
    if (!container) return;
    
    // Créer la scène
    scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.background);
    
    // Créer la caméra
    const aspectRatio = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(45, aspectRatio, 0.1, 1000);
    camera.position.set(0, MODEL_CONFIG.cameraHeight, MODEL_CONFIG.cameraDistance);
    camera.lookAt(0, 1, 0);
    
    // Créer le renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    
    // Lumières
    addLights();
    
    // Sol
    addGround();
    
    // Modèle 3D de la voiture - version simplifiée
    createSimpleCar();
    
    // Gestion du redimensionnement
    window.addEventListener('resize', onWindowResize);
    
    // Démarrer l'animation
    animate();
    
    console.log('Visualiseur 3D initialisé avec succès');
}

// Créer les lumières pour la scène
function addLights() {
    // Lumière ambiante
    const ambientLight = new THREE.AmbientLight(COLORS.ambient, 0.6);
    scene.add(ambientLight);
    
    // Lumière directionnelle (soleil)
    const directionalLight = new THREE.DirectionalLight(COLORS.directional, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    
    // Configuration des ombres
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    
    scene.add(directionalLight);
    
    // Lumière d'appoint
    const fillLight = new THREE.DirectionalLight(COLORS.directional, 0.3);
    fillLight.position.set(-5, 5, -7.5);
    scene.add(fillLight);
}

// Créer le sol
function addGround() {
    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: COLORS.ground,
        roughness: 0.8
    });
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    
    scene.add(ground);
}

// Créer un modèle simplifié de voiture (en attendant un vrai modèle 3D)
function createSimpleCar() {
    // Groupe pour tous les éléments de la voiture
    carModel = new THREE.Group();
    
    // Matériaux
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x3b82f6, // Bleu Renault
        roughness: 0.2,
        metalness: 0.8
    });
    
    const glassMaterial = new THREE.MeshStandardMaterial({
        color: 0x90cdf4,
        roughness: 0.1,
        metalness: 0.2,
        transparent: true,
        opacity: 0.7
    });
    
    const wheelMaterial = new THREE.MeshStandardMaterial({
        color: 0x1e1e1e,
        roughness: 0.9
    });
    
    const rimMaterial = new THREE.MeshStandardMaterial({
        color: 0xc0c0c0,
        roughness: 0.3,
        metalness: 0.8
    });
    
    // Carrosserie principale
    const bodyGeometry = new THREE.BoxGeometry(2, 0.7, 4);
    const carBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
    carBody.position.y = 0.6;
    carBody.castShadow = true;
    carModel.add(carBody);
    
    // Toit
    const roofGeometry = new THREE.BoxGeometry(1.8, 0.6, 2.5);
    const roof = new THREE.Mesh(roofGeometry, bodyMaterial);
    roof.position.set(0, 1.25, -0.2);
    roof.castShadow = true;
    carModel.add(roof);
    
    // Pare-brise avant
    const windshieldGeometry = new THREE.BoxGeometry(1.7, 0.6, 0.1);
    const windshield = new THREE.Mesh(windshieldGeometry, glassMaterial);
    windshield.position.set(0, 1.1, 1.2);
    windshield.rotation.x = Math.PI / 8;
    carModel.add(windshield);
    
    // Pare-brise arrière
    const rearWindshieldGeometry = new THREE.BoxGeometry(1.7, 0.6, 0.1);
    const rearWindshield = new THREE.Mesh(rearWindshieldGeometry, glassMaterial);
    rearWindshield.position.set(0, 1.1, -1.5);
    rearWindshield.rotation.x = -Math.PI / 8;
    carModel.add(rearWindshield);
    
    // Fenêtres latérales
    const sideWindowGeometry = new THREE.BoxGeometry(0.1, 0.5, 2.5);
    
    const leftWindow = new THREE.Mesh(sideWindowGeometry, glassMaterial);
    leftWindow.position.set(0.9, 1.1, -0.2);
    carModel.add(leftWindow);
    
    const rightWindow = new THREE.Mesh(sideWindowGeometry, glassMaterial);
    rightWindow.position.set(-0.9, 1.1, -0.2);
    carModel.add(rightWindow);
    
    // Phares avant
    const headlightGeometry = new THREE.BoxGeometry(0.4, 0.2, 0.1);
    const headlightMaterial = new THREE.MeshStandardMaterial({
        color: 0xfff4cc,
        emissive: 0xfff4cc,
        emissiveIntensity: 0.5
    });
    
    const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    leftHeadlight.position.set(0.6, 0.6, 2);
    carModel.add(leftHeadlight);
    
    const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    rightHeadlight.position.set(-0.6, 0.6, 2);
    carModel.add(rightHeadlight);
    
    // Feux arrière
    const tailLightGeometry = new THREE.BoxGeometry(0.4, 0.2, 0.1);
    const tailLightMaterial = new THREE.MeshStandardMaterial({
        color: 0xff3333,
        emissive: 0xff0000,
        emissiveIntensity: 0.5
    });
    
    const leftTailLight = new THREE.Mesh(tailLightGeometry, tailLightMaterial);
    leftTailLight.position.set(0.6, 0.6, -2);
    carModel.add(leftTailLight);
    
    const rightTailLight = new THREE.Mesh(tailLightGeometry, tailLightMaterial);
    rightTailLight.position.set(-0.6, 0.6, -2);
    carModel.add(rightTailLight);
    
    // Roues
    const wheels = [];
    const wheelPositions = [
        { x: 0.9, y: 0, z: 1.2 },  // Avant gauche
        { x: -0.9, y: 0, z: 1.2 }, // Avant droite
        { x: 0.9, y: 0, z: -1.2 },  // Arrière gauche
        { x: -0.9, y: 0, z: -1.2 }  // Arrière droite
    ];
    
    wheelPositions.forEach((pos, index) => {
        // Pneu
        const wheelGeometry = new THREE.CylinderGeometry(
            MODEL_CONFIG.wheelRadius, 
            MODEL_CONFIG.wheelRadius, 
            0.3, 
            24
        );
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(pos.x, pos.y, pos.z);
        wheel.castShadow = true;
        
        // Jante
        const rimGeometry = new THREE.CylinderGeometry(
            MODEL_CONFIG.wheelRadius * 0.6, 
            MODEL_CONFIG.wheelRadius * 0.6, 
            0.31, 
            10
        );
        const rim = new THREE.Mesh(rimGeometry, rimMaterial);
        rim.rotation.z = Math.PI / 2;
        rim.position.set(pos.x, pos.y, pos.z);
        
        carModel.add(wheel);
        carModel.add(rim);
        
        // Stocker les roues avant pour la direction
        if (index < 2) {
            wheels.push({ wheel, rim });
        }
    });
    
    // Ajuster la position et l'échelle du modèle
    carModel.scale.set(
        MODEL_CONFIG.modelScale, 
        MODEL_CONFIG.modelScale, 
        MODEL_CONFIG.modelScale
    );
    carModel.position.y = 0.1;
    
    // Ajouter le modèle à la scène
    scene.add(carModel);
}

// Mettre à jour la vue lors du redimensionnement de la fenêtre
function onWindowResize() {
    const container = document.getElementById('vehicle-model');
    if (!container || !camera || !renderer) return;
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
}

// Animer la scène
function animate() {
    requestAnimationFrame(animate);
    
    if (!scene || !camera || !renderer || !carModel) return;
    
    // Rotation automatique si activée
    if (isRotating) {
        carModel.rotation.y += MODEL_CONFIG.rotationSpeed;
    }
    
    // Faire tourner les roues selon la vitesse
    animateWheels();
    
    renderer.render(scene, camera);
}

// Animer les roues en fonction de la vitesse
function animateWheels() {
    // Récupérer toutes les roues (les cylindres)
    scene.traverse((object) => {
        if (object instanceof THREE.Mesh && 
            object.geometry instanceof THREE.CylinderGeometry && 
            object.geometry.parameters.radiusTop === MODEL_CONFIG.wheelRadius) {
            
            // Les deux premières roues sont les roues avant (direction)
            const isSteeringWheel = (
                object.position.z > 0 && 
                (object.position.x === 0.9 * MODEL_CONFIG.modelScale || 
                 object.position.x === -0.9 * MODEL_CONFIG.modelScale)
            );
            
            // Appliquer la rotation des roues pour simuler le mouvement
            object.rotation.x += (currentSpeed / 100) * 0.1;
            
            // Appliquer l'angle de direction aux roues avant
            if (isSteeringWheel) {
                object.rotation.y = wheelAngle;
            }
        }
    });
}

// Mettre à jour l'état du modèle en fonction des données du véhicule
function updateModel(data) {
    if (!carModel) return;
    
    // Mettre à jour la vitesse actuelle
    currentSpeed = data.speed;
    
    // Mettre à jour l'angle des roues en fonction de la direction
    wheelAngle = data.steering * 0.5; // Conversion de la valeur de direction en radians
    
    // Simuler l'accélération en inclinant légèrement la voiture
    carModel.rotation.x = (data.throttle - data.brake) * 0.05;
    
    // Désactiver la rotation automatique si on est en mouvement
    isRotating = currentSpeed < 0.5;
}

// Exporter les fonctions dans l'espace global
window.modelViewer = {
    initModelViewer,
    updateModel
};

// Initialiser le visualiseur au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    // Vérifier si Three.js est disponible
    if (typeof THREE !== 'undefined') {
        initModelViewer();
    } else {
        console.error('Three.js n\'est pas chargé. Visualisation 3D désactivée.');
    }
}); 