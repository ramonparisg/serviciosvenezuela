import { NextRequest, NextResponse } from "next/server";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, category, address, city, notes } = body;

  if (!name || !city) {
    return NextResponse.json(
      { error: "name and city are required" },
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
      subject: `[Servicios VE] Local faltante: ${name} en ${city}`,
      text: `
Nuevo local sugerido:

Nombre: ${name}
Categoría: ${category || "No especificada"}
Ciudad: ${city}
Dirección: ${address || "No especificada"}
Notas: ${notes || "Ninguna"}
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
