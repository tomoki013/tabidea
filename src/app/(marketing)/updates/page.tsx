import type { Metadata } from "next";
import { FaFlag, FaCheck, FaTools } from "react-icons/fa";

export const metadata: Metadata = {
  title: "更新情報・ロードマップ",
  description: "Tabideaの更新情報と今後の開発ロードマップを掲載しています。",
};

type UpdateType = "release" | "pre_release" | "patch" | "minor" | "major";

type RoadmapItem = {
  status: "done" | "planned" | "developing";
  date?: string; // For done items
  updateType?: UpdateType;
  title: string;
  description: string;
};

// Chronological order (Oldest -> Newest)
// This enables dynamic version calculation from a base of 0.0.0
const rawRoadmapData: RoadmapItem[] = [
  {
    status: "done",
    date: "2025.12.13",
    updateType: "pre_release",
    title: "α版サービス公開",
    description:
      "Tabideaのα版を公開しました。Gemini AIを活用した旅行プラン生成が可能です。",
  },
  {
    status: "done",
    date: "2025.12.23",
    updateType: "pre_release",
    title: "β版サービス公開",
    description:
      "UIとUXの修正、および本格的なサービス開始に伴うページ整理を行いました。",
  },
  {
    status: "done",
    date: "2025.01.08",
    updateType: "patch",
    title: "よくある質問および機能紹介・使い方ページを設置",
    description:
      "よくある質問ページと使い方ページを設置し、多くの人が利用しやすいサービスとするための改修を行いました。",
  },
  {
    status: "done",
    date: "2026.01.09",
    updateType: "patch",
    title: "プラン生成精度の向上",
    description:
      "AIによるプラン生成の精度を向上させました。より具体的で実現性の高いプランが提案されるようになりました。",
  },
  {
    status: "done",
    date: "2026.01.10",
    updateType: "patch",
    title: "日程が長い場合のスケジュール生成改善",
    description:
      "日程が長くなると1日あたりの予定が少なくなる問題を修正しました。",
  },
  {
    status: "done",
    date: "2026.01.10",
    updateType: "patch",
    title: "PDF出力機能の実装",
    description:
      "生成された旅行プランをPDF形式でダウンロードできるようになりました。オフラインでの閲覧や印刷に便利です。",
  },
  {
    status: "done",
    date: "2026.01.11",
    updateType: "patch",
    title: "プランの手動修正機能",
    description: "プラン生成後に手動でプランの修正ができるようになりました。",
  },
  {
    status: "done",
    date: "2026.01.13",
    updateType: "patch",
    title: "旅程サンプル集の公開",
    description:
      "様々な旅行プランのサンプルを閲覧できる旅程サンプル集を公開しました。プラン作成の参考にご活用ください。",
  },
  {
    status: "done",
    date: "2026.01.14",
    updateType: "patch",
    title: "サンプルの大幅追加と検索・絞り込み機能の実装",
    description:
      "旅程サンプルを大幅に追加し、地域やキーワードでプランを探せる検索・絞り込み機能を実装しました。よりスムーズに理想の旅程を見つけられるようになりました。",
  },
  {
    status: "done",
    date: "2026.01.14",
    updateType: "patch",
    title: "日程の並び替えや時間の調整",
    description: "日程の並び替えや時間の調整ができるようになりました。",
  },
  {
    status: "done",
    date: "2026.01.15",
    updateType: "minor",
    title: "渡航情報のAI検索機能を追加",
    description:
      "渡航情報・安全ガイド詳細ページにて、AIが最新の渡航情報を調べてくれる機能を追加しました。より詳細でリアルタイムな情報を確認できるようになりました。",
  },
  {
    status: "done",
    date: "2026.01.16",
    updateType: "patch",
    title: "渡航情報のAI検索機能の精度向上とカテゴリー追加",
    description:
      "AIによる情報の検索精度を改善しました。また、より多角的な情報を取得できるよう、検索可能なカテゴリーを追加しました。",
  },
  {
    status: "done",
    date: "2026.01.16",
    updateType: "patch",
    title: "渡航情報のPDF出力機能",
    description:
      "渡航情報をPDFとしてダウンロードできる機能を追加しました。オフラインでの閲覧や印刷に便利です。",
  },
  {
    status: "done",
    date: "2026.01.17",
    updateType: "patch",
    title: "渡航情報・安全ガイドで、外部APIを使用",
    description:
      "渡航情報・安全ガイドで、外部APIを使用して情報を取得するようになりました。より正確でリアルタイムな情報を確認できるようになりました。",
  },
  {
    status: "done",
    date: "2026.01.19",
    updateType: "patch",
    title: "ブランドイメージとTabideaへの想いをTabideaについてページに追加",
    description:
      "ブランドイメージとTabideaへの想いをTabideaについてページに追加しました。",
  },
  {
    status: "done",
    date: "2026.01.19",
    updateType: "patch",
    title: "渡航情報・安全ガイドのカテゴリを追加",
    description:
      "渡航情報・安全ガイドのカテゴリを追加しました。より多くの情報を検索できます。",
  },
  {
    status: "done",
    date: "2026.01.20",
    updateType: "patch",
    title: "ブランドイメージに合わせて一部ページのUIを修正",
    description: "ブランドイメージに合わせて一部ページのUIを修正しました。",
  },
  {
    status: "done",
    date: "2026.01.21",
    updateType: "patch",
    title:
      "旅程生成後のチャットでよく使われる文章をボタン一つで追加できるように",
    description:
      "旅程生成後のチャットでよく使われる文章をボタン一つで追加できるようになりました。",
  },
  {
    status: "done",
    date: "2026.01.22",
    updateType: "patch",
    title: "渡航情報・安全ガイドのデザインを更新",
    description:
      "渡航情報・安全ガイドのデザインを更新し、見やすくてすぐに理解できるような見た目にしました。",
  },
  {
    status: "done",
    date: "2026.01.23",
    updateType: "patch",
    title: "複数地域を周遊する旅程プラン生成に対応",
    description: "複数地域を周遊する旅程プランを生成できるようになりました。",
  },
  {
    status: "done",
    date: "2026.01.23",
    updateType: "patch",
    title: "プランページで渡航情報・安全ガイドを確認できるように",
    description:
      "プランページで生成された旅程の地域の渡航情報・安全ガイドをボタン一つで確認できるようにしました。",
  },
  {
    status: "done",
    date: "2026.01.24",
    updateType: "patch",
    title: "サンプルプラン集の絞り込み画面の更新",
    description:
      "サンプルプラン集の絞り込み画面をタブ形式にして、カテゴリごとに分けて絞り込みやすくしました。",
  },
  {
    status: "done",
    date: "2026.01.26",
    updateType: "minor",
    title: "ユーザーアカウント機能",
    description:
      "ログインすることで、複数のデバイスでプランを同期したり、過去の履歴を管理できるようになりました。",
  },
  {
    status: "done",
    date: "2026.01.26",
    updateType: "patch",
    title: "プランの保存機能",
    description:
      "生成した旅行プランを保存し、後から確認できるようになりました。",
  },
  {
    status: "done",
    date: "2026.01.27",
    updateType: "patch",
    title: "ユーザーアカウント機能の追加に伴う法務関連文書の更新",
    description:
      "ユーザーアカウント機能の追加に伴い、利用規約およびプライバシーポリシーを改定しました。",
  },
  {
    status: "done",
    date: "2026.01.27",
    updateType: "patch",
    title: "サイドーで保存したプランを確認できるように",
    description: "サイドバーで保存したプランを確認できるようになりました。",
  },
  {
    status: "done",
    date: "2026.01.28",
    updateType: "patch",
    title: "アイコンを選択したときにマイページモーダルを表示",
    description:
      "アイコンを選択したときにマイページモーダルを表示し、アカウント設定を変更できるようになりました。",
  },
  {
    status: "done",
    date: "2026.01.28",
    updateType: "patch",
    title: "飛行機等の移動手段の入力方法を簡略化",
    description:
      "飛行機等の移動手段の入力を希望入力の際に簡単に入力できるようにしました。",
  },
  {
    status: "done",
    date: "2026.01.29",
    updateType: "patch",
    title: "AIに考慮してほしい要望の設定機能",
    description:
      "ユーザーごとに、AI生成時に常に考慮してほしい要望（例：朝食あり、カフェ巡り多め、ホテルの星数など）を設定・保存できるようになりました。",
  },
  {
    status: "done",
    date: "2026.01.30",
    updateType: "patch",
    title: "個人の旅のスタイルを設定可能に",
    description:
      "どんなスタイルで旅をするのかを設定して、よりパーソナライズドされたプラン生成が可能になりました。",
  },
  {
    status: "done",
    date: "2026.01.30",
    updateType: "patch",
    title: "保存済みプランにフラグを立てれるように",
    description:
      "保存済みプランにフラグを立てることができ、フラグを立てたプランは一番上に表示されます。",
  },
  {
    status: "done",
    date: "2026.02.01",
    updateType: "minor",
    title: "有料プラン（Proプラン）の提供開始",
    description:
      "旅のスタイル設定やプラン生成数・保存数の無制限化など、より快適にサービスをご利用いただける有料プランの提供を開始しました。",
  },
  {
    status: "done",
    date: "2026.02.02",
    updateType: "patch",
    title: "希望入力フォームのUI変更",
    description: "希望入力が簡単かつ見やすくなりました。",
  },
  {
    status: "done",
    date: "2026.02.02",
    updateType: "patch",
    title: "プラン画面のUI変更",
    description: "プラン画面で移動の独自UIを実装しました。",
  },
  {
    status: "done",
    date: "2026.02.02",
    updateType: "patch",
    title: "動的OGP作成",
    description:
      "SNSシェア時に、プラン名と写真が入った魅力的なカード画像を自動生成するようになりました。",
  },
  {
    status: "done",
    date: "2026.02.03",
    updateType: "patch",
    title: "サブスクリプションユーザーの複雑な旅程生成時にProモデルを使用",
    description:
      "サブスクリプションプランに加入しているユーザーが複雑なプランを生成する際に、Proモデルを使用するようになりました。",
  },
  {
    status: "done",
    date: "2026.02.03",
    updateType: "patch",
    title: "希望入力を3フェーズ化",
    description:
      "希望入力のステップが多く、また分かりにくかったのをまとめ、簡単にプラン生成に移行できるようにしました。",
  },
  {
    status: "done",
    date: "2026.02.03",
    updateType: "patch",
    title: "生成待ち時間の減少",
    description:
      "プランの概要生成後にプランを見ることができるようにし、体感的な待ち時間を減少しました。",
  },
  {
    status: "done",
    date: "2026.02.03", // User request: 2026-02-03
    updateType: "patch",
    title: "プラン保存数を全ログインユーザーが無制限に",
    description:
      "作成したプランをログインするだけで制限なく保存できるようになりました。",
  },
  {
    status: "done",
    date: "2026.02.04",
    updateType: "patch",
    title: "信頼性バッジ表示",
    description:
      "生成されたスポットに対して、検証済み、AI生成、要確認のバッジを表示するようにしました。",
  },
  {
    status: "done",
    date: "2026.02.05",
    updateType: "patch",
    title: "Google Map連携",
    description:
      "提案されたスポットをGoogle Mapですぐに確認できるようになりました。",
  },
  {
    status: "done",
    date: "2026.02.05",
    updateType: "patch",
    title: "詳細プランの生成失敗問題の修正",
    description: "1,2日目の詳細プラン生成が失敗する問題を修正しました。",
  },
  {
    status: "done",
    date: "2026.02.05",
    updateType: "patch",
    title: "ホテル・航空券予約のリンクを設置",
    description:
      "AIが生成した旅程プランにホテルや航空券が含まれている場合、リンクをクリックすることで直接予約サイトを訪問できるようになりました。",
  },
  {
    status: "done",
    date: "2026.02.05",
    updateType: "patch",
    title: "スポットの詳細を表示",
    description:
      "生成されたスポットの詳細をカードを開くことで表示されるようにしました。",
  },
  {
    status: "done",
    date: "2026.02.05",
    updateType: "patch",
    title: "旅程カードのUI更新",
    description:
      "プランページの旅程カードを、旅程・しおりらしいデザインを目指し、何をするのかがわかりやすいUIに変更しました。",
  },
  {
    status: "done",
    date: "2026.02.06", // User request: 2026-02-06
    updateType: "patch",
    title: "コスト表示機能の追加",
    description:
      "生成されたプランからAIがコストの概算を計算し表示する機能を追加しました。",
  },
  {
    status: "done",
    date: "2026.02.06", // User request: 2026-02-06 (Corrected from 2026-026)
    updateType: "patch",
    title: "カレンダー連携",
    description:
      "Google CalendarおよびiCalenderにエクスポートする機能を追加しました。",
  },
  // Future items
  {
    status: "planned",
    title: "共同編集機能",
    description:
      "友人や家族と一緒に旅行プランを編集できる機能を計画しています。",
  },
  {
    status: "planned",
    title: "予算を詳細に制御する機能",
    description:
      "宿泊費や交通費などの項目ごとに予算を細かく設定し、全体の費用をより正確にシミュレーション・管理できる機能を計画しています。",
  },
  {
    status: "planned",
    title: "プランの画像共有",
    description:
      "旅行プランを綺麗な画像として書き出し、SNSでシェアしやすくする機能を検討しています。",
  },
  {
    status: "planned",
    title: "旅行中のメモ機能",
    description:
      "旅行中に何を食べたかやどこが良かったかを生成されたプランに直接書き込める機能を計画しています。",
  },
  {
    status: "planned",
    title: "複数の候補からプランを選択できる機能",
    description: "複数の候補からプランを選択できる機能を開発中です。",
  },
  {
    status: "planned",
    title: "ホテル、飛行機を含めたプラン提案",
    description: "ホテル、飛行機を含めたプランを提案する機能を検討しています。",
  },
  {
    status: "planned",
    title: "ダークモード対応",
    description: "目に優しいダークモードへの対応を計画しています。",
  },
  {
    status: "planned",
    title: "多言語対応",
    description:
      "日本語以外の言語でもサービスを利用できるよう、多言語対応を計画しています。",
  },
  {
    status: "planned",
    title: "回数券の導入",
    description:
      "サブスクリプションなしで、必要な分だけ機能を利用できる回数券の導入を計画しています。",
  },
  {
    status: "planned",
    title: "モバイルアプリ化",
    description:
      "より手軽にプランの確認や作成ができるモバイルアプリの開発を計画しています。",
  },
  {
    status: "done",
    date: "2026.02.07",
    updateType: "patch",
    title: "予約リンクの精度向上",
    description:
      "予約リンクの精度を向上させ、より正確なページに遷移するようになりました。",
  },
  {
    status: "done",
    date: "2026.02.07",
    updateType: "patch",
    title: "スポット詳細情報の精度向上",
    description:
      "スポットの詳細情報の精度を向上させ、より正確な情報を表示するようになりました。",
  },
  {
    status: "done",
    date: "2026.02.07",
    updateType: "patch",
    title: "予算精度の向上",
    description:
      "AIによる予算見積もりの精度を向上させ、より実態に近い費用を算出できるようになりました。",
  },
  {
    status: "done",
    date: "2026.02.08",
    updateType: "patch",
    title: "サイト全体のUI修正",
    description:
      "サイト全体のUIを見直し、より使いやすく見やすいデザインに修正しました。",
  },
  {
    status: "done",
    date: "2026.02.08",
    updateType: "patch",
    title: "持ち物リスト生成の追加",
    description:
      "旅行の目的地や期間に合わせて、必要な持ち物リストを自動で生成する機能を追加しました。",
  },
  {
    status: "done",
    date: "2026.02.08",
    updateType: "patch",
    title: "フィードバックシステムの実装",
    description:
      "サービス改善のため、ユーザーからのフィードバックを送信できるシステムを実装しました。",
  },
  {
    status: "done",
    date: "2026.02.09",
    updateType: "patch",
    title: "PDF出力機能の拡充",
    description:
      "PDF出力に旅程、渡航情報、持ち物リストを含められるようになりました。",
  },
  {
    status: "done",
    date: "2026.02.09",
    updateType: "patch",
    title: "AI生成精度の向上",
    description:
      "AIによるプラン生成の精度をさらに向上させ、より満足度の高いプランが提案されるようになりました。",
  },
  {
    status: "done",
    date: "2026.02.09",
    updateType: "patch",
    title: "GoogleMapによるルート表示",
    description:
      "生成されたプランのルートをGoogle Map上で表示できるようになりました。",
  },
];

// Helper to calculate versions
type RoadmapItemWithVersion = RoadmapItem & { version?: string };

function calculateVersions(items: RoadmapItem[]): RoadmapItemWithVersion[] {
  let major = 0;
  let minor = 0;
  let patch = 0;

  return items.map((item) => {
    if (item.status !== "done") return item;

    if (item.updateType === "release" || item.updateType === "major") {
      major += 1;
      minor = 0;
      patch = 0;
    } else if (
      item.updateType === "pre_release" ||
      item.updateType === "minor"
    ) {
      minor += 1;
      patch = 0;
    } else if (item.updateType === "patch") {
      patch += 1;
    }

    return {
      ...item,
      version: `${major}.${minor}.${patch}`,
    };
  });
}

const roadmapData = calculateVersions(rawRoadmapData);

// 1. 優先順位を定義するオブジェクトを作る (数値が小さいほうが先頭)
const statusPriority: Record<RoadmapItem["status"], number> = {
  developing: 1, // 先頭にしたい
  planned: 2,
  done: 3,
};

// 2. その数値を使って引き算でソートする
// Note: We use the raw data logic for Roadmap section (future items),
// but typically we just filter the computed 'roadmapData' too.
const sortedRoadmap = roadmapData.toSorted((a, b) => {
  return statusPriority[a.status] - statusPriority[b.status];
});

// For history, we want Newest -> Oldest
const historyItems = roadmapData
  .filter((i) => i.status === "done")
  .toReversed();

export default function UpdatesPage() {
  return (
    <div className="min-h-screen pt-32 pb-20 px-8 sm:px-20 font-sans">
      <main className="max-w-4xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#2c2c2c] mb-4">
            Updates & Roadmap
          </h1>
          <p className="text-stone-600 font-hand text-lg">
            Tabideaのこれまでの歩みと、これからの計画。
          </p>
        </header>

        <div className="space-y-12">
          {/* Section: Development Status */}
          <section>
            <h2 className="text-xl font-bold text-[#e67e22] mb-6 flex items-center gap-2 border-b-2 border-[#e67e22]/20 pb-2">
              <FaTools />
              <span>開発ロードマップ</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sortedRoadmap
                .filter((i) => i.status !== "done")
                .map((item, index) => (
                  <div
                    key={index}
                    className="bg-white p-6 rounded-lg shadow-sm border border-stone-100 relative h-full flex flex-col"
                  >
                    {item.status === "developing" && (
                      <span className="absolute -top-3 right-4 bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full font-bold">
                        開発中
                      </span>
                    )}
                    <h3 className="text-lg font-bold text-[#2c2c2c] mb-2 font-serif">
                      {item.title}
                    </h3>
                    <p className="text-stone-600 leading-relaxed text-sm flex-grow">
                      {item.description}
                    </p>
                  </div>
                ))}
            </div>
          </section>

          {/* Section: Update History */}
          <section>
            <h2 className="text-xl font-bold text-[#2c2c2c] mb-6 flex items-center gap-2 border-b-2 border-stone-200 pb-2">
              <FaCheck className="text-green-600" />
              <span>更新履歴</span>
            </h2>

            {/* 2-column Timeline Layout */}
            <div className="md:columns-2 gap-12 mt-8 space-y-0">
              {historyItems.map((item, index) => (
                <div
                  key={index}
                  className="relative pl-6 border-l-2 border-stone-200 pb-10 break-inside-avoid"
                >
                  {/* Dot */}
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-green-500 bg-white"></div>

                  {/* Content */}
                  <div>
                    <span className="text-sm font-bold text-stone-400 block mb-1 font-mono flex items-center gap-2 flex-wrap">
                      {item.date}
                      {item.version && (
                        <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded text-xs">
                          v{item.version}
                        </span>
                      )}
                      {item.updateType && (
                        <span
                          className={`px-2 py-0.5 rounded text-xs border ${
                            item.updateType === "release"
                              ? "bg-orange-50 text-red-600 border-orange-200"
                              : item.updateType === "pre_release"
                                ? "bg-blue-50 text-blue-600 border-blue-200"
                                : item.updateType === "major"
                                  ? "bg-red-50 text-orange-600 border-red-200"
                                  : item.updateType === "minor"
                                    ? "bg-green-50 text-green-600 border-green-200"
                                    : "bg-stone-50 text-stone-500 border-stone-200"
                          }`}
                        >
                          {item.updateType === "release"
                            ? "Release"
                            : item.updateType === "pre_release"
                              ? "Pre-release"
                              : item.updateType === "major"
                                ? "Major"
                                : item.updateType === "minor"
                                  ? "Minor"
                                  : "Patch"}
                        </span>
                      )}
                    </span>
                    <h3 className="text-lg font-bold text-[#2c2c2c] mb-2 font-serif">
                      {item.title}
                    </h3>
                    <p className="text-stone-600 leading-relaxed text-sm">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-16 bg-stone-50 rounded-xl border border-stone-200 p-8">
            <h3 className="text-center font-bold text-lg text-[#2c2c2c] mb-6 font-serif">
              ご意見・お問い合わせ
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href="/contact"
                className="flex flex-col items-center justify-center p-6 bg-white rounded-lg border border-stone-200 hover:border-[#e67e22] hover:shadow-sm transition-all group"
              >
                <span className="font-bold text-[#2c2c2c] group-hover:text-[#e67e22] mb-2">
                  お問い合わせ
                </span>
                <span className="text-xs text-stone-500 text-center">
                  一般的なご質問やご感想はこちら
                </span>
              </a>
              <a
                href="https://github.com/tomoki013/ai-travel-planner/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-6 bg-white rounded-lg border border-stone-200 hover:border-[#e67e22] hover:shadow-sm transition-all group"
              >
                <span className="flex items-center gap-2 font-bold text-[#2c2c2c] group-hover:text-[#e67e22] mb-2">
                  <FaFlag size={14} /> 不具合報告・要望
                </span>
                <span className="text-xs text-stone-500 text-center">
                  GitHub Issueにて受け付けています
                </span>
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
