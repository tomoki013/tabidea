import type { Metadata } from 'next';
import LoginClient from './LoginClient';
import { getRequestLanguage } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const language = await getRequestLanguage();
  return language === "ja"
    ? {
        title: 'ログイン',
        description: 'Tabideaにログインして、保存したプランにアクセスしたり、新しい旅を作成しましょう。',
      }
    : {
        title: 'Log in',
        description: 'Log in to Tabidea to access saved plans and create your next trip.',
      };
}

export default function LoginPage() {
  return <LoginClient />;
}
