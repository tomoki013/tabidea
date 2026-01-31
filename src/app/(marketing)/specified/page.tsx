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
                <TableRow label="事業者" value="Tabidea" />
                <TableRow
                  label="事業者の所在"
                  value="請求があった場合には遅滞なく開示いたします。"
                />
                <TableRow label="運営責任者" value="髙木　友喜" />
                <TableRow
                  label="お問合せ先"
                  value={
                    <div className="space-y-1">
                      <p>gaomuyouxi@gmail.com</p>
                      <p>
                        <PolicyLink href="/contact">
                          お問い合わせページへのリンク
                        </PolicyLink>
                      </p>
                    </div>
                  }
                />
                <TableRow
                  label="販売価格と手数料"
                  value={
                    <div className="space-y-2">
                      <p>
                        販売ページおよび購入手続きの画面において、消費税・手数料を含む価格で表示されています。
                      </p>
                      <p>
                        本サービスの利用に必要となるインターネット通信料金はお客様のご負担となります。
                      </p>
                      <p>
                        デジタルコンテンツ（役務）のため送料や返品送料は発生しません。
                      </p>
                    </div>
                  }
                />
                <TableRow
                  label="提供時期"
                  value="お支払いが確認でき次第、すぐに利用できるようになります。"
                />
                <TableRow
                  label="お支払方法"
                  value="クレジットカード、またはその他当社が定める方法（Apple Pay、Google Pay、Stripe Link）によりお支払いいただきます"
                />
                <TableRow
                  label="お支払時期"
                  value={
                    <div className="space-y-2">
                      <p>
                        利用料金のお支払いは利用期間ごとの前払いとし、お支払時期は初回を有料サービス登録時、以降は1ヶ月または1年ごとの同日となります（翌月または翌年に同日がない場合は、その月の末日となります）。
                      </p>
                      <p>
                        クレジットカード会社からお客様への請求時期は、お客様とクレジットカード会社との間の契約に基づきます。
                      </p>
                    </div>
                  }
                />
                <TableRow
                  label="返品・キャンセル・解約について"
                  value={
                    <div className="space-y-2">
                      <p>
                        デジタルサービスという性質上、お客様都合による返金・キャンセルはお受けしておりません。
                      </p>
                      <p>
                        弊社の責による長期システム停止等、当社利用規約で定める場合に限り、未提供日数を日割り計算の上で返金いたします。
                      </p>
                      <p>
                        次回更新日の24時間前までに解約いただけます。解約後も当該請求期間の終了日まではサービスをご利用いただけます。
                      </p>
                    </div>
                  }
                />
                <TableRow
                  label="推奨するご利用環境"
                  value={
                    <div className="space-y-2">
                      <p>以下の環境でのご利用を推奨します。</p>
                      <p>
                        お支払い前にあらかじめご利用環境での動作をご確認ください。
                      </p>
                      <div className="mt-2">
                        <p className="font-semibold">Web版（ブラウザ）</p>
                        <ul className="list-disc list-inside ml-1 space-y-1">
                          <li>macOSの場合、ChromeまたはSafariの最新版</li>
                          <li>Windowsの場合、EdgeまたはChromeの最新版</li>
                          <li>iOSの場合、Safariの最新版</li>
                          <li>Androidの場合、Chromeの最新版</li>
                        </ul>
                      </div>
                    </div>
                  }
                />
              </tbody>
            </table>
          </div>

          <div className="text-right text-sm text-stone-500 mt-12 font-serif">
            最終更新日：2026年2月1日
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
