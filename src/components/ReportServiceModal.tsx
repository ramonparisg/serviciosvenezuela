"use client";

import { useState } from "react";

interface ReportServiceModalProps {
  service: { id: string; name: string };
  onClose: () => void;
}

const REASONS = [
  { value: "outdated", label: "📝 Información desactualizada" },
  { value: "closed", label: "🔒 Local cerrado permanentemente" },
  { value: "wrong_location", label: "📍 Ubicación incorrecta" },
  { value: "duplicate", label: "👥 Está duplicado" },
  { value: "other", label: "💬 Otro motivo" },
];

type ModalStatus = "idle" | "loading" | "success" | "error";

export default function ReportServiceModal({
  service,
  onClose,
}: ReportServiceModalProps) {
  const [reason, setReason] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<ModalStatus>("idle");

  async function handleSubmit() {
    if (!reason || status === "loading") return;
    setStatus("loading");

    try {
      const res = await fetch("/api/service-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: service.id,
          service_name: service.name,
          reason,
          notes,
        }),
      });

      if (!res.ok) throw new Error();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  const canSubmit = !!reason && status !== "loading";

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
              Reporte enviado
            </p>
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
              Revisaremos el problema y lo corregiremos pronto.
            </p>
          </div>
        ) : (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 4px" }}>
              Reportar problema
            </h3>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px" }}>
              {service.name}
            </p>

            {/* Motivos */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginBottom: 16,
              }}
            >
              {REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setReason(reason === r.value ? null : r.value)}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: `1.5px solid ${reason === r.value ? "#111827" : "#e5e7eb"}`,
                    background: reason === r.value ? "#111827" : "white",
                    color: reason === r.value ? "white" : "#374151",
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Notas opcionales */}
            <textarea
              placeholder="Detalles adicionales (opcional)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1.5px solid #e5e7eb",
                fontSize: 14,
                fontFamily: "inherit",
                resize: "none",
                boxSizing: "border-box",
                marginBottom: 16,
              }}
            />

            {status === "error" && (
              <p style={{ fontSize: 13, color: "#ef4444", margin: "0 0 12px" }}>
                Error al enviar. Intenta de nuevo.
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{
                width: "100%",
                padding: "14px 0",
                borderRadius: 12,
                border: "none",
                background: canSubmit ? "#111827" : "#e5e7eb",
                color: canSubmit ? "white" : "#9ca3af",
                fontSize: 15,
                fontWeight: 600,
                cursor: canSubmit ? "pointer" : "not-allowed",
                fontFamily: "inherit",
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
