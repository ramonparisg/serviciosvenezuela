"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Service, Category } from "@/types";
import VerificationBar from "./VerificationBar";
import { categoryConfig } from "@/lib/category-config";

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

interface MapViewProps {
  services: Service[];
}

export default function MapView({ services }: MapViewProps) {
  const [selected, setSelected] = useState<Service | null>(null);
  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    new Set(),
  );

  const toggleCategory = (cat: string) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const handleSelect = useCallback((service: Service) => {
    setSelected(service);
  }, []);

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
      {/* Filtros */}
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "10px 12px",
          overflowX: "auto",
          background: "white",
          borderBottom: "1px solid #f3f4f6",
          scrollbarWidth: "none",
        }}
      >
        {(Object.keys(categoryConfig) as Category[]).map((cat) => {
          const isActive = activeCategories.has(cat);
          const { emoji, label, color } = categoryConfig[cat];
          return (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              style={{
                flexShrink: 0,
                padding: "6px 12px",
                borderRadius: 99,
                border: `1.5px solid ${isActive ? color : "#e5e7eb"}`,
                background: isActive ? color : "white",
                color: isActive ? "white" : "#374151",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {emoji} {label}
            </button>
          );
        })}
      </div>

      {/* Mapa */}
      <div style={{ flex: 1, position: "relative" }}>
        <Map
          services={services}
          onSelectService={handleSelect}
          activeCategories={activeCategories}
        />
      </div>

      {/* Drawer */}
      {selected && (
        <div
          style={{
            background: "white",
            borderTop: "1px solid #e5e7eb",
            padding: "16px 16px 24px",
            maxHeight: "40vh",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 12,
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 11,
                  color: categoryConfig[selected.category as Category].color,
                  fontWeight: 600,
                  margin: "0 0 2px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {categoryConfig[selected.category as Category].emoji}{" "}
                {categoryConfig[selected.category as Category].label}
              </p>
              <h2 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>
                {selected.name}
              </h2>
              <p style={{ fontSize: 13, color: "#6b7280", margin: "2px 0 0" }}>
                {selected.address}, {selected.city}
              </p>
            </div>
            <button
              onClick={() => setSelected(null)}
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

          <div style={{ marginBottom: 16 }}>
            <VerificationBar
              active={Number(selected.active_reports)}
              inactive={Number(selected.inactive_reports)}
              total={Number(selected.total_reports)}
            />
          </div>

          {selected.notes && (
            <p
              style={{
                fontSize: 13,
                color: "#374151",
                background: "#f9fafb",
                padding: "8px 12px",
                borderRadius: 8,
                margin: "0 0 12px",
              }}
            >
              {selected.notes}
            </p>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            {selected.phone && (
              <a
                href={`tel:${selected.phone}`}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  background: "#f3f4f6",
                  borderRadius: 10,
                  textAlign: "center",
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#111827",
                  textDecoration: "none",
                }}
              >
                📞 Llamar
              </a>
            )}
            <button
              style={{
                flex: 1,
                padding: "10px 0",
                background: "#111827",
                borderRadius: 10,
                border: "none",
                fontSize: 14,
                fontWeight: 500,
                color: "white",
                cursor: "pointer",
              }}
            >
              📋 Reportar estado
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
