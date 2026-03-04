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
 * ポリシーリンクコンポーネント
 * @param props.href - リンク先URL
 * @param props.children - リンクテキスト
 * @param props.className - 追加のCSSクラス
 * @param props.target - リンクターゲット
 * @param props.rel - rel属性
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
