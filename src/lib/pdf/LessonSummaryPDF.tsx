import path from "path";
import fs from "fs";
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// Hebrew font from public/fonts - TTF required (WOFF causes fontkit "Offset outside bounds" crash)
// Register Regular + Bold. Prioritize NotoSansHebrew-Bold.ttf for high-contrast rendering; fallback to regular only if bold missing.
const fontDir = path.join(process.cwd(), "public", "fonts");
const regularTtf = path.join(fontDir, "NotoSansHebrew-Regular.ttf");
const boldTtf = path.join(fontDir, "NotoSansHebrew-Bold.ttf");
Font.register({
  family: "NotoSansHebrew",
  fonts: [
    { src: regularTtf, fontWeight: 400 },
    { src: fs.existsSync(boldTtf) ? boldTtf : regularTtf, fontWeight: 700 },
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
    fontFamily: "NotoSansHebrew",
    color: "#000",
    lineHeight: 1.2,
    ...rtl,
  },
  title: {
    fontSize: 20,
    marginBottom: 16,
    fontWeight: 700,
    fontFamily: "NotoSansHebrew",
    color: "#000",
    lineHeight: 1.2,
    ...rtl,
  },
  metaRtl: {
    fontSize: 12,
    fontWeight: 700,
    color: "#000",
    marginBottom: 2,
    fontFamily: "NotoSansHebrew",
    lineHeight: 1.3,
    ...rtl,
  },
  metaLtr: {
    fontSize: 12,
    fontWeight: 700,
    color: "#000",
    marginBottom: 2,
    fontFamily: "NotoSansHebrew",
    lineHeight: 1.3,
    ...ltr,
  },
  metaBlock: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 700,
    marginBottom: 6,
    fontFamily: "NotoSansHebrew",
    color: "#000",
    lineHeight: 1.3,
    ...rtl,
  },
  sectionText: {
    fontSize: 12.5,
    lineHeight: 1.3,
    fontFamily: "NotoSansHebrew",
    color: "#000",
    ...rtl,
  },
  sectionLine: {
    marginBottom: 3,
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
      author="פזצט״א"
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
