"use client";

import { useState, useEffect } from "react";

type LocationStatus = "checking" | "venezuela" | "outside" | "unknown";

export function useLocationCheck() {
  const [status, setStatus] = useState<LocationStatus>("checking");

  useEffect(() => {
    fetch("/api/location")
      .then((r) => r.json())
      .then((data) => {
        setStatus(
          data.country === "VE" || data.country === "unknown"
            ? "venezuela"
            : "outside",
        );
      })
      .catch(() => setStatus("unknown"));
  }, []);

  return status;
}
