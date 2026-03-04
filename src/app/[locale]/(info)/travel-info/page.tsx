import { Metadata } from "next";
import { getRequestLanguage } from "@/lib/i18n/server";
import TravelInfoClient from "./TravelInfoClient";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getRequestLanguage();
  return language === "ja"
    ? {
        title: "渡航情報・安全ガイド",
        description: "世界各国のビザ、電源、チップ、治安情報を一括チェック。",
      }
    : {
        title: "Travel Info & Safety Guide",
        description: "Check visas, power plugs, tipping and safety information for destinations worldwide.",
      };
}

export default function TravelInfoPage() {
  return <TravelInfoClient />;
}
