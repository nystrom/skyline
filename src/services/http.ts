/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const WEATHER_TIMEOUT_MS = 15_000;
export const GEO_TIMEOUT_MS = 8_000;

const rateLimitQueues: Record<string, number[]> = {};

async function acquireRateLimitSlot(serviceKey: string, maxRequestsPerMinute = 100): Promise<void> {
  const ONE_MINUTE_MS = 60_000;
  if (!rateLimitQueues[serviceKey]) {
    rateLimitQueues[serviceKey] = [];
  }
  const queue = rateLimitQueues[serviceKey];
  while (true) {
    const now = Date.now();
    while (queue.length > 0 && now - queue[0] >= ONE_MINUTE_MS) {
      queue.shift();
    }
    if (queue.length < maxRequestsPerMinute) {
      queue.push(now);
      return;
    }
    const waitMs = ONE_MINUTE_MS - (now - queue[0]);
    await new Promise((resolve) => setTimeout(resolve, Math.max(waitMs, 25)));
  }
}

export async function fetchWithRateLimit(
  serviceKey: string,
  url: string,
  options?: RequestInit,
  maxRequestsPerMinute = 100
): Promise<Response> {
  await acquireRateLimitSlot(serviceKey, maxRequestsPerMinute);
  return timedFetch(url, options, WEATHER_TIMEOUT_MS);
}

export function timedFetch(url: string, options?: RequestInit, ms = WEATHER_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  const mergedSignal = options?.signal
    ? mergeAbortSignals(options.signal, controller.signal)
    : controller.signal;
  return fetch(url, { ...options, signal: mergedSignal }).finally(() => clearTimeout(timer));
}

function mergeAbortSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
  if (a.aborted || b.aborted) {
    return AbortSignal.abort(a.reason ?? b.reason);
  }
  const controller = new AbortController();
  const onAbort = () => controller.abort(a.reason ?? b.reason);
  a.addEventListener('abort', onAbort);
  b.addEventListener('abort', onAbort);
  return controller.signal;
}

export function withAbortTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fn(controller.signal).finally(() => clearTimeout(timer));
}
