import { supabase } from "./supabase";
import { ServiceWithSupplies, SupplyWithStatus } from "@/types";

export interface ServiceFilters {
  category?: string;
  city?: string;
  supply?: string; // nombre del insumo buscado
}

export async function getServices(
  filters: ServiceFilters = {},
): Promise<ServiceWithSupplies[]> {
  const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(); // 3 días

  let query = supabase
    .from("services")
    .select(
      `
      *,
      supply_reports!left(
        id, status, created_at,
        supply:supplies(id, name, category, is_custom)
      )
    `,
    )
    .order("name");

  if (filters.category) query = query.eq("category", filters.category);
  if (filters.city) query = query.ilike("city", `%${filters.city}%`);

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching services:", error);
    return [];
  }

  // Procesar insumos por servicio
  const services: ServiceWithSupplies[] = (data ?? []).map((service) => {
    const recentReports = (service.supply_reports ?? []).filter(
      (r: any) => r.created_at > since && r.supply,
    );

    // Agrupar por insumo
    const supplyMap = new Map<string, SupplyWithStatus>();

    recentReports.forEach((r: any) => {
      const supplyId = r.supply.id;
      if (!supplyMap.has(supplyId)) {
        supplyMap.set(supplyId, {
          supply: r.supply,
          latest_status: null,
          report_count: 0,
          available_count: 0,
          last_reported_at: null,
        });
      }
      const entry = supplyMap.get(supplyId)!;
      entry.report_count++;
      if (r.status === "available") entry.available_count++;

      // Mantener el más reciente
      if (!entry.last_reported_at || r.created_at > entry.last_reported_at) {
        entry.last_reported_at = r.created_at;
        entry.latest_status = r.status;
      }
    });

    // Ordenar: disponibles primero, luego por más reciente
    const supplies = Array.from(supplyMap.values()).sort((a, b) => {
      if (a.latest_status === "available" && b.latest_status !== "available")
        return -1;
      if (b.latest_status === "available" && a.latest_status !== "available")
        return 1;
      return (b.last_reported_at ?? "") > (a.last_reported_at ?? "") ? 1 : -1;
    });

    return {
      ...service,
      supply_reports: undefined,
      supplies,
    };
  });

  // Si hay búsqueda por insumo, filtrar y reordenar
  if (filters.supply) {
    const term = filters.supply.toLowerCase();
    return services
      .filter((s) =>
        s.supplies.some((sw) => sw.supply.name.toLowerCase().includes(term)),
      )
      .sort((a, b) => {
        const aHas = a.supplies.filter(
          (sw) =>
            sw.supply.name.toLowerCase().includes(term) &&
            sw.latest_status === "available",
        ).length;
        const bHas = b.supplies.filter(
          (sw) =>
            sw.supply.name.toLowerCase().includes(term) &&
            sw.latest_status === "available",
        ).length;
        return bHas - aHas;
      });
  }

  return services;
}

export async function getSuppliesByCategory(category: string) {
  const { data, error } = await supabase
    .from("supplies")
    .select("*")
    .eq("category", category)
    .order("name");

  if (error) return [];
  return data;
}
