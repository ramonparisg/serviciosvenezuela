"use client";

import { useEffect, useRef, useState } from "react";
import { fuzzySearch } from "@/lib/fuzzy-search";
import { categoryConfig } from "@/lib/category-config";
import { Category } from "@/types";

interface Supply {
  id: string;
  name: string;
  category: string;
}

interface SupplySearchInputProps {
  value: string;
  onChange: (value: string) => void;
  supplies: Supply[];
  placeholder?: string;
  compact?: boolean; // versión reducida para el sticky navbar
}

export default function SupplySearchInput({
  value,
  onChange,
  supplies,
  placeholder,
  compact = false,
}: SupplySearchInputProps) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = fuzzySearch(supplies, value, (s) => s.name);

  // Cerrar al click fuera
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const showDropdown =
    open && focused && value.length >= 1 && results.length > 0;

  const pad = compact ? "7px 8px 7px 26px" : "10px 12px 10px 38px";
  const fs = compact ? 13 : 16;

  return (
    <div ref={containerRef} style={{ position: "relative", flex: 1 }}>
      {/* Input */}
      <span
        style={{
          position: "absolute",
          left: compact ? 8 : 12,
          top: "50%",
          transform: "translateY(-50%)",
          fontSize: compact ? 13 : 16,
          pointerEvents: "none",
        }}
      >
        🔍
      </span>

      <input
        ref={inputRef}
        type="text"
        placeholder={
          placeholder ?? 'Buscar insumo... ej: "Pañales", "Insulina"'
        }
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setFocused(true);
          setOpen(true);
        }}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%",
          padding: pad,
          borderRadius: compact ? 8 : 10,
          border: "1.5px solid #e5e7eb",
          fontSize: fs,
          fontFamily: "inherit",
          boxSizing: "border-box" as const,
          background: "#f9fafb",
          outline: focused ? "2px solid #e5e7eb" : "none",
        }}
      />

      {value && (
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            onChange("");
            inputRef.current?.focus();
          }}
          style={{
            position: "absolute",
            right: compact ? 6 : 10,
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            fontSize: compact ? 13 : 16,
            cursor: "pointer",
            color: "#9ca3af",
          }}
        >
          ✕
        </button>
      )}

      {/* Dropdown */}
      {showDropdown && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            zIndex: 600,
            overflow: "hidden",
            maxHeight: 220,
            overflowY: "auto",
          }}
        >
          {results.map(({ item }) => {
            const config = categoryConfig[item.category as Category];
            return (
              <div
                key={item.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(item.name);
                  setOpen(false);
                  inputRef.current?.blur();
                }}
                style={{
                  padding: "10px 14px",
                  borderBottom: "1px solid #f9fafb",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#f9fafb")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "white")
                }
              >
                <span style={{ fontSize: 14, color: "#111827" }}>
                  {item.name}
                </span>
                {config && (
                  <span
                    style={{
                      fontSize: 11,
                      color: config.color,
                      fontWeight: 500,
                      whiteSpace: "nowrap" as const,
                      flexShrink: 0,
                    }}
                  >
                    {config.emoji} {config.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
