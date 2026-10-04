import { createServerFn } from "@tanstack/react-start";

export type WeatherLocation = {
  name: string;
  admin1: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

export type SourceStatus = {
  id: string;
  name: string;
  provider: string;
  status: "live" | "unavailable" | "restricted";
  detail: string;
  url: string;
};

export type GridPoint = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  temperature: number;
  humidity: number;
  pressure: number;
  precipitation: number;
  windSpeed: number;
  windDirection: number;
  windGusts: number;
  cloudCover: number;
  weatherCode: number;
  time: string;
};

export type HourPoint = {
  time: string;
  temperature: number;
  humidity: number;
  dewPoint: number;
  precipitation: number;
  precipitationProbability: number;
  weatherCode: number;
  cape: number;
  windSpeed: number;
  windGusts: number;
  pressure: number;
  visibility: number;
  cloudCover: number;
};

export type DayPoint = {
  date: string;
  high: number;
  low: number;
  feelsLikeMax: number;
  precipitation: number;
  precipitationProbability: number;
  weatherCode: number;
  windMax: number;
  gustMax: number;
  uvMax: number;
  sunrise: string;
  sunset: string;
};

export type FloodDay = { date: string; discharge: number; ensembleMean: number; ensembleMax: number; isForecast: boolean };
export type AirHour = { time: string; usAqi: number; pm25: number; pm10: number };
export type AirNow = { time: string; usAqi: number; pm25: number; pm10: number; no2: number; o3: number; co: number; so2: number };
export type NasaDay = { date: string; temperature: number | null; tmax: number | null; tmin: number | null; humidity: number | null; precipitation: number | null; windSpeed: number | null };
export type NaturalEvent = { id: string; title: string; category: string; date: string; latitude: number; longitude: number; distanceKm: number; link: string };

export type WeatherBundle = {
  location: WeatherLocation;
  fetchedAt: string;
  timezone: string;
  error: string | null;
  current: {
    time: string;
    temperature: number;
    feelsLike: number;
    humidity: number;
    dewPoint: number;
    precipitation: number;
    weatherCode: number;
    cloudCover: number;
    pressure: number;
    windSpeed: number;
    windGusts: number;
    windDirection: number;
    isDay: boolean;
  } | null;
  hourly: HourPoint[];
  daily: DayPoint[];
  pastDaily: DayPoint[];
  grid: GridPoint[];
  flood: FloodDay[];
  air: { now: AirNow | null; hourly: AirHour[] };
  nasa: NasaDay[];
  events: NaturalEvent[];
  radar: { host: string; path: string; time: number } | null;
  satelliteDate: string;
  sources: SourceStatus[];
};

type Series = Record<string, Array<string | number | null> | undefined>;

async function getJson<T>(url: string, headers?: Record<string, string>): Promise<T> {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as T;
}

function n(values: Array<string | number | null> | undefined, index: number): number {
  const value = values?.[index];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
function s(values: Array<string | number | null> | undefined, index: number): string {
  const value = values?.[index];
  return value === null || value === undefined ? "" : String(value);
}
function utcDate(date: Date): string {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = (deg: number) => (deg * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
const compass = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
function bearingLabel(lat1: number, lon1: number, lat2: number, lon2: number): string {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x = Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) - Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(((lon2 - lon1) * Math.PI) / 180);
  const deg = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  return compass[Math.round(deg / 45) % 8] ?? "N";
}

function validateLocation(input: WeatherLocation): WeatherLocation {
  if (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90) throw new Error("Invalid latitude.");
  if (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) throw new Error("Invalid longitude.");
  return {
    name: String(input.name || "Selected point").slice(0, 120),
    admin1: String(input.admin1 || "").slice(0, 120),
    country: String(input.country || "").slice(0, 80),
    latitude: input.latitude,
    longitude: input.longitude,
    timezone: String(input.timezone || "auto").slice(0, 60),
  };
}

export const searchWeatherLocations = createServerFn({ method: "GET" })
  .inputValidator((input: { query: string }) => {
    const query = String(input.query ?? "").trim();
    if (query.length < 2 || query.length > 80) throw new Error("Enter a place name with 2 to 80 characters.");
    return { query };
  })
  .handler(async ({ data }): Promise<WeatherLocation[]> => {
    const params = new URLSearchParams({ name: data.query, count: "10", language: "en", format: "json" });
    try {
      const payload = await getJson<{ results?: Array<{ name?: string; admin1?: string; country?: string; latitude?: number; longitude?: number; timezone?: string }> }>(
        `https://geocoding-api.open-meteo.com/v1/search?${params}`,
      );
      return (payload.results ?? []).flatMap((place) =>
        typeof place.latitude === "number" && typeof place.longitude === "number" && place.name
          ? [{ name: place.name, admin1: place.admin1 ?? "", country: place.country ?? "", latitude: place.latitude, longitude: place.longitude, timezone: place.timezone ?? "auto" }]
          : [],
      );
    } catch {
      return [];
    }
  });

export const reverseGeocode = createServerFn({ method: "GET" })
  .inputValidator((input: { latitude: number; longitude: number }) => {
    if (!Number.isFinite(input.latitude) || Math.abs(input.latitude) > 90) throw new Error("Invalid latitude.");
    if (!Number.isFinite(input.longitude) || Math.abs(input.longitude) > 180) throw new Error("Invalid longitude.");
    return input;
  })
  .handler(async ({ data }): Promise<WeatherLocation> => {
    const fallback: WeatherLocation = {
      name: `${data.latitude.toFixed(3)}°, ${data.longitude.toFixed(3)}°`,
      admin1: "",
      country: "",
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: "auto",
    };
    try {
      const params = new URLSearchParams({ format: "json", lat: String(data.latitude), lon: String(data.longitude), zoom: "12", "accept-language": "en" });
      const payload = await getJson<{ name?: string; address?: Record<string, string | undefined> }>(
        `https://nominatim.openstreetmap.org/reverse?${params}`,
        { "User-Agent": "SkyShieldAI/1.0 (weather dashboard)" },
      );
      const address = payload.address ?? {};
      const name = address["city"] ?? address["town"] ?? address["village"] ?? address["suburb"] ?? address["county"] ?? address["state_district"] ?? payload.name;
      return { ...fallback, name: name || fallback.name, admin1: address["state"] ?? "", country: address["country"] ?? "" };
    } catch {
      return fallback;
    }
  });

export const getWeatherBundle = createServerFn({ method: "GET" })
  .inputValidator((input: WeatherLocation) => validateLocation(input))
  .handler(async ({ data }): Promise<WeatherBundle> => {
    const { latitude: lat, longitude: lon } = data;

    // 5x5 observation grid (~11 km spacing) around the selected point
    const step = 0.1;
    const lonStep = step / Math.max(Math.cos((lat * Math.PI) / 180), 0.2);
    const gridCoords: Array<{ lat: number; lon: number }> = [];
    for (let row = 2; row >= -2; row--) for (let col = -2; col <= 2; col++) gridCoords.push({ lat: +(lat + row * step).toFixed(4), lon: +(lon + col * lonStep).toFixed(4) });

    const forecastParams = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,dew_point_2m,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,is_day",
      hourly: "temperature_2m,relative_humidity_2m,dew_point_2m,precipitation_probability,precipitation,weather_code,cape,wind_speed_10m,wind_gusts_10m,pressure_msl,visibility,cloud_cover",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,uv_index_max,sunrise,sunset",
      timezone: "auto",
      past_days: "3",
      forecast_days: "7",
      wind_speed_unit: "kmh",
    });
    const gridParams = new URLSearchParams({
      latitude: gridCoords.map((c) => c.lat).join(","),
      longitude: gridCoords.map((c) => c.lon).join(","),
      current: "temperature_2m,relative_humidity_2m,pressure_msl,precipitation,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cloud_cover,weather_code",
      timezone: "auto",
      wind_speed_unit: "kmh",
    });
    const floodParams = new URLSearchParams({ latitude: String(lat), longitude: String(lon), daily: "river_discharge,river_discharge_mean,river_discharge_max", past_days: "14", forecast_days: "21" });
    const airParams = new URLSearchParams({ latitude: String(lat), longitude: String(lon), current: "us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,carbon_monoxide,sulphur_dioxide", hourly: "us_aqi,pm2_5,pm10", forecast_days: "3", timezone: "auto" });
    const nasaEnd = new Date(Date.now() - 2 * 86400000);
    const nasaStart = new Date(nasaEnd.getTime() - 29 * 86400000);
    const nasaParams = new URLSearchParams({ parameters: "T2M,T2M_MAX,T2M_MIN,RH2M,PRECTOTCORR,WS2M", community: "AG", longitude: String(lon), latitude: String(lat), start: utcDate(nasaStart), end: utcDate(nasaEnd), format: "JSON" });
    const box = 10;
    const eonetParams = new URLSearchParams({ status: "open", days: "60", limit: "100", bbox: `${lon - box},${lat + box},${lon + box},${lat - box}` });

    const [forecastR, gridR, floodR, airR, nasaR, eonetR, radarR] = await Promise.allSettled([
      getJson<{ timezone?: string; current?: Record<string, string | number>; hourly?: Series; daily?: Series }>(`https://api.open-meteo.com/v1/forecast?${forecastParams}`),
      getJson<Array<{ current?: Record<string, string | number> }> | { current?: Record<string, string | number> }>(`https://api.open-meteo.com/v1/forecast?${gridParams}`),
      getJson<{ daily?: Series }>(`https://flood-api.open-meteo.com/v1/flood?${floodParams}`),
      getJson<{ current?: Record<string, string | number>; hourly?: Series }>(`https://air-quality-api.open-meteo.com/v1/air-quality?${airParams}`),
      getJson<{ properties?: { parameter?: Record<string, Record<string, number>> } }>(`https://power.larc.nasa.gov/api/temporal/daily/point?${nasaParams}`),
      getJson<{ events?: Array<{ id: string; title: string; link: string; categories?: Array<{ title: string }>; geometry?: Array<{ date: string; type: string; coordinates: unknown }> }> }>(`https://eonet.gsfc.nasa.gov/api/v3/events?${eonetParams}`),
      getJson<{ host?: string; radar?: { past?: Array<{ time: number; path: string }> } }>("https://api.rainviewer.com/public/weather-maps.json"),
    ]);

    const sources: SourceStatus[] = [];
    const push = (source: SourceStatus) => sources.push(source);

    // Forecast + current
    let current: WeatherBundle["current"] = null;
    let hourly: HourPoint[] = [];
    let daily: DayPoint[] = [];
    let pastDaily: DayPoint[] = [];
    let timezone = data.timezone;
    if (forecastR.status === "fulfilled") {
      const f = forecastR.value;
      timezone = f.timezone ?? timezone;
      const c = f.current;
      if (c) {
        current = {
          time: String(c["time"] ?? ""),
          temperature: Number(c["temperature_2m"] ?? 0),
          feelsLike: Number(c["apparent_temperature"] ?? 0),
          humidity: Number(c["relative_humidity_2m"] ?? 0),
          dewPoint: Number(c["dew_point_2m"] ?? 0),
          precipitation: Number(c["precipitation"] ?? 0),
          weatherCode: Number(c["weather_code"] ?? 0),
          cloudCover: Number(c["cloud_cover"] ?? 0),
          pressure: Number(c["pressure_msl"] ?? 0),
          windSpeed: Number(c["wind_speed_10m"] ?? 0),
          windGusts: Number(c["wind_gusts_10m"] ?? 0),
          windDirection: Number(c["wind_direction_10m"] ?? 0),
          isDay: Number(c["is_day"] ?? 1) === 1,
        };
      }
      const h = f.hourly ?? {};
      const times = h["time"] ?? [];
      const nowHour = (current?.time ?? "").slice(0, 13);
      let startIndex = times.findIndex((t) => String(t).slice(0, 13) >= nowHour);
      if (startIndex < 0) startIndex = 0;
      for (let i = startIndex; i < Math.min(times.length, startIndex + 72); i++) {
        hourly.push({
          time: s(times, i),
          temperature: n(h["temperature_2m"], i),
          humidity: n(h["relative_humidity_2m"], i),
          dewPoint: n(h["dew_point_2m"], i),
          precipitation: n(h["precipitation"], i),
          precipitationProbability: n(h["precipitation_probability"], i),
          weatherCode: n(h["weather_code"], i),
          cape: n(h["cape"], i),
          windSpeed: n(h["wind_speed_10m"], i),
          windGusts: n(h["wind_gusts_10m"], i),
          pressure: n(h["pressure_msl"], i),
          visibility: n(h["visibility"], i),
          cloudCover: n(h["cloud_cover"], i),
        });
      }
      const d = f.daily ?? {};
      const today = (current?.time ?? "").slice(0, 10);
      const days: DayPoint[] = (d["time"] ?? []).map((date, i) => ({
        date: String(date),
        high: n(d["temperature_2m_max"], i),
        low: n(d["temperature_2m_min"], i),
        feelsLikeMax: n(d["apparent_temperature_max"], i),
        precipitation: n(d["precipitation_sum"], i),
        precipitationProbability: n(d["precipitation_probability_max"], i),
        weatherCode: n(d["weather_code"], i),
        windMax: n(d["wind_speed_10m_max"], i),
        gustMax: n(d["wind_gusts_10m_max"], i),
        uvMax: n(d["uv_index_max"], i),
        sunrise: s(d["sunrise"], i),
        sunset: s(d["sunset"], i),
      }));
      daily = days.filter((day) => day.date >= today);
      pastDaily = days.filter((day) => day.date < today);
      push({ id: "forecast", name: "Current conditions & 7-day forecast", provider: "Open-Meteo (ECMWF · GFS · ICON · IMD-assimilated models)", status: "live", detail: `Updated ${current?.time ?? "now"} local time`, url: "https://open-meteo.com" });
    } else {
      push({ id: "forecast", name: "Current conditions & 7-day forecast", provider: "Open-Meteo", status: "unavailable", detail: "Provider did not respond", url: "https://open-meteo.com" });
    }

    // Grid
    let grid: GridPoint[] = [];
    if (gridR.status === "fulfilled") {
      const list = Array.isArray(gridR.value) ? gridR.value : [gridR.value];
      grid = list.flatMap((item, i) => {
        const coord = gridCoords[i];
        const c = item.current;
        if (!coord || !c) return [];
        const distanceKm = haversine(lat, lon, coord.lat, coord.lon);
        return [{
          id: `GP-${String(i + 1).padStart(2, "0")}`,
          label: distanceKm < 1 ? "Centre" : `${Math.round(distanceKm)} km ${bearingLabel(lat, lon, coord.lat, coord.lon)}`,
          latitude: coord.lat,
          longitude: coord.lon,
          distanceKm,
          temperature: Number(c["temperature_2m"] ?? 0),
          humidity: Number(c["relative_humidity_2m"] ?? 0),
          pressure: Number(c["pressure_msl"] ?? 0),
          precipitation: Number(c["precipitation"] ?? 0),
          windSpeed: Number(c["wind_speed_10m"] ?? 0),
          windDirection: Number(c["wind_direction_10m"] ?? 0),
          windGusts: Number(c["wind_gusts_10m"] ?? 0),
          cloudCover: Number(c["cloud_cover"] ?? 0),
          weatherCode: Number(c["weather_code"] ?? 0),
          time: String(c["time"] ?? ""),
        }];
      });
      push({ id: "grid", name: "25-point observation grid", provider: "Open-Meteo multi-point analysis", status: "live", detail: `${grid.length} points · 11 km spacing`, url: "https://open-meteo.com" });
    } else {
      push({ id: "grid", name: "25-point observation grid", provider: "Open-Meteo", status: "unavailable", detail: "Grid request failed", url: "https://open-meteo.com" });
    }

    // Flood
    let flood: FloodDay[] = [];
    if (floodR.status === "fulfilled") {
      const d = floodR.value.daily ?? {};
      const today = (current?.time ?? new Date().toISOString()).slice(0, 10);
      flood = (d["time"] ?? []).map((date, i) => ({ date: String(date), discharge: n(d["river_discharge"], i), ensembleMean: n(d["river_discharge_mean"], i), ensembleMax: n(d["river_discharge_max"], i), isForecast: String(date) >= today }));
      const hasRiver = flood.some((day) => day.discharge > 0.5);
      if (!hasRiver) flood = [];
      push({ id: "flood", name: "River discharge forecast", provider: "GloFAS v4 · Copernicus EMS (via Open-Meteo)", status: hasRiver ? "live" : "unavailable", detail: hasRiver ? "5 km river cell found" : "No major river cell at this point", url: "https://www.globalfloods.eu" });
    } else {
      push({ id: "flood", name: "River discharge forecast", provider: "GloFAS v4 · Copernicus EMS", status: "unavailable", detail: "Flood API did not respond", url: "https://www.globalfloods.eu" });
    }

    // Air
    const air: WeatherBundle["air"] = { now: null, hourly: [] };
    if (airR.status === "fulfilled") {
      const c = airR.value.current;
      if (c) air.now = { time: String(c["time"] ?? ""), usAqi: Number(c["us_aqi"] ?? 0), pm25: Number(c["pm2_5"] ?? 0), pm10: Number(c["pm10"] ?? 0), no2: Number(c["nitrogen_dioxide"] ?? 0), o3: Number(c["ozone"] ?? 0), co: Number(c["carbon_monoxide"] ?? 0), so2: Number(c["sulphur_dioxide"] ?? 0) };
      const h = airR.value.hourly ?? {};
      const times = h["time"] ?? [];
      const nowHour = (air.now?.time ?? "").slice(0, 13);
      let start = times.findIndex((t) => String(t).slice(0, 13) >= nowHour);
      if (start < 0) start = 0;
      for (let i = start; i < Math.min(times.length, start + 48); i++) air.hourly.push({ time: s(times, i), usAqi: n(h["us_aqi"], i), pm25: n(h["pm2_5"], i), pm10: n(h["pm10"], i) });
      push({ id: "air", name: "Air quality", provider: "Copernicus CAMS (via Open-Meteo)", status: "live", detail: `US AQI ${air.now?.usAqi ?? "—"}`, url: "https://atmosphere.copernicus.eu" });
    } else {
      push({ id: "air", name: "Air quality", provider: "Copernicus CAMS", status: "unavailable", detail: "Air-quality API did not respond", url: "https://atmosphere.copernicus.eu" });
    }

    // NASA POWER
    const nasa: NasaDay[] = [];
    if (nasaR.status === "fulfilled") {
      const p = nasaR.value.properties?.parameter ?? {};
      const t2m = p["T2M"] ?? {};
      for (const key of Object.keys(t2m).sort()) {
        const at = (param: string) => {
          const v = p[param]?.[key];
          return typeof v === "number" && v > -900 ? v : null;
        };
        nasa.push({ date: `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`, temperature: at("T2M"), tmax: at("T2M_MAX"), tmin: at("T2M_MIN"), humidity: at("RH2M"), precipitation: at("PRECTOTCORR"), windSpeed: at("WS2M") });
      }
      const valid = nasa.filter((day) => day.temperature !== null).length;
      push({ id: "nasa", name: "30-day observed history", provider: "NASA POWER (MERRA-2 · GPM IMERG)", status: valid > 0 ? "live" : "unavailable", detail: valid > 0 ? `${valid} days with data` : "No processed days yet", url: "https://power.larc.nasa.gov" });
    } else {
      push({ id: "nasa", name: "30-day observed history", provider: "NASA POWER", status: "unavailable", detail: "NASA POWER did not respond", url: "https://power.larc.nasa.gov" });
    }

    // NASA EONET
    const events: NaturalEvent[] = [];
    if (eonetR.status === "fulfilled") {
      for (const event of eonetR.value.events ?? []) {
        const geometry = event.geometry?.[event.geometry.length - 1];
        if (!geometry || geometry.type !== "Point" || !Array.isArray(geometry.coordinates)) continue;
        const [eLon, eLat] = geometry.coordinates as [number, number];
        if (typeof eLat !== "number" || typeof eLon !== "number") continue;
        events.push({ id: event.id, title: event.title, category: event.categories?.[0]?.title ?? "Event", date: geometry.date, latitude: eLat, longitude: eLon, distanceKm: Math.round(haversine(lat, lon, eLat, eLon)), link: event.link });
      }
      events.sort((a, b) => a.distanceKm - b.distanceKm);
      push({ id: "eonet", name: "Natural hazard events", provider: "NASA EONET (GDACS · FIRMS · JTWC)", status: "live", detail: `${events.length} open events within ~1,100 km`, url: "https://eonet.gsfc.nasa.gov" });
    } else {
      push({ id: "eonet", name: "Natural hazard events", provider: "NASA EONET", status: "unavailable", detail: "EONET did not respond", url: "https://eonet.gsfc.nasa.gov" });
    }

    // Radar
    let radar: WeatherBundle["radar"] = null;
    if (radarR.status === "fulfilled") {
      const last = radarR.value.radar?.past?.[radarR.value.radar.past.length - 1];
      if (last && radarR.value.host) radar = { host: radarR.value.host, path: last.path, time: last.time };
    }
    push({ id: "radar", name: "Precipitation radar mosaic", provider: "RainViewer (national radar networks incl. IMD)", status: radar ? "live" : "unavailable", detail: radar ? `Frame ${new Date(radar.time * 1000).toISOString().slice(11, 16)} UTC` : "Radar index unavailable", url: "https://www.rainviewer.com" });

    const satelliteDate = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    push({ id: "gibs", name: "Satellite imagery & IMERG rain rate", provider: "NASA GIBS (VIIRS SNPP · GPM IMERG)", status: "live", detail: `Imagery date ${satelliteDate}`, url: "https://earthdata.nasa.gov/gibs" });
    push({ id: "mosdac", name: "INSAT-3D/3DR products", provider: "ISRO MOSDAC", status: "restricted", detail: "Needs a registered MOSDAC account; open link to view official imagery", url: "https://www.mosdac.gov.in" });
    push({ id: "imd", name: "District warnings & AWS network", provider: "India Meteorological Department", status: "restricted", detail: "IMD APIs are IP-whitelisted; official warnings open on mausam.imd.gov.in", url: "https://mausam.imd.gov.in" });

    return {
      location: { ...data, timezone },
      fetchedAt: new Date().toISOString(),
      timezone,
      error: forecastR.status === "rejected" ? "The live forecast provider could not be reached. Try refreshing." : null,
      current,
      hourly,
      daily,
      pastDaily,
      grid,
      flood,
      air,
      nasa,
      events,
      radar,
      satelliteDate,
      sources,
    };
  });
