export type Station = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  temperature: number;
  humidity: number;
  pressure: number;
  rainfall: number;
  wind_speed: number;
  wind_direction: string;
  health: number;
  trust_score: number;
  status: string;
  updated_at: string;
};

export type Scenario = "Normal Weather" | "Sensor Fault" | "Thunderstorm Development" | "Heavy Rainfall" | "Flash Flood" | "Multi-Hazard Event";

const locations = [
  ["Assi Ghat", 25.287, 83.006], ["Dashashwamedh", 25.307, 83.01], ["Ravidas Gate", 25.277, 82.992], ["Lanka", 25.267, 82.999], ["Varuna Bridge", 25.342, 82.987],
  ["Sarnath", 25.381, 83.022], ["Manduadih", 25.286, 82.967], ["Shivpur", 25.365, 82.956], ["Ramnagar", 25.269, 83.032], ["Babatpur", 25.452, 82.86],
  ["Cholapur", 25.51, 83.05], ["Pindra", 25.42, 82.92], ["Kashi Vidyapith", 25.312, 82.978], ["Bhelupur", 25.292, 83.002], ["Sigra", 25.316, 82.985],
  ["Mahmoorganj", 25.301, 82.978], ["Pandeypur", 25.351, 83.01], ["Lalpur", 25.375, 82.985], ["Chitaipur", 25.249, 82.994], ["Kandwa", 25.234, 82.975],
  ["Varuna North", 25.401, 83.012], ["Ganga Barrage", 25.329, 83.027], ["Chunar Road", 25.191, 82.915], ["Lohta", 25.286, 82.935], ["Kachhwa", 25.212, 82.991],
  ["Baragaon", 25.468, 82.93], ["Arajiline", 25.214, 82.94], ["Sevapuri", 25.306, 82.835], ["Harhua", 25.41, 82.965], ["Kapsethi", 25.339, 82.805],
  ["Phulwaria", 25.33, 82.95], ["Rohania", 25.273, 83.045], ["Sewapuri East", 25.322, 82.875], ["Jansa", 25.252, 82.856], ["Khalispur", 25.391, 83.08],
  ["Rajatalab", 25.237, 82.905], ["Chandpur", 25.342, 82.92], ["Bhadwar", 25.426, 83.11], ["Ganga West Bank", 25.32, 82.945], ["Sarai Mohana", 25.39, 83.065],
  ["Adampur", 25.335, 83.005], ["Chaukaghat", 25.329, 82.998], ["Mughal Sarai", 25.283, 83.118], ["Gopiganj Road", 25.173, 82.91], ["Kachnar", 25.376, 82.9],
  ["Bari Gaibi", 25.297, 82.994], ["Ramnagar Fort", 25.268, 83.031], ["Varanasi Cantonment", 25.338, 82.973], ["Ganga East Bank", 25.309, 83.024], ["Lal Bahadur Nagar", 25.257, 82.984],
] as const;

const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

export const demoStations: Station[] = locations.map(([name, latitude, longitude], index) => {
  const fault = index === 16;
  const watch = [4, 7, 17, 21, 28, 34, 37, 42].includes(index);
  return {
    id: `AWS-${String(index + 1).padStart(3, "0")}`,
    name,
    latitude,
    longitude,
    temperature: fault ? 55 : Number((29.6 + ((index * 17) % 30) / 10).toFixed(1)),
    humidity: 68 + ((index * 7) % 20),
    pressure: Number((1003.4 + ((index * 13) % 34) / 10).toFixed(1)),
    rainfall: Number((2.3 + ((index * 19) % 220) / 10).toFixed(1)),
    wind_speed: Number((9.8 + ((index * 11) % 145) / 10).toFixed(1)),
    wind_direction: directions[index % directions.length] ?? "N",
    health: fault ? 58 : watch ? 89 : 92 + ((index * 7) % 7),
    trust_score: fault ? 42 : watch ? 91 : 94 + ((index * 5) % 5),
    status: fault ? "critical" : watch ? "watch" : "healthy",
    updated_at: "2026-09-29T18:00:00.000Z",
  };
});

export const getScenarioMetrics = (scenario: Scenario, tick: number) => {
  const storm = scenario === "Thunderstorm Development" || scenario === "Multi-Hazard Event";
  const rain = scenario === "Heavy Rainfall" || scenario === "Flash Flood" || scenario === "Multi-Hazard Event";
  const flood = scenario === "Flash Flood" || scenario === "Multi-Hazard Event";
  const pressureDrop = storm || rain ? Math.min(tick * 0.8, 14) : 0;
  return {
    thunderstorm: Math.min(24 + (storm ? 42 : 0) + tick * (storm ? 4 : 0), 96),
    lightning: Math.min(18 + (storm ? 39 : 0) + tick * (storm ? 3 : 0), 92),
    rainfall: Number((8 + (rain ? 26 : 0) + Math.min(tick * 2.2, rain ? 32 : 3)).toFixed(1)),
    flood: Math.min(22 + (flood ? 49 : rain ? 17 : 0) + tick * (flood ? 3 : rain ? 1 : 0), 98),
    pressure: Number((1006.4 - pressureDrop).toFixed(1)),
    activeAlerts: flood ? 3 : storm || rain ? 2 : scenario === "Sensor Fault" ? 1 : 0,
  };
};

export const demoAlerts = [
  { id: "ALT-042", title: "Sensor temperature spike", location: "Pandeypur · AWS-017", severity: "critical", confidence: 96, time: "18:02", reason: "Observed 55°C; neighboring stations remain within 31°C." },
  { id: "ALT-041", title: "Heavy rainfall watch", location: "Varuna North corridor", severity: "warning", confidence: 88, time: "17:54", reason: "Simulated accumulation exceeds the local watch threshold." },
  { id: "ALT-040", title: "Lightning potential rising", location: "Sarnath · north sector", severity: "watch", confidence: 81, time: "17:46", reason: "Convective cell conditions are developing in the demo feed." },
];