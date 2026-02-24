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

// Hebrew font from public/fonts - included in deployment (Netlify, Vercel, etc.)
const fontDir = path.join(process.cwd(), "public", "fonts");
Font.register({
  family: "Heebo",
  fonts: [
    { src: path.join(fontDir, "heebo-hebrew-400-normal.woff"), fontWeight: 400 },
    { src: path.join(fontDir, "heebo-hebrew-700-normal.woff"), fontWeight: 700 },
  ],
});

// Disable hyphenation for Hebrew (prevents broken word splitting)
Font.registerHyphenationCallback((word) => [word]);

/** Normalize and trim content before rendering. Removes strange characters. */
function normalize(str: string): string {
  if (typeof str !== "string") return "";
  return str.replace(/#+/g, "").trim();
}

// RTL: Hebrew text - use direction + textAlign (react-pdf uses "direction", not "writingDirection")
const rtl = { direction: "rtl" as const, textAlign: "right" as const };
const ltr = { direction: "ltr" as const, textAlign: "left" as const };

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Heebo",
    ...rtl,
  },
  title: {
    fontSize: 18,
    marginBottom: 12,
    fontWeight: 700,
    fontFamily: "Heebo",
    ...rtl,
  },
  metaRtl: {
    fontSize: 10,
    color: "#666",
    marginBottom: 2,
    fontFamily: "Heebo",
    ...rtl,
  },
  metaLtr: {
    fontSize: 10,
    color: "#666",
    marginBottom: 2,
    fontFamily: "Heebo",
    ...ltr,
  },
  metaBlock: {
    marginBottom: 20,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 4,
    fontFamily: "Heebo",
    ...rtl,
  },
  sectionText: {
    fontSize: 10,
    lineHeight: 1.5,
    fontFamily: "Heebo",
    ...rtl,
  },
  sectionLine: {
    marginBottom: 2,
  },
});

function Section({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  const cleaned = normalize(text);
  if (!cleaned || cleaned === "—") return null;
  const lines = cleaned.split("\n").filter((l) => l !== undefined);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{normalize(title)}</Text>
      <View>
        {lines.map((line, i) => (
          <Text key={i} style={[styles.sectionText, styles.sectionLine]}>
            {line || " "}
          </Text>
        ))}
      </View>
    </View>
  );
}

export type LessonSummaryPDFProps = {
  studentName: string;
  teacherName: string;
  studentEmail?: string;
  teacherEmail?: string;
  date: string;
  timeRange: string;
  summaryText: string;
  homeworkText: string;
  pointsToKeep?: string;
  pointsToImprove?: string;
  tips?: string;
  recommendations?: string;
};

/**
 * CRITICAL: Never mix Hebrew (RTL) and LTR content (email, date, time) inside the same <Text>.
 * Mixed-direction text in one element breaks bidi rendering in react-pdf.
 * Always use separate <Text> blocks: RTL for Hebrew, LTR for emails/dates/times.
 */
export function createLessonSummaryDocument(props: LessonSummaryPDFProps) {
  const {
    studentName,
    teacherName,
    studentEmail,
    teacherEmail,
    date,
    timeRange,
    summaryText,
    homeworkText,
    pointsToKeep = "",
    pointsToImprove = "",
    tips = "",
    recommendations = "",
  } = props;

  const sn = normalize(studentName);
  const tn = normalize(teacherName);
  const dt = normalize(date);
  const tr = normalize(timeRange);

  return (
    <Document
      title="דוח סיום שיעור"
      author="פאזה"
      subject={`דוח שיעור – ${sn}`}
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>דוח סיום שיעור</Text>

        <View style={styles.metaBlock}>
          <Text style={styles.metaRtl}>תלמיד: {sn}</Text>
          {studentEmail && (
            <Text style={styles.metaLtr}>{normalize(studentEmail)}</Text>
          )}
          <Text style={styles.metaRtl}>מורה: {tn}</Text>
          {teacherEmail && (
            <Text style={styles.metaLtr}>{normalize(teacherEmail)}</Text>
          )}
          <Text style={styles.metaRtl}>תאריך:</Text>
          <Text style={styles.metaLtr}>{dt} {tr}</Text>
        </View>

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
