import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

// Register a font that supports Hebrew (use system font fallback)
// @react-pdf/renderer uses Noto by default for some scripts; we use a generic approach
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    direction: "rtl",
  },
  title: {
    fontSize: 18,
    marginBottom: 12,
    fontWeight: "bold",
  },
  meta: {
    fontSize: 10,
    color: "#666",
    marginBottom: 20,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 4,
  },
  sectionText: {
    fontSize: 10,
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
  },
});

function Section({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  if (!text || text === "—") return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionText}>{text}</Text>
    </View>
  );
}

export type LessonSummaryPDFProps = {
  studentName: string;
  teacherName: string;
  date: string;
  timeRange: string;
  summaryText: string;
  homeworkText: string;
  pointsToKeep?: string;
  pointsToImprove?: string;
  tips?: string;
  recommendations?: string;
};

export function createLessonSummaryDocument(props: LessonSummaryPDFProps) {
  const {
    studentName,
    teacherName,
    date,
    timeRange,
    summaryText,
    homeworkText,
    pointsToKeep = "",
    pointsToImprove = "",
    tips = "",
    recommendations = "",
  } = props;

  return (
    <Document
      title="דוח סיום שיעור"
      author="פאזה"
      subject={`דוח שיעור – ${studentName}`}
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>דוח סיום שיעור</Text>
        <Text style={styles.meta}>
          {studentName} עם {teacherName} — {date} {timeRange}
        </Text>
        <Section title="סיכום כללי" text={summaryText || "—"} />
        <Section title="נקודות לשימור" text={pointsToKeep} />
        <Section title="נקודות לשיפור" text={pointsToImprove} />
        <Section title="טיפים" text={tips} />
        <Section title="המלצות להמשך" text={recommendations} />
        <Section title="משימות לתרגול" text={homeworkText || "—"} />
      </Page>
    </Document>
  );
}
