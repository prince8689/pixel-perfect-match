import { CircleMarker, MapContainer, TileLayer, useMap } from "react-leaflet";
import { useEffect } from "react";
import type { Station } from "@/lib/skyshield-data";

function MapViewport({ selected }: { selected: Station | null }) {
  const map = useMap();
  useEffect(() => {
    if (selected) map.flyTo([selected.latitude, selected.longitude], 13, { duration: 0.7 });
  }, [map, selected]);
  return null;
}

export default function SkyshieldMap({ stations, selected, onSelect }: {
  stations: Station[];
  selected: Station | null;
  onSelect: (station: Station) => void;
}) {
  return (
    <MapContainer center={[25.314, 82.985]} zoom={11} scrollWheelZoom className="h-full w-full">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MapViewport selected={selected} />
      {stations.map((station) => {
        const critical = station.status === "critical";
        const watch = station.status === "watch";
        const color = critical ? "#ef5d4e" : watch ? "#edb34e" : "#37d2a0";
        return <CircleMarker key={station.id} center={[station.latitude, station.longitude]} radius={selected?.id === station.id ? 9 : critical ? 7 : 5} pathOptions={{ color, fillColor: color, fillOpacity: 0.9, weight: selected?.id === station.id ? 3 : 1.5 }} eventHandlers={{ click: () => onSelect(station) }} />;
      })}
    </MapContainer>
  );
}