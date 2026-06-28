"use client";

import { useState, useEffect } from "react";

export interface Coords {
  lat: number;
  lng: number;
}

export type GeoStatus =
  | "idle"
  | "loading"
  | "granted"
  | "denied"
  | "fallback"
  | "unavailable";

export type CountryStatus = "checking" | "venezuela" | "outside" | "unknown";

export interface IPInfo {
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
  ready: boolean; // true cuando ipwho respondió (con o sin éxito)
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
    ready: false,
  });

  useEffect(() => {
    // País desde Cloudflare — independiente del resto
    fetch("/api/location")
      .then((r) => r.json())
      .then((data) => {
        const isVE = data.country === "VE" || data.country === "unknown";
        setState((prev) => ({
          ...prev,
          countryStatus:
            data.country === "VE"
              ? "venezuela"
              : data.country === "unknown"
                ? "unknown"
                : "outside",
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

    // IP primero — al terminar (éxito o fallo) pedimos geolocation
    fetch("https://ipwho.is/")
      .then((r) => r.json())
      .then((data) => {
        const ipInfo: IPInfo | null = data.success
          ? {
              city: data.city ?? null,
              region: data.region ?? null,
              lat: data.latitude ?? null,
              lng: data.longitude ?? null,
            }
          : null;

        setState((prev) => ({ ...prev, ipInfo, ready: true }));
        requestGeolocation(ipInfo);
      })
      .catch(() => {
        // ipwho falló — marcar ready igual y pedir geolocation sin fallback de IP
        setState((prev) => ({ ...prev, ready: true }));
        requestGeolocation(null);
      });
  }, []);

  // Separada del estado para evitar closures viejos
  function requestGeolocation(ipInfo: IPInfo | null) {
    const ipCoords =
      ipInfo?.lat && ipInfo?.lng ? { lat: ipInfo.lat, lng: ipInfo.lng } : null;

    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        geoStatus: ipCoords ? "fallback" : "unavailable",
        coords: ipCoords,
        isPrecise: false,
      }));
      return;
    }

    navigator.permissions.query({ name: "geolocation" }).then((permission) => {
      if (permission.state === "denied") {
        setState((prev) => ({
          ...prev,
          geoStatus: ipCoords ? "fallback" : "denied",
          coords: ipCoords,
          isPrecise: false,
        }));
        return;
      }

      setState((prev) => ({ ...prev, geoStatus: "loading" }));

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setState((prev) => ({
            ...prev,
            coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
            isPrecise: true,
            geoStatus: "granted",
          }));
        },
        () => {
          setState((prev) => ({
            ...prev,
            geoStatus: ipCoords ? "fallback" : "denied",
            coords: ipCoords ?? prev.coords,
            isPrecise: false,
          }));
        },
        { timeout: 5000, enableHighAccuracy: false },
      );
    });
  }

  // Expuesta para el botón "afinar ubicación" si lo necesitas después
  async function requestPreciseLocation(): Promise<Coords | null> {
    if (state.geoStatus === "granted" && state.coords && state.isPrecise) {
      return state.coords;
    }

    const ipCoords =
      state.ipInfo?.lat && state.ipInfo?.lng
        ? { lat: state.ipInfo.lat, lng: state.ipInfo.lng }
        : null;

    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        geoStatus: ipCoords ? "fallback" : "unavailable",
        coords: ipCoords ?? prev.coords,
        isPrecise: false,
      }));
      return ipCoords;
    }

    const permission = await navigator.permissions.query({
      name: "geolocation",
    });

    if (permission.state === "denied") {
      setState((prev) => ({
        ...prev,
        geoStatus: ipCoords ? "fallback" : "denied",
        coords: ipCoords ?? prev.coords,
        isPrecise: false,
      }));
      return ipCoords;
    }

    return new Promise((resolve) => {
      setState((prev) => ({ ...prev, geoStatus: "loading" }));

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
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
        () => {
          setState((prev) => ({
            ...prev,
            geoStatus: ipCoords ? "fallback" : "denied",
            coords: ipCoords ?? prev.coords,
            isPrecise: false,
          }));
          resolve(ipCoords);
        },
        { timeout: 5000, enableHighAccuracy: false },
      );
    });
  }

  function clearPreciseLocation() {
    const ipCoords =
      state.ipInfo?.lat && state.ipInfo?.lng
        ? { lat: state.ipInfo.lat, lng: state.ipInfo.lng }
        : null;

    setState((prev) => ({
      ...prev,
      coords: ipCoords,
      isPrecise: false,
      geoStatus: ipCoords ? "fallback" : "idle",
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
    ready: state.ready,
    requestPreciseLocation,
    clearPreciseLocation,
  };
}
