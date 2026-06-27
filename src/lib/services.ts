import { supabase } from "./supabase";
import { Service } from "@/types";

export async function getServices(): Promise<Service[]> {
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("services")
    .select(
      `
      *,
      reports!left(status, created_at)
    `,
    )
    .not("lat", "is", null)
    .not("lng", "is", null)
    .order("name");

  if (error) {
    console.error("Error fetching services:", error);
    return [];
  }

  // Calcular conteos en JS — más claro y fácil de cambiar

  return (data ?? []).map((service) => {
    const recentReports = (service.reports ?? []).filter(
      (r: any) => r.created_at > sixHoursAgo,
    );

    return {
      ...service,
      active_reports: recentReports.filter((r: any) => r.status === "active")
        .length,
      inactive_reports: recentReports.filter(
        (r: any) => r.status === "inactive",
      ).length,
      total_reports: recentReports.length,
      reports: undefined, // limpiar antes de pasar al componente
    };
  });
}
