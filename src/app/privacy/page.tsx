import React from "react";
import Link from "next/link";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen p-8 sm:p-20 font-[family-name:var(--font-noto-sans-jp)]">
      <main className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">プライバシーポリシー</h1>
        
        <div className="space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. はじめに</h2>
            <p>
              本プライバシーポリシーは、AIトラベルプランナー（以下、「当アプリ」）における利用者情報の取り扱いについて定めたものです。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. 収集する情報</h2>
            <p>
              当アプリは、サービスの提供にあたり、以下の情報を収集する場合があります。
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>入力された旅行の好みや条件</li>
              <li>ログデータ（IPアドレス、ブラウザの種類など）</li>
              <li>Cookieおよび類似の技術を使用した利用状況データ</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. 情報の利用目的</h2>
            <p>
              収集した情報は、以下の目的で利用します。
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>旅行プランの生成および提案のため</li>
              <li>サービスの改善および新機能の開発のため</li>
              <li>利用規約違反の防止および対応のため</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. 第三者への提供</h2>
            <p>
              当アプリは、法令に基づく場合を除き、利用者の同意なく個人情報を第三者に提供することはありません。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. お問い合わせ</h2>
            <p>
              本ポリシーに関するお問い合わせは、運営者までご連絡ください。
            </p>
          </section>
          
          <div className="pt-8 border-t">
            <Link href="/" className="text-blue-500 hover:underline">← ホームに戻る</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
