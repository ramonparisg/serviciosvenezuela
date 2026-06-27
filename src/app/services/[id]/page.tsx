import { supabase } from "@/lib/supabase";
import ServiceDetail from "@/components/ServiceDetail";
import { notFound } from "next/navigation";

export const revalidate = 60;

export default async function ServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: service } = await supabase
    .from("services")
    .select("*")
    .eq("id", id)
    .single();

  if (!service) notFound();

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: reports } = await supabase
    .from("supply_reports")
    .select("*, supply:supplies(id, name, category, is_custom)")
    .eq("service_id", id)
    .gt("created_at", since)
    .order("created_at", { ascending: false });

  return <ServiceDetail service={service} reports={reports ?? []} />;
}
