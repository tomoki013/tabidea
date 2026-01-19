import type { Metadata } from "next";
import PolicyLink from "@/components/ui/PolicyLink";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen p-4 sm:p-20 font-(family-name:--font-noto-sans-jp)">
      <main className="max-w-4xl mx-auto bg-white p-6 sm:p-12 rounded-2xl shadow-sm border border-stone-100">
        <h1 className="text-3xl font-bold mb-8">プライバシーポリシー</h1>

        <div className="space-y-8 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              1. はじめに
            </h2>
            <p>
              Tabidea（以下、「当サービス」といいます。）は、当サービスが提供するアプリケーション（以下、「本アプリ」といいます。）および関連サービスにおける、ユーザーの個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下、「本ポリシー」といいます。）を定めます。
              当サービスは、個人情報保護の重要性を認識し、個人情報の保護に関する法律（以下、「個人情報保護法」といいます。）等の遵守徹底に努めます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              2. 収集する情報
            </h2>
            <p>
              当サービスは、サービスの提供にあたり、以下の情報を取得する場合があります。
            </p>
            <div className="mt-3 space-y-4">
              <div>
                <h3 className="font-medium text-foreground">
                  2-1. ユーザーから直接提供される情報
                </h3>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>
                    旅行計画に関する情報（目的地、日程、予算、同行者、興味・関心、その他要望等）
                  </li>
                  <li>
                    お問い合わせ時に提供される連絡先情報（メールアドレス、氏名等）
                  </li>
                  <li>
                    フィードバックやアンケート回答等の任意で提供される情報
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-foreground">
                  2-2. サービス利用時に自動的に収集される情報
                </h3>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>端末情報（デバイスの種類、OSのバージョン、機種等）</li>
                  <li>
                    ログ情報（アクセス日時、IPアドレス、ブラウザの種類、リファラ情報等）
                  </li>
                  <li>Cookie（クッキー）および類似技術を用いた識別子</li>
                  <li>位置情報（ユーザーが許可した場合に限る）</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              3. 利用目的
            </h2>
            <p>当サービスは、収集した情報を以下の目的で利用します。</p>
            <ol className="list-decimal pl-6 mt-3 space-y-2">
              <li>
                <strong>サービスの提供・運営：</strong>
                AIによる旅行プランの生成、提案、保存、共有機能の提供のため。
              </li>
              <li>
                <strong>サービスの改善・開発：</strong>
                利用状況の分析、AIモデルの精度向上、新機能の企画・開発のため。
              </li>
              <li>
                <strong>ユーザーサポート：</strong>
                お問い合わせへの対応、不具合の調査・修正のため。
              </li>
              <li>
                <strong>安全管理：</strong>
                不正アクセス、スパム行為、利用規約違反の防止および対応のため。
              </li>
              <li>
                <strong>マーケティング：</strong>
                当サービスまたは第三者の広告配信、キャンペーン情報の提供、利用状況に基づく最適な情報の提案のため。
              </li>
              <li>
                <strong>その他：</strong>
                上記各目的に付随する業務のため。
              </li>
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
              <li>
                人の生命、身体または財産の保護のために必要がある場合であって、本人の同意を得ることが困難である場合
              </li>
              <li>
                公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合であって、本人の同意を得ることが困難である場合
              </li>
              <li>
                国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合であって、本人の同意を得ることにより当該事務の遂行に支障を及ぼすおそれがある場合
              </li>
              <li>
                <strong>合併等の場合：</strong>
                合併、会社分割、事業譲渡その他の事由による事業の承継に伴って個人情報が提供される場合
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              5. 外部委託および外部サービスの利用
            </h2>
            <p>
              当サービスは、利用目的の達成に必要な範囲内において、個人情報の取扱いの全部または一部を外部に委託する場合や、外部サービスを利用する場合があります。
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <h3 className="font-medium text-foreground">
                  5-1. AIサービスプロバイダー
                </h3>
                <p className="mt-1">
                  旅行プランの生成には、Google
                  LLCが提供する生成AIサービス（Gemini
                  API）等を利用しています。ユーザーが入力した情報は、当該サービスのプライバシーポリシーに従って処理されるほか、AIの学習には利用されない設定（オプトアウト等）で利用することを原則としますが、提供元の方針により変更が生じる可能性があります。詳細は
                  <PolicyLink href="/ai-policy">AIポリシー</PolicyLink>
                  をご確認ください。
                </p>
              </div>
              <div>
                <h3 className="font-medium text-foreground">
                  5-2. アクセス解析ツール
                </h3>
                <p className="mt-1">
                  当サービスでは、Google
                  Analyticsを利用しています。これらはCookie等を用いてトラフィックデータを収集しますが、個人を特定する情報は含まれません。収集されたデータはGoogle社のプライバシーポリシーに基づいて管理されます。
                </p>
              </div>
              <div>
                <h3 className="font-medium text-foreground">
                  5-3. アフィリエイトプログラム
                </h3>
                <p className="mt-1">
                  当サービスは、Amazonアソシエイト・プログラム、楽天アフィリエイトなどのアフィリエイトプログラムに参加しています。これらのリンクを通じて購入等が行われた場合、第三者がCookie等を使用して情報を収集する可能性があります。
                </p>
              </div>
            </div>
            <p className="mt-4">
              クッキー（Cookie）の利用目的や無効化（オプトアウト）等の詳細については、別途定める
              <PolicyLink href="/cookie-policy">クッキーポリシー</PolicyLink>
              をご確認ください。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              6. 個人情報の管理
            </h2>
            <p>
              当サービスは、個人情報の漏洩、滅失または毀損の防止その他の個人情報の安全管理のために必要かつ適切な措置を講じます。また、個人情報を取り扱う従業員や委託先（もしあれば）に対して、必要かつ適切な監督を行います。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              7. ユーザーの権利（開示・訂正・利用停止等）
            </h2>
            <p>
              ユーザーは、当サービスが保有する自身の個人情報について、開示、訂正、追加、削除、利用停止、消去（以下、「開示等」といいます。）を請求することができます。当サービスは、ユーザー本人からの請求であることを確認した上で、法令の定めに従い遅滞なく対応いたします。ただし、個人情報保護法その他の法令により、当サービスが開示等の義務を負わない場合はこの限りではありません。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              8. 通信の秘密
            </h2>
            <p>
              当サービスは、電気通信事業法に基づき、ユーザーの通信の秘密を守ります。ただし、法令の定めに基づく強制処分が行われた場合や、正当防衛、緊急避難に該当する場合には、この限りではありません。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              9. プライバシーポリシーの変更
            </h2>
            <p>
              当サービスは、必要と判断した場合、本ポリシーを変更することができるものとします。本ポリシーを変更する場合、変更後の本ポリシーの施行時期および内容を当サービス上の適切な場所に掲示することにより周知します。変更後のプライバシーポリシーは、掲示された時点で効力を生じるものとします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              10. お問い合わせ窓口
            </h2>
            <p>
              本ポリシーに関するご質問、ご意見、個人情報の開示等のご請求は、当サービスのお問い合わせページまたは指定の連絡先までご連絡ください。
            </p>
          </section>

          <div className="text-right text-sm text-muted-foreground mt-12">
            策定日：2024年12月23日
            <br />
            最終更新日：2026年1月9日
          </div>
        </div>
      </main>
    </div>
  );
}
