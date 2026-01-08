import type { Metadata } from "next";
import PolicyLink from "@/components/ui/PolicyLink";

export const metadata: Metadata = {
  title: "クッキーポリシー",
};

export default function CookiePolicy() {
  return (
    <div className="min-h-screen p-8 sm:p-20 font-(family-name:--font-noto-sans-jp)">
      <main className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">クッキーポリシー</h1>

        <div className="space-y-8 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              1. クッキー（Cookie）とは
            </h2>
            <p>
              クッキー（Cookie）とは、ウェブサイトを閲覧した際に、お客様のコンピュータやスマートフォンなどの端末に保存される小さなテキストファイルのことです。
              これを利用することで、お客様が再度ウェブサイトを訪れた際に、より便利に利用していただいたり、ウェブサイトの利用状況を分析してサービスの改善に役立てたりすることができます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              2. クッキーの利用目的
            </h2>
            <p>当サービスでは、以下の目的でクッキーを使用しています。</p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>
                <strong>サービスの利便性向上：</strong>{" "}
                お客様の設定内容（言語設定や入力内容の一時保存など）を記憶し、再度入力する手間を省くため。
              </li>
              <li>
                <strong>アクセス解析：</strong>{" "}
                Google Analyticsなどの分析ツールを使用し、サイトの訪問数や閲覧ページなどの利用状況を把握し、サービスの改善に役立てるため。
              </li>
              <li>
                <strong>広告配信：</strong>{" "}
                お客様の興味・関心に合わせた適切な広告を配信するため（第三者配信事業者による広告配信を含む場合があります）。
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              3. Google Analyticsの利用について
            </h2>
            <p>
              当サービスでは、Googleによるアクセス解析ツール「Google Analytics」を使用しています。
              このGoogle Analyticsはデータの収集のためにクッキーを使用しています。このデータは匿名で収集されており、個人を特定するものではありません。
            </p>
            <p className="mt-2">
              Google Analyticsにより収集されたデータは、Google社のプライバシーポリシーに基づいて管理されます。
              詳細は以下のページをご覧ください。
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>
                <a
                  href="https://policies.google.com/technologies/partner-sites?hl=ja"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  Googleのサービスを使用するサイトやアプリから収集した情報のGoogleによる使用
                </a>
              </li>
              <li>
                <a
                  href="https://policies.google.com/privacy?hl=ja"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  Google プライバシーポリシー
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              4. クッキーの無効化（オプトアウト）について
            </h2>
            <p>
              お客様は、ブラウザの設定を変更することにより、クッキーの受け入れを拒否（無効化）することができます。
              ただし、クッキーを無効にした場合、当サービスの一部機能が正常に動作しなくなる可能性がありますので、あらかじめご了承ください。
            </p>

            <h3 className="text-lg font-medium text-foreground mt-6 mb-2">
              ブラウザの設定変更方法
            </h3>
            <p>主要なブラウザの設定方法は以下の各社サポートページをご確認ください。</p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>
                <a href="https://support.google.com/chrome/answer/95647?hl=ja" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Google Chrome</a>
              </li>
              <li>
                <a href="https://support.apple.com/ja-jp/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Apple Safari (Mac)</a> / <a href="https://support.apple.com/ja-jp/HT201265" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">iPhone・iPad</a>
              </li>
              <li>
                <a href="https://support.mozilla.org/ja/kb/enhanced-tracking-protection-firefox-desktop" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Mozilla Firefox</a>
              </li>
              <li>
                <a href="https://support.microsoft.com/ja-jp/microsoft-edge/microsoft-edge-%E3%81%A7-cookie-%E3%82%92%E5%89%8A%E9%99%A4%E3%81%99%E3%82%8B-63947406-40ac-c2b9-25b4-935471955f0e" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Microsoft Edge</a>
              </li>
            </ul>

             <h3 className="text-lg font-medium text-foreground mt-6 mb-2">
              Google Analyticsのオプトアウト
            </h3>
            <p>
              Google Analyticsによるデータ収集のみを無効にしたい場合は、Google社が提供する「Google Analyticsオプトアウトアドオン」をご利用ください。
            </p>
             <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>
                <a href="https://tools.google.com/dlpage/gaoptout?hl=ja" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Google Analytics オプトアウト アドオン</a>
              </li>
             </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              5. お問い合わせ
            </h2>
            <p>
              本クッキーポリシーに関するお問い合わせは、<PolicyLink href="/contact">お問い合わせフォーム</PolicyLink>よりお願いいたします。
            </p>
          </section>

          <div className="text-right text-sm text-muted-foreground mt-12">
            最終更新日: 2026年1月8日
          </div>
        </div>
      </main>
    </div>
  );
}
