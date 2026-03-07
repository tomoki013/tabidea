import { UserInput } from '@/types';
import { useTranslations } from "next-intl";
import {
  FaMapLocationDot,
  FaCalendarDays,
  FaUserGroup,
  FaPalette,
  FaWallet,
  FaPersonRunning,
  FaPen,
} from "react-icons/fa6";
import { FaPlane, FaTrain, FaBus, FaShip, FaCar, FaQuestion } from "react-icons/fa";

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
  saving: "saving",
  standard: "standard",
  high: "high",
  luxury: "luxury",
};

function formatBudgetDisplay(
  budget: string,
  t: ReturnType<typeof useTranslations>,
  tBudgetOptions: ReturnType<typeof useTranslations>
): string {
  if (budget.startsWith("range:")) {
    const parts = budget.split(":");
    if (parts.length >= 3) {
      const min = Number.parseInt(parts[1], 10);
      const max = Number.parseInt(parts[2], 10);
      const formatAmount = (value: number) => {
        if (value >= 10000) {
          return t("budget.tenThousandAmount", {
            value: (value / 10000).toFixed(value % 10000 === 0 ? 0 : 1),
          });
        }
        return t("budget.yenAmount", { value: value.toLocaleString() });
      };
      return t("budget.range", {
        min: formatAmount(min),
        max: formatAmount(max),
      });
    }
  }
  const budgetKey = budgetMap[budget];
  return budgetKey ? tBudgetOptions(`${budgetKey}.label`) : budget;
}

const regionMap: Record<string, "domestic" | "overseas" | "anywhere"> = {
  domestic: "domestic",
  overseas: "overseas",
  anywhere: "anywhere",
};

const transitTypeMap: Record<string, "flight" | "train" | "bus" | "ship" | "car" | "other"> = {
  flight: "flight",
  train: "train",
  bus: "bus",
  ship: "ship",
  car: "car",
  other: "other",
};

const transitIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  flight: FaPlane,
  train: FaTrain,
  bus: FaBus,
  ship: FaShip,
  car: FaCar,
  other: FaQuestion,
};

const EditButton = ({
  stepIndex,
  onEdit,
  t,
}: {
  stepIndex: number;
  onEdit?: (stepIndex: number) => void;
  t: ReturnType<typeof useTranslations>;
}) => {
  if (!onEdit) return null;
  return (
    <button
      onClick={() => onEdit(stepIndex)}
      className="ml-2 text-stone-400 hover:text-primary transition-colors p-1"
      aria-label={t("editAria")}
      title={t("editTitle")}
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
  const t = useTranslations("components.features.planner.requestSummary");
  const tCompanionOptions = useTranslations("components.features.planner.steps.stepCompanions.options");
  const tPaceOptions = useTranslations("components.features.planner.steps.stepPace.options");
  const tRegionOptions = useTranslations("components.features.planner.steps.stepRegion.regions");
  const tTransitTypes = useTranslations("components.features.planner.steps.transitForm.types");
  const tBudgetOptions = useTranslations("components.features.planner.steps.stepBudget.options");

  const companionLabelMap: Record<string, "solo" | "couple" | "friends" | "family"> = {
    solo: "solo",
    couple: "couple",
    friends: "friends",
    family: "family",
  };

  const paceLabelMap: Record<string, "relaxed" | "balanced" | "active" | "packed"> = {
    relaxed: "relaxed",
    balanced: "balanced",
    active: "active",
    packed: "packed",
  };

  const formatPace = (pace: string) => {
    if (pace === "normal") return t("pace.normal");
    const key = paceLabelMap[pace];
    if (!key) return pace;
    return t("pace.value", {
      label: tPaceOptions(`${key}.label`),
      desc: tPaceOptions(`${key}.desc`),
    });
  };

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
             {regionMap[input.region] ? tRegionOptions(`${regionMap[input.region]}.label`) : input.region}
         </p>
      );
    }

    // 3. Travel Vibe
    if (input.travelVibe) {
       return (
         <>
           <p className="text-stone-600 font-medium">{t("destinationAreaUndecided")}</p>
           <p className="text-xs text-stone-500 mt-1">
                {t("vibePrefix")} {input.travelVibe}
           </p>
         </>
       );
    }

    // 4. Fallback
    return <p className="text-stone-600 font-medium">{t("unset")}</p>;
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
                {t("sections.destination")}
              </h3>
              <EditButton stepIndex={steps.destination} onEdit={onEdit} t={t} />
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
                  {t("sections.mustVisit")}
                </h3>
                <EditButton stepIndex={steps.mustVisit} onEdit={onEdit} t={t} />
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
              <h3 className="font-bold text-stone-700 text-sm">{t("sections.companions")}</h3>
              <EditButton stepIndex={steps.companions} onEdit={onEdit} t={t} />
            </div>
            <p className="text-stone-600 font-medium">
              {companionLabelMap[input.companions]
                ? tCompanionOptions(`${companionLabelMap[input.companions]}.label`)
                : input.companions}
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
              <h3 className="font-bold text-stone-700 text-sm">{t("sections.themes")}</h3>
              <EditButton stepIndex={steps.themes} onEdit={onEdit} t={t} />
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
              <h3 className="font-bold text-stone-700 text-sm">{t("sections.budget")}</h3>
              <EditButton stepIndex={steps.budget} onEdit={onEdit} t={t} />
            </div>
            <p className="text-stone-600 font-medium">
              {formatBudgetDisplay(input.budget, t, tBudgetOptions)}
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
              <h3 className="font-bold text-stone-700 text-sm">{t("sections.dates")}</h3>
              <EditButton stepIndex={steps.dates} onEdit={onEdit} t={t} />
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
              <h3 className="font-bold text-stone-700 text-sm">{t("sections.pace")}</h3>
              <EditButton stepIndex={steps.pace} onEdit={onEdit} t={t} />
            </div>
            <p className="text-stone-600 font-medium">
              {formatPace(input.pace)}
            </p>
          </div>
        </div>
      )}

      {/* Transits / Transportation Preferences */}
      {input.transits && Object.keys(input.transits).length > 0 && (
        <div className="flex items-start gap-3 border-t border-stone-100 pt-3 first:border-t-0 first:pt-0">
          <div className="mt-1 text-primary text-xl">
            <FaPlane />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-stone-700 text-sm">{t("sections.transits")}</h3>
            <div className="mt-2 space-y-2">
              {Object.entries(input.transits).map(([dayIndex, transit]) => {
                const Icon = transitIconMap[transit.type] || FaQuestion;
                return (
                  <div key={dayIndex} className="flex items-start gap-2 text-sm">
                    <div className="flex items-center gap-1.5 mt-0.5 px-2 py-1 bg-stone-100 rounded-full">
                      <Icon className="text-primary text-xs" />
                      <span className="font-medium text-stone-700">
                        {transitTypeMap[transit.type]
                          ? tTransitTypes(transitTypeMap[transit.type])
                          : transit.type}
                      </span>
                    </div>
                    <div className="flex-1 text-stone-600">
                      <div className="flex items-center gap-2">
                        <span>{transit.departure.place}</span>
                        <span className="text-stone-400">→</span>
                        <span>{transit.arrival.place}</span>
                      </div>
                      {transit.departure.time && transit.arrival.time && (
                        <div className="text-xs text-stone-500 mt-0.5">
                          {transit.departure.time} - {transit.arrival.time}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Fixed Schedule / Bookings */}
      {input.fixedSchedule && input.fixedSchedule.length > 0 && (
        <div className="flex items-start gap-3 border-t border-stone-100 pt-3 first:border-t-0 first:pt-0">
          <div className="mt-1 text-primary text-xl">
            <FaPlane />
          </div>
          <div className="flex-1">
            <div className="flex items-center">
              <h3 className="font-bold text-stone-700 text-sm">{t("sections.bookedItems")}</h3>
              <EditButton stepIndex={steps.freeText} onEdit={onEdit} t={t} />
            </div>
            <ul className="mt-1 space-y-1 text-stone-600 font-medium">
              {input.fixedSchedule.map((item, index) => (
                <li key={`${item.type}-${item.name}-${index}`}>
                  <span className="font-semibold">
                    {t(`bookingTypes.${item.type}`)}
                  </span>
                  {": "}
                  {item.name}
                  {item.date ? ` (${item.date}${item.time ? ` ${item.time}` : ""})` : ""}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Free Text */}
      {input.freeText && (
        <div className="mt-4 p-4 bg-stone-50 rounded-lg border border-dashed border-stone-300 relative group">
          <div className="absolute top-2 right-2">
            <EditButton stepIndex={steps.freeText} onEdit={onEdit} t={t} />
          </div>
          <h3 className="text-xs font-bold text-stone-500 mb-1">
            {t("sections.freeText")}
          </h3>
          <p className="text-stone-700 text-sm whitespace-pre-wrap">
            {input.freeText}
          </p>
        </div>
      )}
    </div>
  );
}
