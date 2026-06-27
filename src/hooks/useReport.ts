import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

export function useReport() {
  const [status, setStatus] = useState<Status>("idle");

  async function submitReport(
    service_id: string,
    reportStatus: "active" | "inactive",
    note?: string,
  ) {
    setStatus("loading");

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service_id, status: reportStatus, note }),
      });

      if (!res.ok) throw new Error();
      setStatus("success");
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  return { status, submitReport };
}
