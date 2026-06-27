import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { service_id, supply_id, status } = await req.json();

  if (!service_id || !supply_id || !status) {
    return NextResponse.json(
      { error: "service_id, supply_id and status are required" },
      { status: 400 },
    );
  }

  if (!["available", "unavailable"].includes(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const { error } = await supabase
    .from("supply_reports")
    .insert({ service_id, supply_id, status, source: "web" });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
