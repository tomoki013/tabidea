import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PlanClient from "./PlanClient";

export const maxDuration = 120;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.planner.plan.meta");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function PlanPage() {
  return <PlanClient />;
}
