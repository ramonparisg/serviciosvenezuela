"use client";

import { Filters } from "./FiltersModal";
import { categoryConfig } from "@/lib/category-config";
import { Category } from "@/types";
import { useLocation } from "@/hooks/useLocation";

interface FilterBarProps {
  filters: Filters;
  onRemove: (key: keyof Filters) => void;
  onOpenFilters: () => void;
  onMyLocation: () => void;
  locationStatus: string;
}

// Configuración visual por estado
const LOCATION_BUTTON = {
  idle: {
    label: "Ordenar por cercanía",
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
    label: "Ordenado por cercanía",
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

export default function FilterBar({
  filters,
  onRemove,
  onOpenFilters,
  onMyLocation,
  locationStatus,
}: FilterBarProps) {
  const chips: { key: keyof Filters; label: string }[] = [];

  // @ts-ignore
  const btn = LOCATION_BUTTON[locationStatus];

  const { isVenezuela } = useLocation();

  if (filters.category) {
    const config = categoryConfig[filters.category as Category];
    chips.push({ key: "category", label: `${config.emoji} ${config.label}` });
  }
  if (filters.state) chips.push({ key: "state", label: `🗺 ${filters.state}` });
  if (filters.city) chips.push({ key: "city", label: `📍 ${filters.city}` });
  if (filters.name) chips.push({ key: "name", label: `🏷 "${filters.name}"` });
  if (filters.address)
    chips.push({ key: "address", label: `📌 "${filters.address}"` });
  if (filters.recentOnly)
    chips.push({ key: "recentOnly", label: "✅ Con reportes" });

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 16px",
          overflowX: "auto",
          scrollbarWidth: "none",
          borderBottom: "1px solid #f0f0f0",
          background: "white",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 6,
            flex: 1,
            overflowX: "auto",
            scrollbarWidth: "none",
          }}
        >
          {chips.length === 0 ? (
            <span
              style={{ fontSize: 13, color: "#9ca3af", whiteSpace: "nowrap" }}
            >
              Mostrando todos los locales
            </span>
          ) : (
            chips.map((chip) => (
              <div
                key={chip.key}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "5px 10px",
                  borderRadius: 99,
                  background: "#111827",
                  color: "white",
                  fontSize: 12,
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {chip.label}
                <button
                  onClick={() => onRemove(chip.key)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "white",
                    cursor: "pointer",
                    padding: 0,
                    fontSize: 13,
                    lineHeight: 1,
                    opacity: 0.7,
                    marginLeft: 2,
                  }}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
        {/* Botón de filtros — siempre visible */}
        <button
          onClick={onOpenFilters}
          style={{
            flexShrink: 0,
            padding: "7px 12px",
            borderRadius: 8,
            border: `1.5px solid ${chips.length > 0 ? "#111827" : "#e5e7eb"}`,
            background: chips.length > 0 ? "#111827" : "white",
            color: chips.length > 0 ? "white" : "#374151",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "inherit",
          }}
        >
          ⚙ Filtros {chips.length > 0 && `(${chips.length})`}
        </button>
      </div>
      {/* Botón ubicación */}
      {isVenezuela && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            width: "100%",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onMyLocation}
            disabled={
              locationStatus === "loading" || locationStatus === "unavailable"
            }
            style={{
              flexShrink: 0,
              padding: "7px 12px",
              borderRadius: 8,
              border: `1.5px solid ${chips.length > 0 ? "#111827" : "#e5e7eb"}`,
              background: chips.length > 0 ? "#111827" : "white",
              color: chips.length > 0 ? "white" : "#374151",
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
            }}
          >
            {btn.icon} {btn.label}
          </button>
        </div>
      )}
    </div>
  );
}
