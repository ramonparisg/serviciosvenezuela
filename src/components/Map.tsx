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
      border: "1.5px solid #e5e7eb",
      background: "white",
      color: "#374151",
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
      border: "1.5px solid #fcd34d",
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
  const clusterRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  const {
    requestPreciseLocation: requestLocation,
    geoStatus: locationStatus,
    ready,
  } = useLocation();
  const btn = LOCATION_BUTTON[locationStatus];

  // ── Marker de usuario ──────────────────────────────────────────────────
  async function addUserMarker(lat: number, lng: number) {
    const L = (await import("leaflet")).default;
    if (userMarkerRef.current) userMarkerRef.current.remove();

    userMarkerRef.current = L.marker([lat, lng], {
      icon: L.divIcon({
        className: "",
        html: `<div style="
          width:16px;height:16px;
          background:#3b82f6;
          border:3px solid white;
          border-radius:50%;
          box-shadow:0 0 0 3px rgba(59,130,246,0.3);
        "></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      }),
    }).addTo(mapRef.current!);
  }

  // ── Navegación ─────────────────────────────────────────────────────────
  const handleFlyToUser = () => {
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
    mapRef.current?.flyTo([initLat, initLng], 6, {
      animate: true,
      duration: 1,
    });
  };

  useImperativeHandle(ref, () => ({
    flyTo(lat, lng, zoom) {
      mapRef.current?.flyTo(
        [lat, lng],
        zoom ?? mapRef.current?.getZoom() ?? 16,
        { animate: true, duration: 0.8 },
      );
    },
    flyToUser: handleFlyToUser,
  }));

  // ── Inicializar mapa ───────────────────────────────────────────────────
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

  // ── Markers con clustering ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    const loadMarkers = async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet.markercluster");
      await import("leaflet.markercluster/dist/MarkerCluster.css");
      await import("leaflet.markercluster/dist/MarkerCluster.Default.css");

      // Limpiar cluster anterior
      if (clusterRef.current) {
        mapRef.current!.removeLayer(clusterRef.current);
        clusterRef.current = null;
      }

      const cluster = (L as any).markerClusterGroup({
        maxClusterRadius: 60,
        disableClusteringAtZoom: 16,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        chunkedLoading: true, // procesa en chunks — no bloquea el hilo en móvil
      });

      // Forzar spiderfy en clusters pequeños
      cluster.on("clusterclick", (e: any) => {
        if (e.layer.getChildCount() <= 8) {
          e.layer.spiderfy();
        } else {
          e.layer.zoomToBounds({ padding: [20, 20] });
        }
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
          // Popup
          const container = document.createElement("div");
          container.style.cssText =
            "min-width:200px;font-family:system-ui,sans-serif";

          const title = document.createElement("div");
          title.style.cssText =
            "font-size:14px;font-weight:600;margin-bottom:6px";
          title.textContent = service.name;

          const info = document.createElement("div");
          info.style.cssText = "font-size:13px;color:#6b7280;margin-bottom:8px";
          info.textContent = service.address || service.city || "";

          const suppliesEl = document.createElement("div");
          suppliesEl.style.cssText =
            "display:flex;flex-direction:column;gap:6px;margin-bottom:8px";

          const supplies = Array.isArray(service.supplies)
            ? service.supplies
            : [];
          const reported = supplies.filter(
            (sw: any) => sw.latest_status != null,
          );

          if (reported.length === 0) {
            const none = document.createElement("div");
            none.style.cssText = "font-size:13px;color:#9ca3af";
            none.textContent = "Sin reportes recientes";
            suppliesEl.appendChild(none);
          } else {
            reported.slice(0, 3).forEach((sw: any) => {
              const row = document.createElement("div");
              row.style.cssText = "display:flex;align-items:center;gap:8px";
              row.innerHTML = `
                <span style="font-size:14px">${sw.latest_status === "available" ? "✅" : "❌"}</span>
                <span style="font-size:13px;color:#111827">${sw.supply?.name ?? "Insumo"}</span>
              `;
              suppliesEl.appendChild(row);
            });
            if (reported.length > 3) {
              const more = document.createElement("div");
              more.style.cssText = "font-size:13px;color:#6b7280";
              more.textContent = `+${reported.length - 3} insumos más`;
              suppliesEl.appendChild(more);
            }
          }

          const actions = document.createElement("div");
          actions.style.cssText = "display:flex;gap:8px";

          const detail = document.createElement("button");
          detail.textContent = "Ver detalle";
          detail.style.cssText =
            "padding:6px 8px;border-radius:8px;border:1px solid #e5e7eb;background:white;cursor:pointer";
          detail.onclick = (e) => {
            e.stopPropagation();
            window.open(`/services/${service.id}`, "_blank");
          };

          const report = document.createElement("button");
          report.textContent = "Reportar";
          report.style.cssText =
            "padding:6px 8px;border-radius:8px;border:none;background:#111827;color:white;cursor:pointer";
          report.onclick = (e) => {
            e.stopPropagation();
            onRequestReport(service);
            mapRef.current?.closePopup();
          };

          actions.appendChild(detail);
          actions.appendChild(report);
          container.appendChild(title);
          container.appendChild(info);
          container.appendChild(suppliesEl);
          container.appendChild(actions);

          L.popup({ offset: [0, -10], closeButton: true })
            .setLatLng([service.lat, service.lng])
            .setContent(container)
            .openOn(mapRef.current!);

          mapRef.current?.flyTo([service.lat, service.lng], 16, {
            animate: true,
            duration: 0.8,
          });
        });

        cluster.addLayer(marker);
      });

      clusterRef.current = cluster;
      mapRef.current!.addLayer(cluster);
    };

    loadMarkers();
  }, [services, activeCategories, onRequestReport, mapReady]);

  // ── UI ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      <div
        ref={containerRef}
        style={{ height: "100%", width: "100%", background: "#e8e0d8" }}
      />

      <div
        style={{
          position: "absolute",
          bottom: "24px",
          right: "24px",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {ready && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleFlyToUser();
            }}
            disabled={
              locationStatus === "loading" || locationStatus === "unavailable"
            }
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
              whiteSpace: "nowrap",
              cursor:
                locationStatus === "loading" || locationStatus === "unavailable"
                  ? "not-allowed"
                  : "pointer",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              ...btn.style,
            }}
          >
            {btn.icon} {btn.label}
          </button>
        )}

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
