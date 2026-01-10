import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { Itinerary } from "@/lib/types";

// Register Japanese font (Noto Sans JP from Google Fonts)
Font.register({
  family: "Noto Sans JP",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/notosansjp/v52/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEi75vY0rw-oME.ttf",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/notosansjp/v52/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEj7pfY0rw-oME.ttf",
      fontWeight: 700,
    },
  ],
});

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Noto Sans JP",
    fontSize: 10,
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#8B7355",
  },
  destination: {
    fontSize: 24,
    fontWeight: 700,
    color: "#1f2937",
    marginBottom: 8,
  },
  description: {
    fontSize: 11,
    color: "#4b5563",
    lineHeight: 1.6,
    marginBottom: 12,
  },
  metaInfo: {
    fontSize: 9,
    color: "#6b7280",
    marginTop: 8,
  },
  daySection: {
    marginBottom: 20,
    breakInside: "avoid",
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#f5f5f4",
    borderLeftWidth: 4,
    borderLeftColor: "#8B7355",
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: 700,
    color: "#8B7355",
    marginRight: 12,
  },
  dayTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#374151",
  },
  activitiesContainer: {
    paddingLeft: 20,
  },
  activity: {
    marginBottom: 12,
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: "#e5e7eb",
  },
  activityTime: {
    fontSize: 9,
    color: "#6b7280",
    marginBottom: 4,
    fontWeight: 700,
  },
  activityTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#1f2937",
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 9,
    color: "#4b5563",
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#9ca3af",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
  },
  pageNumber: {
    fontSize: 8,
    color: "#9ca3af",
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
          <Text style={styles.destination}>{itinerary.destination}</Text>
          <Text style={styles.description}>{itinerary.description}</Text>
          <Text style={styles.metaInfo}>
            {itinerary.days.length}日間の旅程
          </Text>
        </View>

        {/* Itinerary Days */}
        {itinerary.days.map((day) => (
          <View key={day.day} style={styles.daySection}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayNumber}>Day {day.day}</Text>
              <Text style={styles.dayTitle}>{day.title}</Text>
            </View>

            <View style={styles.activitiesContainer}>
              {day.activities.map((activity, index) => (
                <View key={index} style={styles.activity}>
                  <Text style={styles.activityTime}>{activity.time}</Text>
                  <Text style={styles.activityTitle}>{activity.activity}</Text>
                  <Text style={styles.activityDescription}>
                    {activity.description}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Footer */}
        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `${pageNumber} / ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
};

export default ItineraryPDF;
