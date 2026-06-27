import { categoryConfig } from "./category-config";

export function createIcon(L: typeof import("leaflet"), category: string) {
  const config = categoryConfig[category as keyof typeof categoryConfig];

  return L.divIcon({
    className: "",
    html: `
      <div style="
        background: ${config.color};
        width: 32px; height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex; align-items: center; justify-content: center;
      ">
        <span style="transform: rotate(45deg); font-size: 14px;">
          ${config.emoji}
        </span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}
