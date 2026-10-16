import * as THREE from 'three';
import * as xb from 'xrblocks';
import { sounds } from '../sound/AudioEffects';
import type { FlightTelemetry } from '../types';

export class TelemetryCard {
  public card: xb.UICard;

  // Grip handle & visual feedback elements
  private gripBar: xb.UIPanel;
  private gripIcon: xb.UIIcon;
  private gripText: xb.UIText;

  // Interaction state flags
  private isPointerHovered = false;
  private isPointerFocused = false;
  private isHandHovered = false;
  private isHandFocused = false;

  // Smooth animation interpolation
  private targetScale = 1.0;
  private currentScale = 1.0;
  private targetTranslateY = 0;
  private currentTranslateY = 0;

  // Dynamic Text Fields
  private statusBadgeText: xb.UIText;
  private airspeedText: xb.UIText;
  private altitudeText: xb.UIText;
  private aoaText: xb.UIText;
  private ldText: xb.UIText;
  private liftText: xb.UIText;
  private dragText: xb.UIText;
  private distanceText: xb.UIText;
  private flightTimeText: xb.UIText;
  private coPilotText: xb.UIText;

  constructor() {
    // Top Illuminated Grip Handle for Pinch & Move
    this.gripIcon = new xb.UIIcon({
      icon: 'drag_indicator',
      style: { width: 16, height: 16, color: '#94a3b8' },
    });
    this.gripText = new xb.UIText({
      text: 'PINCH & MOVE PANEL',
      style: { fontSize: 10, fontWeight: 'bold', color: '#94a3b8' },
    });
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
      children: [this.gripIcon, this.gripText],
    });

    // 1. Header with Status Badge
    this.statusBadgeText = new xb.UIText({
      text: 'READY',
      style: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#38bdf8',
        padding: 4,
        paddingLeft: 8,
        paddingRight: 8,
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        borderRadius: 6,
      },
    });

    const header = new xb.UIPanel({
      style: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      },
      children: [
        new xb.UIPanel({
          style: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          },
          children: [
            new xb.UIIcon({
              icon: 'analytics',
              style: { width: 30, height: 30, color: '#38bdf8' },
            }),
            new xb.UIText({
              text: 'Live Telemetry',
              style: { fontSize: 22, fontWeight: 'bold' },
            }),
          ],
        }),
        this.statusBadgeText,
      ],
    });

    // Subtitle
    const subtitle = new xb.UIText({
      text: 'Real-time Aerodynamic Twin Diagnostics',
      style: { fontSize: 12, opacity: 0.72 },
    });

    // 2. Metric Tiles
    this.airspeedText = new xb.UIText({
      text: '0.0 m/s',
      style: { fontSize: 18, fontWeight: 'bold', color: '#38bdf8' },
    });
    const airspeedTile = this.createMetricTile('Airspeed', this.airspeedText);

    this.altitudeText = new xb.UIText({
      text: '1.35 m',
      style: { fontSize: 18, fontWeight: 'bold', color: '#60a5fa' },
    });
    const altitudeTile = this.createMetricTile('Altitude', this.altitudeText);

    this.aoaText = new xb.UIText({
      text: '0.0°',
      style: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },
    });
    const aoaTile = this.createMetricTile('Angle of Attack', this.aoaText);

    this.ldText = new xb.UIText({
      text: '--',
      style: { fontSize: 18, fontWeight: 'bold', color: '#a78bfa' },
    });
    const ldTile = this.createMetricTile('Glide Ratio (L/D)', this.ldText);

    this.liftText = new xb.UIText({
      text: '0.000 N',
      style: { fontSize: 18, fontWeight: 'bold', color: '#34d399' },
    });
    const liftTile = this.createMetricTile('Lift Force', this.liftText);

    this.dragText = new xb.UIText({
      text: '0.000 N',
      style: { fontSize: 18, fontWeight: 'bold', color: '#f87171' },
    });
    const dragTile = this.createMetricTile('Drag Force', this.dragText);

    // Row 1
    const row1 = new xb.UIPanel({
      style: { width: '100%', flexDirection: 'row', gap: 8 },
      children: [airspeedTile, altitudeTile],
    });

    // Row 2
    const row2 = new xb.UIPanel({
      style: { width: '100%', flexDirection: 'row', gap: 8 },
      children: [aoaTile, ldTile],
    });

    // Row 3
    const row3 = new xb.UIPanel({
      style: { width: '100%', flexDirection: 'row', gap: 8 },
      children: [liftTile, dragTile],
    });

    // 3. Distance & Flight Time Summary Bar
    this.distanceText = new xb.UIText({
      text: '0.0 m',
      style: { fontSize: 15, fontWeight: 'bold', color: '#fbbf24' },
    });
    this.flightTimeText = new xb.UIText({
      text: '0.0 s',
      style: { fontSize: 15, fontWeight: 'bold', color: '#94a3b8' },
    });

    const summaryRow = new xb.UIPanel({
      style: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 8,
      },
      children: [
        new xb.UIPanel({
          style: { flexDirection: 'row', gap: 6, alignItems: 'center' },
          children: [
            new xb.UIText({ text: 'Distance:', style: { fontSize: 13, opacity: 0.8 } }),
            this.distanceText,
          ],
        }),
        new xb.UIPanel({
          style: { flexDirection: 'row', gap: 6, alignItems: 'center' },
          children: [
            new xb.UIText({ text: 'Time:', style: { fontSize: 13, opacity: 0.8 } }),
            this.flightTimeText,
          ],
        }),
      ],
    });

    // 4. Gemini AI Aerodynamic Co-Pilot Debrief Box
    this.coPilotText = new xb.UIText({
      text: 'Co-Pilot ready. Launch your plane to receive real-time aerodynamic diagnostics and pitch/speed tuning tips.',
      style: {
        fontSize: 12,
        lineHeight: 1.35,
        color: '#e2e8f0',
      },
    });

    const coPilotPanel = new xb.UIPanel({
      style: {
        width: '100%',
        flexDirection: 'column',
        gap: 6,
        padding: 12,
        backgroundColor: 'rgba(168, 85, 247, 0.12)',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(192, 132, 252, 0.3)',
      },
      children: [
        new xb.UIPanel({
          style: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          },
          children: [
            new xb.UIIcon({
              icon: 'auto_awesome',
              style: { width: 18, height: 18, color: '#c084fc' },
            }),
            new xb.UIText({
              text: 'GEMINI AI AERODYNAMIC COACH',
              style: { fontSize: 11, fontWeight: 'bold', color: '#c084fc' },
            }),
          ],
        }),
        this.coPilotText,
      ],
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
      size: { width: 0.48, height: 'auto' },
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
        subtitle,
        row1,
        row2,
        row3,
        summaryRow,
        coPilotPanel,
        footer,
      ],
    });

    this.card.name = 'TelemetryCard';
    // Position on the right, comfortably reachable, angled -18° toward center
    this.card.position.set(0.55, 1.45, -1.05);
    this.card.rotation.set(0, -0.32, 0);

    // Reticle & Controller pointer hover feedback
    this.card.onHoverEnter = () => {
      this.setPointerHover(true, false);
      sounds.playClick();
    };
    this.card.onHoverExit = () => {
      this.setPointerHover(false, false);
    };
    this.card.onObjectSelectStart = () => {
      this.setPointerHover(true, true);
      sounds.playGrab();
    };
    this.card.onObjectSelectEnd = () => {
      this.setPointerHover(false, false);
      sounds.playRelease();
    };
  }

  setPointerHover(hovered: boolean, focused: boolean) {
    this.isPointerHovered = hovered;
    this.isPointerFocused = focused;
    this.applyVisualState();
  }

  setHandHover(hovered: boolean, focused: boolean) {
    this.isHandHovered = hovered;
    this.isHandFocused = focused;
    this.applyVisualState();
  }

  setHoverState(hovered: boolean, focused: boolean) {
    this.setHandHover(hovered, focused);
  }

  private applyVisualState() {
    const focused = this.isPointerFocused || this.isHandFocused;
    const hovered = this.isPointerHovered || this.isHandHovered;

    if (focused) {
      this.targetScale = 1.038;
      this.targetTranslateY = -6;
      this.card.style.borderColor = '#818cf8';
      this.card.style.borderWidth = 2.5;
      this.card.style.dropShadowColor = 'rgba(129, 140, 248, 0.7)';
      this.card.style.dropShadowBlur = 24;
      this.gripBar.style.backgroundColor = 'rgba(129, 140, 248, 0.4)';
      this.gripText.style.color = '#e0e7ff';
      this.gripIcon.style.color = '#e0e7ff';
    } else if (hovered) {
      this.targetScale = 1.022;
      this.targetTranslateY = -3;
      this.card.style.borderColor = '#38bdf8';
      this.card.style.borderWidth = 2;
      this.card.style.dropShadowColor = 'rgba(56, 189, 248, 0.5)';
      this.card.style.dropShadowBlur = 18;
      this.gripBar.style.backgroundColor = 'rgba(56, 189, 248, 0.25)';
      this.gripText.style.color = '#bae6fd';
      this.gripIcon.style.color = '#bae6fd';
    } else {
      this.targetScale = 1.0;
      this.targetTranslateY = 0;
      this.card.style.borderColor = 'rgba(255, 255, 255, 0.12)';
      this.card.style.borderWidth = 1;
      this.card.style.dropShadowColor = 'rgba(0, 0, 0, 0)';
      this.card.style.dropShadowBlur = 0;
      this.gripBar.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
      this.gripText.style.color = '#94a3b8';
      this.gripIcon.style.color = '#94a3b8';
    }
  }

  updateAnimation(dt: number) {
    const factor = Math.min(1, dt * 14);
    this.currentScale = THREE.MathUtils.lerp(this.currentScale, this.targetScale, factor);
    this.card.scale.setScalar(this.currentScale);

    this.currentTranslateY = THREE.MathUtils.lerp(this.currentTranslateY, this.targetTranslateY, factor);
    this.card.style.transform = { translateY: this.currentTranslateY };
  }

  private createMetricTile(label: string, valueElement: xb.UIText): xb.UIPanel {
    return new xb.UIPanel({
      style: {
        flexGrow: 1,
        flexDirection: 'column',
        gap: 3,
        padding: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
      },
      children: [
        new xb.UIText({
          text: label.toUpperCase(),
          style: { fontSize: 11, fontWeight: 'bold', opacity: 0.65 },
        }),
        valueElement,
      ],
    });
  }

  updateTelemetry(t: FlightTelemetry) {
    this.airspeedText.text = `${t.airspeed.toFixed(1)} m/s (${t.airspeedKmh.toFixed(0)} km/h)`;
    this.altitudeText.text = `${t.altitude.toFixed(2)} m`;
    this.aoaText.text = `${t.angleOfAttackDeg.toFixed(1)}°`;

    // Stall warning color
    if (t.state === 'stall') {
      this.aoaText.style.color = '#ef4444';
      this.statusBadgeText.text = 'STALL WARNING';
      this.statusBadgeText.style.color = '#ef4444';
      this.statusBadgeText.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
    } else {
      this.aoaText.style.color = '#f8fafc';
      const badgeText = t.state.toUpperCase();
      this.statusBadgeText.text = badgeText;

      if (t.state === 'gliding') {
        this.statusBadgeText.style.color = '#10b981';
        this.statusBadgeText.style.backgroundColor = 'rgba(16, 185, 129, 0.2)';
      } else if (t.state === 'landed') {
        this.statusBadgeText.style.color = '#94a3b8';
        this.statusBadgeText.style.backgroundColor = 'rgba(148, 163, 184, 0.2)';
      } else {
        this.statusBadgeText.style.color = '#38bdf8';
        this.statusBadgeText.style.backgroundColor = 'rgba(56, 189, 248, 0.2)';
      }
    }

    this.ldText.text = t.liftToDragRatio > 0 ? t.liftToDragRatio.toFixed(1) : '--';
    this.liftText.text = `${t.liftForceN.toFixed(3)} N`;
    this.dragText.text = `${t.dragForceN.toFixed(3)} N`;
    this.distanceText.text = `${t.distanceTraveledM.toFixed(1)} m`;
    this.flightTimeText.text = `${t.flightTimeSec.toFixed(1)} s`;
  }

  setCoPilotDebrief(text: string) {
    this.coPilotText.text = text;
  }
}
