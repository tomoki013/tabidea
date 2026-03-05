import type { Metadata } from 'next';
import { getTranslations } from "next-intl/server";
import LoginClient from './LoginClient';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.auth.login.meta");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function LoginPage() {
  return <LoginClient />;
}
