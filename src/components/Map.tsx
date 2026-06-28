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
import { useLocation } from "@/hooks/useLocation";

export interface MapHandle {
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  flyToUser: () => void;
}

interface MapProps {
  services: any[];
  onRequestReport: (service: any) => void;
  activeCategories: Set<string>;
  initLat?: number;
  initLng?: number;
}

const LOCATION_BUTTON = {
  idle: {
    label: "Mi ubicación",
    icon: "📍",
    style: {
      border: "1.5px solid #e5e7eb",
      background: "white",
      color: "#374151",
    },
  },
  loading: {
    label: "Buscando...",
    icon: "⏳",
    style: {
      border: "1.5px solid #e5e7eb",
      background: "white",
      color: "#9ca3af",
    },
  },
  granted: {
    label: "Mi ubicación",
    icon: "📍",
    style: {
      border: "1.5px solid #93c5fd",
      background: "#eff6ff",
      color: "#3b82f6",
    },
  },
  denied: {
    label: "Ubicación bloqueada",
    icon: "🚫",
    style: {
      border: "1.5px solid #fca5a5",
      background: "#fef2f2",
      color: "#dc2626",
    },
  },
  fallback: {
    label: "Ubicación aproximada",
    icon: "🧭",
    style: {
      border: "1.5px solid #fca5a5",
      background: "#fefbf2",
      color: "#dc8126",
    },
  },
  unavailable: {
    label: "No disponible",
    icon: "📍",
    style: {
      border: "1.5px solid #e5e7eb",
      background: "white",
      color: "#9ca3af",
    },
  },
};

const Map = forwardRef<MapHandle, MapProps>(function Map(
  {
    services,
    onRequestReport,
    activeCategories,
    initLng = -66.9036,
    initLat = 10.4806,
  },
  ref,
) {
  const mapRef = useRef<LeafletMap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);
  const { requestPreciseLocation: requestLocation, geoStatus: locationStatus } =
    useLocation();

  const btn = LOCATION_BUTTON[locationStatus];

  const userMarkerRef = useRef<any>(null);

  async function addUserMarker(lat: number, lng: number) {
    const L = (await import("leaflet")).default;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }

    const icon = L.divIcon({
      className: "",
      html: `
      <div style="
        width: 16px; height: 16px;
        background: #3b82f6;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 0 0 3px rgba(59,130,246,0.3);
      "></div>
    `,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    userMarkerRef.current = L.marker([lat, lng], { icon }).addTo(
      mapRef.current!,
    );
  }

  // --- NUEVAS FUNCIONES AUXILIARES ---
  const handleFlyToUser = () => {
    console.log("Attempting to fly to user location");
    if (!mapRef.current) return;
    requestLocation().then((location) => {
      if (!location) return;

      mapRef.current?.flyTo([location.lat, location.lng], 14, {
        animate: true,
        duration: 1,
      });
      addUserMarker(location.lat, location.lng);
    });
  };

  const handleFlyToVenezuela = () => {
    if (!mapRef.current) return;
    // Zoom 6 es ideal para ver todo el país. Puedes cambiarlo a 13 si prefieres enfocar en la ciudad inicial
    mapRef.current.flyTo([initLat, initLng], 6, {
      animate: true,
      duration: 1,
    });
  };

  useImperativeHandle(ref, () => ({
    flyTo(lat: number, lng: number, zoom?: number) {
      const z = zoom ?? mapRef.current?.getZoom() ?? 16;
      mapRef.current?.flyTo([lat, lng], z, { animate: true, duration: 0.8 });
    },
    flyToUser: handleFlyToUser,
  }));

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initMap = async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (!containerRef.current || mapRef.current) return;

      mapRef.current = L.map(containerRef.current, {
        center: [initLat, initLng],
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
  }, [initLat, initLng]);

  useEffect(() => {
    // ... (Tu código existente de loadMarkers se mantiene exactamente igual) ...
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
            if (mapRef.current) mapRef.current.closePopup();
          };

          actions.appendChild(detail);
          actions.appendChild(report);

          container.appendChild(title);
          container.appendChild(info);
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

  // --- ESTRUCTURA ACTUALIZADA (Wrapper + Botones) ---
  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      {/* Contenedor del Mapa */}
      <div
        ref={containerRef}
        style={{ height: "100%", width: "100%", background: "#e8e0d8" }}
      />

      {/* Controles Flotantes */}
      <div
        style={{
          position: "absolute",
          bottom: "24px",
          right: "24px",
          zIndex: 1000, // Debe ser >= 1000 para estar sobre Leaflet
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation(); // Evita que Leaflet registre el clic en el mapa
            handleFlyToUser();
          }}
          style={{
            flexShrink: 0,
            padding: "7px 12px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "inherit",
            cursor:
              locationStatus === "loading" || locationStatus === "unavailable"
                ? "not-allowed"
                : "pointer",
            whiteSpace: "nowrap" as const,
            ...btn.style,
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          {btn.icon} {btn.label}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleFlyToVenezuela();
          }}
          style={{
            background: "white",
            border: "2px solid rgba(0,0,0,0.2)",
            borderRadius: "8px",
            padding: "8px 14px",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "13px",
            color: "#374151",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          🇻🇪 Ir a Venezuela
        </button>
      </div>
    </div>
  );
});

export default Map;
