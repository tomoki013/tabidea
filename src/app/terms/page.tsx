import React from "react";
import Link from "next/link";

export default function TermsOfService() {
  return (
    <div className="min-h-screen p-8 sm:p-20 font-(family-name:--font-noto-sans-jp)">
      <main className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">利用規約</h1>

        <div className="space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              1. 総則
            </h2>
            <p>
              本利用規約（以下、「本規約」）は、AIトラベルプランナー（以下、「当アプリ」）の利用条件を定めるものです。利用者は、本規約に同意した上で当アプリを利用するものとします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              2. 禁止事項
            </h2>
            <p>
              利用者は、当アプリの利用にあたり、以下の行為をしてはなりません。
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>法令または公序良俗に違反する行為</li>
              <li>当アプリの運営を妨害する行為</li>
              <li>AI生成コンテンツを不適切に利用する行為</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              3. 免責事項
            </h2>
            <p>
              当アプリが提供する旅行プランや情報は、AIによって生成されたものであり、その正確性や信頼性を完全に保証するものではありません。
              施設の営業時間、料金、アクセス情報などは変更されている可能性があります。実際の旅行の際は、必ず公式サイト等で最新情報をご確認ください。
              当アプリの利用によって生じた損害について、運営者は一切の責任を負いません。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              4. 規約の変更
            </h2>
            <p>
              運営者は、必要と判断した場合、利用者に通知することなく本規約を変更することができるものとします。
            </p>
          </section>

          <div className="pt-8 border-t">
            <Link href="/" className="text-blue-500 hover:underline">
              ← ホームに戻る
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
