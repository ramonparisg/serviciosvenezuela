"use client";

import { Filters } from "./FiltersModal";
import { categoryConfig } from "@/lib/category-config";
import { Category } from "@/types";

interface FilterBarProps {
  filters: Filters;
  onRemove: (key: keyof Filters) => void;
  onOpenFilters: () => void;
}

export default function FilterBar({
  filters,
  onRemove,
  onOpenFilters,
}: FilterBarProps) {
  const chips: { key: keyof Filters; label: string }[] = [];

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
      {/* Chips de filtros activos */}
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
  );
}
