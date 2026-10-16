import * as xb from 'xrblocks';
import { AERO_PROFILES } from '../planes/PlaneModels';
import { sounds } from '../sound/AudioEffects';
import type { PlaneType } from '../types';

export interface FlightControlsCallbacks {
  onSelectPlane: (type: PlaneType) => void;
  onLaunch: () => void;
  onReset: () => void;
  onToggleStreamlines: () => boolean;
  onToggleVectors: () => boolean;
  onSpeedChange: (speed: number) => void;
  onPitchChange: (pitchDeg: number) => void;
  onWindChange: (windZ: number) => void;
}

export class FlightControlsCard {
  public card: xb.UICard;
  private callbacks: FlightControlsCallbacks;

  // Dynamic UI elements
  private modelDescText: xb.UIText;
  private speedValText: xb.UIText;
  private pitchValText: xb.UIText;
  private windValText: xb.UIText;
  private streamlinesBtn: xb.UIButton;
  private vectorsBtn: xb.UIButton;
  private gripBar: xb.UIPanel;

  constructor(callbacks: FlightControlsCallbacks) {
    this.callbacks = callbacks;

    // Top Illuminated Grip Handle
    this.gripBar = new xb.UIPanel({
      style: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        padding: 5,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        marginBottom: 2,
      },
      children: [
        new xb.UIIcon({
          icon: 'drag_indicator',
          style: { width: 16, height: 16, color: '#94a3b8' },
        }),
        new xb.UIText({
          text: 'PINCH & MOVE PANEL',
          style: { fontSize: 10, fontWeight: 'bold', color: '#94a3b8' },
        }),
      ],
    });

    // 1. Header Panel
    const header = new xb.UIPanel({
      style: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      },
      children: [
        new xb.UIIcon({
          icon: 'flight',
          style: { width: 34, height: 34, color: '#38bdf8' },
        }),
        new xb.UIPanel({
          style: {
            flexGrow: 1,
            flexDirection: 'column',
            gap: 2,
          },
          children: [
            new xb.UIText({
              text: 'Flight Controls',
              style: { fontSize: 24, fontWeight: 'bold' },
            }),
            new xb.UIText({
              text: 'Select model & set launch physics',
              style: { fontSize: 13, opacity: 0.72 },
            }),
          ],
        }),
      ],
    });

    // 2. Model Selection Section
    const modelTitle = new xb.UIText({
      text: 'SELECT PAPER AIRPLANE',
      style: { fontSize: 13, fontWeight: 'bold', opacity: 0.8, marginTop: 4 },
    });

    const modelRow = new xb.UIPanel({
      style: {
        width: '100%',
        flexDirection: 'row',
        gap: 8,
      },
      children: [
        new xb.UIButton({
          label: 'Dart',
          icon: 'rocket_launch',
          style: { flexGrow: 1 },
          onClick: () => this.selectPlane('dart'),
        }),
        new xb.UIButton({
          label: 'Glider',
          icon: 'flight',
          style: { flexGrow: 1 },
          onClick: () => this.selectPlane('glider'),
        }),
        new xb.UIButton({
          label: 'Concorde',
          icon: 'bolt',
          style: { flexGrow: 1 },
          onClick: () => this.selectPlane('concorde'),
        }),
      ],
    });

    this.modelDescText = new xb.UIText({
      text: AERO_PROFILES.glider.description,
      style: {
        fontSize: 12,
        opacity: 0.75,
        lineHeight: 1.3,
        padding: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 6,
      },
    });

    // 3. Flight Action Buttons
    const actionsTitle = new xb.UIText({
      text: 'FLIGHT ACTIONS',
      style: { fontSize: 13, fontWeight: 'bold', opacity: 0.8, marginTop: 4 },
    });

    const mainActionsRow = new xb.UIPanel({
      style: {
        width: '100%',
        flexDirection: 'row',
        gap: 8,
      },
      children: [
        new xb.UIButton({
          label: 'Launch Plane',
          icon: 'play_arrow',
          style: { flexGrow: 2 },
          onClick: () => {
            this.callbacks.onLaunch();
          },
        }),
        new xb.UIButton({
          label: 'Reset Stand',
          icon: 'restart_alt',
          style: { flexGrow: 1 },
          onClick: () => {
            sounds.playRelease();
            this.callbacks.onReset();
          },
        }),
      ],
    });

    this.streamlinesBtn = new xb.UIButton({
      label: 'Streamlines: ON',
      icon: 'air',
      style: { flexGrow: 1 },
      onClick: () => {
        sounds.playClick();
        const active = this.callbacks.onToggleStreamlines();
        this.streamlinesBtn.label = active ? 'Streamlines: ON' : 'Streamlines: OFF';
      },
    });

    this.vectorsBtn = new xb.UIButton({
      label: 'Force Vectors: ON',
      icon: 'straighten',
      style: { flexGrow: 1 },
      onClick: () => {
        sounds.playClick();
        const active = this.callbacks.onToggleVectors();
        this.vectorsBtn.label = active ? 'Force Vectors: ON' : 'Force Vectors: OFF';
      },
    });

    const togglesRow = new xb.UIPanel({
      style: {
        width: '100%',
        flexDirection: 'row',
        gap: 8,
      },
      children: [this.streamlinesBtn, this.vectorsBtn],
    });

    // 4. Sliders Section: Speed, Pitch, Wind
    const paramsTitle = new xb.UIText({
      text: 'LAUNCH PARAMETERS',
      style: { fontSize: 13, fontWeight: 'bold', opacity: 0.8, marginTop: 4 },
    });

    // Speed Slider
    this.speedValText = new xb.UIText({
      text: '5.2 m/s',
      style: { fontSize: 13, fontWeight: 'bold', color: '#38bdf8' },
    });
    const speedHeader = new xb.UIPanel({
      style: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      },
      children: [
        new xb.UIText({ text: 'Launch Speed', style: { fontSize: 13 } }),
        this.speedValText,
      ],
    });
    const speedSlider = new xb.UISlider({
      ariaLabel: 'Launch speed',
      min: 2,
      max: 10,
      step: 0.5,
      value: 5.2,
      style: { width: '100%', height: 28 },
      onInput: (val: number) => {
        this.speedValText.text = `${val.toFixed(1)} m/s`;
        this.callbacks.onSpeedChange(val);
      },
    });

    // Pitch Slider
    this.pitchValText = new xb.UIText({
      text: '12°',
      style: { fontSize: 13, fontWeight: 'bold', color: '#34d399' },
    });
    const pitchHeader = new xb.UIPanel({
      style: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      },
      children: [
        new xb.UIText({ text: 'Launch Pitch Angle', style: { fontSize: 13 } }),
        this.pitchValText,
      ],
    });
    const pitchSlider = new xb.UISlider({
      ariaLabel: 'Launch pitch angle',
      min: 0,
      max: 30,
      step: 1,
      value: 12,
      style: { width: '100%', height: 28 },
      onInput: (val: number) => {
        this.pitchValText.text = `${Math.round(val)}°`;
        this.callbacks.onPitchChange(Math.round(val));
      },
    });

    // Wind Slider
    this.windValText = new xb.UIText({
      text: '0.0 m/s',
      style: { fontSize: 13, fontWeight: 'bold', color: '#fbbf24' },
    });
    const windHeader = new xb.UIPanel({
      style: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      },
      children: [
        new xb.UIText({ text: 'Headwind / Tailwind', style: { fontSize: 13 } }),
        this.windValText,
      ],
    });
    const windSlider = new xb.UISlider({
      ariaLabel: 'Headwind or tailwind',
      min: -4,
      max: 4,
      step: 0.5,
      value: 0,
      style: { width: '100%', height: 28 },
      onInput: (val: number) => {
        this.windValText.text = `${val > 0 ? '+' : ''}${val.toFixed(1)} m/s`;
        this.callbacks.onWindChange(val);
      },
    });

    // Card Footer Note
    const footer = new xb.UIText({
      text: 'Pinch edge to move or resize card',
      style: {
        fontSize: 11,
        opacity: 0.55,
        textAlign: 'center',
        marginTop: 4,
      },
    });

    // 5. Build Master UICard
    this.card = new xb.UICard({
      size: { width: 0.52, height: 'auto' },
      manipulation: true,
      edge: true,
      style: {
        flexDirection: 'column',
        gap: 10,
        padding: 18,
      },
      children: [
        this.gripBar,
        header,
        modelTitle,
        modelRow,
        this.modelDescText,
        actionsTitle,
        mainActionsRow,
        togglesRow,
        paramsTitle,
        speedHeader,
        speedSlider,
        pitchHeader,
        pitchSlider,
        windHeader,
        windSlider,
        footer,
      ],
    });

    this.card.name = 'FlightControlsCard';
    // Position on the left, comfortably reachable, angled 18° toward center
    this.card.position.set(-0.55, 1.45, -1.05);
    this.card.rotation.set(0, 0.32, 0);

    // Reticle & Controller pointer hover feedback
    this.card.onHoverEnter = () => {
      this.setHoverState(true, false);
      sounds.playClick();
    };
    this.card.onHoverExit = () => {
      this.setHoverState(false, false);
    };
    this.card.onObjectSelectStart = () => {
      this.setHoverState(true, true);
    };
    this.card.onObjectSelectEnd = () => {
      this.setHoverState(false, false);
    };
  }

  setHoverState(hovered: boolean, focused: boolean) {
    if (focused) {
      this.card.style.borderColor = '#818cf8';
      this.card.style.borderWidth = 2.5;
      this.card.style.dropShadowColor = 'rgba(129, 140, 248, 0.65)';
      this.card.style.dropShadowBlur = 24;
      this.card.style.transform = { translateY: -4 };
      this.card.scale.set(1.035, 1.035, 1.035);
      this.gripBar.style.backgroundColor = 'rgba(129, 140, 248, 0.35)';
    } else if (hovered) {
      this.card.style.borderColor = '#38bdf8';
      this.card.style.borderWidth = 2;
      this.card.style.dropShadowColor = 'rgba(56, 189, 248, 0.45)';
      this.card.style.dropShadowBlur = 18;
      this.card.style.transform = { translateY: -2 };
      this.card.scale.set(1.02, 1.02, 1.02);
      this.gripBar.style.backgroundColor = 'rgba(56, 189, 248, 0.22)';
    } else {
      this.card.style.borderColor = 'rgba(255, 255, 255, 0.12)';
      this.card.style.borderWidth = 1;
      this.card.style.dropShadowColor = 'rgba(0, 0, 0, 0)';
      this.card.style.dropShadowBlur = 0;
      this.card.style.transform = { translateY: 0 };
      this.card.scale.set(1.0, 1.0, 1.0);
      this.gripBar.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
    }
  }

  private selectPlane(type: PlaneType) {
    sounds.playClick();
    this.modelDescText.text = AERO_PROFILES[type].description;
    this.callbacks.onSelectPlane(type);
  }
}
