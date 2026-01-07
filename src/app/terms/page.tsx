import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "利用規約",
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen p-8 sm:p-20 font-(family-name:--font-noto-sans-jp)">
      <main className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">利用規約</h1>

        <div className="space-y-8 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              1. はじめに
            </h2>
            <p>
              この利用規約（以下、「本規約」といいます。）は、Tabidea（以下、「当サービス」といいます。）の利用条件を定めるものです。
              本サービスを利用する全ての皆様（以下、「ユーザー」といいます。）には、本規約に同意した上でご利用いただきます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              2. サービスの目的と性質
            </h2>
            <p>
              当サービスは、人工知能（AI）技術を用いて旅行プランの提案を行うサービスです。
              <strong>
                当サービスは情報の提供のみを目的としており、旅行の手配（予約、契約等）を代行するものではありません。
              </strong>
              また、AIが生成する情報は、統計的なデータや学習データに基づいた推測であり、現実の状況と異なる場合があります。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              3. AIの利用について
            </h2>
            <p>
              当サービスは、Google LLCが提供する「Gemini API」を利用して旅行プランを生成しています。
              AIの利用に関する詳細、データの取り扱い、および生成されるコンテンツの性質については、別途定める
              <a href="/ai-policy" className="text-blue-500 hover:underline">
                AIポリシー
              </a>
              をご確認ください。ユーザーは、本規約に加え、AIポリシーにも同意したものとみなされます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              4. 禁止事項
            </h2>
            <p>
              ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>法令または公序良俗に違反する行為</li>
              <li>犯罪行為に関連する行為</li>
              <li>
                当サービスのサーバーまたはネットワークの機能を破壊したり、妨害したりする行為
              </li>
              <li>当サービスの運営を妨害するおそれのある行為</li>
              <li>他のユーザーに関する個人情報等を収集または蓄積する行為</li>
              <li>不正アクセスをし、またはこれを試みる行為</li>
              <li>他のユーザーに成りすます行為</li>
              <li>
                当サービスのサービスに関連して、反社会的勢力に対して直接または間接に利益を供与する行為
              </li>
              <li>その他、運営者が不適切と判断する行為</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              5. 免責事項（重要）
            </h2>
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <p className="font-bold mb-2">
                以下の事項について、当サービスは一切の責任を負いません。
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>AI生成情報の正確性：</strong>{" "}
                  AIが提案する情報の正確性、完全性、最新性、有用性については保証いたしません。詳細は
                  <a href="/ai-policy" className="text-blue-500 hover:underline">
                    AIポリシー
                  </a>
                  をご参照ください。
                </li>
                <li>
                  <strong>損害の発生：</strong>{" "}
                  当サービスの利用に起因してユーザーに生じたあらゆる損害（旅行中のトラブル、事故、予約の不成立、費用の増加等を含みますがこれらに限りません）。
                </li>
                <li>
                  <strong>サービスの中断・停止：</strong>{" "}
                  システムの保守、障害、天災等によるサービスの停止によって生じた損害。
                </li>
                <li>
                  <strong>第三者とのトラブル：</strong>{" "}
                  本サービスの利用を通じてユーザーと第三者との間に生じた紛争。
                </li>
              </ul>
            </div>
            <p className="mt-4">
              ユーザーは、当サービスが提案する情報を参考情報として利用し、実際の行動においては、自己の責任において判断し、必要に応じて公式サイト等の一次情報を確認するものとします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              6. 知的財産権
            </h2>
            <p>
              当サービスに含まれる文章、画像、プログラム、その他一切のコンテンツに関する知的財産権は、運営者または正当な権利者に帰属します。
              ユーザーは、これらを無断で複製、転載、改変、その他の二次利用をすることはできません。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              7. サービス内容の変更等
            </h2>
            <p>
              運営者は、ユーザーに通知することなく、当サービスの内容を変更し、または当サービスの提供を中止することができるものとし、これによってユーザーに生じた損害について一切の責任を負いません。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              8. 利用規約の変更
            </h2>
            <p>
              運営者は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。
              本規約の変更後、当サービスの利用を開始した場合には、当該ユーザーは変更後の規約に同意したものとみなします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              9. 準拠法・裁判管轄
            </h2>
            <p>
              本規約の解釈にあたっては、日本法を準拠法とします。
              本サービスに関して紛争が生じた場合には、東京地方裁判所を専属的合意管轄裁判所とします。
            </p>
          </section>

          <div className="text-right text-sm text-muted-foreground mt-12">
            最終更新日: 2025年12月25日
          </div>
        </div>
      </main>
    </div>
  );
}
