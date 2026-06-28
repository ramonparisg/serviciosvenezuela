export default function OutsideVenezuelaWarning() {
  return (
    <div
      style={{
        margin: "0 0px 12px",
        padding: "12px 14px",
        borderRadius: 10,
        background: "#fffbeb",
        border: "1.5px solid #fcd34d",
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
      <div>
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#92400e",
            margin: "0 0 2px",
          }}
        >
          Estás fuera de Venezuela
        </p>
        <p
          style={{ fontSize: 12, color: "#78350f", margin: 0, lineHeight: 1.5 }}
        >
          Puedes consultar el directorio, pero no podrás reportar insumos desde
          fuera del país. Los reportes solo son válidos desde Venezuela.
        </p>
      </div>
    </div>
  );
}
