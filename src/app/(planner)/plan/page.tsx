import { Metadata } from "next";
import PlanClient from "./PlanClient";

export const maxDuration = 120;

export const metadata: Metadata = {
  title: "旅行プラン結果",
  description: "AIが生成したあなただけの旅行プラン結果です。",
};

export default function PlanPage() {
  return <PlanClient />;
}
