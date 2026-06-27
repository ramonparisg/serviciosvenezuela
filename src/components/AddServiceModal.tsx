"use client";

import { useRef, useState } from "react";
import { categoryConfig } from "@/lib/category-config";
import { VENEZUELA_STATES } from "@/lib/venezuela-states";
import { Category } from "@/types";
import { useGeocode } from "@/hooks/useGeocode";

interface AddServiceModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

type FormStatus = "idle" | "loading" | "success" | "error";

const INITIAL_FORM = {
  name: "",
  category: "" as Category | "",
  address: "",
  city: "",
  state: "",
  phone: "",
  notes: "",
};

export default function AddServiceModal({
  onClose,
  onSuccess,
}: AddServiceModalProps) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const {
    status: geoStatus,
    result: geoResult,
    geocode,
    reset: resetGeo,
  } = useGeocode();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function update(field: keyof typeof INITIAL_FORM, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));

    if (field === "address" || field === "city") {
      resetGeo();

      if (debounceRef.current) clearTimeout(debounceRef.current);

      const newForm = { ...form, [field]: value };
      if (newForm.address.length > 5 && newForm.city.length > 2) {
        debounceRef.current = setTimeout(() => {
          geocode(newForm.address, newForm.city);
        }, 800);
      }
    }
  }

  const isFormComplete =
    form.name && form.category && form.address && form.city && form.state;
  const hasVerified = geoStatus === "found" || geoStatus === "not_found";
  const canSave = isFormComplete && hasVerified && formStatus !== "loading";

  async function handleVerify() {
    await geocode(form.address, form.city);
  }

  async function handleSubmit() {
    if (!canSave) return;
    setFormStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          lat: geoResult?.lat ?? null,
          lng: geoResult?.lng ?? null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "Error al guardar");
        setFormStatus("error");
        return;
      }

      setFormStatus("success");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch {
      setErrorMsg("Error de conexión. Intenta de nuevo.");
      setFormStatus("error");
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1.5px solid #e5e7eb",
    fontSize: 15,
    fontFamily: "inherit",
    boxSizing: "border-box" as const,
    background: "white",
  };

  const labelStyle = {
    fontSize: 13,
    fontWeight: 500,
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
          maxHeight: "90vh",
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

        <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 20px" }}>
          Agregar servicio
        </h3>

        {formStatus === "success" ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <p style={{ fontSize: 32, margin: "0 0 8px" }}>✅</p>
            <p style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>
              Servicio agregado
            </p>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>
              Aparecerá en el mapa en unos segundos
            </p>
          </div>
        ) : (
          <>
            {/* Categoría */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Categoría *</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(Object.keys(categoryConfig) as Category[]).map((cat) => {
                  const isSelected = form.category === cat;
                  const { emoji, label, color } = categoryConfig[cat];
                  return (
                    <button
                      key={cat}
                      onClick={() => update("category", cat)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 99,
                        border: `1.5px solid ${isSelected ? color : "#e5e7eb"}`,
                        background: isSelected ? `${color}15` : "white",
                        color: isSelected ? color : "#374151",
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: "pointer",
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
              <label style={labelStyle}>Nombre *</label>
              <input
                type="text"
                placeholder="Ej: Farmacia Bello Monte"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Ciudad y Estado */}
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Ciudad *</label>
                <input
                  type="text"
                  placeholder="Ej: Caracas"
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Estado *</label>
                <select
                  value={form.state}
                  onChange={(e) => update("state", e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Seleccionar</option>
                  {VENEZUELA_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dirección */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Dirección *</label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="Ej: Av. Principal c/c Av. Mohedano"
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  style={{
                    ...inputStyle,
                    paddingRight: 36, // espacio para el ícono
                    borderColor:
                      geoStatus === "found"
                        ? "#86efac"
                        : geoStatus === "not_found"
                          ? "#fca5a5"
                          : geoStatus === "error"
                            ? "#fca5a5"
                            : "#e5e7eb",
                  }}
                />
                {/* Ícono de estado */}
                <span
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 16,
                    lineHeight: 1,
                  }}
                >
                  {geoStatus === "loading" && "⏳"}
                  {geoStatus === "found" && "✅"}
                  {geoStatus === "not_found" && "❌"}
                  {geoStatus === "error" && "❌"}
                </span>
              </div>

              {/* Mensaje debajo del input */}
              {geoStatus === "found" && geoResult && (
                <p
                  style={{
                    fontSize: 12,
                    color: "#15803d",
                    margin: "4px 0 0",
                    lineHeight: 1.4,
                  }}
                >
                  {geoResult.display_name}
                </p>
              )}
              {geoStatus === "not_found" && (
                <p
                  style={{ fontSize: 12, color: "#dc2626", margin: "4px 0 0" }}
                >
                  No encontramos esta dirección — el servicio se guardará sin
                  ubicación en el mapa
                </p>
              )}
              {geoStatus === "error" && (
                <p
                  style={{ fontSize: 12, color: "#dc2626", margin: "4px 0 0" }}
                >
                  Error al verificar la dirección
                </p>
              )}
            </div>

            {/* Teléfono */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>
                Teléfono{" "}
                <span style={{ color: "#9ca3af", fontWeight: 400 }}>
                  (opcional)
                </span>
              </label>
              <input
                type="tel"
                placeholder="Ej: 0212-555-1234"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
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
                placeholder="Ej: Solo efectivo, tienen insulina, abierto hasta las 6pm..."
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                rows={2}
                style={{ ...inputStyle, resize: "none" }}
              />
            </div>

            {/* Verificar ubicación */}
            {isFormComplete && (
              <div style={{ marginBottom: 16 }}>
                {/* Botón verificar — solo si no se ha verificado aún */}
                {geoStatus === "idle" && (
                  <button
                    onClick={handleVerify}
                    style={{
                      width: "100%",
                      padding: "12px 0",
                      borderRadius: 12,
                      border: "1.5px solid #e5e7eb",
                      background: "white",
                      fontSize: 14,
                      fontWeight: 500,
                      color: "#374151",
                      cursor: "pointer",
                    }}
                  >
                    🔍 Verificar ubicación en el mapa
                  </button>
                )}

                {geoStatus === "loading" && (
                  <p
                    style={{
                      fontSize: 13,
                      color: "#9ca3af",
                      textAlign: "center",
                      margin: 0,
                    }}
                  >
                    Buscando ubicación...
                  </p>
                )}

                {geoStatus === "found" && geoResult && (
                  <div
                    style={{
                      padding: "12px",
                      borderRadius: 10,
                      background: "#f0fdf4",
                      border: "1.5px solid #86efac",
                    }}
                  >
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "#15803d",
                        margin: "0 0 2px",
                      }}
                    >
                      ✅ Ubicación encontrada
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#166534",
                        margin: "0 0 8px",
                        lineHeight: 1.4,
                      }}
                    >
                      {geoResult.display_name}
                    </p>
                    <button
                      onClick={resetGeo}
                      style={{
                        fontSize: 12,
                        color: "#15803d",
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                    >
                      Buscar de nuevo
                    </button>
                  </div>
                )}

                {geoStatus === "not_found" && (
                  <div
                    style={{
                      padding: "12px",
                      borderRadius: 10,
                      background: "#fffbeb",
                      border: "1.5px solid #fcd34d",
                    }}
                  >
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "#92400e",
                        margin: "0 0 2px",
                      }}
                    >
                      ⚠️ No encontramos la ubicación exacta
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#78350f",
                        margin: "0 0 8px",
                        lineHeight: 1.4,
                      }}
                    >
                      El servicio se guardará pero no aparecerá en el mapa.
                      Puedes guardarlo igual y corregirlo después.
                    </p>
                    <button
                      onClick={resetGeo}
                      style={{
                        fontSize: 12,
                        color: "#92400e",
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                    >
                      Intentar con otra dirección
                    </button>
                  </div>
                )}

                {geoStatus === "error" && (
                  <div
                    style={{
                      padding: "12px",
                      borderRadius: 10,
                      background: "#fef2f2",
                      border: "1.5px solid #fca5a5",
                    }}
                  >
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "#991b1b",
                        margin: "0 0 8px",
                      }}
                    >
                      Error al verificar. Intenta de nuevo.
                    </p>
                    <button
                      onClick={resetGeo}
                      style={{
                        fontSize: 12,
                        color: "#991b1b",
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                    >
                      Reintentar
                    </button>
                  </div>
                )}
              </div>
            )}

            {errorMsg && (
              <p style={{ fontSize: 13, color: "#ef4444", margin: "0 0 12px" }}>
                {errorMsg}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!canSave}
              style={{
                width: "100%",
                padding: "14px 0",
                borderRadius: 12,
                border: "none",
                background: canSave ? "#111827" : "#e5e7eb",
                color: canSave ? "white" : "#9ca3af",
                fontSize: 15,
                fontWeight: 600,
                cursor: canSave ? "pointer" : "not-allowed",
              }}
            >
              {formStatus === "loading"
                ? "Guardando..."
                : "Confirmar y guardar"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
