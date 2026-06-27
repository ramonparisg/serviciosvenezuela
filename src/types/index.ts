export type Category = "hospital" | "pharmacy" | "gas" | "supermarket";
export type SupplyStatus = "available" | "unavailable";

export interface Service {
  id: string;
  name: string;
  category: Category;
  address: string;
  city: string;
  state: string;
  phone: string | null;
  notes: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
}

export interface Supply {
  id: string;
  name: string;
  category: Category;
  is_custom: boolean;
}

export interface SupplyReport {
  id: string;
  service_id: string;
  supply_id: string;
  status: SupplyStatus;
  created_at: string;
}

// Supply con su reporte más reciente para un local
export interface SupplyWithStatus {
  supply: Supply;
  latest_status: SupplyStatus | null;
  report_count: number; // reportes en las últimas 6h
  available_count: number;
  last_reported_at: string | null;
}

// Servicio con sus insumos para el listado
export interface ServiceWithSupplies extends Service {
  supplies: SupplyWithStatus[];
}

export interface MissingServiceRequest {
  name: string;
  category?: string;
  address?: string;
  city?: string;
  notes?: string;
}
