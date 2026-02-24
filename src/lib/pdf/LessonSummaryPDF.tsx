import path from "path";
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// Hebrew-compatible font: Noto Sans Hebrew
const fontPath = path.join(process.cwd(), "src/assets/fonts/NotoSansHebrew-Regular.ttf");
Font.register({
  family: "NotoSansHebrew",
  src: fontPath,
});

// Disable hyphenation for Hebrew (prevents broken word splitting)
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "NotoSansHebrew",
    direction: "rtl",
    textAlign: "right",
  },
  title: {
    fontSize: 18,
    marginBottom: 12,
    fontWeight: 700,
    fontFamily: "NotoSansHebrew",
    textAlign: "right",
  },
  meta: {
    fontSize: 10,
    color: "#666",
    marginBottom: 20,
    fontFamily: "NotoSansHebrew",
    textAlign: "right",
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 4,
    fontFamily: "NotoSansHebrew",
    textAlign: "right",
  },
  sectionText: {
    fontSize: 10,
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
    fontFamily: "NotoSansHebrew",
    textAlign: "right",
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
