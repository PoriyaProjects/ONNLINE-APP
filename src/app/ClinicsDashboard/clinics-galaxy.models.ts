/**
 * Shared, framework-agnostic types for the Galaxy View visualization.
 * Kept separate from rendering (component) and animation (orbit animator)
 * so each concern can be tested / reasoned about independently.
 */

export type GalaxyColorTheme = 'blue' | 'purple' | 'cyan' | 'orange' | 'pink' | 'green';

export const GALAXY_COLOR_THEMES: GalaxyColorTheme[] = ['blue', 'purple', 'cyan', 'orange', 'pink', 'green'];

export type GalaxySizeTier = 'large' | 'medium' | 'small' | 'tiny';

/** Reference pixel sizes for each tier, per the design spec. */
export const GALAXY_SIZE_PX: Record<GalaxySizeTier, number> = {
  large: 280,
  medium: 190,
  small: 140,
  tiny: 90
};

export const GALAXY_ICONS: string[] = [
  'monitor_heart',
  'favorite',
  'local_hospital',
  'healing',
  'medical_services',
  'vaccines'
];

/** Raw input describing one clinic, independent of the backend DTO shape. */
export interface GalaxyPlanetInput {
  id: string;
  name: string;
  patients: number;
  attendanceRate: number;
  hoursLabel: string;
}

/** Computed, purely geometric/visual layout for one clinic "planet". */
export interface GalaxyPlanetLayout {
  id: string;
  rank: number;
  ring: number;
  ringCount: number;
  isCenter: boolean;
  sizeTier: GalaxySizeTier;
  sizePx: number;
  colorTheme: GalaxyColorTheme;
  icon: string;
  /** Radians. Starting angle within its orbit. */
  baseAngle: number;
  /** Radians/second. Signed — direction alternates per ring. */
  angularSpeed: number;
  /** Orbit radius in px from the galaxy center (0 for the center clinic). */
  orbitRadius: number;
  /** Stable per-clinic seed, reused to desynchronize CSS animation delays. */
  seed: number;
}

export interface GalaxyLayoutResult {
  layouts: GalaxyPlanetLayout[];
  order: string[];
}
