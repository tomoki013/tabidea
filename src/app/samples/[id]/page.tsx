"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { getSamplePlanById } from "@/lib/samplePlans";
import { FaWandMagicSparkles, FaPencil, FaLocationDot, FaCalendarDays, FaUsers, FaPalette, FaYenSign, FaGauge, FaMapPin, FaArrowLeft } from "react-icons/fa6";

export default function SamplePlanDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const sample = getSamplePlanById(id);

  if (!sample) {
    return (
      <div className="flex flex-col min-h-screen bg-[#fcfbf9]">
        <main className="flex-1 w-full flex flex-col items-center justify-center p-4">
          <div className="text-center space-y-4">
            <div className="text-6xl mb-4">😢</div>
            <h1 className="text-2xl font-serif font-bold text-stone-800">
              サンプルプランが見つかりません
            </h1>
            <p className="text-stone-600">
              指定されたサンプルプランは存在しないか、削除された可能性があります。
            </p>
            <Link
              href="/samples"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-bold hover:bg-primary/90 transition-colors"
            >
              <FaArrowLeft />
              サンプル一覧に戻る
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const { userInput } = sample;

  // Format dates display
  const formatDates = () => {
    return userInput.dates;
  };

  // Format companions display
  const companionLabels: Record<string, string> = {
    "ひとり": "ひとり旅",
    "カップル": "カップル",
    "友達": "友達と",
    "家族": "家族と",
    "夫婦": "夫婦で",
  };

  // Format pace display
  const paceLabels: Record<string, string> = {
    "のんびり": "のんびり（1日2〜3スポット）",
    "ゆったり": "ゆったり（1日3〜4スポット）",
    "普通": "普通（1日4〜5スポット）",
    "アクティブ": "アクティブ（1日5〜6スポット）",
    "詰め込み": "詰め込み（1日6スポット以上）",
  };

  // Format budget display
  const budgetLabels: Record<string, string> = {
    "節約": "節約（コスパ重視）",
    "普通": "普通",
    "贅沢に": "贅沢に",
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#fcfbf9]">
      <main className="flex-1 w-full flex flex-col items-center">
        {/* Back link */}
        <div className="w-full max-w-4xl px-4 pt-8">
          <Link
            href="/samples"
            className="inline-flex items-center gap-2 text-stone-600 hover:text-primary transition-colors font-medium"
          >
            <FaArrowLeft className="text-sm" />
            サンプル一覧に戻る
          </Link>
        </div>

        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-4xl px-4 pt-8 pb-6"
        >
          <div className="text-center space-y-4">
            <div className="inline-block mb-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold tracking-wider uppercase">
              Sample Plan
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-stone-800">
              {sample.title}
            </h1>
            <p className="text-stone-600 max-w-2xl mx-auto leading-relaxed">
              {sample.description}
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {sample.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-stone-100 text-stone-700 rounded-full text-sm font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* User Input Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-4xl px-4 py-6"
        >
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-stone-50 border-b border-stone-200">
              <h2 className="text-xl font-serif font-bold text-stone-800">
                このプランの希望条件
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Destination */}
                <div className="flex items-start gap-3 p-4 bg-stone-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FaLocationDot className="text-primary" />
                  </div>
                  <div>
                    <div className="text-sm text-stone-500 font-medium">目的地</div>
                    <div className="text-stone-800 font-bold">
                      {userInput.isDestinationDecided
                        ? userInput.destination
                        : userInput.travelVibe
                        ? `未定（${userInput.travelVibe}）`
                        : "AIにおまかせ"}
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="flex items-start gap-3 p-4 bg-stone-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <FaCalendarDays className="text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm text-stone-500 font-medium">日程</div>
                    <div className="text-stone-800 font-bold">{formatDates()}</div>
                  </div>
                </div>

                {/* Companions */}
                <div className="flex items-start gap-3 p-4 bg-stone-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <FaUsers className="text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm text-stone-500 font-medium">同行者</div>
                    <div className="text-stone-800 font-bold">
                      {companionLabels[userInput.companions] || userInput.companions}
                    </div>
                  </div>
                </div>

                {/* Themes */}
                <div className="flex items-start gap-3 p-4 bg-stone-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <FaPalette className="text-purple-600" />
                  </div>
                  <div>
                    <div className="text-sm text-stone-500 font-medium">テーマ</div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {userInput.theme.map((t, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Budget */}
                <div className="flex items-start gap-3 p-4 bg-stone-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                    <FaYenSign className="text-yellow-600" />
                  </div>
                  <div>
                    <div className="text-sm text-stone-500 font-medium">予算感</div>
                    <div className="text-stone-800 font-bold">
                      {budgetLabels[userInput.budget] || userInput.budget}
                    </div>
                  </div>
                </div>

                {/* Pace */}
                <div className="flex items-start gap-3 p-4 bg-stone-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <FaGauge className="text-orange-600" />
                  </div>
                  <div>
                    <div className="text-sm text-stone-500 font-medium">旅のペース</div>
                    <div className="text-stone-800 font-bold">
                      {paceLabels[userInput.pace] || userInput.pace}
                    </div>
                  </div>
                </div>

                {/* Must Visit Places (if any) */}
                {userInput.hasMustVisitPlaces && userInput.mustVisitPlaces && userInput.mustVisitPlaces.length > 0 && (
                  <div className="flex items-start gap-3 p-4 bg-stone-50 rounded-xl md:col-span-2">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <FaMapPin className="text-red-600" />
                    </div>
                    <div>
                      <div className="text-sm text-stone-500 font-medium">行きたい場所</div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {userInput.mustVisitPlaces.map((place, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-sm font-medium"
                          >
                            {place}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Free Text (if any) */}
                {userInput.freeText && (
                  <div className="md:col-span-2 p-4 bg-stone-50 rounded-xl">
                    <div className="text-sm text-stone-500 font-medium mb-2">その他の希望</div>
                    <p className="text-stone-700 leading-relaxed">
                      {userInput.freeText}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-4xl px-4 py-8"
        >
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {/* Generate with these conditions */}
            <Link
              href={`/plan?sample=${id}`}
              className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 font-bold text-white transition-all duration-200 bg-primary font-serif rounded-full hover:bg-primary/90 hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <FaWandMagicSparkles className="relative z-10" />
              <span className="relative z-10">この条件でプランを生成する</span>
            </Link>

            {/* Customize conditions */}
            <Link
              href={`/?sample=${id}`}
              className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 font-bold text-primary transition-all duration-200 bg-white border-2 border-primary font-serif rounded-full hover:bg-primary/5 hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary overflow-hidden"
            >
              <FaPencil className="relative z-10" />
              <span className="relative z-10">条件をカスタマイズする</span>
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
