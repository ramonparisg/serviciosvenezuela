"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ServiceWithSupplies } from "@/types";
import ServiceCard from "./ServiceCard";
import Footer from "./Footer";
import ReportSupplyModal from "./ReportSupplyModal";
import MissingServiceModal from "./MissingServiceModal";
import { MapHandle } from "@/components/Map";
import { useViewport } from "@/hooks/useViewport";
import FiltersModal, {
  EMPTY_FILTERS,
  Filters,
} from "@/components/FiltersModal";
import FilterBar from "@/components/FilterBar";
import { useLocation } from "@/hooks/useLocation";

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
  initialTotal: number;
  initialHasMore: boolean;
}

type ViewMode = "list" | "map";

export default function HomeView({
  initialServices,
  initialTotal,
  initialHasMore,
}: HomeViewProps) {
  const [services, setServices] = useState(initialServices);
  const [total, setTotal] = useState(initialTotal);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(0);
  const [fetching, setFetching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const supplyDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [supplySearch, setSupplySearch] = useState("");
  const [reporting, setReporting] = useState<ServiceWithSupplies | null>(null);
  const [showMissing, setShowMissing] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const [allCities, setAllCities] = useState<{ city: string; state: string }[]>(
    [],
  );

  useEffect(() => {
    fetch("/api/services/cities")
      .then((r) => r.json())
      .then(setAllCities);
  }, []);

  const { isDesktop } = useViewport();

  const { geoStatus: locationStatus, requestPreciseLocation: requestLocation } =
    useLocation();

  async function handleMyLocation() {
    const loc = await requestLocation();
    if (!loc) return;

    // Reordenar el listado por cercanía
    await fetchServices({ lat: loc.lat, lng: loc.lng });
  }

  const mapRef = useRef<MapHandle | null>(null);

  function handleSelectOnMap(service: ServiceWithSupplies) {
    if (service.lat && service.lng) {
      mapRef.current?.flyTo(service.lat, service.lng);
    }
  }

  // Cuando se selecciona una ciudad en el CityFilter, pedir geocoding
  // y mover el mapa hacia esa ciudad usando el handle expuesto por Map.
  // Usamos la API interna /api/geocode (POST) que devuelve lat/lng.
  useEffect(() => {
    const cityFilter = filters.city;
    if (!cityFilter) return;

    let cancelled = false;

    async function geocodeAndFly() {
      try {
        const res = await fetch("/api/geocode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: cityFilter, city: cityFilter }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (
          data &&
          data.found &&
          typeof data.lat === "number" &&
          typeof data.lng === "number"
        ) {
          // Mantener zoom en 13 al hacer flyTo por selección de ciudad
          mapRef.current?.flyTo(data.lat, data.lng, 13);
        }
      } catch (err) {
        // fallar silenciosamente; no interfiere con la UI
        // eslint-disable-next-line no-console
        console.error("Geocode failed", err);
      }
    }

    geocodeAndFly();

    return () => {
      cancelled = true;
    };
  }, [filters.city]);

  const [mapServices, setMapServices] = useState<any[]>([]);

  useEffect(() => {
    if (viewMode !== "map" && !isDesktop) return;
    fetch("/api/services/map")
      .then((r) => r.json())
      .then(setMapServices);
  }, [viewMode, isDesktop]);

  // Función central de fetch
  // Función central de fetch — ahora usa el objeto filters completo
  async function fetchServices(
    overrides: {
      filters?: Filters;
      supply?: string;
      page?: number;
      append?: boolean;
      lat?: number;
      lng?: number;
    } = {},
  ) {
    const isAppend = overrides.append ?? false;
    if (isAppend) setLoadingMore(true);
    else setFetching(true);

    const activeFilters = overrides.filters ?? filters;
    const sup = overrides.supply ?? supplySearch;
    const p = overrides.page ?? 0;

    const q = new URLSearchParams();
    if (activeFilters.category) q.set("category", activeFilters.category);
    if (activeFilters.city) q.set("city", activeFilters.city);
    if (activeFilters.state) q.set("state", activeFilters.state);
    if (activeFilters.name) q.set("name", activeFilters.name);
    if (activeFilters.address) q.set("address", activeFilters.address);
    if (activeFilters.recentOnly) q.set("recentOnly", "true");
    if (overrides.lat) q.set("lat", String(overrides.lat));
    if (overrides.lng) q.set("lng", String(overrides.lng));
    if (sup) q.set("supply", sup);
    q.set("page", String(p));

    try {
      const res = await fetch(`/api/services?${q}`);
      const data = await res.json();

      if (isAppend) {
        setServices((prev) => [...prev, ...data.services]);
      } else {
        setServices(data.services);
        setPage(0);
      }
      setTotal(data.total);
      setHasMore(data.hasMore);
    } finally {
      setFetching(false);
      setLoadingMore(false);
    }
  }

  function handleApplyFilters(newFilters: Filters) {
    setFilters(newFilters);
    fetchServices({ filters: newFilters });
  }

  function handleRemoveFilter(key: keyof Filters) {
    const newFilters = {
      ...filters,
      [key]: key === "recentOnly" ? false : "",
    };
    setFilters(newFilters);
    fetchServices({ filters: newFilters });
  }

  function handleSupplySearch(value: string) {
    setSupplySearch(value);
    if (supplyDebounce.current) clearTimeout(supplyDebounce.current);
    supplyDebounce.current = setTimeout(() => {
      fetchServices({ supply: value });
    }, 500);
  }

  async function handleLoadMore() {
    const next = page + 1;
    setPage(next);
    await fetchServices({ page: next, append: true });
  }

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
        maxWidth: "100%",
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
          🇻🇪 Mapa de Insumos - Venezuela
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "#6b7280",
            margin: "0 0 16px",
            lineHeight: 1.5,
          }}
        >
          Mapa comunitario para conseguir insumos en Venezuela. Los reportes son
          de la comunidad en tiempo real.
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
            onChange={(e) => handleSupplySearch(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px 10px 38px",
              borderRadius: 10,
              border: "1.5px solid #e5e7eb",
              fontSize: 16,
              fontFamily: "inherit",
              boxSizing: "border-box",
              background: "#f9fafb",
            }}
          />
          {supplySearch && (
            <button
              onClick={() => handleSupplySearch("")}
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
        <FilterBar
          filters={filters}
          onRemove={handleRemoveFilter}
          onOpenFilters={() => setShowFilters(true)}
          onMyLocation={handleMyLocation}
          locationStatus={locationStatus}
        />

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

        <div
          style={{
            padding: "8px 12px",
            background: "#fffcf0",
            borderLeft: "3px solid #a18103",
            marginBottom: 12,
            borderRadius: "0 6px 6px 0",
          }}
        >
          <p
            style={{
              fontSize: 12,
              color: "#a18103",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            ⚠️ Listado de locales basado en datos públicos. Si detectas algún
            error o inexactitud, por favor infórmanos.
          </p>
        </div>

        {/* Toggle vista */}
        {!isDesktop && (
          <div style={{ display: "flex", borderTop: "1px solid #f0f0f0" }}>
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
        // Layout desktop
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
            <div style={{ textAlign: "center", padding: "4px 0" }}>
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
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 12px" }}>
              {services.length} de {total} locales
              {supplySearch && ` con "${supplySearch}"`}
              {filters.city && ` en ${filters.city}`}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {services.length === 0 ? (
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
                services.map((service) => (
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
            {hasMore && (
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                style={{
                  width: "100%",
                  padding: "12px 0",
                  borderRadius: 12,
                  border: "1.5px solid #e5e7eb",
                  background: "white",
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#374151",
                  cursor: loadingMore ? "not-allowed" : "pointer",
                  marginTop: 4,
                  marginBottom: 8,
                }}
              >
                {loadingMore
                  ? "Cargando..."
                  : `Ver más (${total - services.length} restantes)`}
              </button>
            )}

            {fetching && (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
                  Buscando...
                </p>
              </div>
            )}
          </div>

          {/* Columna derecha — mapa siempre visible */}
          <div style={{ flex: 1 }}>
            <Map
              ref={mapRef}
              services={mapServices}
              onRequestReport={(service) => {
                console.log("onRequestReport", service);
                const full = services.find((sv) => sv.id === service.id);
                if (full) setReporting(full);
              }}
              activeCategories={
                new Set(filters.category ? [filters.category] : [])
              }
            />
          </div>
        </div>
      ) : (
        // Layout mobile
        <>
          {viewMode === "list" ? (
            <div style={{ padding: "8px 8px 0", overflowX: "hidden" }}>
              <div style={{ textAlign: "center", padding: "4px 0" }}>
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
                  ¿Falta un local en el directorio? Agrégalo acá
                </button>
              </div>

              <p
                style={{
                  fontSize: 13,
                  color: "#6b7280",
                  margin: "12px 0 12px",
                }}
              >
                {services.length} de {total} locales
                {supplySearch && ` con "${supplySearch}"`}
                {filters.city && ` en ${filters.city}`}
              </p>

              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {services.length === 0 ? (
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
                  services.map((service) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      onReport={handleReport}
                      highlightSupply={supplySearch}
                    />
                  ))
                )}
              </div>
              {hasMore && (
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  style={{
                    width: "100%",
                    padding: "12px 0",
                    borderRadius: 12,
                    border: "1.5px solid #e5e7eb",
                    background: "white",
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#374151",
                    cursor: loadingMore ? "not-allowed" : "pointer",
                    marginTop: 4,
                    marginBottom: 8,
                  }}
                >
                  {loadingMore
                    ? "Cargando..."
                    : `Ver más (${total - services.length} restantes)`}
                </button>
              )}

              {fetching && (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
                    Buscando...
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ height: "calc(100dvh - 200px)" }}>
              <Map
                ref={mapRef}
                services={mapServices}
                onRequestReport={(s) => {
                  console.log("onRequestReport", s);
                  setReporting(s);
                }}
                activeCategories={
                  new Set(filters.category ? [filters.category] : [])
                }
              />
            </div>
          )}
          <Footer />
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

      {showFilters && (
        <FiltersModal
          current={filters}
          services={allCities} // ← ver nota abajo
          onApply={handleApplyFilters}
          onClose={() => setShowFilters(false)}
        />
      )}
    </div>
  );
}
