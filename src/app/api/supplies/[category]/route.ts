import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export const revalidate = 3600; // 1 hora — los supplies cambian poco

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ category: string }> },
) {
  const { category } = await params;

  const { data, error } = await supabase
    .from("supplies")
    .select("id, name, category, is_custom")
    .eq("category", category)
    .order("name");

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
