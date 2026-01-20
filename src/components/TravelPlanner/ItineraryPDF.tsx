import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { Itinerary } from '@/types';

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
});

interface ItineraryPDFProps {
  itinerary: Itinerary;
}

const ItineraryPDF: React.FC<ItineraryPDFProps> = ({ itinerary }) => {
  return (
    <Document>
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
    </Document>
  );
};

export default ItineraryPDF;
