import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

const VALID_CATEGORIES = ["hospital", "pharmacy", "gas", "supermarket"];

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, category, address, city, state, phone, notes, lat, lng } = body;

  if (!name || !category || !address || !city || !state) {
    return NextResponse.json(
      { error: "name, category, address, city and state are required" },
      { status: 400 },
    );
  }

  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "invalid category" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("services")
    .insert({
      name,
      category,
      address,
      city,
      state,
      phone: phone || null,
      notes: notes || null,
      lat: lat ?? null,
      lng: lng ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
