import { supabase } from "@/lib/supabase";
import HomeView from "@/components/HomeView";
import { computeSupplies } from "@/lib/compute-supplies";

export const revalidate = 300; // 5 minutos

export default async function Home() {
  const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  // Solo los primeros 20, ordenados por más reportados
  const { data: servicesData, count } = await supabase
    .from("services_with_last_report")
    .select(
      "id, name, category, address, city, state, phone, notes, lat, lng, last_reported_at",
      { count: "exact" },
    )
    .order("last_reported_at", { ascending: false, nullsFirst: false })
    .range(0, 19);

  const serviceIds = (servicesData ?? []).map((s) => s.id);

  const { data: reportsData } = serviceIds.length
    ? await supabase
        .from("supply_reports")
        .select(
          "service_id, status, created_at, supply:supplies(id, name, category, is_custom)",
        )
        .in("service_id", serviceIds)
        .gt("created_at", since)
        .order("created_at", { ascending: false })
    : { data: [] };

  const reportsByService = new Map<string, any[]>();
  serviceIds.forEach((id) => reportsByService.set(id, []));
  (reportsData ?? []).forEach((r: any) => {
    if (r.supply) reportsByService.get(r.service_id)?.push(r);
  });

  const services = (servicesData ?? []).map((service) => ({
    ...service,
    supplies: computeSupplies(reportsByService.get(service.id) ?? []),
  }));

  return (
    <HomeView
      // @ts-ignore
      initialServices={services}
      initialTotal={count ?? 0}
      initialHasMore={(count ?? 0) > 20}
    />
  );
}
