"use client";

import { useState, useEffect } from "react";

export interface Coords {
  lat: number;
  lng: number;
}

export type GeoStatus =
  | "idle"
  | "loading"
  | "granted" // ubicación precisa del navegador
  | "denied" // usuario rechazó — usando IP como fallback si hay
  | "fallback" // geolocation falló pero tenemos coords de IP
  | "unavailable"; // geolocation no soportado — usando IP si hay

export type CountryStatus = "checking" | "venezuela" | "outside" | "unknown";

export interface IPInfo {
  country: string;
  city: string | null;
  region: string | null;
  lat: number | null;
  lng: number | null;
}

interface LocationState {
  coords: Coords | null;
  isPrecise: boolean;
  geoStatus: GeoStatus;
  ipInfo: IPInfo | null;
  countryStatus: CountryStatus;
  isVenezuela: boolean;
  isOutside: boolean;
}

export function useLocation() {
  const [state, setState] = useState<LocationState>({
    coords: null,
    isPrecise: false,
    geoStatus: "idle",
    ipInfo: null,
    countryStatus: "checking",
    isVenezuela: true,
    isOutside: false,
  });

  useEffect(() => {
    // Verificar país con Cloudflare header
    fetch("/api/location")
      .then((r) => r.json())
      .then((data) => {
        const isVE = data.country === "VE" || data.country === "unknown";
        setState((prev) => ({
          ...prev,
          countryStatus: data.country === "VE" ? "venezuela" : "outside",
          isVenezuela: isVE,
          isOutside: !isVE,
        }));
      })
      .catch(() => {
        setState((prev) => ({
          ...prev,
          countryStatus: "unknown",
          isVenezuela: true,
        }));
      });

    // Coords de IP — solo para uso interno como fallback
    // No tocar geoStatus aquí — su ciclo de vida es independiente
    fetch("https://ipwho.is/")
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) return;

        const ipInfo: IPInfo = {
          country: "",
          city: data.city ?? null,
          region: data.region ?? null,
          lat: data.latitude ?? null,
          lng: data.longitude ?? null,
        };

        setState((prev) => ({
          ...prev,
          ipInfo,
          ...(prev.geoStatus === "denied" || prev.geoStatus === "unavailable"
            ? {
                coords:
                  ipInfo.lat && ipInfo.lng
                    ? { lat: ipInfo.lat, lng: ipInfo.lng }
                    : prev.coords,
                geoStatus:
                  ipInfo.lat && ipInfo.lng ? "fallback" : prev.geoStatus,
              }
            : {}),
        }));
      })
      .catch(() => {});
  }, []);

  function requestPreciseLocation(): Promise<Coords | null> {
    if (state.geoStatus === "granted" && state.coords && state.isPrecise) {
      return Promise.resolve(state.coords);
    }

    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        // Sin geolocation — usar IP si hay
        setState((prev) => ({
          ...prev,
          geoStatus: prev.ipInfo?.lat ? "fallback" : "unavailable",
          coords:
            prev.ipInfo?.lat && prev.ipInfo?.lng
              ? { lat: prev.ipInfo.lat, lng: prev.ipInfo.lng }
              : prev.coords,
          isPrecise: false,
        }));
        resolve(
          state.ipInfo?.lat && state.ipInfo?.lng
            ? { lat: state.ipInfo.lat, lng: state.ipInfo.lng }
            : null,
        );
        return;
      }

      // Ciclo normal: idle → loading
      setState((prev) => ({ ...prev, geoStatus: "loading" }));

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          // Éxito: loading → granted
          const coords: Coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setState((prev) => ({
            ...prev,
            coords,
            isPrecise: true,
            geoStatus: "granted",
          }));
          resolve(coords);
        },
        (err) => {
          // Fallo: loading → denied/fallback
          const hardFail =
            err.code === err.PERMISSION_DENIED ? "denied" : "unavailable";
          const hasIP = !!(state.ipInfo?.lat && state.ipInfo?.lng);

          setState((prev) => ({
            ...prev,
            // fallback si tenemos IP, sino el error real
            geoStatus: hasIP ? "fallback" : hardFail,
            coords: hasIP
              ? { lat: state.ipInfo!.lat!, lng: state.ipInfo!.lng! }
              : prev.coords,
            isPrecise: false,
          }));

          resolve(
            hasIP ? { lat: state.ipInfo!.lat!, lng: state.ipInfo!.lng! } : null,
          );
        },
        { timeout: 3000, enableHighAccuracy: true },
      );
    });
  }

  function clearPreciseLocation() {
    setState((prev) => ({
      ...prev,
      coords:
        prev.ipInfo?.lat && prev.ipInfo?.lng
          ? { lat: prev.ipInfo.lat, lng: prev.ipInfo.lng }
          : null,
      isPrecise: false,
      // Volver a fallback si tenemos IP, sino idle
      geoStatus: prev.ipInfo?.lat ? "fallback" : "idle",
    }));
  }

  return {
    coords: state.coords,
    isPrecise: state.isPrecise,
    geoStatus: state.geoStatus,
    ipInfo: state.ipInfo,
    countryStatus: state.countryStatus,
    isVenezuela: state.isVenezuela,
    isOutside: state.isOutside,
    requestPreciseLocation,
    clearPreciseLocation,
  };
}
