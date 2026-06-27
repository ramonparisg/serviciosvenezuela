import { SupplyWithStatus } from "@/types";

export function computeSupplies(reports: any[]): SupplyWithStatus[] {
  const supplyMap = new Map<string, SupplyWithStatus>();

  reports.forEach((r: any) => {
    if (!r.supply) return;
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

  return Array.from(supplyMap.values()).sort((a, b) => {
    if (a.latest_status === "available" && b.latest_status !== "available")
      return -1;
    if (b.latest_status === "available" && a.latest_status !== "available")
      return 1;
    return (b.last_reported_at ?? "") > (a.last_reported_at ?? "") ? 1 : -1;
  });
}
