import { useState } from "react";

export type GeocodeStatus =
  | "idle"
  | "loading"
  | "found"
  | "not_found"
  | "error";

export interface GeocodeResult {
  lat: number;
  lng: number;
  display_name: string;
}

export function useGeocode() {
  const [status, setStatus] = useState<GeocodeStatus>("idle");
  const [result, setResult] = useState<GeocodeResult | null>(null);

  async function geocode(address: string, city: string) {
    setStatus("loading");
    setResult(null);

    try {
      const res = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, city }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setStatus("error");
        return;
      }
      if (!data.found) {
        setStatus("not_found");
        return;
      }

      setResult(data);
      setStatus("found");
    } catch {
      setStatus("error");
    }
  }

  function reset() {
    setStatus("idle");
    setResult(null);
  }

  function setManualResult(lat: number, lng: number, display_name: string) {
    setResult({ lat, lng, display_name });
    setStatus("found");
  }

  return { status, result, geocode, reset, setManualResult };
}
