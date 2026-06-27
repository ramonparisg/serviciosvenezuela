"use client";

import { ServiceWithSupplies } from "@/types";
import { categoryConfig } from "@/lib/category-config";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

interface ServiceCardProps {
  service: ServiceWithSupplies;
  onReport: (service: ServiceWithSupplies) => void;
  highlightSupply?: string;
}

export default function ServiceCard({
  service,
  onReport,
  highlightSupply,
}: ServiceCardProps) {
  const config = categoryConfig[service.category];
  const hasSupplies = service.supplies.length > 0;

  return (
    <div
      style={{
        background: "white",
        borderRadius: 14,
        border: "1px solid #f0f0f0",
        padding: "14px 16px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 10 }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: config.color,
            margin: "0 0 2px",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {config.emoji} {config.label}
        </p>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 2px" }}>
          {service.name}
        </h3>
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
          {service.address && `${service.address}, `}
          {service.city}
        </p>
        {service.phone && (
          <a
            href={`tel:${service.phone}`}
            style={{ fontSize: 13, color: "#3b82f6", textDecoration: "none" }}
          >
            📞 {service.phone}
          </a>
        )}
      </div>

      {/* Insumos */}
      {hasSupplies ? (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 8px" }}>
            Últimas 6 horas
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {service.supplies.slice(0, 5).map((sw) => {
              const isHighlighted =
                highlightSupply &&
                sw.supply.name
                  .toLowerCase()
                  .includes(highlightSupply.toLowerCase());
              const isAvailable = sw.latest_status === "available";
              const pct =
                sw.report_count > 0
                  ? Math.round((sw.available_count / sw.report_count) * 100)
                  : null;

              return (
                <div
                  key={sw.supply.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 10px",
                    borderRadius: 8,
                    background: isHighlighted ? "#fefce8" : "#f9fafb",
                    border: isHighlighted
                      ? "1px solid #fde047"
                      : "1px solid transparent",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <span style={{ fontSize: 14 }}>
                      {isAvailable ? "✅" : "❌"}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: isHighlighted ? 600 : 400,
                        color: "#111827",
                      }}
                    >
                      {sw.supply.name}
                    </span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {pct !== null && (
                      <>
                        <span
                          style={{
                            fontSize: 11,
                            color:
                              pct >= 60
                                ? "#15803d"
                                : pct >= 40
                                  ? "#92400e"
                                  : "#991b1b",
                            fontWeight: 500,
                            display: "block",
                          }}
                        >
                          {pct}% confirman
                        </span>
                        <span style={{ fontSize: 11, color: "#9ca3af" }}>
                          {sw.report_count}{" "}
                          {sw.report_count === 1 ? "persona" : "personas"}
                        </span>
                      </>
                    )}
                    {sw.last_reported_at && (
                      <p
                        style={{
                          fontSize: 11,
                          color: "#9ca3af",
                          margin: "1px 0 0",
                        }}
                      >
                        {timeAgo(sw.last_reported_at)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            {service.supplies.length > 5 && (
              <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0" }}>
                +{service.supplies.length - 5} insumos más
              </p>
            )}
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: "10px",
            borderRadius: 8,
            background: "#f9fafb",
            marginBottom: 12,
          }}
        >
          <p
            style={{
              fontSize: 13,
              color: "#9ca3af",
              margin: 0,
              textAlign: "center",
            }}
          >
            Sin reportes recientes
          </p>
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <a
          href={`/services/${service.id}`}
          style={{
            flex: 1,
            padding: "10px 0",
            borderRadius: 10,
            border: "1.5px solid #e5e7eb",
            background: "white",
            fontSize: 14,
            fontWeight: 500,
            color: "#374151",
            textDecoration: "none",
            textAlign: "center",
          }}
        >
          Ver detalle
        </a>
        <button
          onClick={() => onReport(service)}
          style={{
            flex: 1,
            padding: "10px 0",
            borderRadius: 10,
            border: "none",
            background: "#111827",
            fontSize: 14,
            fontWeight: 500,
            color: "white",
            cursor: "pointer",
          }}
        >
          📋 Reportar
        </button>
      </div>
    </div>
  );
}
