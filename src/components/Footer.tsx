export default function Footer() {
  return (
    <footer
      style={{
        padding: "24px 16px 36px",
        background: "#f9fafb",
        borderTop: "1px solid #f0f0f0",
        marginTop: 24,
      }}
    >
      <p
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "#374151",
          margin: "0 0 8px",
          textAlign: "center",
        }}
      >
        🇻🇪 Mapa de Insumos - Venezuela
      </p>
      <p
        style={{
          fontSize: 12,
          color: "#6b7280",
          margin: "0 0 12px",
          textAlign: "center",
          lineHeight: 1.6,
        }}
      >
        Esta es una plataforma de organización civil sin fines de lucro, creada
        para ayudar a los venezolanos afectados por la emergencia. No recibimos
        financiamiento de ninguna organización pública ni privada.
      </p>
      <p
        style={{
          fontSize: 12,
          color: "#9ca3af",
          margin: 0,
          textAlign: "center",
          lineHeight: 1.6,
        }}
      >
        <strong>Descargo de responsabilidad:</strong> Los datos publicados aquí
        reflejan los reportes de la comunidad y no han sido verificados
        oficialmente. La información puede no ser precisa o estar
        desactualizada. Verifica siempre antes de desplazarte.
      </p>
    </footer>
  );
}
