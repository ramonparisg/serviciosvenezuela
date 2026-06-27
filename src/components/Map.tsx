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
  // Llamado cuando el usuario solicita abrir el modal de reporte desde el popup
  onRequestReport: (service: any) => void;
  activeCategories: Set<string>;
}

const Map = forwardRef<MapHandle, MapProps>(function Map(
  { services, onRequestReport, activeCategories },
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
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(mapRef.current);

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
          // Crear contenido resumido para el popup
          const container = document.createElement("div");
          container.style.minWidth = "200px";
          container.style.fontFamily = "system-ui, sans-serif";

          const title = document.createElement("div");
          title.style.fontSize = "14px";
          title.style.fontWeight = "600";
          title.style.marginBottom = "6px";
          title.textContent = `${service.name}`;

          const info = document.createElement("div");
          info.style.fontSize = "13px";
          info.style.color = "#6b7280";
          info.style.marginBottom = "8px";
          info.textContent = service.address || service.city || "";

          // Insumos: mostrar hasta 3 con estado, o texto "Sin reportes recientes"
          const suppliesContainer = document.createElement("div");
          suppliesContainer.style.display = "flex";
          suppliesContainer.style.flexDirection = "column";
          suppliesContainer.style.gap = "6px";
          suppliesContainer.style.marginBottom = "8px";

          const supplies = Array.isArray(service.supplies)
            ? service.supplies
            : [];
          const reported = supplies.filter(
            (sw: any) =>
              sw.latest_status !== null && sw.latest_status !== undefined,
          );

          if (reported.length === 0) {
            const none = document.createElement("div");
            none.style.fontSize = "13px";
            none.style.color = "#9ca3af";
            none.textContent = "Sin reportes recientes";
            suppliesContainer.appendChild(none);
          } else {
            const maxShow = 3;
            reported.slice(0, maxShow).forEach((sw: any) => {
              const row = document.createElement("div");
              row.style.display = "flex";
              row.style.alignItems = "center";
              row.style.gap = "8px";

              const dot = document.createElement("span");
              dot.textContent = sw.latest_status === "available" ? "✅" : "❌";
              dot.style.fontSize = "14px";

              const name = document.createElement("span");
              name.textContent = sw.supply?.name ?? "Insumo";
              name.style.fontSize = "13px";
              name.style.color = "#111827";

              row.appendChild(dot);
              row.appendChild(name);
              suppliesContainer.appendChild(row);
            });

            if (reported.length > 3) {
              const more = document.createElement("div");
              more.style.fontSize = "13px";
              more.style.color = "#6b7280";
              more.textContent = `+${reported.length - 3} insumos más`;
              suppliesContainer.appendChild(more);
            }
          }

          const actions = document.createElement("div");
          actions.style.display = "flex";
          actions.style.gap = "8px";

          const detail = document.createElement("button");
          detail.textContent = "Ver detalle";
          detail.style.padding = "6px 8px";
          detail.style.borderRadius = "8px";
          detail.style.border = "1px solid #e5e7eb";
          detail.style.background = "white";
          detail.style.cursor = "pointer";
          detail.onclick = (e) => {
            e.stopPropagation();
            // Abrir en nueva pestaña la página de detalle
            window.open(`/services/${service.id}`, "_blank");
          };

          const report = document.createElement("button");
          report.textContent = "Reportar";
          report.style.padding = "6px 8px";
          report.style.borderRadius = "8px";
          report.style.border = "none";
          report.style.background = "#111827";
          report.style.color = "white";
          report.style.cursor = "pointer";
          report.onclick = (e) => {
            e.stopPropagation();
            onRequestReport(service);
            // cerrar cualquier popup abierto
            if (mapRef.current) mapRef.current.closePopup();
          };

          actions.appendChild(detail);
          actions.appendChild(report);

          container.appendChild(title);
          container.appendChild(info);
          // insertar lista de insumos (o texto "Sin reportes recientes")
          container.appendChild(suppliesContainer);
          container.appendChild(actions);

          const popup = L.popup({ offset: [0, -10], closeButton: true });
          popup.setLatLng([service.lat, service.lng]);
          popup.setContent(container);
          popup.openOn(mapRef.current!);

          mapRef.current?.flyTo([service.lat, service.lng], 16, {
            animate: true,
            duration: 0.8,
          });
        });
        marker.addTo(mapRef.current!);
      });
    };

    loadMarkers();
  }, [services, activeCategories, onRequestReport, mapReady]);

  return (
    <div
      ref={containerRef}
      style={{ height: "100%", width: "100%", background: "#e8e0d8" }}
    />
  );
});

export default Map;
