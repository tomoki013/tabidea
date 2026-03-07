import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FaFlag, FaCheck, FaTools } from "react-icons/fa";
import { localizePath } from "@/lib/i18n/locales";
import { getRequestLanguage } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.marketing.updatesPage");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

type UpdateType = "release" | "pre_release" | "patch" | "minor" | "major";

type RoadmapItem = {
  status: "done" | "planned" | "developing";
  date?: string; // For done items
  updateType?: UpdateType;
  translationKey: string;
};

// Chronological order (Oldest -> Newest)
// Source of truth is CHANGELOG.md; this array is a user-facing summary.
// This enables dynamic version calculation from a base of 0.0.0
const rawRoadmapData: RoadmapItem[] = [
  {
    status: "done",
    date: "2025.12.13",
    updateType: "pre_release",
    translationKey: "entry001",
  },
  {
    status: "done",
    date: "2025.12.23",
    updateType: "pre_release",
    translationKey: "entry002",
  },
  {
    status: "done",
    date: "2025.01.08",
    updateType: "patch",
    translationKey: "entry003",
  },
  {
    status: "done",
    date: "2026.01.09",
    updateType: "patch",
    translationKey: "entry004",
  },
  {
    status: "done",
    date: "2026.01.10",
    updateType: "patch",
    translationKey: "entry005",
  },
  {
    status: "done",
    date: "2026.01.10",
    updateType: "patch",
    translationKey: "entry006",
  },
  {
    status: "done",
    date: "2026.01.11",
    updateType: "patch",
    translationKey: "entry007",
  },
  {
    status: "done",
    date: "2026.01.13",
    updateType: "patch",
    translationKey: "entry008",
  },
  {
    status: "done",
    date: "2026.01.14",
    updateType: "patch",
    translationKey: "entry009",
  },
  {
    status: "done",
    date: "2026.01.14",
    updateType: "patch",
    translationKey: "entry010",
  },
  {
    status: "done",
    date: "2026.01.15",
    updateType: "patch",
    translationKey: "entry011",
  },
  {
    status: "done",
    date: "2026.01.16",
    updateType: "patch",
    translationKey: "entry012",
  },
  {
    status: "done",
    date: "2026.01.16",
    updateType: "patch",
    translationKey: "entry013",
  },
  {
    status: "done",
    date: "2026.01.17",
    updateType: "patch",
    translationKey: "entry014",
  },
  {
    status: "done",
    date: "2026.01.19",
    updateType: "patch",
    translationKey: "entry015",
  },
  {
    status: "done",
    date: "2026.01.19",
    updateType: "patch",
    translationKey: "entry016",
  },
  {
    status: "done",
    date: "2026.01.20",
    updateType: "patch",
    translationKey: "entry017",
  },
  {
    status: "done",
    date: "2026.01.21",
    updateType: "patch",
    translationKey: "entry018",
  },
  {
    status: "done",
    date: "2026.01.22",
    updateType: "patch",
    translationKey: "entry019",
  },
  {
    status: "done",
    date: "2026.01.23",
    updateType: "patch",
    translationKey: "entry020",
  },
  {
    status: "done",
    date: "2026.01.23",
    updateType: "patch",
    translationKey: "entry021",
  },
  {
    status: "done",
    date: "2026.01.24",
    updateType: "patch",
    translationKey: "entry022",
  },
  {
    status: "done",
    date: "2026.01.26",
    updateType: "minor",
    translationKey: "entry023",
  },
  {
    status: "done",
    date: "2026.01.26",
    updateType: "patch",
    translationKey: "entry024",
  },
  {
    status: "done",
    date: "2026.01.27",
    updateType: "patch",
    translationKey: "entry025",
  },
  {
    status: "done",
    date: "2026.01.27",
    updateType: "patch",
    translationKey: "entry026",
  },
  {
    status: "done",
    date: "2026.01.28",
    updateType: "patch",
    translationKey: "entry027",
  },
  {
    status: "done",
    date: "2026.01.28",
    updateType: "patch",
    translationKey: "entry028",
  },
  {
    status: "done",
    date: "2026.01.29",
    updateType: "patch",
    translationKey: "entry029",
  },
  {
    status: "done",
    date: "2026.01.30",
    updateType: "patch",
    translationKey: "entry030",
  },
  {
    status: "done",
    date: "2026.01.30",
    updateType: "patch",
    translationKey: "entry031",
  },
  {
    status: "done",
    date: "2026.02.01",
    updateType: "minor",
    translationKey: "entry032",
  },
  {
    status: "done",
    date: "2026.02.02",
    updateType: "patch",
    translationKey: "entry033",
  },
  {
    status: "done",
    date: "2026.02.02",
    updateType: "patch",
    translationKey: "entry034",
  },
  {
    status: "done",
    date: "2026.02.02",
    updateType: "patch",
    translationKey: "entry035",
  },
  {
    status: "done",
    date: "2026.02.03",
    updateType: "patch",
    translationKey: "entry036",
  },
  {
    status: "done",
    date: "2026.02.03",
    updateType: "patch",
    translationKey: "entry037",
  },
  {
    status: "done",
    date: "2026.02.03",
    updateType: "patch",
    translationKey: "entry038",
  },
  {
    status: "done",
    date: "2026.02.03",
    updateType: "patch",
    translationKey: "entry039",
  },
  {
    status: "done",
    date: "2026.02.04",
    updateType: "patch",
    translationKey: "entry040",
  },
  {
    status: "done",
    date: "2026.02.05",
    updateType: "patch",
    translationKey: "entry041",
  },
  {
    status: "done",
    date: "2026.02.05",
    updateType: "patch",
    translationKey: "entry042",
  },
  {
    status: "done",
    date: "2026.02.05",
    updateType: "patch",
    translationKey: "entry043",
  },
  {
    status: "done",
    date: "2026.02.05",
    updateType: "patch",
    translationKey: "entry044",
  },
  {
    status: "done",
    date: "2026.02.05",
    updateType: "patch",
    translationKey: "entry045",
  },
  {
    status: "done",
    date: "2026.02.06",
    updateType: "patch",
    translationKey: "entry046",
  },
  {
    status: "done",
    date: "2026.02.06",
    updateType: "patch",
    translationKey: "entry047",
  },
  {
    status: "planned",
    translationKey: "entry048",
  },
  {
    status: "planned",
    translationKey: "entry049",
  },
  {
    status: "planned",
    translationKey: "entry050",
  },
  {
    status: "developing",
    translationKey: "entry051",
  },
  {
    status: "planned",
    translationKey: "entry052",
  },
  {
    status: "planned",
    translationKey: "entry053",
  },
  {
    status: "done",
    date: "2026.03.04",
    updateType: "patch",
    translationKey: "entry054",
  },
  {
    status: "planned",
    translationKey: "entry055",
  },
  {
    status: "planned",
    translationKey: "entry056",
  },
  {
    status: "done",
    date: "2026.02.07",
    updateType: "patch",
    translationKey: "entry057",
  },
  {
    status: "done",
    date: "2026.02.07",
    updateType: "patch",
    translationKey: "entry058",
  },
  {
    status: "done",
    date: "2026.02.07",
    updateType: "patch",
    translationKey: "entry059",
  },
  {
    status: "done",
    date: "2026.02.08",
    updateType: "patch",
    translationKey: "entry060",
  },
  {
    status: "done",
    date: "2026.02.08",
    updateType: "patch",
    translationKey: "entry061",
  },
  {
    status: "done",
    date: "2026.02.08",
    updateType: "patch",
    translationKey: "entry062",
  },
  {
    status: "done",
    date: "2026.02.09",
    updateType: "patch",
    translationKey: "entry063",
  },
  {
    status: "done",
    date: "2026.02.09",
    updateType: "patch",
    translationKey: "entry064",
  },
  {
    status: "done",
    date: "2026.02.09",
    updateType: "patch",
    translationKey: "entry065",
  },
  {
    status: "done",
    date: "2026.02.10",
    updateType: "patch",
    translationKey: "entry066",
  },
  {
    status: "done",
    date: "2026.02.11",
    updateType: "patch",
    translationKey: "entry067",
  },
  {
    status: "done",
    date: "2026.02.13",
    updateType: "patch",
    translationKey: "entry068",
  },
  {
    status: "done",
    date: "2026.02.14",
    updateType: "patch",
    translationKey: "entry069",
  },
  {
    status: "done",
    date: "2026.02.15",
    updateType: "patch",
    translationKey: "entry070",
  },
  {
    status: "done",
    date: "2026.02.16",
    updateType: "patch",
    translationKey: "entry071",
  },
  {
    status: "done",
    date: "2026.02.16",
    updateType: "patch",
    translationKey: "entry072",
  },
  {
    status: "done",
    date: "2026.02.16",
    updateType: "patch",
    translationKey: "entry073",
  },
  {
    status: "done",
    date: "2026.02.16",
    updateType: "patch",
    translationKey: "entry074",
  },
  {
    status: "done",
    date: "2026.02.17",
    updateType: "patch",
    translationKey: "entry075",
  },
  {
    status: "done",
    date: "2026.02.17",
    updateType: "patch",
    translationKey: "entry076",
  },
  {
    status: "done",
    date: "2026.02.17",
    updateType: "patch",
    translationKey: "entry077",
  },
  {
    status: "done",
    date: "2026.02.17",
    updateType: "patch",
    translationKey: "entry078",
  },
  {
    status: "done",
    date: "2026.02.17",
    updateType: "patch",
    translationKey: "entry080",
  },
  {
    status: "done",
    date: "2026.02.18",
    updateType: "patch",
    translationKey: "entry081",
  },
  {
    status: "done",
    date: "2026.02.18",
    updateType: "patch",
    translationKey: "entry082",
  },
  {
    status: "done",
    date: "2026.02.18",
    updateType: "patch",
    translationKey: "entry083",
  },
  {
    status: "done",
    date: "2026.02.18",
    updateType: "patch",
    translationKey: "entry084",
  },
  {
    status: "done",
    date: "2026.02.23",
    updateType: "patch",
    translationKey: "entry085",
  },
  {
    status: "done",
    date: "2026.02.24",
    updateType: "patch",
    translationKey: "entry086",
  },
  {
    status: "done",
    date: "2026.02.24",
    updateType: "patch",
    translationKey: "entry087",
  },
  {
    status: "done",
    date: "2026.02.24",
    updateType: "patch",
    translationKey: "entry088",
  },
  {
    status: "done",
    date: "2026.02.24",
    updateType: "patch",
    translationKey: "entry089",
  },
  {
    status: "done",
    date: "2026.02.24",
    updateType: "patch",
    translationKey: "entry090",
  },
  {
    status: "done",
    date: "2026.02.24",
    updateType: "patch",
    translationKey: "entry091",
  },
  {
    status: "done",
    date: "2026.02.25",
    updateType: "patch",
    translationKey: "entry092",
  },
  {
    status: "done",
    date: "2026.03.03",
    updateType: "patch",
    translationKey: "entry093",
  },
  {
    status: "done",
    date: "2026.03.04",
    updateType: "patch",
    translationKey: "entry094",
  },
  {
    status: "done",
    date: "2026.03.05",
    updateType: "patch",
    translationKey: "entry095",
  },
  {
    status: "done",
    date: "2026.03.06",
    updateType: "patch",
    translationKey: "entry096",
  },
  {
    status: "done",
    date: "2026.03.07",
    updateType: "patch",
    translationKey: "entry097",
  },
  {
    status: "done",
    date: "2026.03.07",
    updateType: "patch",
    translationKey: "entry098",
  },
  {
    status: "done",
    date: "2026.03.08",
    updateType: "release",
    translationKey: "entry099",
  },
  {
    status: "planned",
    translationKey: "entry100",
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

// 1) Define status priority (smaller number appears first)
const statusPriority: Record<RoadmapItem["status"], number> = {
  developing: 1, // show at top
  planned: 2,
  done: 3,
};

// 2) Sort using the priority values above
// Note: We use the raw data logic for Roadmap section (future items),
// but typically we just filter the computed 'roadmapData' too.
const sortedRoadmap = roadmapData.toSorted((a, b) => {
  return statusPriority[a.status] - statusPriority[b.status];
});

// For history, we want Newest -> Oldest
const historyItems = roadmapData
  .filter((i) => i.status === "done")
  .toReversed();

export default async function UpdatesPage() {
  const language = await getRequestLanguage();
  const t = await getTranslations("pages.marketing.updatesPage");
  const isEnglish = language === "en";
  return (
    <div className="min-h-screen pt-32 pb-20 px-8 sm:px-20 font-sans">
      <main className="max-w-4xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#2c2c2c] mb-4">
            {t("title")}
          </h1>
          <p className="text-stone-600 font-hand text-lg">
            {t("lead")}
          </p>
        </header>

        <div className="space-y-12">
          {/* Section: Development Status */}
          <section>
            <h2 className="text-xl font-bold text-[#e67e22] mb-6 flex items-center gap-2 border-b-2 border-[#e67e22]/20 pb-2">
              <FaTools />
              <span>{t("roadmapTitle")}</span>
            </h2>

            {isEnglish ? (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-100">
                <h3 className="text-lg font-bold text-[#2c2c2c] mb-2 font-serif">
                  {t("roadmapUnavailableTitle")}
                </h3>
                <p className="text-stone-600 leading-relaxed text-sm">
                  {t("roadmapUnavailableBody")}
                </p>
              </div>
            ) : (
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
                          {t("inProgress")}
                        </span>
                      )}
                      <h3 className="text-lg font-bold text-[#2c2c2c] mb-2 font-serif">
                        {t(`entries.${item.translationKey}.title`)}
                      </h3>
                      <p className="text-stone-600 leading-relaxed text-sm flex-grow">
                        {t(`entries.${item.translationKey}.description`)}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </section>

          {/* Section: Update History */}
          <section>
            <h2 className="text-xl font-bold text-[#2c2c2c] mb-6 flex items-center gap-2 border-b-2 border-stone-200 pb-2">
              <FaCheck className="text-green-600" />
              <span>{t("historyTitle")}</span>
            </h2>

            {isEnglish ? (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-100 mt-8">
                <h3 className="text-lg font-bold text-[#2c2c2c] mb-2 font-serif">
                  {t("historyUnavailableTitle")}
                </h3>
                <p className="text-stone-600 leading-relaxed text-sm">
                  {t("historyUnavailableBody")}
                </p>
              </div>
            ) : (
              <div className="md:columns-2 gap-12 mt-8 space-y-0">
                {historyItems.map((item, index) => (
                  <div
                    key={index}
                    className="relative pl-6 border-l-2 border-stone-200 pb-10 break-inside-avoid"
                  >
                    <div className="absolute -left-[7px] top-0 w-4 h-4 rounded-full border-2 border-green-500 bg-white"></div>

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
                              ? t("updateTypeLabels.release")
                              : item.updateType === "pre_release"
                                ? t("updateTypeLabels.pre_release")
                                : item.updateType === "major"
                                  ? t("updateTypeLabels.major")
                                  : item.updateType === "minor"
                                    ? t("updateTypeLabels.minor")
                                    : t("updateTypeLabels.patch")}
                          </span>
                        )}
                      </span>
                      <h3 className="text-lg font-bold text-[#2c2c2c] mb-2 font-serif">
                        {t(`entries.${item.translationKey}.title`)}
                      </h3>
                      <p className="text-stone-600 leading-relaxed text-sm">
                        {t(`entries.${item.translationKey}.description`)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="mt-16 bg-stone-50 rounded-xl border border-stone-200 p-8">
            <h3 className="text-center font-bold text-lg text-[#2c2c2c] mb-6 font-serif">
              {t("feedbackTitle")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href={localizePath("/contact", language)}
                className="flex flex-col items-center justify-center p-6 bg-white rounded-lg border border-stone-200 hover:border-[#e67e22] hover:shadow-sm transition-all group"
              >
                <span className="font-bold text-[#2c2c2c] group-hover:text-[#e67e22] mb-2">
                  {t("contactTitle")}
                </span>
                <span className="text-xs text-stone-500 text-center">
                  {t("contactDescription")}
                </span>
              </a>
              <a
                href="https://github.com/tomoki013/ai-travel-planner/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-6 bg-white rounded-lg border border-stone-200 hover:border-[#e67e22] hover:shadow-sm transition-all group"
              >
                <span className="flex items-center gap-2 font-bold text-[#2c2c2c] group-hover:text-[#e67e22] mb-2">
                  <FaFlag size={14} /> {t("bugTitle")}
                </span>
                <span className="text-xs text-stone-500 text-center">
                  {t("bugDescription")}
                </span>
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
