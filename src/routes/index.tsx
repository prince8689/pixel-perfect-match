import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Bell, Check, ChevronDown, ChevronRight,
  CloudRain, Crosshair, Database, Gauge, Layers, LocateFixed, MapPin, Menu, Radio,
  RefreshCw, Shield, ShieldAlert, Siren, SlidersHorizontal, Sparkles, Target, Wind, X, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSkyshieldStations } from "@/lib/stations.functions";
import { demoAlerts, getScenarioMetrics, type Scenario, type Station } from "@/lib/skyshield-data";

const MapView = lazy(() => import("@/components/SkyshieldMap"));
const scenarios: Scenario[] = ["Normal Weather", "Sensor Fault", "Thunderstorm Development", "Heavy Rainfall", "Flash Flood", "Multi-Hazard Event"];

export const Route = createFileRoute("/")({
  loader: () => getSkyshieldStations(),
  head: () => ({ meta: [
    { title: "SkyShield AI — Varanasi Weather Command Center" },
    { name: "description", content: "Monitor simulated weather stations, alerts, rainfall and hazard scenarios across Varanasi." },
    { property: "og:title", content: "SkyShield AI — Varanasi Weather Command Center" },
    { property: "og:description", content: "Detect, predict, protect — simulated weather intelligence for Varanasi." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: CommandCenter,
});

function CommandCenter() {
  const { stations: initialStations, source } = Route.useLoaderData();
  const [stations, setStations] = useState(initialStations);
  const [scenario, setScenario] = useState<Scenario>("Thunderstorm Development");
  const [tick, setTick] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [activeSection, setActiveSection] = useState("Overview");
  const [selectedStation, setSelectedStation] = useState<Station | null>(initialStations.find((item) => item.status === "critical") ?? null);
  const [alertFilter, setAlertFilter] = useState("All alerts");
  const [mobileMenu, setMobileMenu] = useState(false);
  const metrics = useMemo(() => getScenarioMetrics(scenario, tick), [scenario, tick]);
  const healthy = stations.filter((station) => station.status === "healthy").length;
  const watch = stations.filter((station) => station.status === "watch").length;
  const critical = stations.filter((station) => station.status === "critical").length;
  const filteredAlerts = demoAlerts.filter((alert) => alertFilter === "All alerts" || alert.severity === alertFilter.toLowerCase());

  useEffect(() => {
    if (!playing) return;
    const interval = window.setInterval(() => setTick((current) => current + 1), 1400);
    return () => window.clearInterval(interval);
  }, [playing]);

  const changeScenario = (next: Scenario) => {
    setScenario(next);
    setTick(0);
    setPlaying(false);
    setStations((current) => current.map((station) => station.id === "AWS-017"
      ? { ...station, status: next === "Sensor Fault" ? "critical" : "healthy", temperature: next === "Sensor Fault" ? 55 : 32.5, health: next === "Sensor Fault" ? 58 : 95 }
      : station));
  };

  const navItems = [
    { label: "Overview", icon: Layers, group: "COMMAND" },
    { label: "AWS Network", icon: Radio, count: String(stations.length), group: "OBSERVE" },
    { label: "Anomaly Detection", icon: Activity, count: String(critical + 2), group: "OBSERVE" },
    { label: "Nowcasting", icon: Zap, group: "PREDICT" },
    { label: "Rainfall & Flood", icon: CloudRain, group: "PREDICT" },
    { label: "Alert Center", icon: Siren, count: String(demoAlerts.length), group: "PROTECT" },
    { label: "Simulation Lab", icon: Crosshair, group: "PROTECT" },
    { label: "Reports", icon: Database, group: "SYSTEM" },
  ];

  return <div className="flex h-screen min-h-[720px] overflow-hidden bg-ink text-snow">
    {mobileMenu && <button aria-label="Close navigation" onClick={() => setMobileMenu(false)} className="fixed inset-0 z-30 bg-ink/80 lg:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[248px] shrink-0 flex-col border-r border-edge bg-panel transition-transform lg:static lg:translate-x-0 ${mobileMenu ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex h-[68px] items-center gap-3 border-b border-edge px-5"><div className="grid size-9 place-items-center rounded-lg border border-amber/40 bg-amber/10 text-amber"><Shield size={19}/></div><div><p className="text-[14px] font-bold tracking-[0.12em]">SKYSHIELD<span className="text-amber"> AI</span></p><p className="font-mono text-[9px] tracking-[0.18em] text-muted-ops">WEATHER INTELLIGENCE</p></div><Button variant="ghost" size="icon" className="ml-auto lg:hidden" aria-label="Close navigation" onClick={() => setMobileMenu(false)}><X size={16}/></Button></div>
      <div className="mx-4 mt-4 flex items-center justify-between border border-edge bg-ink/40 px-3 py-2.5"><div className="flex items-center gap-2"><span className="dot-live size-2 rounded-full bg-amber"/><span className="font-mono text-[10px] font-semibold tracking-[0.1em] text-amber">DEMO / SIMULATION</span></div><ChevronDown size={13} className="text-muted-ops"/></div>
      <nav className="mt-6 flex-1 overflow-y-auto px-3">{["COMMAND", "OBSERVE", "PREDICT", "PROTECT", "SYSTEM"].map((group) => <div key={group} className="mb-5"><p className="px-3 pb-2 font-mono text-[9px] font-semibold tracking-[0.2em] text-muted-ops">{group}</p>{navItems.filter((item) => item.group === group).map(({ label, icon: Icon, count }) => <button key={label} onClick={() => { setActiveSection(label); setMobileMenu(false); }} className={`mb-0.5 flex h-10 w-full items-center gap-3 px-3 text-left text-[12px] transition-colors ${activeSection === label ? "border-l-2 border-amber bg-amber/10 text-snow" : "border-l-2 border-transparent text-muted-ops hover:bg-panel2 hover:text-snow"}`}><Icon size={15} className={activeSection === label ? "text-amber" : ""}/><span className="flex-1">{label}</span>{count && <span className="font-mono text-[10px] text-muted-ops">{count}</span>}</button>)}</div>)}</nav>
      <div className="border-t border-edge p-4"><div className="mb-3 flex items-center justify-between"><span className="font-mono text-[9px] tracking-[0.16em] text-muted-ops">SYSTEM HEALTH</span><span className="flex items-center gap-1.5 font-mono text-[9px] text-teal"><span className="size-1.5 rounded-full bg-teal"/> ALL SYSTEMS NOMINAL</span></div><div className="grid grid-cols-3 gap-2"><HealthMini label="API" value="99.9%"/><HealthMini label="FEED" value="DEMO"/><HealthMini label="AI" value="READY"/></div><div className="mt-4 flex items-center gap-2 border-t border-edge pt-3"><div className="grid size-8 place-items-center rounded-full bg-panel2 text-[10px] font-semibold text-amber">OP</div><div className="flex-1"><p className="text-[11px] font-medium">Operations Desk</p><p className="font-mono text-[9px] text-muted-ops">VARANASI CONTROL</p></div><ChevronDown size={13} className="text-muted-ops"/></div></div>
    </aside>

    <main className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-[68px] shrink-0 items-center gap-3 border-b border-edge bg-panel/70 px-4 md:px-6"><Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation" onClick={() => setMobileMenu(true)}><Menu size={18}/></Button><div className="min-w-0"><div className="flex items-center gap-2 text-[11px] text-muted-ops"><span>Uttar Pradesh</span><ChevronRight size={12}/><span className="text-snow">Varanasi District</span></div><div className="mt-0.5 flex items-center gap-2"><h1 className="text-[17px] font-semibold leading-none">{activeSection === "Overview" ? "Operations Overview" : activeSection}</h1><span className="hidden border border-edge px-1.5 py-0.5 font-mono text-[9px] text-amber sm:inline">ZONE UP-73</span></div></div><div className="ml-auto hidden items-center gap-2 xl:flex"><span className="font-mono text-[10px] text-muted-ops">25.31°N 82.98°E</span><span className="mx-1 h-4 border-l border-edge"/><span className="font-mono text-[10px] text-muted-ops">SOURCE</span><span className="font-mono text-[10px] text-cyan">{source.toUpperCase()}</span></div><span className="ml-auto flex items-center gap-1.5 border border-amber/30 bg-amber/10 px-2 py-1 font-mono text-[9px] font-semibold tracking-[0.08em] text-amber xl:ml-2"><span className="dot-live size-1.5 rounded-full bg-amber"/> SIMULATION</span><Button variant="outline" size="icon" className="relative ml-1 size-9" aria-label="Alerts"><Bell size={16}/><span className="absolute right-1 top-1 size-1.5 rounded-full bg-alert"/></Button><Button variant="outline" size="icon" className="size-9" aria-label="System settings"><SlidersHorizontal size={16}/></Button></header>

      <div className="flex-1 overflow-y-auto"><div className="mx-auto max-w-[1720px] p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><span className="font-mono text-[9px] tracking-[0.17em] text-muted-ops">TUESDAY · 29 SEPTEMBER 2026</span><span className="size-1 rounded-full bg-edge"/><span className="font-mono text-[9px] text-muted-ops">18:04 IST</span></div><h2 className="mt-1 text-[21px] font-semibold">Varanasi District <span className="font-normal text-muted-ops">/</span> <span className="text-[14px] font-normal text-muted-ops">Command Center</span></h2></div><div className="flex items-center gap-2"><span className="hidden font-mono text-[9px] text-muted-ops sm:inline">SIMULATION SCENARIO</span><div className="relative"><select aria-label="Simulation scenario" value={scenario} onChange={(event) => changeScenario(event.target.value as Scenario)} className="h-9 appearance-none border border-edge bg-panel px-3 pr-8 font-mono text-[10px] text-snow outline-none focus:border-amber">{scenarios.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-3 text-muted-ops"/></div><Button variant="outline" size="icon" className="size-9" aria-label="Reset scenario" onClick={() => { setTick(0); setPlaying(false); }}><RefreshCw size={15}/></Button></div></div>

        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6"><MetricCard label="ACTIVE STATIONS" value={String(stations.length)} unit="AWS NODES" icon={Radio} color="cyan" foot={`${healthy} reporting normally`} trend="up"/><MetricCard label="NETWORK HEALTH" value={`${Math.round(stations.reduce((sum, station) => sum + station.health, 0) / stations.length)}%`} unit="UPTIME" icon={Gauge} color="teal" foot={`${watch} stations on watch`} trend="up"/><MetricCard label="ANOMALIES" value={String(critical + 2)} unit="DETECTED" icon={Activity} color="alert" foot={`${critical} critical · ${watch} watch`} trend="down"/><MetricCard label="THUNDERSTORM" value={`${metrics.thunderstorm}%`} unit="PROBABILITY" icon={Zap} color="amber" foot="Next 3 hours" trend="up"/><MetricCard label="RAINFALL RATE" value={metrics.rainfall.toFixed(1)} unit="MM / HR" icon={CloudRain} color="cyan" foot="District average" trend="up"/><MetricCard label="FLOOD RISK" value={`${metrics.flood}%`} unit="INDEX" icon={ShieldAlert} color={metrics.flood > 70 ? "alert" : "amber"} foot={metrics.flood > 70 ? "Elevated · river corridor" : "Moderate · basin stable"} trend="up"/></div>

        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="min-w-0 border border-edge bg-panel"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge px-4 py-3"><div className="flex items-center gap-2"><MapPin size={15} className="text-amber"/><h3 className="text-[12px] font-semibold">Live Sensor Network</h3><span className="border border-edge px-1.5 py-0.5 font-mono text-[8px] text-muted-ops">{stations.length} NODES</span></div><div className="flex items-center gap-3 font-mono text-[9px]"><Legend color="bg-teal" label={`${healthy} NORMAL`}/><Legend color="bg-amber" label={`${watch} WATCH`}/><Legend color="bg-alert" label={`${critical} CRITICAL`}/><Button variant="ghost" size="icon" className="ml-1 size-7" aria-label="Center map" onClick={() => setSelectedStation(null)}><LocateFixed size={14}/></Button></div></div>
            <div className="relative h-[350px] sm:h-[430px]"><ClientOnly fallback={<div className="h-full animate-pulse bg-panel2"/>}><Suspense fallback={<div className="h-full animate-pulse bg-panel2"/>}><MapView stations={stations} selected={selectedStation} onSelect={setSelectedStation}/></Suspense></ClientOnly><div className="pointer-events-none absolute left-3 top-3 z-[500] border border-edge bg-ink/90 px-2.5 py-2 font-mono text-[9px] leading-[1.8] text-muted-ops"><p className="text-snow">DISTRICT BOUNDARY</p><p>Uttar Pradesh · IN</p><p className="text-teal">● {stations.length} SENSORS ONLINE</p></div><div className="pointer-events-none absolute bottom-3 left-3 z-[500] flex gap-2"><span className="flex items-center gap-1.5 border border-edge bg-ink/90 px-2 py-1 font-mono text-[9px] text-snow"><span className="size-1.5 rounded-full bg-teal"/>AWS</span><span className="flex items-center gap-1.5 border border-edge bg-ink/90 px-2 py-1 font-mono text-[9px] text-snow"><span className="size-1.5 rounded-full bg-cyan"/>GANGA CORRIDOR</span></div></div>
            <div className="grid grid-cols-3 divide-x divide-edge border-t border-edge"><MapValue label="AVG TEMPERATURE" value={`${(31.1 + tick * 0.1).toFixed(1)}°C`} icon={Wind}/><MapValue label="MEAN PRESSURE" value={`${metrics.pressure} hPa`} icon={Gauge}/><MapValue label="LIGHTNING CHANCE" value={`${metrics.lightning}%`} icon={Zap}/></div>
          </section>

          <div className="flex flex-col gap-4">
            <section className="border border-edge bg-panel"><div className="flex items-center justify-between border-b border-edge px-4 py-3"><div className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-alert"/><h3 className="text-[12px] font-semibold">Active Alerts</h3><span className="grid size-[18px] place-items-center bg-alert/15 font-mono text-[9px] text-alert">{metrics.activeAlerts + demoAlerts.length}</span></div><button onClick={() => setActiveSection("Alert Center")} className="font-mono text-[9px] text-amber hover:text-snow">VIEW ALL <ArrowUpRight size={11} className="ml-1 inline"/></button></div><div className="flex gap-1.5 border-b border-edge px-4 py-2">{["All alerts", "Critical", "Warning", "Watch"].map((filter) => <button key={filter} onClick={() => setAlertFilter(filter)} className={`px-2 py-1 font-mono text-[8px] ${alertFilter === filter ? "bg-panel2 text-snow" : "text-muted-ops hover:text-snow"}`}>{filter}</button>)}</div><div className="divide-y divide-edge">{filteredAlerts.length === 0 ? <p className="px-4 py-6 text-center text-[11px] text-muted-ops">No alerts at this level</p> : filteredAlerts.map((alert) => <AlertRow key={alert.id} alert={alert} onClick={() => setSelectedStation(stations.find((station) => station.id === "AWS-017") ?? null)}/>)}</div><div className="border-t border-edge px-4 py-2 font-mono text-[8px] text-muted-ops">SIMULATED ALERTS · NOT OPERATIONAL WARNINGS</div></section>
            <section className="border border-edge bg-panel"><div className="flex items-center justify-between border-b border-edge px-4 py-3"><div className="flex items-center gap-2"><Sparkles size={14} className="text-amber"/><h3 className="text-[12px] font-semibold">Hazard Assessment</h3></div><span className="font-mono text-[8px] text-muted-ops">T+{tick * 15} MIN</span></div><div className="space-y-3 px-4 py-3"><RiskBar label="Thunderstorm" value={metrics.thunderstorm} color="amber"/><RiskBar label="Lightning" value={metrics.lightning} color="amber"/><RiskBar label="Urban flooding" value={metrics.flood} color={metrics.flood > 70 ? "alert" : "cyan"}/></div><div className="mx-4 mb-3 flex gap-2 border-l-2 border-amber bg-amber/5 px-3 py-2.5"><AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber"/><p className="text-[10px] leading-relaxed text-muted-ops">{scenario === "Normal Weather" ? "No significant hazard detected in the current simulated window." : `${scenario} scenario active. Risk estimates are synthetic and intended for demonstration only.`}</p></div></section>
            <section className="border border-edge bg-panel"><div className="flex items-center justify-between border-b border-edge px-4 py-3"><div className="flex items-center gap-2"><Target size={14} className="text-cyan"/><h3 className="text-[12px] font-semibold">Scenario Playback</h3></div><span className="font-mono text-[8px] text-muted-ops">DEMO ENGINE</span></div><div className="px-4 py-3"><div className="mb-3 flex items-center justify-between"><span className="text-[10px] text-muted-ops">{scenario}</span><span className="font-mono text-[9px] text-amber">{tick === 0 ? "READY" : `+${tick * 15} MIN`}</span></div><div className="mb-3 h-1 overflow-hidden bg-panel2"><div className="h-full bg-amber transition-all duration-500" style={{ width: `${Math.min(8 + tick * 12, 100)}%` }}/></div><div className="flex gap-2"><Button variant="default" size="sm" className="h-8 flex-1 text-[10px]" onClick={() => setPlaying((active) => !active)}>{playing ? "Pause playback" : "▶ Run scenario"}</Button><Button variant="outline" size="icon" className="size-8" aria-label="Reset scenario" onClick={() => { setTick(0); setPlaying(false); }}><RefreshCw size={13}/></Button></div><p className="mt-2 font-mono text-[8px] leading-relaxed text-muted-ops">Synthetic feed · demo simulation — not operational weather data</p></div></section>
          </div>
        </div>

        <section className="mt-4 border border-edge bg-panel"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge px-4 py-3"><div className="flex items-center gap-2"><Radio size={14} className="text-teal"/><h3 className="text-[12px] font-semibold">AWS Station Monitor</h3><span className="font-mono text-[8px] text-muted-ops">SYNTHETIC FEED</span></div><button onClick={() => setActiveSection("AWS Network")} className="font-mono text-[9px] text-amber">EXPLORE NETWORK <ArrowUpRight size={11} className="ml-1 inline"/></button></div><div className="overflow-x-auto"><table className="w-full min-w-[740px] text-left"><thead><tr className="border-b border-edge font-mono text-[8px] tracking-[0.08em] text-muted-ops">{["STATION", "LOCATION", "TEMP", "HUMIDITY", "RAINFALL", "WIND", "HEALTH", "STATUS"].map((title) => <th key={title} className="px-4 py-2.5 font-medium">{title}</th>)}</tr></thead><tbody>{stations.slice(0, 5).map((station) => <tr key={station.id} onClick={() => setSelectedStation(station)} className="cursor-pointer border-b border-edge/70 text-[10px] transition-colors hover:bg-panel2"><td className="px-4 py-2.5 font-mono text-cyan">{station.id}</td><td className="px-4 py-2.5 text-snow">{station.name}</td><td className={`px-4 py-2.5 font-mono ${station.temperature > 45 ? "text-alert" : "text-snow"}`}>{station.temperature.toFixed(1)}°C</td><td className="px-4 py-2.5 font-mono text-snow">{station.humidity}%</td><td className="px-4 py-2.5 font-mono text-snow">{station.rainfall.toFixed(1)} mm</td><td className="px-4 py-2.5 font-mono text-snow">{station.wind_speed.toFixed(1)} km/h</td><td className="px-4 py-2.5 font-mono text-snow">{station.health}%</td><td className="px-4 py-2.5"><StatusChip status={station.status}/></td></tr>)}</tbody></table></div></section>
        <footer className="flex flex-wrap items-center justify-between gap-2 py-4 font-mono text-[8px] text-muted-ops"><span>SKYSHIELD AI · WEATHER INTELLIGENCE COMMAND CENTER</span><span>DEMO / SIMULATION DATA · FOR DEMONSTRATION ONLY</span><span>MODEL OUTPUTS ARE NOT SAFETY GUIDANCE</span></footer>
      </div></div>
    </main>
  </div>;
}

function HealthMini({ label, value }: { label: string; value: string }) { return <div className="border border-edge px-2 py-1.5"><p className="font-mono text-[8px] text-muted-ops">{label}</p><p className="mt-0.5 font-mono text-[9px] text-teal">{value}</p></div>; }

function MetricCard({ label, value, unit, icon: Icon, color, foot, trend }: { label: string; value: string; unit: string; icon: typeof Radio; color: string; foot: string; trend: "up" | "down" }) {
  const tones: Record<string, string> = { cyan: "text-cyan", teal: "text-teal", alert: "text-alert", amber: "text-amber" };
  return <div className="border border-edge bg-panel p-3 transition-colors hover:border-edge/80 sm:p-3.5"><div className="flex items-center justify-between"><span className="font-mono text-[8px] tracking-[0.11em] text-muted-ops">{label}</span><Icon size={14} className={tones[color] ?? "text-amber"}/></div><div className="mt-3 flex items-baseline gap-1.5"><span className={`font-mono text-[22px] font-semibold leading-none ${tones[color] ?? "text-snow"}`}>{value}</span><span className="font-mono text-[8px] text-muted-ops">{unit}</span></div><div className="mt-2 flex items-center justify-between gap-1"><span className="truncate text-[9px] text-muted-ops">{foot}</span>{trend === "down" ? <ArrowDownRight size={12} className="shrink-0 text-alert"/> : <ArrowUpRight size={12} className="shrink-0 text-teal"/>}</div></div>;
}

function Legend({ color, label }: { color: string; label: string }) { return <span className="hidden items-center gap-1.5 text-muted-ops sm:flex"><span className={`size-1.5 rounded-full ${color}`}/>{label}</span>; }

function MapValue({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Wind }) { return <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4"><Icon size={13} className="shrink-0 text-muted-ops"/><div className="min-w-0"><p className="truncate font-mono text-[8px] text-muted-ops">{label}</p><p className="mt-0.5 font-mono text-[10px] font-medium text-snow">{value}</p></div></div>; }

function AlertRow({ alert, onClick }: { alert: (typeof demoAlerts)[number]; onClick: () => void }) {
  const tones: Record<string, string> = { critical: "border-alert/30 bg-alert/10 text-alert", warning: "border-amber/30 bg-amber/10 text-amber", watch: "border-cyan/30 bg-cyan/10 text-cyan" };
  return <button onClick={onClick} className="flex w-full gap-2.5 px-4 py-3 text-left transition-colors hover:bg-panel2"><span className={`mt-0.5 grid size-[25px] shrink-0 place-items-center border ${tones[alert.severity]}`}><AlertTriangle size={12}/></span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-[10px] font-medium text-snow">{alert.title}</span><span className="shrink-0 font-mono text-[8px] text-muted-ops">{alert.time}</span></span><span className="mt-0.5 block truncate text-[9px] text-muted-ops">{alert.location} · {alert.confidence}% confidence</span><span className="mt-1 block text-[9px] leading-relaxed text-muted-ops">{alert.reason}</span></span><ChevronRight size={13} className="mt-1 shrink-0 text-muted-ops"/></button>;
}

function RiskBar({ label, value, color }: { label: string; value: number; color: string }) {
  const fills: Record<string, string> = { amber: "bg-amber", cyan: "bg-cyan", alert: "bg-alert" };
  const texts: Record<string, string> = { amber: "text-amber", cyan: "text-cyan", alert: "text-alert" };
  return <div><div className="mb-1.5 flex items-center justify-between"><span className="text-[10px] text-muted-ops">{label}</span><span className={`font-mono text-[9px] ${texts[color] ?? texts.amber}`}>{value}%</span></div><div className="h-1 overflow-hidden bg-panel2"><div className={`h-full transition-all duration-700 ${fills[color] ?? fills.amber}`} style={{ width: `${value}%` }}/></div></div>;
}

function StatusChip({ status }: { status: string }) {
  const tones: Record<string, string> = { healthy: "border-teal/30 bg-teal/10 text-teal", watch: "border-amber/30 bg-amber/10 text-amber", critical: "border-alert/30 bg-alert/10 text-alert" };
  return <span className={`inline-flex items-center gap-1 border px-1.5 py-0.5 font-mono text-[8px] uppercase ${tones[status] ?? tones.healthy}`}>{status === "healthy" ? <Check size={9}/> : <AlertTriangle size={9}/>} {status}</span>;
}