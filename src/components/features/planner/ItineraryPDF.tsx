import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { Itinerary, TravelInfoCategory, SafetyInfo, BasicCountryInfo, VisaInfo, HealthcareInfo, MannerInfo, ClimateInfo } from '@/types';
import type { CategoryState } from "@/components/features/travel-info/types";
import { CATEGORY_INFO } from "@/components/features/travel-info/types";

const theme = {
  primary: "#e67e22", // Orange
  text: "#2c2c2c", // Dark Grey
  textLight: "#6b7280", // Light Grey
  bg: "#fcfbf9", // Cream
  border: "#e5e7eb", // Light Border
  sectionBg: "#ffffff", // White
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Noto Sans JP",
    fontSize: 9,
    backgroundColor: theme.bg,
    color: theme.text,
  },
  // Header
  header: {
    marginBottom: 25,
    borderBottomWidth: 2,
    borderBottomColor: theme.primary,
    paddingBottom: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerLeft: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 10,
    color: theme.primary,
    letterSpacing: 2,
    marginBottom: 8,
    fontWeight: "bold",
  },
  destinationTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: theme.text,
    lineHeight: 1,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  dateBox: {
    backgroundColor: theme.sectionBg,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.border,
  },
  dateText: {
    fontSize: 9,
    color: theme.textLight,
  },

  // Description
  descriptionBox: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: theme.sectionBg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.border,
    borderLeftWidth: 4,
    borderLeftColor: theme.primary,
  },
  descriptionText: {
    fontSize: 10,
    lineHeight: 1.6,
    color: theme.text,
  },

  // Timeline
  timelineContainer: {
    marginTop: 10,
    paddingLeft: 10,
  },
  daySection: {
    marginBottom: 25,
    breakInside: "avoid",
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  dayMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  dayNumberText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
  },
  dayTitleContainer: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingBottom: 5,
    justifyContent: "center",
  },
  dayTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: theme.text,
  },

  // Activities
  activitiesContainer: {
    marginLeft: 16, // Center of 32px marker
    borderLeftWidth: 1,
    borderLeftColor: theme.primary,
    borderLeftStyle: "dashed",
    paddingLeft: 20,
    paddingBottom: 10,
  },
  activity: {
    marginBottom: 12,
    position: "relative",
  },
  timelineDot: {
    position: "absolute",
    left: -24, // -20 padding + -4 center alignment
    top: 3,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: theme.sectionBg,
    borderWidth: 2,
    borderColor: theme.primary,
  },
  activityHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 9,
    fontFamily: "Noto Sans JP",
    fontWeight: "bold",
    color: theme.primary,
    width: 35,
    marginRight: 5,
  },
  activityTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: theme.text,
    flex: 1,
  },
  activityDescription: {
    fontSize: 9,
    color: theme.textLight,
    lineHeight: 1.4,
    marginTop: 2,
    paddingLeft: 40,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 8,
    color: theme.textLight,
  },

  // Memo
  memoSection: {
    marginTop: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: theme.border,
    borderStyle: "dashed",
    backgroundColor: theme.sectionBg,
    borderRadius: 4,
    minHeight: 100,
  },
  memoTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: theme.textLight,
    marginBottom: 5,
  },

  // Travel Info Styles
  travelInfoHeader: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: theme.primary,
    paddingBottom: 10,
  },
  travelInfoTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.text,
  },
  travelInfoSubtitle: {
    fontSize: 10,
    color: theme.textLight,
    marginTop: 4,
  },
  categorySection: {
    marginBottom: 20,
    breakInside: "avoid",
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    backgroundColor: theme.sectionBg,
    padding: 10,
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: theme.primary,
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: theme.text,
  },
  categoryContent: {
    paddingLeft: 10,
    paddingRight: 10,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 6,
    alignItems: "flex-start",
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: theme.text,
    width: 100,
    flexShrink: 0,
  },
  infoValue: {
    fontSize: 9,
    color: theme.textLight,
    flex: 1,
    lineHeight: 1.4,
  },
  warningBox: {
    backgroundColor: "#fef3c7",
    padding: 10,
    borderRadius: 4,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#f59e0b",
  },
  warningText: {
    fontSize: 9,
    color: "#92400e",
    lineHeight: 1.4,
  },
  dangerBox: {
    backgroundColor: "#fee2e2",
    padding: 10,
    borderRadius: 4,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#ef4444",
  },
  dangerText: {
    fontSize: 9,
    color: "#991b1b",
    lineHeight: 1.4,
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 4,
    paddingLeft: 10,
  },
  bulletPoint: {
    fontSize: 9,
    color: theme.primary,
    marginRight: 6,
  },
  listText: {
    fontSize: 9,
    color: theme.textLight,
    flex: 1,
    lineHeight: 1.4,
  },
});

interface ItineraryPDFProps {
  itinerary: Itinerary;
  includeTravelInfo?: boolean;
  travelInfoData?: Map<TravelInfoCategory, CategoryState>;
}

// Helper component for rendering travel info categories
const TravelInfoSection: React.FC<{
  category: TravelInfoCategory;
  state: CategoryState;
}> = ({ category, state }) => {
  if (state.status !== "success" || !state.data) return null;

  const info = CATEGORY_INFO[category];
  if (!info) return null;

  const data = state.data.data;

  return (
    <View style={styles.categorySection}>
      <View style={styles.categoryHeader}>
        <Text style={styles.categoryTitle}>{info.label}</Text>
      </View>
      <View style={styles.categoryContent}>
        {category === "basic" && <BasicInfoContent data={data as BasicCountryInfo} />}
        {category === "safety" && <SafetyInfoContent data={data as SafetyInfo} />}
        {category === "visa" && <VisaInfoContent data={data as VisaInfo} />}
        {category === "healthcare" && <HealthcareInfoContent data={data as HealthcareInfo} />}
        {category === "manner" && <MannerInfoContent data={data as MannerInfo} />}
        {category === "climate" && <ClimateInfoContent data={data as ClimateInfo} />}
        {/* Add more categories as needed */}
      </View>
    </View>
  );
};

// Content components for each category
const BasicInfoContent: React.FC<{ data: BasicCountryInfo }> = ({ data }) => (
  <>
    {data.officialName && (
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>正式名称</Text>
        <Text style={styles.infoValue}>{data.officialName}</Text>
      </View>
    )}
    {data.capital && (
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>首都</Text>
        <Text style={styles.infoValue}>{data.capital}</Text>
      </View>
    )}
    {data.languages && data.languages.length > 0 && (
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>公用語</Text>
        <Text style={styles.infoValue}>{data.languages.join(", ")}</Text>
      </View>
    )}
    {data.timezone && (
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>タイムゾーン</Text>
        <Text style={styles.infoValue}>{data.timezone}</Text>
      </View>
    )}
  </>
);

const SafetyInfoContent: React.FC<{ data: SafetyInfo }> = ({ data }) => (
  <>
    {data.dangerLevel && (
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>危険度</Text>
        <Text style={styles.infoValue}>{data.dangerLevel}</Text>
      </View>
    )}
    {data.summary && (
      <View style={styles.warningBox}>
        <Text style={styles.warningText}>{data.summary}</Text>
      </View>
    )}
    {data.tips && data.tips.length > 0 && (
      <View style={{ marginTop: 8 }}>
        <Text style={[styles.infoLabel, { marginBottom: 4 }]}>安全のヒント</Text>
        {data.tips.slice(0, 5).map((tip, i) => (
          <View key={i} style={styles.listItem}>
            <Text style={styles.bulletPoint}>•</Text>
            <Text style={styles.listText}>{tip}</Text>
          </View>
        ))}
      </View>
    )}
  </>
);

const VisaInfoContent: React.FC<{ data: VisaInfo }> = ({ data }) => (
  <>
    {data.visaRequired !== undefined && (
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>ビザ要否</Text>
        <Text style={styles.infoValue}>{data.visaRequired ? "必要" : "不要"}</Text>
      </View>
    )}
    {data.stayDuration && (
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>滞在可能日数</Text>
        <Text style={styles.infoValue}>{data.stayDuration}</Text>
      </View>
    )}
    {data.requirements && data.requirements.length > 0 && (
      <View style={{ marginTop: 8 }}>
        <Text style={[styles.infoLabel, { marginBottom: 4 }]}>必要書類</Text>
        {data.requirements.slice(0, 5).map((req, i) => (
          <View key={i} style={styles.listItem}>
            <Text style={styles.bulletPoint}>•</Text>
            <Text style={styles.listText}>{req}</Text>
          </View>
        ))}
      </View>
    )}
  </>
);

const HealthcareInfoContent: React.FC<{ data: HealthcareInfo }> = ({ data }) => (
  <>
    {data.healthcareQuality && (
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>医療水準</Text>
        <Text style={styles.infoValue}>{data.healthcareQuality}</Text>
      </View>
    )}
    {data.vaccinations && data.vaccinations.length > 0 && (
      <View style={{ marginTop: 8 }}>
        <Text style={[styles.infoLabel, { marginBottom: 4 }]}>推奨予防接種</Text>
        {data.vaccinations.slice(0, 5).map((vac, i) => (
          <View key={i} style={styles.listItem}>
            <Text style={styles.bulletPoint}>•</Text>
            <Text style={styles.listText}>{vac}</Text>
          </View>
        ))}
      </View>
    )}
    {data.emergencyInfo && (
      <View style={styles.dangerBox}>
        <Text style={styles.dangerText}>{data.emergencyInfo}</Text>
      </View>
    )}
  </>
);

const MannerInfoContent: React.FC<{ data: MannerInfo }> = ({ data }) => (
  <>
    {data.greetings && (
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>挨拶</Text>
        <Text style={styles.infoValue}>{data.greetings}</Text>
      </View>
    )}
    {data.taboos && data.taboos.length > 0 && (
      <View style={{ marginTop: 8 }}>
        <Text style={[styles.infoLabel, { marginBottom: 4 }]}>タブー・注意事項</Text>
        {data.taboos.slice(0, 5).map((taboo, i) => (
          <View key={i} style={styles.listItem}>
            <Text style={styles.bulletPoint}>•</Text>
            <Text style={styles.listText}>{taboo}</Text>
          </View>
        ))}
      </View>
    )}
    {data.dressCode && (
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>服装</Text>
        <Text style={styles.infoValue}>{data.dressCode}</Text>
      </View>
    )}
  </>
);

const ClimateInfoContent: React.FC<{ data: ClimateInfo }> = ({ data }) => (
  <>
    {data.climate && (
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>気候</Text>
        <Text style={styles.infoValue}>{data.climate}</Text>
      </View>
    )}
    {data.bestSeason && (
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>ベストシーズン</Text>
        <Text style={styles.infoValue}>{data.bestSeason}</Text>
      </View>
    )}
    {data.packingTips && data.packingTips.length > 0 && (
      <View style={{ marginTop: 8 }}>
        <Text style={[styles.infoLabel, { marginBottom: 4 }]}>持ち物のヒント</Text>
        {data.packingTips.slice(0, 5).map((tip, i) => (
          <View key={i} style={styles.listItem}>
            <Text style={styles.bulletPoint}>•</Text>
            <Text style={styles.listText}>{tip}</Text>
          </View>
        ))}
      </View>
    )}
  </>
);

const ItineraryPDF: React.FC<ItineraryPDFProps> = ({
  itinerary,
  includeTravelInfo,
  travelInfoData,
}) => {
  // Get categories that have successful data
  const successfulCategories = travelInfoData
    ? Array.from(travelInfoData.entries())
        .filter(([, state]) => state.status === "success")
        .map(([cat]) => cat)
    : [];

  return (
    <Document>
      {/* Itinerary Page */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.brandTitle}>TRAVEL PLAN</Text>
            <Text style={styles.destinationTitle}>{itinerary.destination}</Text>
          </View>
          <View style={styles.headerRight}>
             <View style={styles.dateBox}>
                <Text style={styles.dateText}>
                   作成日: {new Date().toLocaleDateString('ja-JP')}
                </Text>
                <Text style={[styles.dateText, { marginTop: 2 }]}>
                   {itinerary.days.length} Days Trip
                </Text>
             </View>
          </View>
        </View>

        {/* Description */}
        <View style={styles.descriptionBox}>
           <Text style={styles.descriptionText}>{itinerary.description}</Text>
        </View>

        {/* Itinerary Days */}
        <View style={styles.timelineContainer}>
          {itinerary.days.map((day) => (
            <View key={day.day} style={styles.daySection}>
              {/* Day Header */}
              <View style={styles.dayHeader}>
                <View style={styles.dayMarker}>
                  <Text style={styles.dayNumberText}>{day.day}</Text>
                </View>
                <View style={styles.dayTitleContainer}>
                  <Text style={styles.dayTitle}>{day.title}</Text>
                </View>
              </View>

              {/* Activities Timeline */}
              <View style={styles.activitiesContainer}>
                {day.activities.map((activity, index) => (
                  <View key={index} style={styles.activity}>
                    {/* Timeline Dot */}
                    <View style={styles.timelineDot} />

                    <View style={styles.activityHeader}>
                      <Text style={styles.activityTime}>{activity.time}</Text>
                      <Text style={styles.activityTitle}>{activity.activity}</Text>
                    </View>
                    <Text style={styles.activityDescription}>
                      {activity.description}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Memo Section */}
        <View style={styles.memoSection}>
           <Text style={styles.memoTitle}>MEMO</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) =>
            `${pageNumber} / ${totalPages}`
          } />
          <Text style={[styles.footerText, { color: theme.primary, fontWeight: 'bold' }]}>Powered by Tabidea</Text>
        </View>
      </Page>

      {/* Travel Info Pages */}
      {includeTravelInfo && travelInfoData && successfulCategories.length > 0 && (
        <Page size="A4" style={styles.page} wrap>
          {/* Travel Info Header */}
          <View style={styles.travelInfoHeader}>
            <Text style={styles.travelInfoTitle}>渡航情報・安全ガイド</Text>
            <Text style={styles.travelInfoSubtitle}>
              {itinerary.destination} - Travel Information & Safety Guide
            </Text>
          </View>

          {/* Render each category */}
          {successfulCategories.map((category) => {
            const state = travelInfoData.get(category);
            if (!state) return null;
            return (
              <TravelInfoSection key={category} category={category} state={state} />
            );
          })}

          {/* Disclaimer */}
          <View style={[styles.descriptionBox, { marginTop: 20 }]}>
            <Text style={[styles.descriptionText, { fontSize: 8, color: theme.textLight }]}>
              ※ この情報はAIによって生成されたものであり、正確性を保証するものではありません。
              渡航前には必ず外務省海外安全ホームページ等の公式情報をご確認ください。
            </Text>
          </View>

          {/* Footer */}
          <View style={styles.footer} fixed>
            <Text style={styles.footerText} render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            } />
            <Text style={[styles.footerText, { color: theme.primary, fontWeight: 'bold' }]}>Powered by Tabidea</Text>
          </View>
        </Page>
      )}
    </Document>
  );
};

export default ItineraryPDF;
