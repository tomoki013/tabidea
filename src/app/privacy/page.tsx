import React from "react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen p-8 sm:p-20 font-(family-name:--font-noto-sans-jp)">
      <main className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">プライバシーポリシー</h1>

        <div className="space-y-8 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              1. はじめに
            </h2>
            <p>
              AIトラベルプランナー（以下、「当サービス」といいます。）は、利用者の皆様（以下、「ユーザー」といいます。）の個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下、「本ポリシー」といいます。）を定めます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              2. 収集する情報
            </h2>
            <p>当サービスは、以下の情報を収集・取得する場合があります。</p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>
                <strong>ユーザー提供情報：</strong> 旅行の目的地、日程、予算、好みなど、サービス利用時に入力された情報。
              </li>
              <li>
                <strong>自動収集情報：</strong> 端末情報、ログ情報、Cookie（クッキー）、IPアドレス、ブラウザの種類、アクセス日時など。
              </li>
              <li>
                <strong>お問い合わせ情報：</strong> ユーザーからのお問い合わせ時に提供された連絡先情報（メールアドレス等）。
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              3. 利用目的
            </h2>
            <p>収集した情報は、以下の目的で利用します。</p>
            <ol className="list-decimal pl-6 mt-3 space-y-2">
              <li>当サービスの提供・運営（AIによる旅行プランの生成を含む）のため</li>
              <li>ユーザーサポート、お問い合わせ対応のため</li>
              <li>当サービスの利用状況の分析、改善、新機能開発のため</li>
              <li>利用規約違反や不正行為の防止・対応のため</li>
              <li>その他、上記利用目的に付随する目的のため</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              4. 第三者提供
            </h2>
            <p>
              当サービスは、以下の場合を除き、ユーザーの同意なく個人情報を第三者に提供することはありません。
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>法令に基づく場合</li>
              <li>人の生命、身体または財産の保護のために必要がある場合</li>
              <li>公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合</li>
              <li>国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              5. 外部サービスの利用
            </h2>
            <p>
              当サービスは、サービスの改善や広告配信のために、Google Analytics等の外部サービスを利用する場合があります。これらのサービスはCookieを使用してトラフィックデータを収集しますが、このデータは匿名で収集されており、個人を特定するものではありません。
            </p>
            <div className="mt-4">
              <h3 className="text-lg font-medium text-foreground mb-2">Google Gemini API</h3>
              <p>
                当サービスは、AIによる旅行プラン生成のためにGoogle Gemini APIを使用しています。
                ユーザーが入力した情報は、Google社のサーバーへ送信され処理されます。
                Google社の規定（Paid Services）により、本サービスを通じて送信されたデータは、AIモデルの学習（トレーニング）には使用されません。
              </p>
              <p className="mt-2">
                ただし、不正利用防止の観点から、Google社において一定期間データが保持される場合があります。
                詳細なデータ取り扱いについては、以下のGoogle社の規約等をご参照ください。
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Google プライバシーポリシー</a>
                </li>
                <li>
                  <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Gemini API 追加利用規約</a>
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              6. 免責事項（AI生成コンテンツについて）
            </h2>
            <p>
              当サービスが提供する旅行プラン、スポット情報、その他のコンテンツは、人工知能（AI）によって生成されています。
              <strong>AIの特性上、生成された情報には誤り、不正確な内容、または最新ではない情報が含まれる可能性があります。</strong>
            </p>
            <p className="mt-2">
              ユーザーは、自己の責任において当サービスを利用するものとし、当サービスは、生成された情報の正確性、完全性、有用性、安全性等について、いかなる保証も行いません。
              実際の旅行計画や予約に際しては、必ず公式情報や一次情報を確認してください。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              7. プライバシーポリシーの変更
            </h2>
            <p>
              当サービスは、必要と判断した場合、本ポリシーを変更することができるものとします。変更後のプライバシーポリシーは、本ページに掲載された時点で効力を生じるものとします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              8. お問い合わせ
            </h2>
            <p>
              本ポリシーに関するお問い合わせは、当サービスの運営者までご連絡ください。
            </p>
          </section>

          <div className="pt-8 border-t mt-12">
            <Link href="/" className="inline-flex items-center text-blue-500 hover:text-blue-700 font-medium transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              ホームに戻る
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
