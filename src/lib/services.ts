import { supabase } from "./supabase";
import { ServiceWithSupplies, SupplyWithStatus } from "@/types";

export interface ServiceFilters {
  category?: string;
  city?: string;
  supply?: string;
  page?: number;
  pageSize?: number;
}

export async function getServices(filters: ServiceFilters = {}): Promise<{
  services: ServiceWithSupplies[];
  total: number;
  hasMore: boolean;
}> {
  const { category, city, supply, page = 0, pageSize = 20 } = filters;
  const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  // Query 1 — servicios paginados (liviano)
  let servicesQuery = supabase
    .from("services_with_last_report") // ← vista en lugar de tabla
    .select(
      "id, name, category, address, city, state, phone, notes, lat, lng, last_reported_at",
      { count: "exact" },
    )
    .order("last_reported_at", { ascending: false, nullsFirst: false }) // ← últimos reportados primero
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (category) servicesQuery = servicesQuery.eq("category", category);
  if (city) servicesQuery = servicesQuery.ilike("city", `%${city}%`);

  const {
    data: servicesData,
    error: servicesError,
    count,
  } = await servicesQuery;

  if (servicesError || !servicesData?.length) {
    return { services: [], total: count ?? 0, hasMore: false };
  }

  // Query 2 — reportes solo de los servicios traídos (no de todos)
  const serviceIds = servicesData.map((s) => s.id);

  const { data: reportsData } = await supabase
    .from("supply_reports")
    .select(
      "service_id, status, created_at, supply:supplies(id, name, category, is_custom)",
    )
    .in("service_id", serviceIds)
    .gt("created_at", since)
    .order("created_at", { ascending: false });

  // Agrupar reportes por servicio
  const reportsByService = new Map<string, any[]>();
  serviceIds.forEach((id) => reportsByService.set(id, []));
  (reportsData ?? []).forEach((r: any) => {
    if (r.supply) reportsByService.get(r.service_id)?.push(r);
  });

  // Calcular insumos por servicio
  // @ts-ignore
  const services: ServiceWithSupplies[] = servicesData.map((service) => {
    const reports = reportsByService.get(service.id) ?? [];
    const supplyMap = new Map<string, SupplyWithStatus>();

    reports.forEach((r: any) => {
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
      if (!entry.last_reported_at || r.created_at > entry.last_reported_at) {
        entry.last_reported_at = r.created_at;
        entry.latest_status = r.status;
      }
    });

    const supplies = Array.from(supplyMap.values()).sort((a, b) => {
      if (a.latest_status === "available" && b.latest_status !== "available")
        return -1;
      if (b.latest_status === "available" && a.latest_status !== "available")
        return 1;
      return (b.last_reported_at ?? "") > (a.last_reported_at ?? "") ? 1 : -1;
    });

    return { ...service, supplies };
  });

  // Filtrar por insumo si hay búsqueda
  const filtered = supply
    ? services.filter((s) =>
        s.supplies.some((sw) =>
          sw.supply.name.toLowerCase().includes(supply.toLowerCase()),
        ),
      )
    : services;

  return {
    services: filtered,
    total: count ?? 0,
    hasMore: (count ?? 0) > (page + 1) * pageSize,
  };
}
