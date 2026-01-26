import type { Metadata } from "next";
import PolicyLink from "@/components/ui/PolicyLink";
import HighlightBox from "@/components/ui/HighlightBox";

export const metadata: Metadata = {
  title: "利用規約",
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen pt-32 pb-20 px-4 sm:px-20 font-(family-name:--font-noto-sans-jp)">
      <main className="max-w-4xl mx-auto bg-white p-6 sm:p-12 rounded-2xl shadow-sm border border-stone-100">
        <h1 className="text-3xl font-bold mb-8">利用規約</h1>

        <div className="space-y-8 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              1. はじめに
            </h2>
            <p>
              この利用規約（以下、「本規約」といいます。）は、Tabidea（以下、「当サービス」といいます。）の提供するアプリケーションおよび関連サービスの利用条件を定めるものです。
              本サービスを利用する全ての皆様（以下、「ユーザー」といいます。）には、本規約に同意した上でご利用いただきます。
              本規約に同意いただけない場合、本サービスの利用はできません。
            </p>
            <p className="mt-2">
              また、当サービスの利用にあたっては、別途定める
              <PolicyLink href="/privacy">プライバシーポリシー</PolicyLink>、
              <PolicyLink href="/cookie-policy">クッキーポリシー</PolicyLink>
              、および
              <PolicyLink href="/ai-policy">AIポリシー</PolicyLink>
              （以下、これらを総称して「本規約等」といいます。）も適用されます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              2. サービスの目的と性質
            </h2>
            <p>
              当サービスは、人工知能（AI）技術を用いて旅行プランの提案、情報の検索、および整理を行うサービスです。
            </p>
            <HighlightBox variant="info" title="【重要事項】" className="mt-3">
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>情報の提供のみを目的としています：</strong>
                  当サービスは旅行代理店ではありません。旅行の手配（航空券、宿泊施設、ツアー、交通機関等の予約・契約等）は行いません。
                </li>
                <li>
                  <strong>AIによる生成情報の性質：</strong>
                  提示される旅行プランや情報は、AIが統計データや学習に基づいて生成した推測情報であり、その正確性、完全性、実現可能性を保証するものではありません。
                </li>
              </ul>
            </HighlightBox>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              3. 知的財産権
            </h2>
            <p>
              当サービスに含まれる文章、画像、プログラム、コード、デザイン、その他一切のコンテンツ（以下、「本コンテンツ」といいます。）に関する著作権、商標権、特許権、その他の知的財産権は、当サービスまたは当サービスにライセンスを許諾している正当な権利者に帰属します。
            </p>
            <p className="mt-2">
              ユーザーは、当サービスの事前の書面による承諾なく、本コンテンツを複製、転載、改変、配布、公衆送信、その他の二次利用をすることはできません。ただし、当サービスが明示的に許可している機能（SNSシェア機能等）を利用する場合を除きます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              4. ユーザー登録（アカウント）
            </h2>
            <p>
              ユーザーは、当サービスの定める方法（Googleログイン等）により、アカウント登録を行うことができます。
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>
                <strong>アカウントの管理：</strong>
                ユーザーは、自身のGoogleアカウントおよびログイン情報を自己の責任において管理するものとします。当サービスは、登録されたアカウントを用いて行われた一切の行為を、当該ユーザー本人による行為とみなします。
              </li>
              <li>
                <strong>アカウントの譲渡禁止：</strong>
                ユーザーは、アカウントを第三者に譲渡、貸与、または共有することはできません。
              </li>
              <li>
                <strong>登録抹消：</strong>
                ユーザーが本規約に違反した場合、または長期間利用がない場合、当サービスは事前の通知なく当該ユーザーのアカウントを停止または削除することができるものとします。
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              5. 禁止事項
            </h2>
            <p>
              ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>
                法令または公序良俗に違反する行為、またはそのおそれのある行為
              </li>
              <li>犯罪行為に関連する行為</li>
              <li>
                当サービスのサーバーまたはネットワークの機能を破壊したり、妨害したりする行為（DoS攻撃、過度なアクセス等）
              </li>
              <li>
                当サービスのシステム等に不正にアクセスし、またはこれを試みる行為
              </li>
              <li>他のユーザーに関する個人情報等を収集または蓄積する行為</li>
              <li>他のユーザーのIDまたはパスワードを不正に使用する行為</li>
              <li>他のユーザーに成りすます行為</li>
              <li>
                当サービスのサービスに関連して、反社会的勢力に対して直接または間接に利益を供与する行為
              </li>
              <li>
                当サービスが許諾しない方法で、本サービス上の情報を商業的に利用する行為
              </li>
              <li>
                スクレイピング、クローリング、その他の自動化された手段を用いて本サービスの情報にアクセスする行為
              </li>
              <li>その他、当サービスが不適切と判断する行為</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              6. 免責事項（重要）
            </h2>
            <p className="mb-4">
              当サービスは、ユーザーに対し、本サービスの信頼性、正確性、適法性、有用性、第三者の権利侵害の有無等について、明示的にも黙示的にも一切保証しません。
            </p>
            <HighlightBox
              variant="danger"
              title="以下の事項について、当サービスは一切の責任を負いません。"
            >
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>AI生成情報の誤り：</strong>
                  AIが提案するプランの実現可能性（営業時間、料金、移動時間、施設の存続等を含む）については、必ず公式サイト等の一次情報をご自身でご確認ください。
                </li>
                <li>
                  <strong>旅行中のトラブル：</strong>
                  当サービスの情報を利用した結果生じた、事故、怪我、病気、盗難、紛失、予約の不成立、費用の増加、その他の損害。
                </li>
                <li>
                  <strong>リンク先での取引：</strong>
                  当サービスからリンクされている外部サイト（予約サイト、アフィリエイト先等）における商品購入やサービス利用に関するトラブル。これらはユーザーと当該外部サイト運営者との間で解決するものとします。
                </li>
                <li>
                  <strong>システム障害・データ消失：</strong>
                  通信回線の障害、システムメンテナンス、サイバー攻撃等によるサービスの停止・中断・遅延・データ消失によってユーザーに生じた損害。なお、ログインユーザーの保存データについても、バックアップの完全性を保証するものではありません。
                </li>
              </ul>
            </HighlightBox>
            <p className="mt-4">
              いかなる場合であっても、当サービスがユーザーに対して負う損害賠償責任は、当サービスの故意または重過失による場合を除き、免責されるものとします。また、責任を負う場合であっても、通常生ずべき直接かつ現実の損害に限られるものとします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              7. アフィリエイト・広告について
            </h2>
            <p>
              当サービスには、アフィリエイトリンクや広告が含まれる場合があります。これらのリンクを経由して商品やサービスを購入された場合、当サービスは一定の報酬を得ることがあります。ただし、紹介される商品やサービスはアフィリエイトパートナーにより提供されるものであり、当サービスが管理・販売するものではありません。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              8. サービス内容の変更等
            </h2>
            <p>
              当サービスは、ユーザーに通知することなく、当サービスの内容を変更し、または当サービスの提供を中止することができるものとし、これによってユーザーに生じた損害について一切の責任を負いません。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              9. 利用規約の変更
            </h2>
            <p>
              当サービスは、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。変更後の利用規約は、本サービス上に掲示された時点で効力を生じるものとします。本規約の変更後、当サービスの利用を開始した場合には、当該ユーザーは変更後の規約に同意したものとみなします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              10. 準拠法・裁判管轄
            </h2>
            <p>
              本規約の解釈にあたっては、日本法を準拠法とします。
              本サービスに関して紛争が生じた場合には、当サービスの運営拠点を管轄する地方裁判所（東京地方裁判所）を専属的合意管轄裁判所とします。
            </p>
          </section>

          <div className="text-right text-sm text-muted-foreground mt-12">
            策定日：2024年12月23日
            <br />
            最終更新日：2026年1月27日
          </div>
        </div>
      </main>
    </div>
  );
}
