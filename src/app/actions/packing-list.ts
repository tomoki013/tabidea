"use server";

import { generateObject } from "ai";
import { createTranslator } from "next-intl";
import { z } from "zod";
import { resolveModel } from '@/lib/services/ai/model-provider';
import type { PackingList } from "@/types/packing-list";
import type { LanguageCode } from "@/lib/i18n/locales";
import enMessages from "@/messages/en/actions/packing-list.json";
import jaMessages from "@/messages/ja/actions/packing-list.json";

const PACKING_LIST_MESSAGES = {
  en: enMessages,
  ja: jaMessages,
} as const;

type PackingListLocale = keyof typeof PACKING_LIST_MESSAGES;

function resolvePackingListLocale(locale?: string): PackingListLocale {
  return locale === "en" ? "en" : "ja";
}

function createPackingListTranslator(locale: PackingListLocale) {
  return createTranslator({
    locale: locale as LanguageCode,
    messages: PACKING_LIST_MESSAGES[locale],
    namespace: "actions.packingList",
  });
}

// ============================================
// Schema
// ============================================

function createPackingListSchema(t: ReturnType<typeof createPackingListTranslator>) {
  const PackingItemSchema = z.object({
    id: z.string().describe(t("schema.idDescription")),
    name: z.string().describe(t("schema.nameDescription")),
    category: z.enum([
      "documents",
      "clothing",
      "electronics",
      "toiletries",
      "medicine",
      "theme",
      "other",
    ]).describe(t("schema.categoryDescription")),
    quantity: z.number().optional().describe(t("schema.quantityDescription")),
    note: z.string().optional().describe(t("schema.noteDescription")),
    priority: z
      .enum(["essential", "recommended", "optional"])
      .describe(t("schema.priorityDescription")),
  });

  return z.object({
    items: z.array(PackingItemSchema).min(1).describe(t("schema.itemsDescription")),
  });
}

// ============================================
// Types
// ============================================

export interface GeneratePackingListParams {
  destination: string;
  days: number;
  themes: string[];
  companions: string;
  budget: string;
  region: string;
  locale?: string;
}

export interface PackingListResult {
  success: boolean;
  data?: PackingList;
  error?: string;
  modelName?: string;
}

// ============================================
// Action
// ============================================

export async function generatePackingList(
  params: GeneratePackingListParams
): Promise<PackingListResult> {
  const locale = resolvePackingListLocale(params.locale);
  const t = createPackingListTranslator(locale);

  // Pro entitlement check
  try {
    const { checkBillingAccess } = await import("@/lib/billing/billing-checker");
    const { canAccess } = await import("@/lib/billing/plan-catalog");
    const billing = await checkBillingAccess();
    if (!canAccess(billing.userType, "packing_list")) {
      return { success: false, error: "pro_required" };
    }
  } catch {
    // If billing check fails, allow generation (graceful degradation)
  }

  try {
    const { model, modelName } = resolveModel('packing', { structuredOutputs: true });
    const schema = createPackingListSchema(t);

    const isOverseas = params.region !== "domestic";
    const passportRequirement = isOverseas
      ? t("prompt.passportRequired")
      : t("prompt.passportNotRequired");
    const overseasAdapterNote = isOverseas ? t("prompt.adapterNote") : "";
    const prompt = [
      t("prompt.role"),
      "",
      t("prompt.travelConditionsTitle"),
      t("prompt.destination", { destination: params.destination }),
      t("prompt.days", { days: params.days }),
      t("prompt.themes", { themes: params.themes.join(", ") }),
      t("prompt.companions", { companions: params.companions }),
      t("prompt.budget", { budget: params.budget }),
      isOverseas ? t("prompt.tripType.overseas") : t("prompt.tripType.domestic"),
      "",
      t("prompt.rulesTitle"),
      t("prompt.rules.rule1"),
      t("prompt.rules.rule2", { passportRequirement }),
      t("prompt.rules.rule3", { days: params.days }),
      t("prompt.rules.rule4", { overseasAdapterNote }),
      t("prompt.rules.rule5"),
      t("prompt.rules.rule6"),
      t("prompt.rules.rule7"),
      t("prompt.rules.rule8"),
      "",
      t("prompt.rules.rule9Title"),
      t("prompt.rules.rule9Essential"),
      t("prompt.rules.rule9Recommended"),
      t("prompt.rules.rule9Optional"),
      "",
      t("prompt.rules.rule10"),
      t("prompt.rules.rule11"),
      t("prompt.rules.rule12"),
    ].join("\n");

    const { object } = await generateObject({
      model,
      schema,
      prompt,
      temperature: 0.5,
    });

    return {
      success: true,
      data: {
        items: object.items as PackingList["items"],
        generatedAt: new Date().toISOString(),
        basedOn: {
          destination: params.destination,
          days: params.days,
          themes: params.themes,
        },
      },
      modelName,
    };
  } catch (error) {
    console.error("[packing-list] Generation failed:", error);
    return {
      success: false,
      error: "packing_list_generation_failed",
    };
  }
}
