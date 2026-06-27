import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { service_id, status, note } = body;

  if (!service_id || !status) {
    return NextResponse.json(
      { error: "service_id and status are required" },
      { status: 400 },
    );
  }

  if (!["active", "inactive"].includes(status)) {
    return NextResponse.json(
      { error: "status must be active or inactive" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("reports")
    .insert({ service_id, status, note: note ?? null, source: "web" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
