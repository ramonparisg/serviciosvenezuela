import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mapa de Insumos - Venezuela",
  description: "Directorio de servicios activos en Venezuela",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body
        style={{ margin: 0, padding: 0, fontFamily: "system-ui, sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
