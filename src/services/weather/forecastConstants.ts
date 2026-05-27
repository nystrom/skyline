/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** Maximum forecast length in days when data is available. */
export const TARGET_FORECAST_DAYS = 16;

/** Minimum calendar days with enough observed hourly data before trying another provider. */
export const MIN_SUFFICIENT_FORECAST_DAYS = 4;

/** Minimum non-interpolated hourly samples to count a day as "real". */
export const MIN_REAL_HOURS_PER_DAY = 4;
