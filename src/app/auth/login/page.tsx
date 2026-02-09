import type { Metadata } from 'next';
import LoginClient from './LoginClient';

export const metadata: Metadata = {
  title: 'ログイン',
  description: 'Tabideaにログインして、保存したプランにアクセスしたり、新しい旅を作成しましょう。',
};

export default function LoginPage() {
  return <LoginClient />;
}
