"use client";

import { useState } from "react";
import { categoryConfig } from "@/lib/category-config";
import { Category } from "@/types";

interface MissingServiceModalProps {
  onClose: () => void;
}

type FormStatus = "idle" | "loading" | "success" | "error";

export default function MissingServiceModal({
  onClose,
}: MissingServiceModalProps) {
  const [form, setForm] = useState({
    name: "",
    category: "",
    address: "",
    city: "",
    notes: "",
  });
  const [status, setStatus] = useState<FormStatus>("idle");

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const isValid = form.name && form.city;

  async function handleSubmit() {
    if (!isValid || status === "loading") return;
    setStatus("loading");

    try {
      const res = await fetch("/api/missing-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

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
    fontSize: 13,
    fontWeight: 500 as const,
    color: "#374151",
    display: "block" as const,
    marginBottom: 6,
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
          padding: "20px 16px 36px",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            background: "#e5e7eb",
            borderRadius: 99,
            margin: "0 auto 20px",
          }}
        />

        {status === "success" ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <p style={{ fontSize: 32, margin: "0 0 8px" }}>📬</p>
            <p style={{ fontSize: 15, fontWeight: 500, margin: "0 0 4px" }}>
              Solicitud enviada
            </p>
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
              Revisaremos tu sugerencia y la agregaremos al directorio pronto.
            </p>
          </div>
        ) : (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 4px" }}>
              Sugerir local faltante
            </h3>
            <p
              style={{
                fontSize: 13,
                color: "#6b7280",
                margin: "0 0 20px",
                lineHeight: 1.5,
              }}
            >
              Revisaremos tu sugerencia y la agregaremos manualmente al
              directorio.
            </p>

            {/* Categoría */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Categoría</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(Object.keys(categoryConfig) as Category[]).map((cat) => {
                  const isSelected = form.category === cat;
                  const { emoji, label, color } = categoryConfig[cat];
                  return (
                    <button
                      key={cat}
                      onClick={() => update("category", isSelected ? "" : cat)}
                      style={{
                        padding: "7px 12px",
                        borderRadius: 99,
                        border: `1.5px solid ${isSelected ? color : "#e5e7eb"}`,
                        background: isSelected ? `${color}15` : "white",
                        color: isSelected ? color : "#374151",
                        fontSize: 13,
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

            {/* Nombre */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Nombre del local *</label>
              <input
                type="text"
                placeholder="Ej: Farmatodo Altamira"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Ciudad */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Ciudad *</label>
              <input
                type="text"
                placeholder="Ej: Caracas"
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Dirección */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>
                Dirección{" "}
                <span style={{ color: "#9ca3af", fontWeight: 400 }}>
                  (opcional)
                </span>
              </label>
              <input
                type="text"
                placeholder="Ej: Av. Luis Roche, Altamira"
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Notas */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>
                Notas{" "}
                <span style={{ color: "#9ca3af", fontWeight: 400 }}>
                  (opcional)
                </span>
              </label>
              <textarea
                placeholder="Cualquier información adicional..."
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                rows={2}
                style={{ ...inputStyle, resize: "none" }}
              />
            </div>

            {status === "error" && (
              <p style={{ fontSize: 13, color: "#ef4444", margin: "0 0 12px" }}>
                Error al enviar. Intenta de nuevo.
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!isValid || status === "loading"}
              style={{
                width: "100%",
                padding: "14px 0",
                borderRadius: 12,
                border: "none",
                background: isValid ? "#111827" : "#e5e7eb",
                color: isValid ? "white" : "#9ca3af",
                fontSize: 15,
                fontWeight: 600,
                cursor: isValid ? "pointer" : "not-allowed",
                fontFamily: "inherit",
              }}
            >
              {status === "loading" ? "Enviando..." : "Enviar sugerencia"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
