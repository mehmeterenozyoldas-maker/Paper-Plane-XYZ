import type * as THREE from 'three';

export type PlaneType = 'dart' | 'glider' | 'concorde';

export type FlightState = 'held' | 'launched' | 'gliding' | 'stall' | 'landed';

export interface AeroProfile {
  name: string;
  type: PlaneType;
  mass: number; // in kg (e.g. 0.005 kg = 5 grams for typical A4 fold)
  wingArea: number; // in m^2 (e.g. 0.024 m^2)
  wingspan: number; // in m (e.g. 0.22 m)
  aspectRatio: number;
  zeroLiftDrag: number; // CD0
  inducedDragFactor: number; // k in CD = CD0 + k * CL^2
  liftSlope: number; // CL_alpha in 1/rad (approx 2*PI / (1 + 2/AR))
  maxLift: number; // CL_max before stall
  stallAngleRad: number; // alpha stall in radians (approx 16-20 deg)
  pitchStability: number; // natural tendency to pitch into airflow
  rollStability: number; // dihedral restoring moment
  color: number;
  description: string;
}

export interface FlightTelemetry {
  state: FlightState;
  airspeed: number; // m/s
  airspeedKmh: number; // km/h
  altitude: number; // m
  angleOfAttackDeg: number; // degrees
  bankAngleDeg: number; // degrees
  liftForceN: number; // N
  dragForceN: number; // N
  liftToDragRatio: number; // L/D
  distanceTraveledM: number; // m
  flightTimeSec: number; // s
  maxSpeedKmh: number; // km/h
  maxAltitudeM: number; // m
}

export interface FlightTrajectoryPoint {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  speed: number;
  time: number;
  state: FlightState;
}

export interface FlightSummary {
  planeType: PlaneType;
  distanceM: number;
  flightTimeSec: number;
  maxSpeedKmh: number;
  maxAltitudeM: number;
  avgGlideRatio: number;
  landingPosition: THREE.Vector3;
}
