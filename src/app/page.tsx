import { getServices } from "@/lib/services";
import HomeView from "@/components/HomeView";

export const revalidate = 60;

export default async function Home() {
  const services = await getServices();
  return <HomeView initialServices={services} />;
}
