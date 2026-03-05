import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import TravelInfoClient from "./TravelInfoClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.info.travelInfo.meta");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function TravelInfoPage() {
  return <TravelInfoClient />;
}
