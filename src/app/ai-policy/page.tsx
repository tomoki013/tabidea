import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AIポリシー",
};

export default function AiPolicy() {
  return (
    <div className="min-h-screen p-8 sm:p-20 font-(family-name:--font-noto-sans-jp)">
      <main className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">AIポリシー</h1>

        <div className="space-y-8 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              1. はじめに
            </h2>
            <p>
              Tabidea（以下、「当サービス」といいます。）は、旅行プランの提案等の機能において、最先端の人工知能（AI）技術を活用しています。
              本AIポリシー（以下、「本ポリシー」といいます。）は、当サービスにおけるAIの利用、データ取扱い、およびAIが生成するコンテンツの性質について詳細に定めるものです。
              ユーザーは、当サービスの利用にあたり、<Link href="/terms" className="text-blue-500 hover:underline">利用規約</Link>および<Link href="/privacy" className="text-blue-500 hover:underline">プライバシーポリシー</Link>に加え、本ポリシーの内容を理解し、同意したものとみなされます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              2. 使用しているAI技術
            </h2>
            <p>
              当サービスでは、Google LLC（以下「Google社」）が提供する生成AIモデル「Gemini API」を使用しています。
              ユーザーが入力した条件（目的地、予算、テーマ等）は、このAIモデルによって処理され、旅行プランが生成されます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              3. データの利用と学習について
            </h2>
            <p>
              当サービスは、ユーザーの皆様に安心してご利用いただくため、情報の取り扱いについて厳重な注意を払っています。
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>
                <strong>AI学習への利用禁止：</strong>{" "}
                当サービスに入力されたデータ（プロンプト）および生成されたコンテンツは、Google社の「Gemini API 追加利用規約（Paid Services）」に基づき、Google社のAIモデルの学習（トレーニング）には使用されません。
              </li>
              <li>
                <strong>一時的なデータ保持：</strong>{" "}
                不正利用の検知（abuse monitoring）および法令順守の目的において、Google社により一定期間、入力データおよび出力データがログとして保持される場合があります。これらのデータは、当該目的以外には使用されません。
              </li>
            </ul>
            <p className="mt-2">
              詳細については、以下のGoogle社の規約をご確認ください。
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
               <li>
                <a
                  href="https://ai.google.dev/gemini-api/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  Gemini API 追加利用規約
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              4. AI生成情報の正確性と免責事項
            </h2>
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-100 dark:border-orange-800">
              <p className="font-bold mb-2 text-orange-800 dark:text-orange-200">
                AIの特性上、以下の点にご注意ください。
              </p>
              <ul className="list-disc pl-6 space-y-2 text-orange-900 dark:text-orange-100">
                <li>
                  <strong>情報の不正確性（ハルシネーション）：</strong>{" "}
                  AIは、もっともらしいが事実と異なる情報（存在しない観光地、誤った営業時間、架空の交通手段など）を生成する可能性があります。
                </li>
                <li>
                  <strong>情報の陳腐化：</strong>{" "}
                  AIの学習データには期間的な制限がある場合があり、最新の状況（施設の閉業、価格改定、ダイヤ改正など）が反映されていない可能性があります。
                </li>
                <li>
                  <strong>バイアス：</strong>{" "}
                  AIの学習データに含まれるバイアスにより、生成されるプランに偏りが生じる場合があります。
                </li>
              </ul>
            </div>
            <p className="mt-4">
              当サービスおよび運営者は、AIが生成した情報の正確性、完全性、有用性、安全性等について、いかなる保証も行いません。
              当該情報の利用に起因してユーザーに生じた損害について、一切の責任を負いかねます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              5. ユーザーの責任
            </h2>
            <p>
              当サービスが提案する旅行プランは、あくまで「アイデアの提案」です。
              実際の旅行計画、予約、および行動においては、以下の対応をお願いいたします。
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>
                <strong>一次情報の確認：</strong>{" "}
                公式ウェブサイト、ガイドブック、交通機関の案内等で、必ず最新かつ正確な情報を確認してください。
              </li>
              <li>
                <strong>自己判断：</strong>{" "}
                提案されたプランを実行するか否かは、ユーザー自身の責任において判断してください。
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              6. 禁止事項
            </h2>
            <p>
              AI機能の利用において、以下の行為を禁止します。
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>法令に違反する内容の生成を試みること</li>
              <li>他者の権利を侵害する内容、暴力的・差別的・性的な内容の生成を試みること</li>
              <li>AIに対して、意図的に過度な負荷をかける行為</li>
              <li>その他、Google社の生成AI禁止利用ポリシー（Prohibited Use Policy）に抵触する行為</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              7. ポリシーの変更
            </h2>
            <p>
              運営者は、AI技術の発展やサービスの変更に合わせて、本ポリシーを随時改定することがあります。
              重要な変更がある場合は、当サービス上でお知らせします。
            </p>
          </section>

          <div className="text-right text-sm text-muted-foreground mt-12">
            制定日: 2025年2月18日
          </div>
        </div>
      </main>
    </div>
  );
}
