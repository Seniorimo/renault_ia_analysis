/**
 * Gestionnaire de la scène 3D pour Renault ZOE
 */
class ThreeDManager {
    constructor() {
        this.engine = null;
        this.scene = null;
        this.camera = null;
        this.vehicle = null;
        this.isInitialized = false;
        this.isRunning = false;
        this.canvas = document.getElementById('vehicle3D');
        
        // Données du véhicule
        this.vehicleData = {
            speed: 0,
            acceleration: 0,
            battery_level: 100,
            motor_temperature: 25,
            brake_temperature: 20,
            brake: 0
        };
        
        this.initialize();
    }
    
    /**
     * Initialise la scène 3D
     */
    async initialize() {
        if (!this.canvas) {
            console.error('Canvas 3D non trouvé');
            return;
        }
        
        try {
            console.log('Initialisation de la scène 3D...');
            
            // Création du moteur Babylon.js
            this.engine = new BABYLON.Engine(this.canvas, true);
            this.scene = new BABYLON.Scene(this.engine);
            
            // Configuration de la scène
            this.scene.clearColor = new BABYLON.Color3(0.52, 0.80, 0.92);
            this.scene.ambientColor = new BABYLON.Color3(1, 1, 1);
            
            // Caméra
            this.camera = new BABYLON.ArcRotateCamera(
                "camera", 
                BABYLON.Tools.ToRadians(90), 
                BABYLON.Tools.ToRadians(65), 
                7, 
                BABYLON.Vector3.Zero(), 
                this.scene
            );
            this.camera.attachControl(this.canvas, true);
            this.camera.lowerRadiusLimit = 5;
            this.camera.upperRadiusLimit = 15;
            
            // Lumières
            this._createLights();
            
            // Environnement et véhicule
            this._createEnvironment();
            this.vehicle = this._createVehicle();
            
            // Animation de base
            this.scene.registerBeforeRender(() => {
                if (this.vehicle && !this.isRunning) {
                    this.vehicle.rotation.y += 0.005;
                }
            });
            
            // Boucle de rendu
            this.engine.runRenderLoop(() => {
                this.scene.render();
            });
            
            // Gestion du redimensionnement
            window.addEventListener("resize", () => {
                this.engine.resize();
            });
            
            this.isInitialized = true;
            console.log('Scène 3D initialisée avec succès');
            
            // Mise à jour des contrôles
            this._setupViewControls();
            
        } catch (error) {
            console.error('Erreur lors de l\'initialisation de la scène 3D:', error);
        }
    }
    
    /**
     * Crée les lumières de la scène
     */
    _createLights() {
        // Lumière ambiante
        const hemisphericLight = new BABYLON.HemisphericLight(
            "light", 
            new BABYLON.Vector3(0, 1, 0), 
            this.scene
        );
        hemisphericLight.intensity = 0.7;
        
        // Lumière directionnelle (soleil)
        const directionalLight = new BABYLON.DirectionalLight(
            "dirLight",
            new BABYLON.Vector3(-1, -2, -1),
            this.scene
        );
        directionalLight.position = new BABYLON.Vector3(20, 40, 20);
        directionalLight.intensity = 0.7;
        
        // Ombres
        const shadowGenerator = new BABYLON.ShadowGenerator(2048, directionalLight);
        shadowGenerator.useBlurExponentialShadowMap = true;
        shadowGenerator.blurKernel = 32;
        
        this.shadowGenerator = shadowGenerator;
    }
    
    /**
     * Crée l'environnement (route, terrain...)
     */
    _createEnvironment() {
        // Sol / Route
        const ground = BABYLON.MeshBuilder.CreateGround("ground", {
            width: 100,
            height: 100,
            subdivisions: 2
        }, this.scene);
        
        const groundMaterial = new BABYLON.PBRMaterial("groundMat", this.scene);
        groundMaterial.albedoColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        groundMaterial.roughness = 0.9;
        ground.material = groundMaterial;
        ground.receiveShadows = true;
        
        // Route
        const road = BABYLON.MeshBuilder.CreateGround("road", {
            width: 8,
            height: 100,
            subdivisions: 2
        }, this.scene);
        road.position.y = 0.01;
        
        const roadMaterial = new BABYLON.PBRMaterial("roadMat", this.scene);
        roadMaterial.albedoColor = new BABYLON.Color3(0.15, 0.15, 0.15);
        roadMaterial.roughness = 0.85;
        road.material = roadMaterial;
        road.receiveShadows = true;
        
        // Lignes blanches sur la route
        const lineMaterial = new BABYLON.PBRMaterial("lineMat", this.scene);
        lineMaterial.albedoColor = new BABYLON.Color3(0.9, 0.9, 0.9);
        lineMaterial.roughness = 0.6;
        
        for (let i = -50; i < 50; i += 5) {
            if (i % 15 !== 0) continue; // Espacer les lignes
            
            const line = BABYLON.MeshBuilder.CreateBox("line", {
                width: 0.2,
                height: 0.02,
                depth: 3
            }, this.scene);
            line.position = new BABYLON.Vector3(0, 0.02, i);
            line.material = lineMaterial;
            line.receiveShadows = true;
        }
    }
    
    /**
     * Crée le modèle de Renault ZOE
     */
    _createVehicle() {
        const vehicleRoot = new BABYLON.TransformNode("vehicleRoot", this.scene);

        // Matériaux principaux
        const bodyMaterial = new BABYLON.PBRMaterial("bodyMat", this.scene);
        bodyMaterial.albedoColor = new BABYLON.Color3(0.1, 0.1, 0.8); // Bleu Renault
        bodyMaterial.metallic = 0.7;
        bodyMaterial.roughness = 0.3;
        bodyMaterial.clearCoat.isEnabled = true;
        bodyMaterial.clearCoat.intensity = 1;
        bodyMaterial.clearCoat.roughness = 0.1;

        const glassMaterial = new BABYLON.PBRMaterial("glassMat", this.scene);
        glassMaterial.albedoColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        glassMaterial.alpha = 0.5;
        glassMaterial.metallic = 0.9;
        glassMaterial.roughness = 0.1;

        const wheelMaterial = new BABYLON.PBRMaterial("wheelMat", this.scene);
        wheelMaterial.albedoColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        wheelMaterial.metallic = 0.7;
        wheelMaterial.roughness = 0.4;

        const tireMaterial = new BABYLON.PBRMaterial("tireMat", this.scene);
        tireMaterial.albedoColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        tireMaterial.roughness = 0.9;

        // Chassis principal
        const carBody = BABYLON.MeshBuilder.CreateBox("carBody", {
            width: 1.8,
            height: 1.4,
            depth: 4.2
        }, this.scene);
        carBody.position.y = 0.7;
        carBody.material = bodyMaterial;
        carBody.parent = vehicleRoot;

        // Toit avec courbe
        const roofBody = BABYLON.MeshBuilder.CreateBox("roofBody", {
            width: 1.75,
            height: 0.6,
            depth: 2.8
        }, this.scene);
        roofBody.position.y = 1.5;
        roofBody.position.z = -0.3;
        roofBody.material = bodyMaterial;
        roofBody.parent = vehicleRoot;

        // Partie basse / châssis
        const chassis = BABYLON.MeshBuilder.CreateBox("chassis", {
            width: 1.7,
            height: 0.3,
            depth: 4.0
        }, this.scene);
        chassis.position.y = 0.25;
        chassis.material = new BABYLON.PBRMaterial("chassisMat", this.scene);
        chassis.material.albedoColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        chassis.material.roughness = 0.8;
        chassis.parent = vehicleRoot;

        // Pare-brise
        const windshield = BABYLON.MeshBuilder.CreateBox("windshield", {
            width: 1.6,
            height: 0.9,
            depth: 0.1
        }, this.scene);
        windshield.material = glassMaterial;
        windshield.position = new BABYLON.Vector3(0, 1.2, 0.9);
        windshield.rotation.x = Math.PI * 0.27;
        windshield.parent = vehicleRoot;

        // Vitre arrière
        const rearWindow = BABYLON.MeshBuilder.CreateBox("rearWindow", {
            width: 1.6,
            height: 0.9,
            depth: 0.1
        }, this.scene);
        rearWindow.material = glassMaterial;
        rearWindow.position = new BABYLON.Vector3(0, 1.2, -1.5);
        rearWindow.rotation.x = -Math.PI * 0.27;
        rearWindow.parent = vehicleRoot;

        // Vitres latérales
        [-0.9, 0.9].forEach((x, idx) => {
            const sideWindow = BABYLON.MeshBuilder.CreateBox(`sideWindow${idx}`, {
                width: 0.1,
                height: 0.7,
                depth: 2.6
            }, this.scene);
            sideWindow.material = glassMaterial;
            sideWindow.position = new BABYLON.Vector3(x, 1.3, -0.3);
            sideWindow.parent = vehicleRoot;
        });

        // Roues
        const wheelPositions = [
            [-0.85, 0.35, 1.4],  // Avant gauche
            [0.85, 0.35, 1.4],   // Avant droit
            [-0.85, 0.35, -1.4], // Arrière gauche
            [0.85, 0.35, -1.4]   // Arrière droit
        ];

        const wheels = [];
        wheelPositions.forEach((pos, index) => {
            // Jante
            const wheelRim = BABYLON.MeshBuilder.CreateCylinder(`wheelRim${index}`, {
                height: 0.2,
                diameter: 0.6
            }, this.scene);
            wheelRim.rotation.x = Math.PI/2;
            wheelRim.position = new BABYLON.Vector3(...pos);
            wheelRim.material = wheelMaterial;
            wheelRim.parent = vehicleRoot;

            // Pneu
            const tire = BABYLON.MeshBuilder.CreateTorus(`tire${index}`, {
                diameter: 0.6,
                thickness: 0.22,
                tessellation: 24
            }, this.scene);
            tire.rotation.x = Math.PI/2;
            tire.position = new BABYLON.Vector3(...pos);
            tire.material = tireMaterial;
            tire.parent = vehicleRoot;
            
            wheels.push({rim: wheelRim, tire: tire, position: pos});
            
            this.shadowGenerator.addShadowCaster(wheelRim);
            this.shadowGenerator.addShadowCaster(tire);
        });

        // Phares avant
        const headlightMaterial = new BABYLON.PBRMaterial("headlightMat", this.scene);
        headlightMaterial.albedoColor = new BABYLON.Color3(0.9, 0.9, 0.9);
        headlightMaterial.emissiveColor = new BABYLON.Color3(1, 1, 0.8); // Teinte jaunâtre
        headlightMaterial.emissiveIntensity = 0.8;

        // Phares avant
        const headlights = [];
        [-0.6, 0.6].forEach((x, idx) => {
            const headlight = BABYLON.MeshBuilder.CreateCapsule(`headlight${idx}`, {
                radius: 0.12,
                height: 0.3
            }, this.scene);
            headlight.rotation.z = Math.PI/2;
            headlight.position = new BABYLON.Vector3(x, 0.6, 2.05);
            headlight.material = headlightMaterial;
            headlight.parent = vehicleRoot;
            headlights.push(headlight);
        });

        // Feux arrière
        const tailLightMaterial = new BABYLON.PBRMaterial("tailLightMat", this.scene);
        tailLightMaterial.albedoColor = new BABYLON.Color3(0.8, 0.1, 0.1);
        tailLightMaterial.emissiveColor = new BABYLON.Color3(1, 0, 0); // Rouge vif

        const taillights = [];
        [-0.6, 0.6].forEach((x, idx) => {
            const tailLight = BABYLON.MeshBuilder.CreateCapsule(`tailLight${idx}`, {
                radius: 0.12,
                height: 0.3
            }, this.scene);
            tailLight.rotation.z = Math.PI/2;
            tailLight.position = new BABYLON.Vector3(x, 0.6, -2.05);
            tailLight.material = tailLightMaterial;
            tailLight.parent = vehicleRoot;
            taillights.push(tailLight);
        });

        // Logo Renault
        const logoMaterial = new BABYLON.PBRMaterial("logoMat", this.scene);
        logoMaterial.albedoColor = new BABYLON.Color3(0.9, 0.9, 0.9);
        logoMaterial.metallic = 1;
        logoMaterial.roughness = 0.2;

        const frontLogo = BABYLON.MeshBuilder.CreateBox("frontLogo", {
            width: 0.3,
            height: 0.3,
            depth: 0.05
        }, this.scene);
        frontLogo.position = new BABYLON.Vector3(0, 0.7, 2.1);
        frontLogo.material = logoMaterial;
        frontLogo.parent = vehicleRoot;

        // Port de recharge
        const chargingPortMaterial = new BABYLON.PBRMaterial("chargingPortMat", this.scene);
        chargingPortMaterial.albedoColor = new BABYLON.Color3(0.7, 0.7, 0.7);
        
        const chargingPort = BABYLON.MeshBuilder.CreateCylinder("chargingPort", {
            diameter: 0.2,
            height: 0.05
        }, this.scene);
        chargingPort.position = new BABYLON.Vector3(0.8, 0.8, 1.9);
        chargingPort.rotation.z = Math.PI/2;
        chargingPort.material = chargingPortMaterial;
        chargingPort.parent = vehicleRoot;

        // Ajout des zones thermiques (pour la vue thermique)
        const thermalZones = [];
        
        // Zone du moteur
        const engineZone = BABYLON.MeshBuilder.CreateBox("engineZone", {
            width: 1.6,
            height: 0.5,
            depth: 1.0
        }, this.scene);
        engineZone.position = new BABYLON.Vector3(0, 0.5, 1.5);
        engineZone.material = new BABYLON.StandardMaterial("engineZoneMat", this.scene);
        engineZone.material.alpha = 0;
        engineZone.parent = vehicleRoot;
        thermalZones.push({mesh: engineZone, name: "Moteur", baseTemp: 40});

        // Zone de batterie
        const batteryZone = BABYLON.MeshBuilder.CreateBox("batteryZone", {
            width: 1.6,
            height: 0.3,
            depth: 2.5
        }, this.scene);
        batteryZone.position = new BABYLON.Vector3(0, 0.3, -0.3);
        batteryZone.material = new BABYLON.StandardMaterial("batteryZoneMat", this.scene);
        batteryZone.material.alpha = 0;
        batteryZone.parent = vehicleRoot;
        thermalZones.push({mesh: batteryZone, name: "Batterie", baseTemp: 25});
        
        // Ombres
        carBody.receiveShadows = true;
        roofBody.receiveShadows = true;
        chassis.receiveShadows = true;
        
        this.shadowGenerator.addShadowCaster(carBody);
        this.shadowGenerator.addShadowCaster(roofBody);
        this.shadowGenerator.addShadowCaster(chassis);

        // Stockage des références pour animations
        vehicleRoot.wheels = wheels;
        vehicleRoot.headlights = headlights;
        vehicleRoot.taillights = taillights;
        vehicleRoot.thermalZones = thermalZones;

        return vehicleRoot;
    }
    
    /**
     * Configure les contrôles de vue
     */
    _setupViewControls() {
        // Gestionnaire d'événements pour le menu de vue
        document.getElementById('viewMode').addEventListener('change', (e) => {
            if (!this.scene || !this.vehicle) return;
            
            const mode = e.target.value;
            this._applyViewMode(mode);
        });
        
        // Bouton plein écran
        document.getElementById('fullscreen3D').addEventListener('click', () => {
            if (this.engine) {
                this.engine.enterFullscreen(true);
            }
        });
        
        // Bouton réinitialiser caméra
        document.getElementById('resetCamera').addEventListener('click', () => {
            if (this.camera) {
                this.camera.setPosition(new BABYLON.Vector3(0, 5, 10));
                this.camera.setTarget(BABYLON.Vector3.Zero());
            }
        });
    }
    
    /**
     * Applique un mode de visualisation
     */
    _applyViewMode(mode) {
        switch(mode) {
            case 'thermal':
                // Vue thermique - zones thermiques visibles
                if (this.vehicle && this.vehicle.thermalZones) {
                    this.vehicle.thermalZones.forEach(zone => {
                        if (zone.mesh && zone.mesh.material) {
                            zone.mesh.material.alpha = 0.7;
                            // Couleur basée sur la température
                            const temp = zone.name === "Moteur" ? 
                                this.vehicleData.motor_temperature : 
                                this.vehicleData.battery_temperature;
                            
                            const normalizedTemp = Math.max(0, Math.min(1, (temp - 20) / 80));
                            zone.mesh.material.emissiveColor = new BABYLON.Color3(
                                normalizedTemp, // Rouge pour chaud
                                1 - normalizedTemp, // Vert pour froid
                                0.2 // Peu de bleu
                            );
                        }
                    });
                    
                    // Semi-transparence pour le reste
                    this.vehicle.getChildMeshes().forEach(mesh => {
                        if (mesh.material && 
                            !mesh.name.includes("Zone") && 
                            !mesh.name.includes("light")) {
                            mesh.material.alpha = Math.max(0.3, mesh.material.alpha);
                        }
                    });
                }
                break;
                
            case 'battery':
                // Vue batterie
                if (this.vehicle) {
                    const batteryLevel = this.vehicleData.battery_level / 100;
                    this.vehicle.getChildMeshes().forEach(mesh => {
                        if (mesh.name === "batteryZone") {
                            if (mesh.material) {
                                mesh.material.alpha = 0.7;
                                mesh.material.emissiveColor = new BABYLON.Color3(
                                    1 - batteryLevel, // Rouge quand batterie faible
                                    batteryLevel,     // Vert quand batterie pleine
                                    0.2
                                );
                            }
                        } else if (mesh.material && 
                                  !mesh.name.includes("wheel") && 
                                  !mesh.name.includes("light")) {
                            // Semi-transparent pour voir la batterie
                            mesh.material.alpha = 0.3;
                        }
                    });
                }
                break;
                
            case 'aero':
                // Vue aérodynamique
                if (this.vehicle) {
                    // Créer dynamiquement un système de particules si nécessaire
                    if (!this.scene.getParticleSystemByName("aeroParticles")) {
                        const particleSystem = new BABYLON.ParticleSystem("aeroParticles", 2000, this.scene);
                        
                        // Charge la texture directement depuis le serveur
                        particleSystem.particleTexture = new BABYLON.Texture("/static/textures/particle.png", this.scene);
                        
                        particleSystem.emitter = new BABYLON.Vector3(0, 0.8, -2.1); // Arrière du véhicule
                        particleSystem.minEmitBox = new BABYLON.Vector3(-0.8, 0, 0);
                        particleSystem.maxEmitBox = new BABYLON.Vector3(0.8, 0.5, 0);
                        particleSystem.color1 = new BABYLON.Color4(0.1, 0.1, 1.0, 0.4);
                        particleSystem.color2 = new BABYLON.Color4(0.1, 0.1, 0.8, 0.2);
                        particleSystem.minSize = 0.1;
                        particleSystem.maxSize = 0.5;
                        particleSystem.minLifeTime = 0.5;
                        particleSystem.maxLifeTime = 1.5;
                        particleSystem.emitRate = 500;
                        particleSystem.direction1 = new BABYLON.Vector3(0, 0, -5);
                        particleSystem.direction2 = new BABYLON.Vector3(0, 0, -10);
                        particleSystem.updateSpeed = 0.01;
                        particleSystem.start();
                    } else {
                        const particles = this.scene.getParticleSystemByName("aeroParticles");
                        particles.start();
                    }
                }
                break;
                
            default:
                // Vue extérieure normale
                if (this.vehicle) {
                    this.vehicle.getChildMeshes().forEach(mesh => {
                        if (mesh.material) {
                            if (mesh.name.includes("glass")) {
                                mesh.material.alpha = 0.5; // Verre transparent
                            } else if (!mesh.name.includes("Zone")) {
                                mesh.material.alpha = 1.0; // Reste opaque
                            } else {
                                mesh.material.alpha = 0; // Zones invisibles
                            }
                            
                            // Désactiver l'émissivité sauf pour les lumières
                            if (!mesh.name.includes("light") && !mesh.name.includes("Zone")) {
                                mesh.material.emissiveColor = new BABYLON.Color3(0, 0, 0);
                            }
                        }
                    });
                    
                    // Arrêter système de particules si existe
                    const particles = this.scene.getParticleSystemByName("aeroParticles");
                    if (particles) {
                        particles.stop();
                    }
                }
                break;
        }
    }
    
    /**
     * Met à jour les données du véhicule
     */
    updateVehicleData(data) {
        if (!this.vehicle || !this.scene || !this.engine) return;
        
        try {
            // Mise à jour des données
            this.vehicleData = {
                ...this.vehicleData,
                ...data
            };
            
            // Conversion vitesse
            const speed = data.speed || Math.sqrt(
                (data.velocity ? (data.velocity[0] * data.velocity[0] + 
                              data.velocity[1] * data.velocity[1] + 
                              data.velocity[2] * data.velocity[2]) : 0)
            ) * 3.6; // m/s to km/h
            
            // Accélération normalisée [-1, 1]
            const accel = data.acceleration ? data.acceleration[0] : 0;
            const normalizedAccel = Math.max(-1, Math.min(1, accel / 10));
            
            // Inclinaison basée sur l'accélération
            const targetRotation = -normalizedAccel * 0.05; // Inclinaison plus subtile
            this.vehicle.rotation.x = BABYLON.Scalar.Lerp(
                this.vehicle.rotation.x,
                targetRotation,
                0.1
            );
            
            // Rotation des roues
            if (this.vehicle.wheels) {
                const wheelSpeed = speed / 100; // Ajustement pour une rotation réaliste
                this.vehicle.wheels.forEach(wheel => {
                    if (wheel.rim && wheel.tire) {
                        wheel.rim.rotation.y += wheelSpeed;
                        wheel.tire.rotation.y += wheelSpeed;
                    }
                });
            }
            
            // Gestion des phares
            if (this.vehicle.headlights) {
                // Intensité augmente si la batterie est faible ou à grande vitesse
                const headlightIntensity = Math.min(1, 0.5 + Math.max(0, 1 - (data.battery_level || 100) / 100) + (speed / 200));
                this.vehicle.headlights.forEach(light => {
                    if (light && light.material) {
                        light.material.emissiveIntensity = headlightIntensity;
                    }
                });
            }
            
            // Gestion des feux arrière/stop
            if (this.vehicle.taillights && data.brake > 0.1) {
                // Intensité des feux de stop basée sur la force de freinage
                const brakeIntensity = 0.5 + Math.min(0.5, data.brake);
                this.vehicle.taillights.forEach(light => {
                    if (light && light.material) {
                        light.material.emissiveIntensity = brakeIntensity;
                    }
                });
            } else if (this.vehicle.taillights) {
                // Feux arrière normaux
                this.vehicle.taillights.forEach(light => {
                    if (light && light.material) {
                        light.material.emissiveIntensity = 0.5;
                    }
                });
            }
            
            // Appliquer le mode de vue courant
            const viewMode = document.getElementById('viewMode').value;
            this._applyViewMode(viewMode);

            // Mise à jour des statistiques 3D
            document.getElementById('speed3D').textContent = `${speed.toFixed(1)} km/h`;
            document.getElementById('battery3D').textContent = `${(data.battery_level || 100).toFixed(1)}%`;
            document.getElementById('temp3D').textContent = `${(data.motor_temperature || 25).toFixed(1)}°C`;
            document.getElementById('acc3D').textContent = `${accel.toFixed(2)} m/s²`;
            
        } catch (error) {
            console.error('Erreur lors de la mise à jour du véhicule 3D:', error);
        }
    }
    
    /**
     * Démarre la simulation
     */
    startSimulation() {
        this.isRunning = true;
    }
    
    /**
     * Arrête la simulation
     */
    stopSimulation() {
        this.isRunning = false;
    }
}

// Création du gestionnaire 3D au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    window.threeDManager = new ThreeDManager();
    
    // Connexion au client temps réel
    if (window.vehicleControls && window.vehicleControls.client) {
        window.vehicleControls.client.on('onStateUpdate', (data) => {
            if (window.threeDManager) {
                window.threeDManager.updateVehicleData(data);
            }
        });
    }
}); 