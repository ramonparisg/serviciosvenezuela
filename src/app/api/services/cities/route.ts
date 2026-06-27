import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const revalidate = 3600; // 1 hora

export async function GET() {
  const { data, error } = await supabase
    .from("unique_cities_and_states")
    .select("city, state");

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
