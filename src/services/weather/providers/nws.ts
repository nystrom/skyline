/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { WeatherData } from '../../../types';
import { fetchWithRateLimit } from '../../http';
import { buildForecast } from '../forecastNormalize';
import type { ProviderFetchContext, ProviderRawBundle, RawHourlySlot, StandardDailyPoint, WeatherLocationInput } from '../sharedTypes';
import type { WeatherProviderAdapter } from '../providerTypes';

const NWS_WIND_DEG: Record<string, number> = {
  N: 0, NNE: 22, NE: 45, ENE: 67, E: 90, ESE: 112, SE: 135, SSE: 157,
  S: 180, SSW: 202, SW: 225, WSW: 247, W: 270, WNW: 292, NW: 315, NNW: 337,
};

function parseNWSWindDeg(dir: string): number {
  return NWS_WIND_DEG[dir.trim().toUpperCase()] ?? 0;
}

import { nwsUrlToKind, weatherKindToIcon } from '../weatherKind';
import { getMoonriseMoonset } from '../moonUtils';
import { formatDayKeyAtLocation } from '../../../utils/unitConverter';

function mapNWSIconToLucide(iconUrl: string, isDay = true): string {
  return weatherKindToIcon(nwsUrlToKind(iconUrl), isDay);
}

async function fetchNWSRawBundle(location: WeatherLocationInput, signal?: AbortSignal): Promise<ProviderRawBundle> {
  const { lat, lon, label, country } = location;
  const cityResolved = label.split(',')[0].trim();
  const countryResolved = country || 'US';
  const headers: Record<string, string> = {
    Accept: 'application/geo+json, application/ld+json, application/json',
  };

  const pointsUrl = `https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`;
  const pointsRes = await fetchWithRateLimit('nws', pointsUrl, { headers, signal });
  if (!pointsRes.ok) {
    throw new Error(`NWS: Failed to fetch points metadata (${pointsRes.status})`);
  }
  const pointsData = await pointsRes.json();
  const timeZone = (pointsData?.properties?.timeZone as string | undefined) ?? undefined;
  const forecastHourlyUrl = `${pointsData.properties.forecastHourly}?units=si`;
  const forecastDailyUrl = `${pointsData.properties.forecast}?units=si`;
  const astroUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=sunrise,sunset&hourly=cloud_cover&current=cloud_cover&timezone=auto&timeformat=unixtime`;

  const [hourlyRes, dailyRes, astroRes] = await Promise.all([
    fetchWithRateLimit('nws', forecastHourlyUrl, { headers, signal }),
    fetchWithRateLimit('nws', forecastDailyUrl, { headers, signal }),
    fetchWithRateLimit('nws', astroUrl, { signal }),
  ]);

  if (!hourlyRes.ok || !dailyRes.ok || !astroRes.ok) {
    throw new Error('NWS: Failed to retrieve forecast details');
  }

  const hourlyData = await hourlyRes.json();
  const dailyData = await dailyRes.json();
  const astroData = await astroRes.json();
  const hourlyPeriods = hourlyData.properties.periods as Array<Record<string, unknown>>;
  const dailyPeriods = dailyData.properties.periods as Array<Record<string, unknown>>;
  const astroDaily = astroData.daily as Record<string, number[]>;

  const rawHourly: RawHourlySlot[] = hourlyPeriods.map((p) => {
    const isDay = (p.isDaytime as boolean) ?? true;
    const pop = p.probabilityOfPrecipitation as { value?: number } | undefined;
    const humidity = p.relativeHumidity as { value?: number } | undefined;
    return {
      time: new Date(p.startTime as string),
      temp: p.temperature as number,
      kind: nwsUrlToKind(p.icon as string),
      description: p.shortForecast as string,
      iconName: mapNWSIconToLucide(p.icon as string, isDay),
      isDay,
      windSpeed: (parseFloat(p.windSpeed as string) || 0) / 3.6,
      windDeg: parseNWSWindDeg((p.windDirection as string) ?? ''),
      precipProb: pop?.value || 0,
      precipAccum: 0,
      humidity: humidity?.value || 60,
    };
  });

  const dailyPoints: StandardDailyPoint[] = [];
  for (let i = 0; i < dailyPeriods.length; i++) {
    const p = dailyPeriods[i];
    if (!p.isDaytime) continue;
    const d = new Date(p.startTime as string);
    const locOpts = { timeZone };
    const dayKey = formatDayKeyAtLocation(d, locOpts);
    const astroIdx = astroDaily.time.findIndex((t: number) => {
      const astroDate = new Date(t * 1000);
      return formatDayKeyAtLocation(astroDate, locOpts) === dayKey;
    });
    const next = dailyPeriods[i + 1];
    const minTemp = next && !next.isDaytime ? (next.temperature as number) : (p.temperature as number);
    const pop = p.probabilityOfPrecipitation as { value?: number } | undefined;
    const sunriseVal =
      astroIdx >= 0 && astroDaily.sunrise
        ? new Date(astroDaily.sunrise[astroIdx] * 1000)
        : new Date(d.getTime() + 6 * 3600 * 1000);
    const sunsetVal =
      astroIdx >= 0 && astroDaily.sunset
        ? new Date(astroDaily.sunset[astroIdx] * 1000)
        : new Date(d.getTime() + 18 * 3600 * 1000);
    const { moonriseTime: moonriseVal, moonsetTime: moonsetVal } = getMoonriseMoonset(d, lat, lon, i);

    dailyPoints.push({
      date: d,
      tempMin: minTemp,
      tempMax: p.temperature as number,
      kind: nwsUrlToKind(p.icon as string),
      description: p.shortForecast as string,
      iconName: mapNWSIconToLucide(p.icon as string, true),
      precipProb: pop?.value || 0,
      precipAccum: 0,
      windSpeed: (parseFloat(p.windSpeed as string) || 0) / 3.6,
      windDeg: parseNWSWindDeg((p.windDirection as string) ?? ''),
      sunrise: sunriseVal,
      sunset: sunsetVal,
      moonrise: moonriseVal,
      moonset: moonsetVal,
    });
  }

  const currentPeriod = hourlyPeriods[0];
  const locOpts = { timeZone };
  const todayStr = formatDayKeyAtLocation(new Date(), locOpts);
  const firstAstroIdx = astroDaily.time.findIndex((t: number) => {
    const astroDate = new Date(t * 1000);
    return formatDayKeyAtLocation(astroDate, locOpts) === todayStr;
  });
  const curPop = currentPeriod.probabilityOfPrecipitation as { value?: number } | undefined;
  const curHumidity = currentPeriod.relativeHumidity as { value?: number } | undefined;
  const { moonriseTime: curMoonrise, moonsetTime: curMoonset } = getMoonriseMoonset(new Date(), lat, lon, 0);

  return {
    rawHourly,
    dailyPoints,
    timeZone,
    currentTemp: currentPeriod.temperature as number,
    current: {
      temp: Math.round(currentPeriod.temperature as number),
      description: currentPeriod.shortForecast as string,
      iconName: mapNWSIconToLucide(
        currentPeriod.icon as string,
        (currentPeriod.isDaytime as boolean) ?? true
      ),
      humidity: curHumidity?.value || 50,
      windSpeed: (parseFloat(currentPeriod.windSpeed as string) || 0) / 3.6,
      windDeg: parseNWSWindDeg((currentPeriod.windDirection as string) ?? ''),
      precipProb: curPop?.value || 0,
      precipAccum: 0,
      feelsLike: Math.round(currentPeriod.temperature as number),
      sunriseTime:
        firstAstroIdx >= 0 ? new Date(astroDaily.sunrise[firstAstroIdx] * 1000) : new Date(Date.now() - 15000),
      sunsetTime:
        firstAstroIdx >= 0 ? new Date(astroDaily.sunset[firstAstroIdx] * 1000) : new Date(Date.now() + 15000),
      moonriseTime: curMoonrise,
      moonsetTime: curMoonset,
    },
  };
}

async function fetchNWSData(location: WeatherLocationInput, signal?: AbortSignal): Promise<WeatherData> {
  const { lat, lon, label, country } = location;
  const cityResolved = label.split(',')[0].trim();
  const countryResolved = country || 'US';
  const bundle = await fetchNWSRawBundle(location, signal);
  const { data } = buildForecast({
    location: { lat, lon, label, country },
    ...bundle,
  });

  return { ...data, city: cityResolved, country: countryResolved };
}

export const nwsAdapter: WeatherProviderAdapter = {
  id: 'nws',
  fetchRaw(location, ctx) {
    return fetchNWSRawBundle(location, ctx.signal);
  },
  fetch(location, ctx) {
    return fetchNWSData(location, ctx.signal);
  },
};
