interface VerificationBarProps {
  active: number;
  inactive: number;
  total: number;
}

export default function VerificationBar({
  active,
  total,
}: VerificationBarProps) {
  if (total === 0) {
    return (
      <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>
        Sin reportes en las últimas 6h
      </p>
    );
  }

  const pct = Math.round((active / total) * 100);
  const color = pct >= 60 ? "#22c55e" : pct >= 40 ? "#f97316" : "#ef4444";
  const label = pct >= 60 ? "Activo" : pct >= 40 ? "Incierto" : "Inactivo";

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 500, color }}>
          {label} · {pct}%
        </span>
        <span style={{ fontSize: 12, color: "#9ca3af" }}>
          {total} reporte{total !== 1 ? "s" : ""}
        </span>
      </div>
      <div
        style={{
          height: 6,
          background: "#f3f4f6",
          borderRadius: 99,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: color,
            borderRadius: 99,
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}
