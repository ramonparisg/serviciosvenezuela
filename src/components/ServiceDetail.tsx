"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { categoryConfig } from "@/lib/category-config";
import { Category } from "@/types";
import ReportSupplyModal from "./ReportSupplyModal";
import ReportServiceModal from "@/components/ReportServiceModal";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

export default function ServiceDetail({
  service,
  reports,
}: {
  service: any;
  reports: any[];
}) {
  const router = useRouter();
  const [reporting, setReporting] = useState(false);
  const config = categoryConfig[service.category as Category];
  const [reportingService, setReportingService] = useState(false);

  // Agrupar reportes por insumo
  const supplyMap = new Map<
    string,
    {
      name: string;
      available: number;
      unavailable: number;
      total: number;
      latest_status: string;
      last_reported_at: string;
    }
  >();

  reports.forEach((r) => {
    if (!r.supply) return;
    const id = r.supply.id;
    if (!supplyMap.has(id)) {
      supplyMap.set(id, {
        name: r.supply.name,
        available: 0,
        unavailable: 0,
        total: 0,
        latest_status: r.status,
        last_reported_at: r.created_at,
      });
    }
    const entry = supplyMap.get(id)!;
    entry.total++;
    if (r.status === "available") entry.available++;
    else entry.unavailable++;
    if (r.created_at > entry.last_reported_at) {
      entry.last_reported_at = r.created_at;
      entry.latest_status = r.status;
    }
  });

  const supplies = Array.from(supplyMap.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => {
      if (a.latest_status === "available" && b.latest_status !== "available")
        return -1;
      if (b.latest_status === "available" && a.latest_status !== "available")
        return 1;
      return b.last_reported_at > a.last_reported_at ? 1 : -1;
    });

  const googleMapsUrl =
    service.lat && service.lng
      ? `https://www.google.com/maps/search/?api=1&query=${service.lat},${service.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${service.name} ${service.address} ${service.city}`)}`;

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#f9fafb",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "white",
          borderBottom: "1px solid #f0f0f0",
          padding: "16px",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          onClick={() => router.push("/")}
          style={{
            background: "none",
            border: "none",
            fontSize: 14,
            color: "#6b7280",
            cursor: "pointer",
            padding: 0,
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          ← Volver
        </button>
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: config.color,
            margin: "0 0 4px",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {config.emoji} {config.label}
        </p>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>
          {service.name}
        </h1>
        <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>
          {service.address}, {service.city}, {service.state}
        </p>
      </div>

      <div style={{ padding: 16 }}>
        {/* Acciones rápidas */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          {service.phone && (
            <a
              href={`tel:${service.phone}`}
              style={{
                flex: 1,
                padding: "12px 0",
                borderRadius: 12,
                border: "1.5px solid #e5e7eb",
                background: "white",
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
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1,
              padding: "12px 0",
              borderRadius: 12,
              border: "1.5px solid #e5e7eb",
              background: "white",
              textAlign: "center",
              fontSize: 14,
              fontWeight: 500,
              color: "#111827",
              textDecoration: "none",
            }}
          >
            🗺 Cómo llegar
          </a>
        </div>
        {/* Notas del local */}
        {service.notes && (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              background: "#fffbeb",
              border: "1px solid #fde68a",
              marginBottom: 20,
            }}
          >
            <p style={{ fontSize: 13, color: "#92400e", margin: 0 }}>
              📝 {service.notes}
            </p>
          </div>
        )}
        {/* Insumos */}
        <div
          style={{
            background: "white",
            borderRadius: 14,
            border: "1px solid #f0f0f0",
            overflow: "hidden",
            marginBottom: 16,
          }}
        >
          <div
            style={{ padding: "14px 16px", borderBottom: "1px solid #f9fafb" }}
          >
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 2px" }}>
              Insumos reportados
            </h2>
            <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>
              Últimas 72 horas · {reports.length} reporte
              {reports.length !== 1 ? "s" : ""}
            </p>
          </div>

          {supplies.length === 0 ? (
            <div style={{ padding: "24px 16px", textAlign: "center" }}>
              <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
                Sin reportes recientes. ¡Sé el primero en reportar!
              </p>
            </div>
          ) : (
            supplies.map((supply) => {
              const isAvailable = supply.latest_status === "available";
              const pct = Math.round((supply.available / supply.total) * 100);
              const color =
                pct >= 60 ? "#15803d" : pct >= 40 ? "#92400e" : "#991b1b";

              return (
                <div
                  key={supply.id}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid #f9fafb",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span style={{ fontSize: 16 }}>
                      {isAvailable ? "✅" : "❌"}
                    </span>
                    <div>
                      <p
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          margin: "0 0 1px",
                        }}
                      >
                        {supply.name}
                      </p>
                      <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>
                        {timeAgo(supply.last_reported_at)}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color,
                        margin: "0 0 1px",
                      }}
                    >
                      {pct}% confirman
                    </p>
                    <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>
                      {supply.available} de {supply.total}{" "}
                      {supply.total === 1 ? "persona" : "personas"}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {/* Botón reportar */}
        <button
          onClick={() => setReporting(true)}
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: 12,
            border: "none",
            background: "#111827",
            color: "white",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          📋 Reportar insumo
        </button>
        <div style={{ marginTop: 12, textAlign: "center" }}>
          <button
            onClick={() => setReportingService(true)}
            style={{
              background: "none",
              border: "none",
              fontSize: 12,
              color: "#9ca3af",
              cursor: "pointer",
              textDecoration: "underline",
              padding: "4px 0",
              fontFamily: "inherit",
              width: "100%",
              textAlign: "center",
            }}
          >
            ⚠️ Informar problema
          </button>
        </div>
      </div>

      {reportingService && (
        <ReportServiceModal
          service={{ id: service.id, name: service.name }}
          onClose={() => setReportingService(false)}
        />
      )}

      {reporting && (
        <ReportSupplyModal
          service={{ ...service, supplies: [] }}
          onClose={() => setReporting(false)}
          onSuccess={() => {
            setReporting(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
