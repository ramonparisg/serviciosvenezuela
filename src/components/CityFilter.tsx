"use client";

import { useState, useRef, useEffect } from "react";

interface CityFilterProps {
  services: { city: string; state: string }[];
  value: string;
  onChange: (city: string) => void;
}

export default function CityFilter({
  services,
  value,
  onChange,
}: CityFilterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Agrupar ciudades por estado
  const grouped = services.reduce<Record<string, Set<string>>>((acc, s) => {
    if (!acc[s.state]) acc[s.state] = new Set();
    acc[s.state].add(s.city);
    return acc;
  }, {});

  // Filtrar por búsqueda
  const filtered = Object.entries(grouped)
    .map(([state, cities]) => ({
      state,
      cities: Array.from(cities)
        .filter((c) => c.toLowerCase().includes(search.toLowerCase()))
        .sort(),
    }))
    .filter((g) => g.cities.length > 0)
    .sort((a, b) => a.state.localeCompare(b.state));

  const selectedLabel = value || "Todas las ciudades";

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(city: string) {
    onChange(city === value ? "" : city);
    setOpen(false);
    setSearch("");
  }

  function handleOpen() {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  return (
    <div ref={containerRef} style={{ position: "relative", flexShrink: 0 }}>
      {/* Trigger */}
      <button
        onClick={() => (open ? setOpen(false) : handleOpen())}
        style={{
          padding: "7px 10px",
          borderRadius: 8,
          border: `1.5px solid ${value ? "#111827" : "#e5e7eb"}`,
          background: value ? "#111827" : "white",
          color: value ? "white" : "#374151",
          fontSize: 13,
          fontFamily: "inherit",
          cursor: "pointer",
          whiteSpace: "nowrap",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        📍 {selectedLabel}
        <span style={{ fontSize: 10, opacity: 0.7 }}>{open ? "▲" : "▼"}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 999,
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            width: 240,
            overflow: "hidden",
          }}
        >
          {/* Buscador */}
          <div style={{ padding: "10px 10px 6px" }}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar ciudad..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1.5px solid #e5e7eb",
                fontSize: 13,
                fontFamily: "inherit",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </div>

          {/* Opción "todas" */}
          <div
            onClick={() => handleSelect("")}
            style={{
              padding: "8px 14px",
              fontSize: 13,
              cursor: "pointer",
              color: !value ? "#111827" : "#6b7280",
              fontWeight: !value ? 600 : 400,
              background: !value ? "#f9fafb" : "white",
              borderBottom: "1px solid #f3f4f6",
            }}
          >
            Todas las ciudades
          </div>

          {/* Lista agrupada */}
          <div style={{ maxHeight: 280, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <p
                style={{
                  padding: "12px 14px",
                  fontSize: 13,
                  color: "#9ca3af",
                  margin: 0,
                }}
              >
                Sin resultados
              </p>
            ) : (
              filtered.map(({ state, cities }) => (
                <div key={state}>
                  {/* Header de estado */}
                  <p
                    style={{
                      padding: "8px 14px 4px",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#9ca3af",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      margin: 0,
                      background: "#fafafa",
                      borderTop: "1px solid #f3f4f6",
                    }}
                  >
                    {state}
                  </p>

                  {/* Ciudades del estado */}
                  {cities.map((city) => (
                    <div
                      key={city}
                      onClick={() => handleSelect(city)}
                      style={{
                        padding: "8px 14px 8px 20px",
                        fontSize: 13,
                        cursor: "pointer",
                        color: value === city ? "#111827" : "#374151",
                        fontWeight: value === city ? 600 : 400,
                        background: value === city ? "#f0f9ff" : "white",
                        borderLeft:
                          value === city
                            ? "3px solid #38bdf8"
                            : "3px solid transparent",
                      }}
                    >
                      {city}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
