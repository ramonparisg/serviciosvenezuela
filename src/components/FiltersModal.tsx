"use client";

import { useState } from "react";
import { categoryConfig } from "@/lib/category-config";
import { Category } from "@/types";
// import { VENEZUELA_STATES } from "@/lib/venezuela-states";
import CityFilter from "./CityFilter";

export interface Filters {
  category: string;
  state: string;
  city: string;
  name: string;
  address: string;
  recentOnly: boolean;
}

export const EMPTY_FILTERS: Filters = {
  category: "",
  state: "",
  city: "",
  name: "",
  address: "",
  recentOnly: false,
};

interface FiltersModalProps {
  current: Filters;
  services: { city: string; state: string }[];
  onApply: (filters: Filters) => void;
  onClose: () => void;
}

export default function FiltersModal({
  current,
  services,
  onApply,
  onClose,
}: FiltersModalProps) {
  const [draft, setDraft] = useState<Filters>(current);

  function update<K extends keyof Filters>(key: K, value: Filters[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function handleClear() {
    setDraft(EMPTY_FILTERS);
  }

  function handleApply() {
    onApply(draft);
    onClose();
  }

  const activeCount = Object.entries(draft).filter(([k, v]) =>
    k !== "recentOnly" ? !!v : v,
  ).length;

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1.5px solid #e5e7eb",
    fontSize: 14,
    fontFamily: "inherit",
    boxSizing: "border-box" as const,
  };

  const labelStyle = {
    fontSize: 12,
    fontWeight: 600 as const,
    color: "#6b7280",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    display: "block" as const,
    marginBottom: 8,
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          background: "white",
          borderRadius: "16px 16px 0 0",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header fijo */}
        <div
          style={{
            padding: "20px 16px 16px",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 36,
              height: 4,
              background: "#e5e7eb",
              borderRadius: 99,
              position: "absolute",
              top: 10,
              left: "50%",
              transform: "translateX(-50%)",
            }}
          />
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Filtros</h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 20,
              cursor: "pointer",
              color: "#9ca3af",
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div style={{ overflowY: "auto", padding: "16px", flex: 1 }}>
          {/* Categoría */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Categoría</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {(Object.keys(categoryConfig) as Category[]).map((cat) => {
                const isSelected = draft.category === cat;
                const { emoji, label, color } = categoryConfig[cat];
                return (
                  <button
                    key={cat}
                    onClick={() => update("category", isSelected ? "" : cat)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 99,
                      border: `1.5px solid ${isSelected ? color : "#e5e7eb"}`,
                      background: isSelected ? `${color}15` : "white",
                      color: isSelected ? color : "#374151",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {emoji} {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ciudad */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Ciudad</label>
            <CityFilter
              services={
                draft.state
                  ? services.filter((s) => s.state === draft.state)
                  : services
              }
              value={draft.city}
              onChange={(city) => update("city", city)}
            />
          </div>

          {/* Nombre del local */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Nombre del local</label>
            <input
              type="text"
              placeholder="Ej: Farmatodo, Hospital Universitario..."
              value={draft.name}
              onChange={(e) => update("name", e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Dirección */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Dirección</label>
            <input
              type="text"
              placeholder="Ej: Av. Libertador, Las Mercedes..."
              value={draft.address}
              onChange={(e) => update("address", e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Solo con reportes recientes */}
          <div style={{ marginBottom: 8 }}>
            <button
              onClick={() => update("recentOnly", !draft.recentOnly)}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 12,
                border: `1.5px solid ${draft.recentOnly ? "#22c55e" : "#e5e7eb"}`,
                background: draft.recentOnly ? "#f0fdf4" : "white",
                display: "flex",
                alignItems: "center",
                gap: 12,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  border: `2px solid ${draft.recentOnly ? "#22c55e" : "#d1d5db"}`,
                  background: draft.recentOnly ? "#22c55e" : "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {draft.recentOnly && (
                  <span style={{ color: "white", fontSize: 13, lineHeight: 1 }}>
                    ✓
                  </span>
                )}
              </div>
              <div style={{ textAlign: "left" }}>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#111827",
                    margin: 0,
                  }}
                >
                  Solo con reportes recientes
                </p>
                <p
                  style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0" }}
                >
                  Mostrar solo locales con actividad en los últimos 3 días
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Footer fijo */}
        <div
          style={{
            padding: "12px 16px 32px",
            borderTop: "1px solid #f0f0f0",
            display: "flex",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <button
            onClick={handleClear}
            style={{
              flex: 1,
              padding: "13px 0",
              borderRadius: 12,
              border: "1.5px solid #e5e7eb",
              background: "white",
              fontSize: 14,
              fontWeight: 500,
              color: "#374151",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Limpiar
          </button>
          <button
            onClick={handleApply}
            style={{
              flex: 2,
              padding: "13px 0",
              borderRadius: 12,
              border: "none",
              background: "#111827",
              fontSize: 14,
              fontWeight: 600,
              color: "white",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Ver resultados {activeCount > 0 && `(${activeCount} filtros)`}
          </button>
        </div>
      </div>
    </div>
  );
}
