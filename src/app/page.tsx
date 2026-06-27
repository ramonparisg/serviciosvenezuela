import { getServices } from "@/lib/services";
import MapView from "@/components/MapView";

export const revalidate = 60;

export default async function Home() {
  const services = await getServices();
  return <MapView services={services} />;
}
