"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { Map as LeafletMap } from "leaflet";
import { createIcon } from "@/lib/leaflet-icons";

export interface MapHandle {
  flyTo: (lat: number, lng: number, zoom?: number) => void;
}

interface MapProps {
  services: any[];
  onSelectService: (service: any) => void;
  activeCategories: Set<string>;
}

const Map = forwardRef<MapHandle, MapProps>(function Map(
  { services, onSelectService, activeCategories },
  ref,
) {
  const mapRef = useRef<LeafletMap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);

  useImperativeHandle(ref, () => ({
    flyTo(lat: number, lng: number, zoom?: number) {
      const z = zoom ?? mapRef.current?.getZoom() ?? 16;
      mapRef.current?.flyTo([lat, lng], z, { animate: true, duration: 0.8 });
    },
  }));

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initMap = async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (!containerRef.current || mapRef.current) return;

      mapRef.current = L.map(containerRef.current, {
        center: [10.4806, -66.9036],
        zoom: 13,
        zoomControl: false,
      });

      L.control.zoom({ position: "topright" }).addTo(mapRef.current);
      L.tileLayer(
        "https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.{ext}",
        {
          minZoom: 0,
          maxZoom: 20,
          // @ts-ignore
          ext: "png",
        },
      ).addTo(mapRef.current);

      setMapReady(true);
    };

    initMap();
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

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
        const marker = L.marker([service.lat, service.lng], {
          icon: createIcon(L, service.category),
        });
        marker.on("click", () => {
          mapRef.current?.flyTo([service.lat, service.lng], 16, {
            animate: true,
            duration: 0.8,
          });
          onSelectService(service);
        });
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
});

export default Map;
