import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { Itinerary } from "@/lib/types";

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Noto Sans JP",
    fontSize: 10,
    backgroundColor: "#fcfbf9", // Cream paper background
    color: "#2c2c2c", // Ink black text
  },
  header: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e67e22", // Terracotta
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
  // Hero Image styles removed
  description: {
    fontSize: 10,
    color: "#4b5563",
    lineHeight: 1.6,
    marginBottom: 20,
    padding: 10,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderLeftWidth: 3,
    borderLeftColor: "#e67e22",
  },
  // Timeline Container
  timelineContainer: {
    marginTop: 10,
    paddingLeft: 10,
  },
  daySection: {
    marginBottom: 25,
    position: "relative",
    breakInside: "avoid",
  },
  // Day Marker (The big circle)
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  dayMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#e67e22",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  dayNumberText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: 700,
  },
  dayTitleContainer: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 5,
  },
  dayTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#2c2c2c",
  },
  // Activity List
  activitiesContainer: {
    marginLeft: 15, // Align with center of Day Marker (15px)
    borderLeftWidth: 1,
    borderLeftColor: "#e67e22", // Line color
    borderLeftStyle: "dashed",
    paddingLeft: 20,
    paddingBottom: 10,
  },
  activity: {
    marginBottom: 15,
    position: "relative",
  },
  // The dot on the timeline
  timelineDot: {
    position: "absolute",
    left: -24, // -20 padding + -4 center alignment
    top: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#e67e22",
  },
  activityHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 9,
    fontFamily: "Noto Sans JP",
    fontWeight: 700,
    color: "#e67e22",
    width: 35,
    marginRight: 5,
  },
  activityTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#2c2c2c",
    flex: 1,
  },
  activityDescription: {
    fontSize: 9,
    color: "#666666",
    lineHeight: 1.5,
    marginTop: 2,
    paddingLeft: 40, // Align with title
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
  memoSection: {
    marginTop: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
    backgroundColor: "#ffffff",
    borderRadius: 4,
  },
  memoTitle: {
    fontSize: 10,
    color: "#9ca3af",
    marginBottom: 30, // Space for writing
  },
});

interface ItineraryPDFProps {
  itinerary: Itinerary;
}

const ItineraryPDF: React.FC<ItineraryPDFProps> = ({ itinerary }) => {
  // Hero image support removed per request

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.brandText}>TRAVEL PLAN</Text>
            <View style={styles.destinationBox}>
              <Text style={styles.destination}>{itinerary.destination}</Text>
            </View>
            <Text style={styles.metaInfo}>
              {itinerary.days.length} Days Trip
            </Text>
          </View>
          <View style={styles.headerRight}>
             {/* Date placeholder or creation date */}
            <Text style={styles.metaInfo}>{new Date().toLocaleDateString('ja-JP')}</Text>
          </View>
        </View>

        {/* Hero Image section removed */}

        <Text style={styles.description}>{itinerary.description}</Text>

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

        {/* Memo Section for last page or after itinerary */}
        <View style={styles.memoSection}>
           <Text style={styles.memoTitle}>MEMO</Text>
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

export default ItineraryPDF;
