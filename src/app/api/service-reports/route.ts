import { NextRequest, NextResponse } from "next/server";
import { isFromVenezuela } from "@/lib/geo";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL;

const REASONS: Record<string, string> = {
  outdated: "Información desactualizada (horario, teléfono, dirección)",
  closed: "Local cerrado permanentemente",
  wrong_location: "Ubicación incorrecta en el mapa",
  duplicate: "Local duplicado",
  other: "Otro motivo",
};

export async function POST(req: NextRequest) {
  const { service_id, service_name, reason, notes } = await req.json();

  if (!isFromVenezuela(req)) {
    return NextResponse.json({ error: "outside_venezuela" }, { status: 403 });
  }

  if (!service_id || !reason) {
    return NextResponse.json(
      { error: "service_id and reason are required" },
      { status: 400 },
    );
  }

  if (!RESEND_API_KEY || !NOTIFY_EMAIL) {
    return NextResponse.json(
      { error: "Email not configured" },
      { status: 500 },
    );
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "onboarding@resend.dev",
      to: NOTIFY_EMAIL,
      subject: `[Servicios VE] Problema reportado: ${service_name}`,
      text: `
Local reportado:

ID:     ${service_id}
Nombre: ${service_name}
Motivo: ${REASONS[reason] ?? reason}
Notas:  ${notes || "Sin notas adicionales"}

Puedes buscarlo en Supabase con:
SELECT * FROM services WHERE id = '${service_id}';
      `.trim(),
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    console.error("Resend error:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
