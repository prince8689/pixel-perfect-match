import { createServerFn } from "@tanstack/react-start";

export type WeatherLocation = {
  name: string;
  admin1: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

export type WeatherReport = {
  fetchedAt: string;
  source: string;
  timezone: string;
  current: {
    time: string;
    temperature: number;
    feelsLike: number;
    humidity: number;
    precipitation: number;
    weatherCode: number;
    cloudCover: number;
    pressure: number;
    windSpeed: number;
    windDirection: number;
  } | null;
  hourly: Array<{
    time: string;
    temperature: number;
    precipitation: number;
    precipitationProbability: number;
    weatherCode: number;
  }>;
  daily: Array<{
    date: string;
    high: number;
    low: number;
    precipitation: number;
    precipitationProbability: number;
    weatherCode: number;
  }>;
  nasaHistory: Array<{
    date: string;
    temperature: number | null;
    humidity: number | null;
    precipitation: number | null;
    windSpeed: number | null;
  }>;
  nasaStatus: "available" | "unavailable";
  error: string | null;
};

export const searchWeatherLocations = createServerFn({ method: "GET" })
  .inputValidator((input: { query: string }) => {
    const query = input.query.trim();
    if (query.length < 2 || query.length > 80) throw new Error("Enter a place name with 2 to 80 characters.");
    return { query };
  })
  .handler(async ({ data }): Promise<WeatherLocation[]> => {
    const params = new URLSearchParams({ name: data.query, count: "8", language: "en", format: "json" });
    try {
      const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) return [];
      const payload = await response.json() as {
        results?: Array<{
          name?: string;
          admin1?: string;
          country?: string;
          latitude?: number;
          longitude?: number;
          timezone?: string;
          country_code?: string;
        }>;
      };
      return (payload.results ?? []).flatMap((place) => {
        if (typeof place.latitude !== "number" || typeof place.longitude !== "number" || !place.name) return [];
        return [{
          name: place.name,
          admin1: place.admin1 ?? "",
          country: place.country ?? "",
          latitude: place.latitude,
          longitude: place.longitude,
          timezone: place.timezone ?? "UTC",
        }];
      });
    } catch {
      return [];
    }
  });

function utcDate(date: Date): string {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

export const getLiveWeather = createServerFn({ method: "GET" })
  .inputValidator((input: WeatherLocation) => {
    if (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90) throw new Error("Invalid latitude.");
    if (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) throw new Error("Invalid longitude.");
    if (!input.name || input.name.length > 120) throw new Error("Invalid location name.");
    return input;
  })
  .handler(async ({ data }): Promise<WeatherReport> => {
    const emptyReport: WeatherReport = {
      fetchedAt: new Date().toISOString(),
      source: "Open-Meteo · best-match forecast model",
      timezone: data.timezone || "UTC",
      current: null,
      hourly: [],
      daily: [],
      nasaHistory: [],
      nasaStatus: "unavailable",
      error: null,
    };

    const weatherParams = new URLSearchParams({
      latitude: String(data.latitude),
      longitude: String(data.longitude),
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m",
      hourly: "temperature_2m,precipitation_probability,precipitation,weather_code",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max",
      timezone: "auto",
      forecast_days: "7",
      wind_speed_unit: "kmh",
    });

    const today = new Date();
    const nasaEnd = new Date(today.getTime() - 2 * 86400000);
    const nasaStart = new Date(nasaEnd.getTime() - 6 * 86400000);
    const nasaParams = new URLSearchParams({
      parameters: "T2M,RH2M,PRECTOTCORR,WS2M",
      community: "RE",
      longitude: String(data.longitude),
      latitude: String(data.latitude),
      start: utcDate(nasaStart),
      end: utcDate(nasaEnd),
      format: "JSON",
    });

    const [weatherResult, nasaResult] = await Promise.allSettled([
      fetch(`https://api.open-meteo.com/v1/forecast?${weatherParams}`, { signal: AbortSignal.timeout(15000) }),
      fetch(`https://power.larc.nasa.gov/api/temporal/daily/point?${nasaParams}`, { signal: AbortSignal.timeout(15000) }),
    ]);

    if (weatherResult.status === "rejected" || !weatherResult.value.ok) {
      return { ...emptyReport, error: "The live forecast provider could not be reached. Try again shortly." };
    }

    const weather = await weatherResult.value.json() as {
      timezone?: string;
      current?: Record<string, string | number>;
      hourly?: Record<string, Array<string | number>>;
      daily?: Record<string, Array<string | number>>;
    };
    const current = weather.current;
    const hourly = weather.hourly;
    const daily = weather.daily;
    const numberAt = (values: Array<string | number> | undefined, index: number, fallback = 0) => {
      const value = values?.[index];
      return typeof value === "number" ? value : fallback;
    };
    const stringAt = (values: Array<string | number> | undefined, index: number) => String(values?.[index] ?? "");

    const nasaHistory: WeatherReport["nasaHistory"] = [];
    let nasaStatus: WeatherReport["nasaStatus"] = "unavailable";
    if (nasaResult.status === "fulfilled" && nasaResult.value.ok) {
      try {
        const nasa = await nasaResult.value.json() as {
          properties?: { parameter?: Record<string, Record<string, number>> };
        };
        const parameters = nasa.properties?.parameter;
        const temperatures = parameters?.T2M;
        if (temperatures && Object.keys(temperatures).length > 0) {
          nasaStatus = "available";
          for (const key of Object.keys(temperatures).sort()) {
            const at = (parameter: string) => {
              const value = parameters?.[parameter]?.[key];
              return typeof value === "number" && value > -900 ? value : null;
            };
            nasaHistory.push({ date: `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`, temperature: at("T2M"), humidity: at("RH2M"), precipitation: at("PRECTOTCORR"), windSpeed: at("WS2M") });
          }
        }
      } catch {
        nasaStatus = "unavailable";
      }
    }

    return {
      fetchedAt: new Date().toISOString(),
      source: "Open-Meteo · best-match forecast model",
      timezone: weather.timezone ?? data.timezone ?? "UTC",
      current: current ? {
        time: String(current["time"] ?? ""),
        temperature: Number(current["temperature_2m"] ?? 0),
        feelsLike: Number(current["apparent_temperature"] ?? 0),
        humidity: Number(current["relative_humidity_2m"] ?? 0),
        precipitation: Number(current["precipitation"] ?? 0),
        weatherCode: Number(current["weather_code"] ?? 0),
        cloudCover: Number(current["cloud_cover"] ?? 0),
        pressure: Number(current["pressure_msl"] ?? 0),
        windSpeed: Number(current["wind_speed_10m"] ?? 0),
        windDirection: Number(current["wind_direction_10m"] ?? 0),
      } : null,
      hourly: (hourly?.time ?? []).slice(0, 24).map((time, index) => ({
        time: String(time),
        temperature: numberAt(hourly?.temperature_2m, index),
        precipitation: numberAt(hourly?.precipitation, index),
        precipitationProbability: numberAt(hourly?.precipitation_probability, index),
        weatherCode: numberAt(hourly?.weather_code, index),
      })),
      daily: (daily?.time ?? []).map((date, index) => ({
        date: String(date),
        high: numberAt(daily?.temperature_2m_max, index),
        low: numberAt(daily?.temperature_2m_min, index),
        precipitation: numberAt(daily?.precipitation_sum, index),
        precipitationProbability: numberAt(daily?.precipitation_probability_max, index),
        weatherCode: numberAt(daily?.weather_code, index),
      })),
      nasaHistory,
      nasaStatus,
      error: null,
    };
  });