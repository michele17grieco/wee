/**
 * Elevation correction of forecasts.
 *
 * Weather models work on grid cells whose mean elevation can differ by hundreds
 * of metres from the real elevation of a point (ridges, valleys). Temperature is
 * brought back to the real elevation with the standard atmospheric lapse rate
 * (6.5 °C per 1000 m).
 */

export const LAPSE_RATE_C_PER_M = 0.0065

/** T_corrected = T_model − 0.0065 × (real_elevation − model_elevation) */
export function correctTemperature(tModelC: number, realElevationM: number, modelElevationM: number): number {
  return tModelC - LAPSE_RATE_C_PER_M * (realElevationM - modelElevationM)
}

export function elevationDelta(realElevationM: number, modelElevationM: number): number {
  return realElevationM - modelElevationM
}

/**
 * Falling snow typically survives down to ~300 m below the freezing level.
 * Below that, precipitation reaches the ground as rain.
 */
export const SNOW_LINE_BELOW_FREEZING_M = 300

export function snowLineFromFreezingLevel(freezingLevelM: number): number {
  return Math.max(0, freezingLevelM - SNOW_LINE_BELOW_FREEZING_M)
}

/** true if precipitation at the given elevation is expected to fall as snow. */
export function isSnowAtElevation(elevationM: number, freezingLevelM: number): boolean {
  return elevationM >= snowLineFromFreezingLevel(freezingLevelM)
}
