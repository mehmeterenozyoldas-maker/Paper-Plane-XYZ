# Dual Spatial XR UI Panels for Paper Plane Digital Twin - Implementation Plan

## Overview
This plan transitions the entire interface from 2D DOM elements to **native XR Blocks 3D Spatial UI panels** (`xb.UICard`, `xb.UIPanel`, `xb.UIButton`, `xb.UISlider`, `xb.UIText`).

Per user preference, the experience will feature **Dual 3D Spatial Cards**:
1. **Left Card: Flight Controls (`UICard`)**: Model selector (Dart, Glider, Concorde), launch & reset actions, visualizer toggles (streamlines, force vectors), and interactive sliders (speed, pitch, wind).
2. **Right Card: Live Digital Twin Telemetry (`UICard`)**: Real-time aerodynamic readouts (Airspeed, Altitude, AoA, $L/D$ glide ratio, Lift force, Drag force, Distance, and Flight State).
3. **Full 6-DoF Grabbability**: Both cards have `manipulation: true` and `edge: true`, allowing users to grab, reposition, or resize them anywhere in room space with controllers, tracked hands, or desktop simulator reticles.

---

## User Review Required

> [!IMPORTANT]
> - **Zero DOM HUD Overlays**: The 2D HTML overlay is completely removed. All interactions occur directly in the 3D WebXR world through XR Blocks' native spatial UI system.
> - **Native Raycasting & Direct Touch**: Buttons and sliders use XR Blocks' semantic control pipeline (`UIButton`, `UISlider`) ensuring immediate responsiveness to simulator clicks, controller triggers, and tracked hand pinches without event listener conflicts.

---

## Proposed Changes & Architecture

### 1. Remove 2D DOM Overlay
- Delete `src/ui/FlightHUD.ts`.
- Remove any window-level pointer event listeners that were hijacking mouse clicks from XR Blocks reticles.

### 2. Native Flight Controls Spatial Card (`src/ui/FlightControlsCard.ts`)
- Implemented as a world-space `xb.UICard`:
  - `size: { width: 0.54, height: 'auto' }`
  - `manipulation: true` (movable anywhere in 3D space)
  - `edge: true` (resizable edges)
  - Initial pose: placed at `(-0.55, 1.45, -1.05)`, angled 18° inward toward the user.
- Components inside:
  - Header with icon and title: `✈️ Flight Controls`
  - Model selection button row:
    - `UIButton` for Classic Dart
    - `UIButton` for Nakamura Glider
    - `UIButton` for Concorde Canard
  - Action button rows:
    - `UIButton` "Launch Plane" (`icon: 'rocket_launch'`)
    - `UIButton` "Reset to Stand" (`icon: 'restart_alt'`)
    - `UIButton` "Streamlines" (`icon: 'air'`)
    - `UIButton` "Force Vectors" (`icon: 'straighten'`)
  - Sliders with live value labels:
    - Launch Speed `UISlider` (2.0 to 10.0 m/s)
    - Launch Pitch `UISlider` (0° to 30°)
    - Headwind `UISlider` (-4.0 to +4.0 m/s)

### 3. Native Live Telemetry Spatial Card (`src/ui/TelemetryCard.ts`)
- Implemented as a world-space `xb.UICard`:
  - `size: { width: 0.48, height: 'auto' }`
  - `manipulation: true` (movable anywhere in 3D space)
  - `edge: true` (resizable edges)
  - Initial pose: placed at `(0.55, 1.45, -1.05)`, angled -18° inward toward the user.
- Components inside:
  - Header: `📊 Live Telemetry` with dynamic state indicator text (`HELD`, `LAUNCHED`, `GLIDING`, `STALL`, `LANDED`).
  - Grid of styled `UIPanel` metric tiles containing `UIText`:
    - **Airspeed**: with km/h conversion
    - **Altitude**: in meters
    - **Angle of Attack**: with stall warning color shift
    - **Glide Ratio**: dynamic $L/D$ efficiency
    - **Lift Force**: in Newtons (emerald text)
    - **Drag Force**: in Newtons (red text)
    - **Distance Traveled**: in meters
    - **Flight Duration**: in seconds

### 4. Master Scene & Interaction (`src/index.ts`)
- Instantiate and mount both `FlightControlsCard` and `TelemetryCard` into the XR Blocks scene.
- Hook button callbacks directly to `PlaneLauncher` and `AeroPhysics`.
- Update telemetry card values every frame inside `update()`.
- Keep keyboard shortcuts (`Space` to launch, `R` to reset, `1-3` to switch planes) as convenient secondary controls.

---

## Verification Plan

### Automated Verification
- Run `lint_applet` to verify TypeScript types and method signatures.
- Run `compile_applet` to ensure successful compilation.

### Manual Verification
- In the desktop simulator:
  - Verify the two 3D spatial cards float in front of the user (left and right of the flight pedestal).
  - Point at buttons with the simulator reticle and click: verify plane switches, launches, and toggles respond instantly.
  - Drag the sliders to adjust launch speed and pitch.
  - Grab the edge or header of each card to move them freely around the 3D room.
  - Watch the Telemetry card update live numbers and flight states during flight and landing.
