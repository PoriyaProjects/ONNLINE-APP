/**
 * Shared types for the Galaxy bubble visualization.
 * Layout math, rendering, and motion are kept separate.
 */

export type GalaxyColorTheme = 'blue' | 'purple' | 'cyan' | 'orange' | 'pink' | 'green';

export const GALAXY_COLOR_THEMES: GalaxyColorTheme[] = [
  'purple',
  'blue',
  'cyan',
  'green',
  'orange',
  'pink'
];

export type GalaxySizeTier = 'large' | 'medium' | 'small' | 'tiny';

export const GALAXY_SIZE_PX: Record<GalaxySizeTier, number> = {
  large: 172,
  medium: 136,
  small: 112,
  tiny: 92
};

/** Raw input describing one clinic, independent of the backend DTO shape. */
export interface GalaxyPlanetInput {
  id: string;
  name: string;
  patients: number;
  attendanceRate: number;
  hoursLabel: string;
}

/** Computed layout + motion params for one clinic bubble. */
export interface GalaxyPlanetLayout {
  id: string;
  rank: number;
  isCenter: boolean;
  sizeTier: GalaxySizeTier;
  sizePx: number;
  colorTheme: GalaxyColorTheme;
  /** Offset from stage center in px. */
  x: number;
  y: number;
  /** Vertical float amplitude in px (5–12). */
  floatAmpY: number;
  /** Horizontal drift amplitude in px (1–4). */
  floatAmpX: number;
  /** Float cycle duration in seconds. */
  floatDuration: number;
  /** Float animation delay in seconds. */
  floatDelay: number;
  /** Stable per-clinic seed for deterministic styling. */
  seed: number;
}

export interface GalaxyLayoutResult {
  layouts: GalaxyPlanetLayout[];
  order: string[];
}
