"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Category, ServiceWithSupplies } from "@/types";
import { categoryConfig } from "@/lib/category-config";
import ServiceCard from "./ServiceCard";
import Footer from "./Footer";
import ReportSupplyModal from "./ReportSupplyModal";
import MissingServiceModal from "./MissingServiceModal";
import CityFilter from "./CityFilter";
import { MapHandle } from "@/components/Map";
import { useViewport } from "@/hooks/useViewport";

const Map = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: "100%",
        background: "#e8e0d8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#9ca3af",
        fontSize: 14,
      }}
    >
      Cargando mapa...
    </div>
  ),
});

interface HomeViewProps {
  initialServices: ServiceWithSupplies[];
}

type ViewMode = "list" | "map";

export default function HomeView({ initialServices }: HomeViewProps) {
  const [services, setServices] = useState(initialServices);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [cityFilter, setCityFilter] = useState("");
  const [supplySearch, setSupplySearch] = useState("");
  const [reporting, setReporting] = useState<ServiceWithSupplies | null>(null);
  const [showMissing, setShowMissing] = useState(false);

  const { isDesktop } = useViewport();

  const mapRef = useRef<MapHandle | null>(null);

  function handleSelectOnMap(service: ServiceWithSupplies) {
    if (service.lat && service.lng) {
      mapRef.current?.flyTo(service.lat, service.lng);
    }
  }

  // Filtrado en cliente — rápido, sin llamadas al servidor
  const filtered = services
    .filter((s) => {
      if (categoryFilter && s.category !== categoryFilter) return false;
      if (
        cityFilter &&
        !s.city.toLowerCase().includes(cityFilter.toLowerCase())
      )
        return false;
      if (supplySearch) {
        return s.supplies.some((sw) =>
          sw.supply.name.toLowerCase().includes(supplySearch.toLowerCase()),
        );
      }
      return true;
    })
    .sort((a, b) => {
      // Si hay búsqueda de insumo, ordenar por disponibilidad de ese insumo
      if (supplySearch) {
        const term = supplySearch.toLowerCase();
        const aAvailable = a.supplies.filter(
          (sw) =>
            sw.supply.name.toLowerCase().includes(term) &&
            sw.latest_status === "available",
        ).length;
        const bAvailable = b.supplies.filter(
          (sw) =>
            sw.supply.name.toLowerCase().includes(term) &&
            sw.latest_status === "available",
        ).length;
        return bAvailable - aAvailable;
      }
      return 0;
    });

  const handleReport = useCallback((service: ServiceWithSupplies) => {
    setReporting(service);
  }, []);

  const handleReportSuccess = useCallback(
    (
      serviceId: string,
      supplyId: string,
      status: "available" | "unavailable",
    ) => {
      // Actualización optimista — reflejar el reporte inmediatamente
      setServices((prev) =>
        prev.map((s) => {
          if (s.id !== serviceId) return s;
          const existing = s.supplies.find((sw) => sw.supply.id === supplyId);
          if (existing) {
            return {
              ...s,
              supplies: s.supplies.map((sw) =>
                sw.supply.id === supplyId
                  ? {
                      ...sw,
                      latest_status: status,
                      report_count: sw.report_count + 1,
                      available_count:
                        sw.available_count + (status === "available" ? 1 : 0),
                      last_reported_at: new Date().toISOString(),
                    }
                  : sw,
              ),
            };
          }
          return s;
        }),
      );
    },
    [],
  );

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#f9fafb",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "white",
          borderBottom: "1px solid #f0f0f0",
          padding: "16px 16px 0",
        }}
      >
        <h1
          style={{
            fontSize: 20,
            fontWeight: 700,
            margin: "0 0 2px",
            color: "#111827",
          }}
        >
          🇻🇪 Servicios Venezuela
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "#6b7280",
            margin: "0 0 16px",
            lineHeight: 1.5,
          }}
        >
          Directorio comunitario de servicios activos. Los reportes son de la
          comunidad en tiempo real.
        </p>

        {/* Buscador */}
        <div style={{ position: "relative", marginBottom: 12 }}>
          <span
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 16,
            }}
          >
            🔍
          </span>
          <input
            type="text"
            placeholder='Buscar insumo... ej: "Pañales", "Insulina", "Gasolina 91"'
            value={supplySearch}
            onChange={(e) => setSupplySearch(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px 10px 38px",
              borderRadius: 10,
              border: "1.5px solid #e5e7eb",
              fontSize: 14,
              fontFamily: "inherit",
              boxSizing: "border-box",
              background: "#f9fafb",
            }}
          />
          {supplySearch && (
            <button
              onClick={() => setSupplySearch("")}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                fontSize: 16,
                cursor: "pointer",
                color: "#9ca3af",
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Filtros */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 12,
            overflowX: "clip",
            scrollbarWidth: "none",
          }}
        >
          {/* Filtro ciudad */}
          <CityFilter
            services={services}
            value={cityFilter}
            onChange={setCityFilter}
          />

          {/* Filtros categoría */}
          {(Object.keys(categoryConfig) as Category[]).map((cat) => {
            const isActive = categoryFilter === cat;
            const { emoji, color } = categoryConfig[cat];
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(isActive ? "" : cat)}
                style={{
                  flexShrink: 0,
                  padding: "7px 12px",
                  borderRadius: 8,
                  border: `1.5px solid ${isActive ? color : "#e5e7eb"}`,
                  background: isActive ? color : "white",
                  color: isActive ? "white" : "#374151",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {emoji}
              </button>
            );
          })}
        </div>

        {/* Disclaimer */}
        <div
          style={{
            padding: "8px 12px",
            background: "#f0f9ff",
            borderLeft: "3px solid #38bdf8",
            marginBottom: 12,
            borderRadius: "0 6px 6px 0",
          }}
        >
          <p
            style={{
              fontSize: 12,
              color: "#0369a1",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            📅 Los datos reflejan reportes de la comunidad de los{" "}
            <strong>últimos 3 días</strong>. La información puede no estar
            actualizada — verifica antes de desplazarte.
          </p>
        </div>

        {/* Toggle vista */}
        {!isDesktop && (
          <div style={{ display: "flex", marginBottom: -1 }}>
            {(["list", "map"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  background: "none",
                  border: "none",
                  borderBottom: `2px solid ${viewMode === mode ? "#111827" : "transparent"}`,
                  fontSize: 14,
                  fontWeight: viewMode === mode ? 600 : 400,
                  color: viewMode === mode ? "#111827" : "#9ca3af",
                  cursor: "pointer",
                }}
              >
                {mode === "list" ? "☰ Lista" : "🗺 Mapa"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Contenido */}
      {isDesktop ? (
        // Layout desktop — dos columnas
        <div style={{ display: "flex", height: "calc(100dvh - 160px)" }}>
          {/* Columna izquierda — listado */}
          <div
            style={{
              width: "35%",
              flexShrink: 0,
              overflowY: "auto",
              padding: "16px 16px 0",
              borderRight: "1px solid #f0f0f0",
              background: "#f9fafb",
            }}
          >
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 12px" }}>
              {filtered.length} servicio{filtered.length !== 1 ? "s" : ""}
              {supplySearch && ` con "${supplySearch}"`}
              {cityFilter && ` en ${cityFilter}`}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filtered.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 20px",
                    background: "white",
                    borderRadius: 14,
                  }}
                >
                  <p style={{ fontSize: 32, margin: "0 0 8px" }}>🔍</p>
                  <p
                    style={{ fontSize: 15, fontWeight: 500, margin: "0 0 4px" }}
                  >
                    Sin resultados
                  </p>
                  <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
                    Prueba con otros filtros
                  </p>
                </div>
              ) : (
                filtered.map((service) => (
                  <div
                    key={service.id}
                    onClick={() => handleSelectOnMap(service)}
                    style={{ cursor: "pointer" }}
                  >
                    <ServiceCard
                      service={service}
                      onReport={handleReport}
                      highlightSupply={supplySearch}
                    />
                  </div>
                ))
              )}
            </div>

            <div style={{ textAlign: "center", padding: "24px 0 8px" }}>
              <button
                onClick={() => setShowMissing(true)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 13,
                  color: "#6b7280",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                ¿Falta un local en el directorio?
              </button>
            </div>

            <Footer />
          </div>

          {/* Columna derecha — mapa siempre visible */}
          <div style={{ flex: 1 }}>
            <Map
              ref={mapRef}
              services={filtered}
              onSelectService={(service) => {
                const full = services.find((sv) => sv.id === service.id);
                if (full) setReporting(full);
              }}
              activeCategories={new Set(categoryFilter ? [categoryFilter] : [])}
            />
          </div>
        </div>
      ) : (
        // Layout mobile — igual que antes
        <>
          {viewMode === "list" ? (
            <div style={{ padding: "16px 16px 0" }}>
              <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 12px" }}>
                {filtered.length} servicio{filtered.length !== 1 ? "s" : ""}
                {supplySearch && ` con "${supplySearch}"`}
                {cityFilter && ` en ${cityFilter}`}
              </p>

              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {filtered.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "40px 20px",
                      background: "white",
                      borderRadius: 14,
                    }}
                  >
                    <p style={{ fontSize: 32, margin: "0 0 8px" }}>🔍</p>
                    <p
                      style={{
                        fontSize: 15,
                        fontWeight: 500,
                        margin: "0 0 4px",
                      }}
                    >
                      Sin resultados
                    </p>
                    <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
                      Prueba con otros filtros o términos de búsqueda
                    </p>
                  </div>
                ) : (
                  filtered.map((service) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      onReport={handleReport}
                      highlightSupply={supplySearch}
                    />
                  ))
                )}
              </div>

              <div style={{ textAlign: "center", padding: "24px 0 8px" }}>
                <button
                  onClick={() => setShowMissing(true)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 13,
                    color: "#6b7280",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  ¿Falta un local en el directorio?
                </button>
              </div>

              <Footer />
            </div>
          ) : (
            <div style={{ height: "calc(100dvh - 200px)" }}>
              <Map
                ref={mapRef}
                services={filtered}
                onSelectService={(s) => {
                  const full = services.find((sv) => sv.id === s.id);
                  if (full) setReporting(full);
                }}
                activeCategories={
                  new Set(categoryFilter ? [categoryFilter] : [])
                }
              />
            </div>
          )}
        </>
      )}

      {/* Modales */}
      {reporting && (
        <ReportSupplyModal
          service={reporting}
          onClose={() => setReporting(null)}
          onSuccess={handleReportSuccess}
        />
      )}

      {showMissing && (
        <MissingServiceModal onClose={() => setShowMissing(false)} />
      )}
    </div>
  );
}
