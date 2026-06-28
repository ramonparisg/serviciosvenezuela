import { NextRequest } from "next/server";

export function isFromVenezuela(req: NextRequest): boolean {
  // Cloudflare agrega este header automáticamente
  const country = req.headers.get("CF-IPCountry");

  // En desarrollo local no existe el header — permitir
  if (!country || country === "XX") return true;

  return country === "VE";
}

export function getCountry(req: NextRequest): string {
  return req.headers.get("CF-IPCountry") ?? "unknown";
}
