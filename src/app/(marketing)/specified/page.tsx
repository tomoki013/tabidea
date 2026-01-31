import type { Metadata } from "next";
import PolicyLink from "@/components/ui/PolicyLink";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記",
};

export default function SpecifiedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-[#fcfbf9] pt-32 pb-20 px-4">
      <main className="max-w-4xl mx-auto bg-white p-6 sm:p-12 rounded-3xl border-2 border-dashed border-stone-200 shadow-sm">
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#2c2c2c] mb-12 text-center">
          特定商取引法に基づく表記
        </h1>

        <div className="space-y-6 text-stone-600 leading-relaxed font-sans">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <tbody>
                <TableRow label="販売事業者名" value="Tabidea（タビデア）" />
                <TableRow label="代表者" value="tomokichi" />
                <TableRow
                  label="所在地"
                  value="請求があった場合には遅滞なく開示いたします。"
                />
                <TableRow
                  label="電話番号"
                  value="請求があった場合には遅滞なく開示いたします。"
                />
                <TableRow
                  label="メールアドレス"
                  value={
                    <span>
                      お問い合わせフォーム（
                      <PolicyLink href="/contact">こちら</PolicyLink>
                      ）よりご連絡ください
                    </span>
                  }
                />
                <TableRow
                  label="販売URL"
                  value="https://tabidea.vercel.app/pricing"
                />
                <TableRow
                  label="販売価格"
                  value={
                    <ul className="list-disc list-inside space-y-1">
                      <li>Proプラン（月額）：1,500円（税込）</li>
                      <li>回数券（1回）：300円（税込）</li>
                      <li>回数券（5回）：1,200円（税込）</li>
                      <li>回数券（10回）：2,000円（税込）</li>
                    </ul>
                  }
                />
                <TableRow
                  label="商品代金以外の必要料金"
                  value="なし（インターネット接続料金はお客様のご負担となります）"
                />
                <TableRow
                  label="お支払い方法"
                  value="クレジットカード（Visa, Mastercard, American Express, JCB）"
                />
                <TableRow
                  label="お支払い時期"
                  value="サブスクリプション：お申し込み時に初回課金、以降毎月同日に自動課金。回数券：ご注文時に即時決済。"
                />
                <TableRow
                  label="商品の引き渡し時期"
                  value="決済完了後、即時にサービスをご利用いただけます。"
                />
                <TableRow
                  label="返品・キャンセルについて"
                  value={
                    <div className="space-y-2">
                      <p>
                        <strong>サブスクリプション：</strong>
                        いつでも解約可能です。解約後も現在の請求期間終了までサービスをご利用いただけます。購入後7日以内で、サービスを利用されていない場合に限り、返金に対応いたします。
                      </p>
                      <p>
                        <strong>回数券：</strong>
                        デジタルコンテンツの性質上、購入後の返品・返金は原則としてお受けしておりません。
                      </p>
                    </div>
                  }
                />
                <TableRow
                  label="動作環境"
                  value="インターネット接続環境が必要です。推奨ブラウザ：Google Chrome、Safari、Microsoft Edgeの最新版"
                />
                <TableRow
                  label="サービス提供条件"
                  value={
                    <span>
                      <PolicyLink href="/terms">利用規約</PolicyLink>
                      および
                      <PolicyLink href="/privacy">
                        プライバシーポリシー
                      </PolicyLink>
                      に同意いただく必要があります。
                    </span>
                  }
                />
              </tbody>
            </table>
          </div>

          <div className="text-right text-sm text-stone-500 mt-12 font-serif">
            制定日：2026年1月31日
          </div>
        </div>
      </main>
    </div>
  );
}

function TableRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <tr className="border-b border-stone-200/60 last:border-0">
      <th className="py-4 px-4 text-left font-serif font-bold text-[#2c2c2c] bg-stone-50/50 w-1/3 align-top whitespace-nowrap sm:whitespace-normal">
        {label}
      </th>
      <td className="py-4 px-4 text-stone-600">{value}</td>
    </tr>
  );
}
