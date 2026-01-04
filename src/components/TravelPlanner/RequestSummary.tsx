import { UserInput } from "@/lib/types";
import { FaMapLocationDot, FaCalendarDays, FaUserGroup, FaPalette, FaWallet, FaPersonRunning, FaPen } from "react-icons/fa6";

interface RequestSummaryProps {
  input: UserInput;
  className?: string;
  onEdit?: (stepIndex: number) => void;
}

export default function RequestSummary({ input, className = "", onEdit }: RequestSummaryProps) {
  // Step mappings
  const steps = {
    destination: 1, // or Region
    mustVisit: 2,
    companions: 3,
    themes: 4,
    budget: 5,
    dates: 6,
    pace: 7,
    freeText: 8
  };

  const EditButton = ({ stepIndex }: { stepIndex: number }) => {
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

  return (
    <div className={`space-y-6 bg-white p-6 rounded-xl shadow-xs border border-stone-100 ${className}`}>
      {/* Destination / Region */}
      <div className="flex items-start gap-3">
        <div className="mt-1 text-primary text-xl">
          <FaMapLocationDot />
        </div>
        <div className="flex-1">
          <div className="flex items-center">
             <h3 className="font-bold text-stone-700 text-sm">目的地・エリア</h3>
             <EditButton stepIndex={steps.destination} />
          </div>
          <p className="text-stone-600 font-medium">
            {input.isDestinationDecided
              ? input.destination
              : input.region || (input.travelVibe ? "エリア未定 (雰囲気重視)" : "未設定")}
          </p>
          {!input.isDestinationDecided && input.travelVibe && (
            <p className="text-xs text-stone-500 mt-1">
              雰囲気: {input.travelVibe}
            </p>
          )}
        </div>
      </div>

       {/* Must Visit Places (Only if present) */}
       {input.hasMustVisitPlaces && input.mustVisitPlaces && input.mustVisitPlaces.length > 0 && (
        <div className="flex items-start gap-3 border-t border-stone-100 pt-3">
          <div className="mt-1 text-primary text-xl">
            <FaMapLocationDot className="opacity-70" />
          </div>
          <div className="flex-1">
            <div className="flex items-center">
              <h3 className="font-bold text-stone-700 text-sm">絶対に行きたい場所</h3>
              <EditButton stepIndex={steps.mustVisit} />
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
      <div className="flex items-start gap-3 border-t border-stone-100 pt-3">
        <div className="mt-1 text-primary text-xl">
          <FaUserGroup />
        </div>
        <div className="flex-1">
          <div className="flex items-center">
            <h3 className="font-bold text-stone-700 text-sm">誰と行く？</h3>
            <EditButton stepIndex={steps.companions} />
          </div>
          <p className="text-stone-600 font-medium">
            {input.companions === "solo" && "一人旅"}
            {input.companions === "couple" && "パートナー・夫婦"}
            {input.companions === "friends" && "友人グループ"}
            {input.companions === "family" && "家族（子供連れ）"}
            {!input.companions && "未設定"}
          </p>
        </div>
      </div>

      {/* Themes */}
      <div className="flex items-start gap-3 border-t border-stone-100 pt-3">
        <div className="mt-1 text-primary text-xl">
          <FaPalette />
        </div>
        <div className="flex-1">
          <div className="flex items-center">
            <h3 className="font-bold text-stone-700 text-sm">旅のテーマ</h3>
            <EditButton stepIndex={steps.themes} />
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {input.theme && input.theme.length > 0 ? (
              input.theme.map((t) => (
                <span
                  key={t}
                  className="px-2 py-0.5 bg-stone-100 text-stone-600 text-xs rounded-full border border-stone-200"
                >
                  {t}
                </span>
              ))
            ) : (
              <span className="text-stone-400 text-sm">未設定</span>
            )}
          </div>
        </div>
      </div>

      {/* Budget */}
      <div className="flex items-start gap-3 border-t border-stone-100 pt-3">
        <div className="mt-1 text-primary text-xl">
          <FaWallet />
        </div>
        <div className="flex-1">
          <div className="flex items-center">
             <h3 className="font-bold text-stone-700 text-sm">予算感</h3>
             <EditButton stepIndex={steps.budget} />
          </div>
          <p className="text-stone-600 font-medium">
            {input.budget || "未設定"}
          </p>
        </div>
      </div>

      {/* Dates */}
      <div className="flex items-start gap-3 border-t border-stone-100 pt-3">
        <div className="mt-1 text-primary text-xl">
          <FaCalendarDays />
        </div>
        <div className="flex-1">
            <div className="flex items-center">
                <h3 className="font-bold text-stone-700 text-sm">日程・時期</h3>
                <EditButton stepIndex={steps.dates} />
            </div>
          <p className="text-stone-600 font-medium">
            {input.dates || "未設定"}
          </p>
        </div>
      </div>

      {/* Pace */}
       <div className="flex items-start gap-3 border-t border-stone-100 pt-3">
        <div className="mt-1 text-primary text-xl">
          <FaPersonRunning />
        </div>
        <div className="flex-1">
          <div className="flex items-center">
             <h3 className="font-bold text-stone-700 text-sm">旅行のペース</h3>
             <EditButton stepIndex={steps.pace} />
          </div>
          <p className="text-stone-600 font-medium">
            {input.pace === "relaxed" && "ゆったり (1日1-2箇所)"}
            {input.pace === "normal" && "普通 (1日3-4箇所)"}
            {input.pace === "packed" && "盛りだくさん (行けるだけ行く!)"}
            {!input.pace && "未設定"}
          </p>
        </div>
      </div>

      {/* Free Text */}
      {input.freeText && (
        <div className="mt-4 p-4 bg-stone-50 rounded-lg border border-dashed border-stone-300 relative group">
          <div className="absolute top-2 right-2">
               <EditButton stepIndex={steps.freeText} />
          </div>
          <h3 className="text-xs font-bold text-stone-500 mb-1">その他の要望</h3>
          <p className="text-stone-700 text-sm whitespace-pre-wrap">
            {input.freeText}
          </p>
        </div>
      )}
    </div>
  );
}
