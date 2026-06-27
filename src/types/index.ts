export type Category = 'hospital' | 'pharmacy' | 'gas' | 'water' | 'supermarket'

export interface Service {
    id: string
    name: string
    category: Category
    address: string
    city: string
    state: string
    phone: string | null
    notes: string | null
    lat: number
    lng: number
    created_at: string
    // Calculados desde la query
    active_reports: number
    inactive_reports: number
    total_reports: number
}

export interface Report {
    id: string
    service_id: string
    status: 'active' | 'inactive'
    note: string | null
    source: string
    created_at: string
}
