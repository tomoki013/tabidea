import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import {
  TravelInfoCategory,
  CategoryState,
} from "@/components/TravelInfo/types";
import {
  BasicCountryInfo,
  CATEGORY_LABELS,
  SafetyInfo,
  ClimateInfo,
  VisaInfo,
  MannerInfo,
  TransportInfo,
  DANGER_LEVEL_DESCRIPTIONS,
} from "@/lib/types/travel-info";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Noto Sans JP",
    fontSize: 10,
    backgroundColor: "#fcfbf9",
    color: "#2c2c2c",
  },
  header: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e67e22",
    borderBottomStyle: "dashed",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  brandText: {
    fontSize: 8,
    color: "#e67e22",
    marginBottom: 4,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  destinationBox: {
    marginTop: 10,
    padding: 10,
    borderWidth: 2,
    borderColor: "#2c2c2c",
    alignSelf: "flex-start",
    backgroundColor: "#ffffff",
  },
  destination: {
    fontSize: 24,
    fontWeight: 700,
    color: "#2c2c2c",
  },
  metaInfo: {
    fontSize: 9,
    color: "#6b7280",
    marginTop: 4,
  },

  // Layout Columns
  columnsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  columnLeft: {
    width: "48%",
  },
  columnRight: {
    width: "48%",
  },

  // Section Styles
  section: {
    marginBottom: 20,
    breakInside: "avoid",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    backgroundColor: "#f9fafb",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#e67e22",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  contentPadding: {
    padding: 10,
  },

  // Content Helpers
  row: {
    flexDirection: "row",
    marginBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f3f4f6",
    paddingBottom: 2,
  },
  label: {
    width: "35%",
    fontSize: 9,
    fontWeight: 700,
    color: "#9ca3af",
  },
  value: {
    flex: 1,
    fontSize: 9,
    color: "#2c2c2c",
  },
  textBlock: {
    fontSize: 9,
    lineHeight: 1.6,
    marginBottom: 6,
    color: "#4b5563",
  },
  subHeader: {
    fontSize: 9,
    fontWeight: 700,
    color: "#4b5563",
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: "#f3f4f6",
    paddingVertical: 2,
    paddingHorizontal: 4,
    alignSelf: "flex-start",
  },

  // Specific
  dangerBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  dangerBadgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "bold",
  },
  warningItem: {
    flexDirection: "row",
    marginBottom: 4,
    paddingLeft: 4,
  },
  bullet: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#e67e22",
    marginRight: 6,
    marginTop: 5,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 30,
    right: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: "#9ca3af",
  },
  footerBrand: {
    fontSize: 8,
    color: "#e67e22",
    fontWeight: 700,
  },
});

interface TravelInfoPDFProps {
  destination: string;
  country: string;
  categoryStates: Map<TravelInfoCategory, CategoryState>;
}

// --- Render Helpers ---

const BasicInfoView = ({ data }: { data: BasicCountryInfo }) => (
  <View style={styles.contentPadding}>
    <View style={styles.row}>
      <Text style={styles.label}>通貨</Text>
      <Text style={styles.value}>{data.currency.name} ({data.currency.code})</Text>
    </View>
    <View style={styles.row}>
      <Text style={styles.label}>言語</Text>
      <Text style={styles.value}>{data.languages.join(", ")}</Text>
    </View>
    <View style={styles.row}>
      <Text style={styles.label}>時差</Text>
      <Text style={styles.value}>{data.timeDifference}</Text>
    </View>
    <View style={[styles.row, { borderBottomWidth: 0 }]}>
      <Text style={styles.label}>タイムゾーン</Text>
      <Text style={styles.value}>{data.timezone}</Text>
    </View>
  </View>
);

const SafetyInfoView = ({ data }: { data: SafetyInfo }) => {
  const getDangerColor = (level: number) => {
    switch (level) {
      case 0: return "#10b981";
      case 1: return "#f59e0b";
      case 2: return "#f97316";
      case 3: return "#ef4444";
      case 4: return "#7f1d1d";
      default: return "#6b7280";
    }
  };

  return (
    <View style={styles.contentPadding}>
      <View style={[styles.dangerBadge, { backgroundColor: getDangerColor(data.dangerLevel) }]}>
        <Text style={styles.dangerBadgeText}>
          レベル{data.dangerLevel}: {DANGER_LEVEL_DESCRIPTIONS[data.dangerLevel]}
        </Text>
      </View>
      <Text style={styles.textBlock}>{data.dangerLevelDescription}</Text>

      <Text style={styles.subHeader}>緊急連絡先</Text>
      {data.emergencyContacts.map((contact, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.label}>{contact.name}</Text>
          <Text style={styles.value}>{contact.number}</Text>
        </View>
      ))}
    </View>
  );
};

const ClimateInfoView = ({ data }: { data: ClimateInfo }) => (
  <View style={styles.contentPadding}>
    <Text style={[styles.textBlock, { marginBottom: 10 }]}>{data.seasonDescription}</Text>

    <Text style={styles.subHeader}>おすすめの服装</Text>
    {data.recommendedClothing.map((item, i) => (
       <View key={i} style={styles.warningItem}>
        <View style={styles.bullet} />
        <Text style={styles.value}>{item}</Text>
      </View>
    ))}

    {data.forecast && data.forecast.length > 0 && (
       <View style={{ marginTop: 8 }}>
         <Text style={styles.subHeader}>天気予報</Text>
         {data.forecast.slice(0, 3).map((f, i) => (
           <View key={i} style={styles.row}>
             <Text style={[styles.label, { width: '40%' }]}>{f.date.slice(5)}</Text>
             <Text style={styles.value}>{f.condition} ({f.high}/{f.low}°C)</Text>
           </View>
         ))}
       </View>
    )}
  </View>
);

const VisaInfoView = ({ data }: { data: VisaInfo }) => (
  <View style={styles.contentPadding}>
    <View style={[styles.row, { borderBottomWidth: 0 }]}>
      <Text style={styles.label}>ビザ必要性</Text>
      <Text style={[styles.value, { fontWeight: 'bold', color: data.required ? '#ef4444' : '#10b981' }]}>
        {data.required ? "必要" : "不要"}
        {data.visaFreeStayDays ? ` (${data.visaFreeStayDays}日以内)` : ""}
      </Text>
    </View>

    {data.requirements.length > 0 && (
      <View>
        <Text style={styles.subHeader}>入国要件</Text>
        {data.requirements.map((req, i) => (
          <View key={i} style={styles.warningItem}>
            <View style={styles.bullet} />
            <Text style={styles.value}>{req}</Text>
          </View>
        ))}
      </View>
    )}
  </View>
);

const MannerInfoView = ({ data }: { data: MannerInfo }) => (
  <View style={styles.contentPadding}>
    <Text style={styles.subHeader}>チップ: {data.tipping.required ? "必須" : data.tipping.customary ? "慣習" : "不要"}</Text>
    <Text style={styles.textBlock}>{data.tipping.guideline}</Text>

    <Text style={styles.subHeader}>マナー・習慣</Text>
    {data.customs.slice(0, 3).map((custom, i) => (
      <View key={i} style={styles.warningItem}>
        <View style={styles.bullet} />
        <Text style={styles.value}>{custom}</Text>
      </View>
    ))}

    <Text style={styles.subHeader}>タブー・注意点</Text>
    {data.taboos.slice(0, 3).map((taboo, i) => (
      <View key={i} style={styles.warningItem}>
        <View style={styles.bullet} />
        <Text style={styles.value}>{taboo}</Text>
      </View>
    ))}
  </View>
);

const TransportInfoView = ({ data }: { data: TransportInfo }) => (
  <View style={styles.contentPadding}>
    <Text style={styles.subHeader}>公共交通機関</Text>
    {data.publicTransport.slice(0, 3).map((pt, i) => (
       <View key={i} style={styles.warningItem}>
        <View style={styles.bullet} />
        <Text style={styles.value}>{pt}</Text>
      </View>
    ))}

    <View style={[styles.row, { marginTop: 8, borderBottomWidth: 0 }]}>
      <Text style={styles.label}>ライドシェア</Text>
      <Text style={styles.value}>
        {data.rideshare.available ? `利用可 (${data.rideshare.services.join(", ")})` : "利用不可"}
      </Text>
    </View>
  </View>
);

// --- Main Component ---

const TravelInfoPDF: React.FC<TravelInfoPDFProps> = ({ destination, country, categoryStates }) => {

  const renderSection = (category: TravelInfoCategory) => {
    const state = categoryStates.get(category);
    if (!state || state.status !== "success" || !state.data) return null;

    const data = state.data.data;
    let content = null;

    switch (category) {
      case "basic": content = <BasicInfoView data={data as BasicCountryInfo} />; break;
      case "safety": content = <SafetyInfoView data={data as SafetyInfo} />; break;
      case "climate": content = <ClimateInfoView data={data as ClimateInfo} />; break;
      case "visa": content = <VisaInfoView data={data as VisaInfo} />; break;
      case "manner": content = <MannerInfoView data={data as MannerInfo} />; break;
      case "transport": content = <TransportInfoView data={data as TransportInfo} />; break;
    }

    return (
      <View key={category} style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{CATEGORY_LABELS[category]}</Text>
        </View>
        {content}
      </View>
    );
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.brandText}>TRAVEL INFO GUIDE</Text>
            <View style={styles.destinationBox}>
              <Text style={styles.destination}>{destination}</Text>
            </View>
            <Text style={styles.metaInfo}>{country}</Text>
          </View>
          <View style={styles.headerRight}>
             <Text style={styles.metaInfo}>{new Date().toLocaleDateString('ja-JP')}</Text>
          </View>
        </View>

        {/* 2-Column Layout */}
        <View style={styles.columnsContainer}>
          {/* Left Column */}
          <View style={styles.columnLeft}>
            {renderSection("basic")}
            {renderSection("visa")}
            {renderSection("transport")}
          </View>

          {/* Right Column */}
          <View style={styles.columnRight}>
            {renderSection("safety")}
            {renderSection("climate")}
            {renderSection("manner")}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) =>
            `${pageNumber} / ${totalPages}`
          } />
          <Text style={styles.footerBrand}>Powered by Tabidea</Text>
        </View>
      </Page>
    </Document>
  );
};

export default TravelInfoPDF;
