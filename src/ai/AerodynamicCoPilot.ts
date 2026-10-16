import { GoogleGenAI } from '@google/genai';
import * as xb from 'xrblocks';
import type { FlightSummary, PlaneType } from '../types';

export class AerodynamicCoPilot {
  private ai: GoogleGenAI | null = null;
  private isAnalyzing = false;
  private voiceEnabled = true;

  constructor() {
    // Initialize Gemini GenAI client if GEMINI_API_KEY is available
    const apiKey = typeof process !== 'undefined' && process.env?.GEMINI_API_KEY ? process.env.GEMINI_API_KEY : '';
    if (apiKey) {
      try {
        this.ai = new GoogleGenAI({ apiKey });
      } catch (err) {
        console.warn('Could not initialize GoogleGenAI client:', err);
      }
    }
  }

  setVoiceEnabled(enabled: boolean) {
    this.voiceEnabled = enabled;
  }

  async analyzeFlight(
    summary: FlightSummary,
    launchPitchDeg: number,
    launchSpeed: number,
    stalled: boolean,
    stallTimeSec: number,
    onResult: (analysis: string) => void
  ) {
    if (this.isAnalyzing) return;
    this.isAnalyzing = true;

    // Fast initial heuristic debrief while Gemini evaluates
    const heuristic = this.generateHeuristicDebrief(
      summary,
      launchPitchDeg,
      launchSpeed,
      stalled,
      stallTimeSec
    );

    // If Gemini is available, query Gemini 2.5 Flash for authentic aeronautical insights
    if (this.ai) {
      try {
        const prompt = `Flight Telemetry Debrief:
- Model: ${summary.planeType}
- Distance: ${summary.distanceM.toFixed(1)}m
- Airtime: ${summary.flightTimeSec.toFixed(1)}s
- Max Airspeed: ${summary.maxSpeedKmh.toFixed(0)} km/h
- Max Altitude: ${summary.maxAltitudeM.toFixed(2)}m
- Launch Pitch Angle: ${launchPitchDeg}°
- Launch Speed: ${launchSpeed.toFixed(1)} m/s
- Did Stall: ${stalled ? `Yes, flow separation occurred at ${stallTimeSec.toFixed(1)}s` : 'No, clean laminar glide'}
- Avg Glide Ratio (L/D): ${summary.avgGlideRatio.toFixed(1)}

Provide a sharp, encouraging, 1-2 sentence aeronautical coach debrief. State what happened physically (e.g. stall angle, lift-to-drag, kinetic energy) and give one clear tuning suggestion (e.g. adjust launch angle, speed, or model) to achieve maximum distance.`;

        const response = await this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            systemInstruction:
              'You are an expert aerodynamicist and paper airplane digital twin flight coach. Give concise, insightful 1 to 2 sentence debriefs with specific physical advice. Avoid generic filler words.',
            temperature: 0.7,
            maxOutputTokens: 120,
          },
        });

        const text = response.text?.trim();
        if (text) {
          onResult(text);
          this.speak(text);
          this.isAnalyzing = false;
          return;
        }
      } catch (error) {
        console.warn('Gemini query fell back to heuristic analysis:', error);
      }
    } else if (xb.ai?.isAvailable()) {
      // Alternatively try xb.ai provider if configured
      try {
        const res = await xb.ai.query({
          prompt: `Analyze paper plane flight: ${summary.planeType}, distance ${summary.distanceM.toFixed(1)}m, time ${summary.flightTimeSec.toFixed(1)}s, ${stalled ? 'stalled' : 'smooth glide'}. Give a 1-sentence aerodynamic tip.`,
        });
        const text = typeof res === 'string' ? res : res?.text;
        if (text) {
          onResult(text.trim());
          this.speak(text.trim());
          this.isAnalyzing = false;
          return;
        }
      } catch {
        // Fallback below
      }
    }

    // Default to aerodynamic physics heuristic
    onResult(heuristic);
    this.speak(heuristic);
    this.isAnalyzing = false;
  }

  private generateHeuristicDebrief(
    summary: FlightSummary,
    launchPitchDeg: number,
    launchSpeed: number,
    stalled: boolean,
    stallTimeSec: number
  ): string {
    const planeName = summary.planeType === 'glider' ? 'Nakamura Glider' : summary.planeType === 'dart' ? 'Classic Dart' : 'Concorde Canard';

    if (stalled && launchPitchDeg > 15) {
      return `Your ${planeName} stalled at ${stallTimeSec.toFixed(1)}s due to high pitch angle (${launchPitchDeg}°). Lower launch pitch to 10° for a flatter, high-lift glide.`;
    }

    if (summary.distanceM > 6.0) {
      return `Outstanding flight! ${summary.distanceM.toFixed(1)}m with an efficient glide ratio of ${summary.avgGlideRatio.toFixed(1)}. Great balance between speed and angle of attack.`;
    }

    if (launchSpeed < 4.0) {
      return `Your ${planeName} touched down early after ${summary.flightTimeSec.toFixed(1)}s. Increase launch speed to 5.5 m/s to generate sufficient dynamic pressure for sustained lift.`;
    }

    return `Solid ${summary.distanceM.toFixed(1)}m glide! Max speed reached ${summary.maxSpeedKmh.toFixed(0)} km/h. Try angling slightly into the wind for increased airtime.`;
  }

  private speak(text: string) {
    if (!this.voiceEnabled || typeof window === 'undefined') return;

    try {
      // Use Web Speech Synthesis API
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // cancel any active speech
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        utterance.volume = 0.9;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.warn('Speech synthesis unavailable:', e);
    }
  }
}

export const coPilot = new AerodynamicCoPilot();
