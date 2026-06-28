"use client";

// Detectar el navegador para dar instrucciones específicas
function detectBrowser(): "chrome" | "firefox" | "safari" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("firefox")) return "firefox";
  if (ua.includes("safari") && !ua.includes("chrome")) return "safari";
  if (ua.includes("chrome")) return "chrome";
  return "other";
}

const INSTRUCTIONS = {
  chrome: [
    "Toca el ícono 🔒 o ⓘ en la barra de dirección",
    'Selecciona "Configuración del sitio"',
    'En "Ubicación" selecciona "Permitir"',
    "Recarga la página",
  ],
  firefox: [
    "Toca el ícono 🔒 en la barra de dirección",
    'Toca "Permisos"',
    'En "Acceder a tu ubicación" selecciona "Permitir"',
    "Recarga la página",
  ],
  safari: [
    "Ve a Configuración del iPhone → Safari",
    'Busca "Ubicación" y selecciona "Preguntar" o "Permitir"',
    "Vuelve al navegador y recarga la página",
  ],
  other: [
    "Ve a la configuración de tu navegador",
    "Busca los permisos de este sitio",
    "Habilita el permiso de ubicación",
    "Recarga la página",
  ],
};

interface LocationDeniedMessageProps {
  onClose: () => void;
}

export default function LocationDeniedMessage({
  onClose,
}: LocationDeniedMessageProps) {
  const browser = detectBrowser();
  const steps = INSTRUCTIONS[browser];

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

        <div style={{ fontSize: 32, textAlign: "center", marginBottom: 12 }}>
          📍
        </div>

        <h3
          style={{
            fontSize: 16,
            fontWeight: 600,
            margin: "0 0 8px",
            textAlign: "center",
          }}
        >
          Permiso de ubicación denegado
        </h3>
        <p
          style={{
            fontSize: 13,
            color: "#6b7280",
            margin: "0 0 20px",
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          Bloqueaste el acceso a tu ubicación. Para activarlo de nuevo sigue
          estos pasos:
        </p>

        {/* Pasos */}
        <div
          style={{
            background: "#f9fafb",
            borderRadius: 12,
            padding: "14px 16px",
            marginBottom: 20,
          }}
        >
          {steps.map((step, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                marginBottom: i < steps.length - 1 ? 12 : 0,
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "#111827",
                  color: "white",
                  fontSize: 12,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "#374151",
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {step}
              </p>
            </div>
          ))}
        </div>

        <p
          style={{
            fontSize: 12,
            color: "#9ca3af",
            margin: "0 0 16px",
            textAlign: "center",
          }}
        >
          También puedes usar los filtros de ciudad y estado para buscar
          servicios cerca de ti.
        </p>

        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: "13px 0",
            borderRadius: 12,
            border: "none",
            background: "#111827",
            color: "white",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
