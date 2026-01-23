import { UserInput } from '@/types';
import {
  FaMapLocationDot,
  FaCalendarDays,
  FaUserGroup,
  FaPalette,
  FaWallet,
  FaPersonRunning,
  FaPen,
} from "react-icons/fa6";

interface RequestSummaryProps {
  input: UserInput;
  className?: string;
  onEdit?: (stepIndex: number) => void;
}

// Step mappings
const steps = {
  destination: 1, // or Region
  mustVisit: 2,
  companions: 3,
  themes: 4,
  budget: 5,
  dates: 6,
  pace: 7,
  freeText: 8,
};

const budgetMap: Record<string, string> = {
  saving: "なるべく安く",
  standard: "普通",
  high: "少し贅沢に",
  luxury: "リッチに",
};

const regionMap: Record<string, string> = {
  domestic: "国内",
  overseas: "海外",
  anywhere: "どこでも",
};

const EditButton = ({
  stepIndex,
  onEdit,
}: {
  stepIndex: number;
  onEdit?: (stepIndex: number) => void;
}) => {
  if (!onEdit) return null;
  return (
    <button
      onClick={() => onEdit(stepIndex)}
      className="ml-2 text-stone-400 hover:text-primary transition-colors p-1"
      aria-label="Edit"
      title="修正する"
    >
      <FaPen className="text-sm" />
    </button>
  );
};

export default function RequestSummary({
  input,
  className = "",
  onEdit,
}: RequestSummaryProps) {
  // Helper to render destination content
  const renderDestinationContent = () => {
    // 1. Multiple Destinations
    if (input.isDestinationDecided && input.destinations.length > 0) {
      // If single, just show text
      if (input.destinations.length === 1) {
        return (
           <p className="text-stone-600 font-medium">{input.destinations[0]}</p>
        );
      }
      // If multiple, show list
      return (
        <ul className="text-stone-600 font-medium list-disc list-inside mt-1">
          {input.destinations.map((dest, i) => (
             <li key={i}>{dest}</li>
          ))}
        </ul>
      );
    }

    // 2. Region
    if (input.region) {
      return (
         <p className="text-stone-600 font-medium">
             {regionMap[input.region] || input.region}
         </p>
      );
    }

    // 3. Travel Vibe
    if (input.travelVibe) {
       return (
         <>
           <p className="text-stone-600 font-medium">エリア未定 (雰囲気重視)</p>
           <p className="text-xs text-stone-500 mt-1">
                雰囲気: {input.travelVibe}
           </p>
         </>
       );
    }

    // 4. Fallback
    return <p className="text-stone-600 font-medium">未設定</p>;
  };

  return (
    <div
      className={`space-y-6 bg-white p-6 rounded-xl shadow-xs border border-stone-100 ${className}`}
    >
      {/* Destinations / Region */}
      {((input.isDestinationDecided && input.destinations.length > 0) || input.region || input.travelVibe) && (
        <div className="flex items-start gap-3 first:border-t-0 first:pt-0">
          <div className="mt-1 text-primary text-xl">
            <FaMapLocationDot />
          </div>
          <div className="flex-1">
            <div className="flex items-center">
              <h3 className="font-bold text-stone-700 text-sm">
                目的地・エリア
              </h3>
              <EditButton stepIndex={steps.destination} onEdit={onEdit} />
            </div>
            {renderDestinationContent()}
          </div>
        </div>
      )}

      {/* Must Visit Places (Only if present) */}
      {input.hasMustVisitPlaces &&
        input.mustVisitPlaces &&
        input.mustVisitPlaces.length > 0 && (
          <div className="flex items-start gap-3 border-t border-stone-100 pt-3 first:border-t-0 first:pt-0">
            <div className="mt-1 text-primary text-xl">
              <FaMapLocationDot className="opacity-70" />
            </div>
            <div className="flex-1">
              <div className="flex items-center">
                <h3 className="font-bold text-stone-700 text-sm">
                  絶対に行きたい場所
                </h3>
                <EditButton stepIndex={steps.mustVisit} onEdit={onEdit} />
              </div>
              <ul className="text-stone-600 font-medium list-disc list-inside">
                {input.mustVisitPlaces.map((place, i) => (
                  <li key={i}>{place}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

      {/* Companions */}
      {input.companions && input.companions !== "any" && (
        <div className="flex items-start gap-3 border-t border-stone-100 pt-3 first:border-t-0 first:pt-0">
          <div className="mt-1 text-primary text-xl">
            <FaUserGroup />
          </div>
          <div className="flex-1">
            <div className="flex items-center">
              <h3 className="font-bold text-stone-700 text-sm">誰と行く？</h3>
              <EditButton stepIndex={steps.companions} onEdit={onEdit} />
            </div>
            <p className="text-stone-600 font-medium">
              {input.companions === "solo" && "一人旅"}
              {input.companions === "couple" && "パートナー・夫婦"}
              {input.companions === "friends" && "友人グループ"}
              {input.companions === "family" && "家族（子供連れ）"}
              {!["solo", "couple", "friends", "family"].includes(
                input.companions
              ) && input.companions}
            </p>
          </div>
        </div>
      )}

      {/* Themes */}
      {input.theme && input.theme.length > 0 && (
        <div className="flex items-start gap-3 border-t border-stone-100 pt-3 first:border-t-0 first:pt-0">
          <div className="mt-1 text-primary text-xl">
            <FaPalette />
          </div>
          <div className="flex-1">
            <div className="flex items-center">
              <h3 className="font-bold text-stone-700 text-sm">旅のテーマ</h3>
              <EditButton stepIndex={steps.themes} onEdit={onEdit} />
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {input.theme.map((t) => (
                <span
                  key={t}
                  className="px-2 py-0.5 bg-stone-100 text-stone-600 text-xs rounded-full border border-stone-200"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Budget */}
      {input.budget && input.budget !== "any" && (
        <div className="flex items-start gap-3 border-t border-stone-100 pt-3 first:border-t-0 first:pt-0">
          <div className="mt-1 text-primary text-xl">
            <FaWallet />
          </div>
          <div className="flex-1">
            <div className="flex items-center">
              <h3 className="font-bold text-stone-700 text-sm">予算感</h3>
              <EditButton stepIndex={steps.budget} onEdit={onEdit} />
            </div>
            <p className="text-stone-600 font-medium">
              {budgetMap[input.budget] || input.budget}
            </p>
          </div>
        </div>
      )}

      {/* Dates */}
      {input.dates && (
        <div className="flex items-start gap-3 border-t border-stone-100 pt-3 first:border-t-0 first:pt-0">
          <div className="mt-1 text-primary text-xl">
            <FaCalendarDays />
          </div>
          <div className="flex-1">
            <div className="flex items-center">
              <h3 className="font-bold text-stone-700 text-sm">日程・時期</h3>
              <EditButton stepIndex={steps.dates} onEdit={onEdit} />
            </div>
            <p className="text-stone-600 font-medium">{input.dates}</p>
          </div>
        </div>
      )}

      {/* Pace */}
      {input.pace && input.pace !== "any" && (
        <div className="flex items-start gap-3 border-t border-stone-100 pt-3 first:border-t-0 first:pt-0">
          <div className="mt-1 text-primary text-xl">
            <FaPersonRunning />
          </div>
          <div className="flex-1">
            <div className="flex items-center">
              <h3 className="font-bold text-stone-700 text-sm">旅行のペース</h3>
              <EditButton stepIndex={steps.pace} onEdit={onEdit} />
            </div>
            <p className="text-stone-600 font-medium">
              {input.pace === "relaxed" && "ゆったり (1日1-2箇所)"}
              {input.pace === "balanced" && "バランスよく (観光と休息を程よく)"}
              {input.pace === "active" && "アクティブ (主要スポットを網羅)"}
              {input.pace === "packed" && "詰め込み (朝から晩まで全力で)"}
              {input.pace === "normal" && "普通 (1日3-4箇所)"}
              {!["relaxed", "balanced", "active", "packed", "normal"].includes(
                input.pace
              ) && input.pace}
            </p>
          </div>
        </div>
      )}

      {/* Free Text */}
      {input.freeText && (
        <div className="mt-4 p-4 bg-stone-50 rounded-lg border border-dashed border-stone-300 relative group">
          <div className="absolute top-2 right-2">
            <EditButton stepIndex={steps.freeText} onEdit={onEdit} />
          </div>
          <h3 className="text-xs font-bold text-stone-500 mb-1">
            その他の要望
          </h3>
          <p className="text-stone-700 text-sm whitespace-pre-wrap">
            {input.freeText}
          </p>
        </div>
      )}
    </div>
  );
}
