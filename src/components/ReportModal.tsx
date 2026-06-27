"use client";

import { useEffect, useState } from "react";
import { Service } from "@/types";
import { useReport } from "@/hooks/useReport";

interface ReportModalProps {
  service: Service;
  onClose: () => void;
}

export default function ReportModal({ service, onClose }: ReportModalProps) {
  const [selected, setSelected] = useState<"active" | "inactive" | null>(null);
  const [note, setNote] = useState("");
  const { status, submitReport } = useReport();

  async function handleSubmit() {
    if (!selected) return;
    await submitReport(service.id, selected, note);
  }

  useEffect(() => {
    if (status === "success") {
      const timer = setTimeout(onClose, 1500); // cerrar solo tras 1.5s
      return () => clearTimeout(timer);
    }
  }, [status, onClose]);

  return (
    // Overlay
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
      {/* Sheet — detener propagación para no cerrar al tocar adentro */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          background: "white",
          borderRadius: "16px 16px 0 0",
          padding: "20px 16px 36px",
        }}
      >
        {/* Handle */}
        <div
          style={{
            width: 36,
            height: 4,
            background: "#e5e7eb",
            borderRadius: 99,
            margin: "0 auto 20px",
          }}
        />

        <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 4px" }}>
          Reportar estado
        </h3>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px" }}>
          {service.name}
        </p>

        {status === "success" ? (
          <div
            style={{
              textAlign: "center",
              padding: "24px 0",
            }}
          >
            <p style={{ fontSize: 32, margin: "0 0 8px" }}>✅</p>
            <p style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>
              Reporte enviado
            </p>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>
              Gracias por ayudar a la comunidad
            </p>
          </div>
        ) : (
          <>
            {/* Botones activo/inactivo */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              {(["active", "inactive"] as const).map((opt) => {
                const isSelected = selected === opt;
                const color = opt === "active" ? "#22c55e" : "#ef4444";
                const label =
                  opt === "active"
                    ? "✅ Está activo"
                    : "❌ Está cerrado/inactivo";

                return (
                  <button
                    key={opt}
                    onClick={() => setSelected(opt)}
                    style={{
                      flex: 1,
                      padding: "12px 8px",
                      borderRadius: 12,
                      border: `2px solid ${isSelected ? color : "#e5e7eb"}`,
                      background: isSelected ? `${color}15` : "white",
                      color: isSelected ? color : "#374151",
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Nota opcional */}
            <textarea
              placeholder='Nota opcional: "Sin gasolina 91", "Solo efectivo"...'
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1.5px solid #e5e7eb",
                fontSize: 14,
                resize: "none",
                fontFamily: "inherit",
                marginBottom: 16,
                boxSizing: "border-box",
              }}
            />

            {status === "error" && (
              <p style={{ fontSize: 13, color: "#ef4444", margin: "0 0 12px" }}>
                Error al enviar. Intenta de nuevo.
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!selected || status === "loading"}
              style={{
                width: "100%",
                padding: "14px 0",
                borderRadius: 12,
                border: "none",
                background: selected ? "#111827" : "#e5e7eb",
                color: selected ? "white" : "#9ca3af",
                fontSize: 15,
                fontWeight: 600,
                cursor: selected ? "pointer" : "not-allowed",
              }}
            >
              {status === "loading" ? "Enviando..." : "Enviar reporte"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
