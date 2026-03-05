"use client";

import { Component, type ReactNode } from "react";
import { createTranslator } from "next-intl";
import type { LanguageCode } from "@/lib/i18n/locales";
import { DEFAULT_LANGUAGE, getLanguageFromPathname } from "@/lib/i18n/locales";
import enMessages from "@/messages/en/components/extra-ui.json";
import jaMessages from "@/messages/ja/components/extra-ui.json";

interface MapErrorBoundaryProps {
  children: ReactNode;
  className?: string;
  fallback?: ReactNode;
}

interface MapErrorBoundaryState {
  hasError: boolean;
}

const EXTRA_UI_MESSAGES = {
  en: enMessages,
  ja: jaMessages,
} as const;

function resolveLocale(pathname?: string): LanguageCode {
  if (!pathname) {
    return DEFAULT_LANGUAGE;
  }

  return getLanguageFromPathname(pathname) ?? DEFAULT_LANGUAGE;
}

export default class MapErrorBoundary extends Component<
  MapErrorBoundaryProps,
  MapErrorBoundaryState
> {
  constructor(props: MapErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): MapErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn("[MapErrorBoundary] Google Maps failed to load:", error.message);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const locale = resolveLocale(
        typeof window !== "undefined" ? window.location.pathname : undefined
      );
      const t = createTranslator({
        locale,
        messages: EXTRA_UI_MESSAGES[locale],
        namespace: "components.extraUi.mapErrorBoundary",
      });

      return (
        <div
          className={`bg-stone-100 rounded-xl flex items-center justify-center text-stone-500 ${this.props.className || ""}`}
          style={{ minHeight: "200px" }}
        >
          <div className="text-center p-4">
            <p className="text-sm font-medium">{t("failedToLoadMap")}</p>
            <p className="text-xs mt-1 text-stone-400">
              {t("checkGoogleMapsApiSettings")}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
