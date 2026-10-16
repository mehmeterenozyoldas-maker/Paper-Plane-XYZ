import * as THREE from 'three';
import * as xb from 'xrblocks';
import { coPilot } from './ai/AerodynamicCoPilot';
import { PlaneLauncher } from './interaction/PlaneLauncher';
import { AeroPhysics } from './physics/AeroPhysics';
import { AERO_PROFILES, createPaperPlaneMesh } from './planes/PlaneModels';
import { sounds } from './sound/AudioEffects';
import { AeroVectors } from './telemetry/AeroVectors';
import { FlightRibbon } from './telemetry/FlightRibbon';
import { WindStreamlines } from './telemetry/WindStreamlines';
import type { FlightState, PlaneType } from './types';
import { FlightControlsCard } from './ui/FlightControlsCard';
import { TelemetryCard } from './ui/TelemetryCard';

/**
 * Main WebXR Script for the Realistic Paper Plane Aerodynamics Simulation & Digital Twin.
 * Features dual native XR Blocks spatial UI panels: Flight Controls Card & Telemetry Card.
 */
class PaperPlaneSimulationApp extends xb.Script {
  private currentPlaneType: PlaneType = 'glider';
  private aeroPhysics!: AeroPhysics;
  private planeGroup!: THREE.Group;
  private launcher!: PlaneLauncher;

  // Digital Twin Visualizers
  private aeroVectors!: AeroVectors;
  private windStreamlines!: WindStreamlines;
  private flightRibbon!: FlightRibbon;

  // Native Spatial UI Panels
  private flightControlsCard!: FlightControlsCard;
  private telemetryCard!: TelemetryCard;

  // Environment elements
  private sunLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private runwayGroup!: THREE.Group;
  private pedestalGroup!: THREE.Group;
  private pedestalRing!: THREE.Mesh;

  private previousState: FlightState = 'held';

  init() {
    // 1. Lighting Setup
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 2.4);
    this.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfffbeb, 2.6);
    this.sunLight.position.set(3, 6, 2);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 25;
    const shadowSize = 8;
    this.sunLight.shadow.camera.left = -shadowSize;
    this.sunLight.shadow.camera.right = shadowSize;
    this.sunLight.shadow.camera.top = shadowSize;
    this.sunLight.shadow.camera.bottom = -shadowSize;
    this.add(this.sunLight);

    // 2. Flight Deck Runway & Distance Rings
    this.setupRunway();

    // 3. Launch Pedestal
    this.setupPedestal();

    // 4. Initialize Aerodynamic Physics Engine
    const profile = AERO_PROFILES[this.currentPlaneType];
    this.aeroPhysics = new AeroPhysics(profile);

    // 5. Build Initial Paper Plane 3D Mesh
    this.planeGroup = createPaperPlaneMesh(this.currentPlaneType);
    this.add(this.planeGroup);

    // 6. Launch Controller
    this.launcher = new PlaneLauncher(this.aeroPhysics, this.planeGroup);

    // 7. Digital Twin Visualizers
    this.aeroVectors = new AeroVectors();
    this.add(this.aeroVectors);

    this.windStreamlines = new WindStreamlines();
    this.add(this.windStreamlines);

    this.flightRibbon = new FlightRibbon();
    this.add(this.flightRibbon);

    // 8. Native Spatial UI Cards (Left: Flight Controls, Right: Telemetry)
    this.flightControlsCard = new FlightControlsCard({
      onSelectPlane: (type: PlaneType) => this.switchPlaneType(type),
      onLaunch: () => this.launchActivePlane(),
      onReset: () => this.resetPlane(),
      onToggleStreamlines: () => {
        this.windStreamlines.enabled = !this.windStreamlines.enabled;
        return this.windStreamlines.enabled;
      },
      onToggleVectors: () => {
        this.aeroVectors.enabled = !this.aeroVectors.enabled;
        return this.aeroVectors.enabled;
      },
      onSpeedChange: (speed: number) => {
        this.launcher.launchSpeed = speed;
      },
      onPitchChange: (pitchDeg: number) => {
        this.launcher.launchPitchDeg = pitchDeg;
      },
      onWindChange: (windZ: number) => {
        this.aeroPhysics.wind.set(0, 0, windZ);
      },
    });
    this.add(this.flightControlsCard.card);

    this.telemetryCard = new TelemetryCard();
    this.add(this.telemetryCard.card);

    // 9. Keyboard shortcuts for desktop testing convenience
    this.setupKeyboardShortcuts();
  }

  private setupRunway() {
    this.runwayGroup = new THREE.Group();
    this.runwayGroup.name = 'Runway';

    // Ground high-tech flight test grid
    const grid = new THREE.GridHelper(16, 32, 0x0284c7, 0x1e293b);
    grid.position.y = 0.002;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.5;
    this.runwayGroup.add(grid);

    // Central Runway Launch Line
    const lineGeo = new THREE.PlaneGeometry(0.12, 14);
    const lineMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });
    const runwayLine = new THREE.Mesh(lineGeo, lineMat);
    runwayLine.rotation.x = -Math.PI / 2;
    runwayLine.position.set(0, 0.004, -7);
    this.runwayGroup.add(runwayLine);

    // Concentric distance markers (2m, 4m, 6m, 8m, 10m)
    [2, 4, 6, 8, 10].forEach((dist) => {
      const ringGeo = new THREE.RingGeometry(dist - 0.02, dist + 0.02, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x0ea5e9,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(0, 0.003, -0.65);
      this.runwayGroup.add(ring);
    });

    this.add(this.runwayGroup);
  }

  private setupPedestal() {
    this.pedestalGroup = new THREE.Group();
    this.pedestalGroup.position.set(0, 0, -0.65);

    // Stand column
    const columnGeo = new THREE.CylinderGeometry(0.06, 0.12, 1.3, 24);
    const columnMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.3,
      metalness: 0.85,
    });
    const column = new THREE.Mesh(columnGeo, columnMat);
    column.position.y = 0.65;
    column.castShadow = true;
    column.receiveShadow = true;

    // Base platform
    const baseGeo = new THREE.CylinderGeometry(0.35, 0.42, 0.04, 32);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.2,
      metalness: 0.9,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.02;
    base.receiveShadow = true;

    // Magnetic levitation halo ring
    const ringGeo = new THREE.TorusGeometry(0.18, 0.012, 16, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
    });
    this.pedestalRing = new THREE.Mesh(ringGeo, ringMat);
    this.pedestalRing.rotation.x = Math.PI / 2;
    this.pedestalRing.position.y = 1.32;

    this.pedestalGroup.add(column, base, this.pedestalRing);
    this.add(this.pedestalGroup);
  }

  private switchPlaneType(type: PlaneType) {
    if (this.currentPlaneType === type) return;

    this.currentPlaneType = type;

    // Remove previous mesh
    this.remove(this.planeGroup);

    // Create new folded paper model
    this.planeGroup = createPaperPlaneMesh(type);
    this.add(this.planeGroup);

    // Update aerodynamic parameters
    const newProfile = AERO_PROFILES[type];
    this.aeroPhysics.setProfile(newProfile);
    this.launcher.setPlaneGroup(this.planeGroup);

    this.resetPlane();
  }

  private launchActivePlane() {
    this.flightRibbon.clearRibbon();
    this.launcher.launchPreset();
  }

  private resetPlane() {
    this.launcher.resetToHome();
    this.flightRibbon.clearRibbon();
  }

  private setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.launchActivePlane();
      } else if (e.code === 'KeyR') {
        this.resetPlane();
      } else if (e.code === 'Digit1') {
        this.switchPlaneType('dart');
      } else if (e.code === 'Digit2') {
        this.switchPlaneType('glider');
      } else if (e.code === 'Digit3') {
        this.switchPlaneType('concorde');
      }
    });
  }

  // WebXR Hand / Controller Direct Plane Throwing
  onSelectStart(event: xb.SelectEvent) {
    // Only trigger plane grab if targeting the plane or near the launch stand, not UI cards
    if (event.target === this.planeGroup || event.target?.parent === this.planeGroup) {
      if (this.aeroPhysics.state === 'held') {
        const controller = event.source.controller;
        const controllerPos = controller?.position ?? this.launcher.homePosition;
        this.launcher.startGrab(controllerPos);
      }
    }
  }

  onSelecting(event: xb.SelectEvent) {
    if (this.aeroPhysics.state === 'held') {
      const controller = event.source.controller;
      if (controller) {
        this.launcher.updateGrab(controller.position, controller.quaternion);
      }
    }
  }

  onSelectEnd(event: xb.SelectEvent) {
    if (this.aeroPhysics.state === 'held') {
      this.flightRibbon.clearRibbon();
      this.launcher.releaseThrow();
    }
  }

  update() {
    const dt = xb.getDeltaTime() || 0.016;
    const time = performance.now() * 0.001;

    // Step aerodynamic simulation
    this.aeroPhysics.update(dt);

    // Sync 3D mesh transform with physics
    if (this.aeroPhysics.state !== 'held') {
      this.planeGroup.position.copy(this.aeroPhysics.position);
      this.planeGroup.quaternion.copy(this.aeroPhysics.quaternion);
    }

    // Gentle magnetic levitation bobbing when resting on pedestal
    if (this.aeroPhysics.state === 'held') {
      this.planeGroup.position.y = this.launcher.homePosition.y + Math.sin(time * 3) * 0.012;
      this.pedestalRing.rotation.z = time * 0.8;
    }

    // Update Digital Twin visualizers
    this.aeroVectors.update(
      this.planeGroup.position,
      this.aeroPhysics.liftForce,
      this.aeroPhysics.dragForce,
      this.aeroPhysics.gravityForce,
      this.aeroPhysics.velocity
    );

    const aoaRad = THREE.MathUtils.degToRad(this.aeroPhysics.telemetry.angleOfAttackDeg);
    this.windStreamlines.update(
      this.planeGroup.position,
      this.planeGroup.quaternion,
      this.aeroPhysics.telemetry.airspeed,
      aoaRad,
      this.aeroPhysics.profile.wingspan
    );

    // Record trajectory ribbon during active flight
    if (this.aeroPhysics.state === 'gliding' || this.aeroPhysics.state === 'stall') {
      this.flightRibbon.addPoint(this.planeGroup.position, this.aeroPhysics.telemetry.airspeed);
    }

    // Landing target trigger, audio cue & Gemini AI Aerodynamic Co-Pilot analysis
    if (this.aeroPhysics.state === 'landed' && this.previousState !== 'landed') {
      sounds.playBounce(0.9);
      this.flightRibbon.showLandingMarker(this.planeGroup.position);

      const summary = {
        planeType: this.currentPlaneType,
        distanceM: this.aeroPhysics.telemetry.distanceTraveledM,
        flightTimeSec: this.aeroPhysics.telemetry.flightTimeSec,
        maxSpeedKmh: this.aeroPhysics.telemetry.maxSpeedKmh,
        maxAltitudeM: this.aeroPhysics.telemetry.maxAltitudeM,
        avgGlideRatio: this.aeroPhysics.telemetry.liftToDragRatio,
        landingPosition: this.planeGroup.position.clone(),
      };

      this.telemetryCard.setCoPilotDebrief('Gemini Co-Pilot analyzing flight dynamics...');

      coPilot.analyzeFlight(
        summary,
        this.launcher.launchPitchDeg,
        this.launcher.launchSpeed,
        this.aeroPhysics.didStall,
        this.aeroPhysics.stallTimeSec,
        (debrief) => {
          this.telemetryCard.setCoPilotDebrief(debrief);
        }
      );
    }
    this.previousState = this.aeroPhysics.state;
    this.flightRibbon.updateLandingAnimation(time);

    // Update Native Spatial UI Telemetry Card
    this.telemetryCard.updateTelemetry(this.aeroPhysics.telemetry);
  }

  dispose() {
    this.aeroVectors.dispose();
    this.windStreamlines.dispose();
    this.flightRibbon.dispose();
    this.sunLight.dispose();
  }
}

// Initialize XR Blocks Engine
document.addEventListener('DOMContentLoaded', async () => {
  const options = new xb.Options();

  // Hands & Controller options for Quest 3 and Android XR
  options.enableHands();
  options.hands.visualization = true;
  options.reticles.enabled = true;
  options.reticles.defaultRenderDistance = 8;

  // Real-world Room Depth & Scene Meshing
  options.enableDepth();
  options.world.enableMeshDetection();

  // Gemini AI Provider integration
  options.enableAI();

  // Simulator mode for instant desktop testing
  options.simulator.defaultMode = xb.SimulatorMode.CONTROLLER;

  options.setAppTitle('Paper Plane Aerodynamics Digital Twin');
  options.setAppDescription(
    'Realistic paper airplane flight simulation with wind tunnel streamlines, force vectors, and landing telemetry.'
  );

  xb.add(new PaperPlaneSimulationApp());
  await xb.init(options);
});
