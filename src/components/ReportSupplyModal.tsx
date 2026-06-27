"use client";

import { useState, useEffect, useRef } from "react";
import { ServiceWithSupplies, Supply } from "@/types";
import { categoryConfig } from "@/lib/category-config";

interface ReportSupplyModalProps {
  service: ServiceWithSupplies;
  onClose: () => void;
  onSuccess: (
    serviceId: string,
    supplyId: string,
    status: "available" | "unavailable",
  ) => void;
}

type ModalStatus = "idle" | "loading" | "success" | "error";

interface SupplySelection {
  supply: Supply;
  status: "available" | "unavailable";
}

export default function ReportSupplyModal({
  service,
  onClose,
  onSuccess,
}: ReportSupplyModalProps) {
  const [allSupplies, setAllSupplies] = useState<Supply[]>([]);
  const [loadingSupplies, setLoadingSupplies] = useState(true);
  const [search, setSearch] = useState("");
  const [selections, setSelections] = useState<SupplySelection[]>([]);
  const [modalStatus, setModalStatus] = useState<ModalStatus>("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  const config = categoryConfig[service.category];

  useEffect(() => {
    async function loadSupplies() {
      const res = await fetch(`/api/supplies?category=${service.category}`);
      const data = await res.json();
      setAllSupplies(data);
      setLoadingSupplies(false);
    }
    loadSupplies();
  }, [service.category]);

  // Insumos filtrados por búsqueda, excluyendo ya seleccionados
  const selectedIds = new Set(selections.map((s) => s.supply.id));
  const filtered = allSupplies.filter(
    (s) =>
      !selectedIds.has(s.id) &&
      s.name.toLowerCase().includes(search.toLowerCase()),
  );

  // Si el texto no coincide con ninguno existente, ofrecer crearlo
  const searchTrimmed = search.trim();
  const canCreate =
    searchTrimmed.length > 1 &&
    !allSupplies.some(
      (s) => s.name.toLowerCase() === searchTrimmed.toLowerCase(),
    );

  function addSelection(supply: Supply, status: "available" | "unavailable") {
    setSelections((prev) => [...prev, { supply, status }]);
    setSearch("");
    inputRef.current?.focus();
  }

  function removeSelection(supplyId: string) {
    setSelections((prev) => prev.filter((s) => s.supply.id !== supplyId));
  }

  function moveSelection(
    supplyId: string,
    newStatus: "available" | "unavailable",
  ) {
    setSelections((prev) =>
      prev.map((s) =>
        s.supply.id === supplyId ? { ...s, status: newStatus } : s,
      ),
    );
  }

  async function handleCreateAndAdd(status: "available" | "unavailable") {
    // Crear insumo custom en la API
    const res = await fetch("/api/supplies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: searchTrimmed, category: service.category }),
    });
    const data = await res.json();
    if (!res.ok) return;

    const newSupply: Supply = {
      id: data.id,
      name: searchTrimmed,
      category: service.category,
      is_custom: true,
    };
    setAllSupplies((prev) => [...prev, newSupply]);
    addSelection(newSupply, status);
  }

  async function handleSubmit() {
    if (selections.length === 0 || modalStatus === "loading") return;
    setModalStatus("loading");

    try {
      await Promise.all(
        selections.map(({ supply, status }) =>
          fetch("/api/supply-reports", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              service_id: service.id,
              supply_id: supply.id,
              status,
            }),
          }),
        ),
      );

      // Actualización optimista para cada selección
      selections.forEach(({ supply, status }) => {
        onSuccess(service.id, supply.id, status);
      });

      setModalStatus("success");
    } catch {
      setModalStatus("error");
    }
  }

  const available = selections.filter((s) => s.status === "available");
  const unavailable = selections.filter((s) => s.status === "unavailable");

  const tagStyle = (color: string) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "5px 10px",
    borderRadius: 99,
    background: `${color}15`,
    border: `1.5px solid ${color}`,
    fontSize: 13,
    color: color,
    fontWeight: 500,
    cursor: "default" as const,
  });

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

        {modalStatus === "success" ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <p style={{ fontSize: 32, margin: "0 0 8px" }}>✅</p>
            <p style={{ fontSize: 15, fontWeight: 500, margin: "0 0 4px" }}>
              Reporte enviado
            </p>
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
              Gracias por ayudar a la comunidad
            </p>
          </div>
        ) : (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 2px" }}>
              Reportar insumos
            </h3>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 16px" }}>
              {config.emoji} {service.name}
            </p>
            <p
              style={{
                fontSize: 12,
                color: "#9ca3af",
                margin: "0 0 16px",
                lineHeight: 1.5,
              }}
            >
              Marca solo los insumos que hayas visto. No tienes que reportar
              todo.
            </p>

            {/* Buscador */}
            <div style={{ position: "relative", marginBottom: 8 }}>
              <input
                ref={inputRef}
                type="text"
                placeholder="Buscar o escribir un insumo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1.5px solid #e5e7eb",
                  fontSize: 14,
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Sugerencias del buscador */}
            {(search.length > 0 || allSupplies.length > 0) && (
              <div
                style={{
                  border: "1px solid #f0f0f0",
                  borderRadius: 10,
                  overflow: "hidden",
                  marginBottom: 16,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  maxHeight: 240,
                  overflowY: "auto",
                }}
              >
                {loadingSupplies ? (
                  <p
                    style={{
                      padding: "12px",
                      fontSize: 13,
                      color: "#9ca3af",
                      margin: 0,
                    }}
                  >
                    Cargando...
                  </p>
                ) : (
                  <>
                    {filtered.map((supply) => (
                      <div
                        key={supply.id}
                        style={{
                          padding: "10px 14px",
                          borderBottom: "1px solid #f9fafb",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ fontSize: 14, color: "#111827" }}>
                          {supply.name}
                        </span>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => addSelection(supply, "available")}
                            style={{
                              padding: "5px 10px",
                              borderRadius: 8,
                              border: "none",
                              background: "#dcfce7",
                              color: "#15803d",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            ✅ Hay
                          </button>
                          <button
                            onClick={() => addSelection(supply, "unavailable")}
                            style={{
                              padding: "5px 10px",
                              borderRadius: 8,
                              border: "none",
                              background: "#fee2e2",
                              color: "#991b1b",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            ❌ No hay
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Crear nuevo */}
                    {canCreate && (
                      <div
                        style={{
                          padding: "10px 14px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          background: "#fafafa",
                        }}
                      >
                        <span style={{ fontSize: 14, color: "#6b7280" }}>
                          Agregar "{searchTrimmed}"
                        </span>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => handleCreateAndAdd("available")}
                            style={{
                              padding: "5px 10px",
                              borderRadius: 8,
                              border: "none",
                              background: "#dcfce7",
                              color: "#15803d",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            ✅ Hay
                          </button>
                          <button
                            onClick={() => handleCreateAndAdd("unavailable")}
                            style={{
                              padding: "5px 10px",
                              borderRadius: 8,
                              border: "none",
                              background: "#fee2e2",
                              color: "#991b1b",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            ❌ No hay
                          </button>
                        </div>
                      </div>
                    )}

                    {filtered.length === 0 && !canCreate && (
                      <p
                        style={{
                          padding: "12px",
                          fontSize: 13,
                          color: "#9ca3af",
                          margin: 0,
                        }}
                      >
                        Sin resultados
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Selecciones actuales */}
            {selections.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                {/* SI HAY */}
                {available.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <p
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#15803d",
                        margin: "0 0 8px",
                      }}
                    >
                      ✅ SÍ HAY
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {available.map(({ supply }) => (
                        <div key={supply.id} style={tagStyle("#22c55e")}>
                          <span>{supply.name}</span>
                          <button
                            onClick={() =>
                              moveSelection(supply.id, "unavailable")
                            }
                            title="Mover a No hay"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: 0,
                              fontSize: 12,
                              color: "#15803d",
                              lineHeight: 1,
                            }}
                          >
                            ⇅
                          </button>
                          <button
                            onClick={() => removeSelection(supply.id)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: 0,
                              fontSize: 13,
                              color: "#15803d",
                              lineHeight: 1,
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* NO HAY */}
                {unavailable.length > 0 && (
                  <div>
                    <p
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#991b1b",
                        margin: "0 0 8px",
                      }}
                    >
                      ❌ NO HAY
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {unavailable.map(({ supply }) => (
                        <div key={supply.id} style={tagStyle("#ef4444")}>
                          <span>{supply.name}</span>
                          <button
                            onClick={() =>
                              moveSelection(supply.id, "available")
                            }
                            title="Mover a Sí hay"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: 0,
                              fontSize: 12,
                              color: "#991b1b",
                              lineHeight: 1,
                            }}
                          >
                            ⇅
                          </button>
                          <button
                            onClick={() => removeSelection(supply.id)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: 0,
                              fontSize: 13,
                              color: "#991b1b",
                              lineHeight: 1,
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {modalStatus === "error" && (
              <p style={{ fontSize: 13, color: "#ef4444", margin: "0 0 12px" }}>
                Error al enviar. Intenta de nuevo.
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={selections.length === 0 || modalStatus === "loading"}
              style={{
                width: "100%",
                padding: "14px 0",
                borderRadius: 12,
                border: "none",
                background: selections.length > 0 ? "#111827" : "#e5e7eb",
                color: selections.length > 0 ? "white" : "#9ca3af",
                fontSize: 15,
                fontWeight: 600,
                cursor: selections.length > 0 ? "pointer" : "not-allowed",
                fontFamily: "inherit",
              }}
            >
              {modalStatus === "loading"
                ? "Enviando..."
                : `Enviar reporte${selections.length > 0 ? ` (${selections.length})` : ""}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
