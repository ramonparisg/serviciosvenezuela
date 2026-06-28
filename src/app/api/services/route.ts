import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { computeSupplies } from "@/lib/compute-supplies";

const VALID_CATEGORIES = ["hospital", "pharmacy", "gas", "supermarket"];

const PAGE_SIZE = 20;
const SINCE_DAYS = 3;

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const category = params.get("category") || undefined;
  const city = params.get("city") || undefined;
  const supply = params.get("supply") || undefined;
  const page = parseInt(params.get("page") ?? "0");
  const name = params.get("name") || undefined;
  const address = params.get("address") || undefined;
  const recentOnly = params.get("recentOnly") === "true";
  const lat = params.get("lat") ? parseFloat(params.get("lat")!) : undefined;
  const lng = params.get("lng") ? parseFloat(params.get("lng")!) : undefined;

  const since = new Date(
    Date.now() - SINCE_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  try {
    let serviceRows: any[];
    let total: number;

    // ── Con búsqueda de insumo → función SQL ────────────────────────────
    if (supply) {
      const { data, error } = await supabase.rpc("search_by_supply", {
        supply_term: supply,
        category_filter: category ?? null,
        city_filter: city ?? null,
        page_num: page,
        page_size: PAGE_SIZE,
      });

      if (error) throw error;
      serviceRows = data ?? [];
      total = serviceRows[0]?.total_count
        ? Number(serviceRows[0].total_count)
        : 0;

      // ── Sin búsqueda de insumo → query paginada normal ──────────────────
    } else {
      let query: any;

      // Inicialización condicional de la Query básica y su ordenamiento
      if (lat && lng) {
        // Si hay coordenadas, llamamos al RPC y ordenamos por la columna virtual 'distance'
        query = supabase
          .rpc(
            "get_services_with_distance",
            { user_lat: lat, user_lng: lng },
            { count: "exact" },
          )
          .select(
            "id, name, category, address, city, state, phone, notes, lat, lng, last_reported_at, distance",
          )
          .order("distance", { ascending: true });
      } else {
        // Si no hay coordenadas, consultamos la vista estándar ordenada por tiempo
        query = supabase
          .from("services_with_last_report")
          .select(
            "id, name, category, address, city, state, phone, notes, lat, lng, last_reported_at",
            { count: "exact" },
          )
          .order("last_reported_at", { ascending: false, nullsFirst: false });
      }

      // Aplicamos la paginación
      query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      // Filtros acumulativos idénticos para ambos casos
      if (category) query = query.eq("category", category);
      if (city) query = query.ilike("city", `%${city}%`);
      if (name) query = query.ilike("name", `%${name}%`);
      if (address) query = query.ilike("address", `%${address}%`);
      if (recentOnly) query = query.not("last_reported_at", "is", null);

      const { data, error, count } = await query;
      if (error) throw error;

      serviceRows = data ?? [];
      total = count ?? 0;
    }

    if (!serviceRows.length) {
      return NextResponse.json({ services: [], total, hasMore: false });
    }

    // Traer reportes solo de estos servicios
    const serviceIds = serviceRows.map((s) => s.id);

    const { data: reportsData, error: reportsError } = await supabase
      .from("supply_reports")
      .select(
        "service_id, status, created_at, supply:supplies(id, name, category, is_custom)",
      )
      .in("service_id", serviceIds)
      .gt("created_at", since)
      .order("created_at", { ascending: false });

    if (reportsError) throw reportsError;

    // Agrupar reportes por servicio
    const reportsByService = new Map<string, any[]>();
    serviceIds.forEach((id) => reportsByService.set(id, []));
    (reportsData ?? []).forEach((r: any) => {
      if (r.supply) reportsByService.get(r.service_id)?.push(r);
    });

    const services = serviceRows.map((service) => ({
      ...service,
      supplies: computeSupplies(reportsByService.get(service.id) ?? []),
    }));

    return NextResponse.json({
      services,
      total,
      hasMore: total > (page + 1) * PAGE_SIZE,
    });
  } catch (error: any) {
    console.error("Error fetching services:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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
