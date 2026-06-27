"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import { Service } from "@/types";
import { createIcon } from "@/lib/leaflet-icons";

interface MapProps {
  services: Service[];
  onSelectService: (service: Service) => void;
  activeCategories: Set<string>;
}

export default function Map({
  services,
  onSelectService,
  activeCategories,
}: MapProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false); // ← nuevo

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return; // ← separar en dos líneas, más claro

    const initMap = async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      // Verificar de nuevo dentro del async por si el componente
      // se desmontó mientras esperábamos el import
      if (!containerRef.current || mapRef.current) return;

      mapRef.current = L.map(containerRef.current, {
        center: [10.4806, -66.9036],
        zoom: 12,
        zoomControl: false,
      });

      L.control.zoom({ position: "topright" }).addTo(mapRef.current);

      L.tileLayer(
        "https://tile.jawg.io/jawg-light/{z}/{x}/{y}{r}.png?access-token={accessToken}",
        {
          attribution:
            '<a href="https://jawg.io" title="Tiles Courtesy of Jawg Maps" target="_blank">&copy; <b>Jawg</b>Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          minZoom: 0,
          maxZoom: 22,
          /* @ts-ignore*/
          accessToken: process.env.NEXT_PUBLIC_MAPS_API_KEY,
        },
      ).addTo(mapRef.current);

      setMapReady(true); // ← avisar que el mapa está listo
    };

    initMap();

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Actualizar markers cuando cambian servicios o filtros
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    const loadMarkers = async () => {
      const L = (await import("leaflet")).default;

      mapRef.current!.eachLayer((layer) => {
        if (layer instanceof L.Marker) layer.remove();
      });

      const filtered = services.filter(
        (s) => activeCategories.size === 0 || activeCategories.has(s.category),
      );

      filtered.forEach((service) => {
        if (!service.lat || !service.lng) return;

        const marker = L.marker(
          [service.lat, service.lng],
          { icon: createIcon(L, service.category) }, // ← pasar L aquí
        );

        marker.on("click", () => onSelectService(service));
        marker.addTo(mapRef.current!);
      });
    };

    loadMarkers();
  }, [services, activeCategories, onSelectService, mapReady]);

  return (
    <div
      ref={containerRef}
      style={{ height: "100%", width: "100%", background: "#e8e0d8" }}
    />
  );
}
