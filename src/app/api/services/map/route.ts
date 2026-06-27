import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const revalidate = 300; // 5 minutos

export async function GET() {
  const { data, error } = await supabase
    .from("services")
    .select("id, name, category, lat, lng")
    .not("lat", "is", null)
    .not("lng", "is", null)
    .eq("enabled", true);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
