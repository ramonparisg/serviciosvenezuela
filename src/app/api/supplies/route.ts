import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export const revalidate = 3600; // 1 hora — los supplies cambian poco

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category");

  let query = supabase.from("supplies").select("*").order("name");
  if (category) query = query.eq("category", category);

  const { data, error } = await query;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { name, category } = await req.json();

  if (!name || !category) {
    return NextResponse.json(
      { error: "name and category are required" },
      { status: 400 },
    );
  }

  // Verificar que no exista ya
  const { data: existing } = await supabase
    .from("supplies")
    .select("id")
    .ilike("name", name.trim())
    .eq("category", category)
    .maybeSingle();

  if (existing) return NextResponse.json(existing);

  const { data, error } = await supabase
    .from("supplies")
    .insert({ name: name.trim(), category, is_custom: true })
    .select("id")
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
