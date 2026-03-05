"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { localizeHref, resolveLanguageFromPathname } from "@/lib/i18n/navigation";

export interface PolicyLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  target?: string;
  rel?: string;
}

/**
 * Locale-aware policy link component.
 * @param props.href Target URL.
 * @param props.children Link text/content.
 * @param props.className Additional CSS classes.
 * @param props.target Optional link target.
 * @param props.rel Optional rel attribute.
 */
export default function PolicyLink({ href, children, className = "", target, rel }: PolicyLinkProps) {
  const pathname = usePathname();
  const language = resolveLanguageFromPathname(pathname);
  const localizedHref = href.startsWith("/") ? localizeHref(href, language) : href;

  return (
    <Link
      href={localizedHref}
      target={target}
      rel={rel}
      className={`text-[#e67e22] hover:text-[#d35400] hover:underline decoration-dashed decoration-1 underline-offset-4 transition-colors ${className}`}
    >
      {children}
    </Link>
  );
}
