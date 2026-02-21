import path from "path";
import fs from "fs";

const STORAGE_DIR = process.env.STORAGE_PATH || path.join(process.cwd(), "storage", "pdfs");

export function getLessonSummaryHtml(params: {
  studentName: string;
  teacherName: string;
  date: string;
  timeRange: string;
  summaryText: string;
  homeworkText: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; color: #111; }
    h1 { font-size: 1.25rem; margin-bottom: 0.5rem; }
    .meta { color: #666; font-size: 0.875rem; margin-bottom: 1.5rem; }
    section { margin-bottom: 1.5rem; }
    section h2 { font-size: 1rem; margin-bottom: 0.5rem; }
    p { margin: 0; line-height: 1.5; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>Lesson Summary</h1>
  <div class="meta">${params.studentName} with ${params.teacherName} — ${params.date} ${params.timeRange}</div>
  <section>
    <h2>Summary</h2>
    <p>${escapeHtml(params.summaryText)}</p>
  </section>
  <section>
    <h2>Homework</h2>
    <p>${escapeHtml(params.homeworkText)}</p>
  </section>
</body>
</html>
  `.trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function htmlToPdfBuffer(html: string): Promise<Buffer> {
  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", right: "20px", bottom: "20px", left: "20px" },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

export async function savePdfToStorage(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const dir = path.join(STORAGE_DIR, path.dirname(filename));
  const fullPath = path.join(STORAGE_DIR, filename);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, buffer);
  return `/api/pdf/${filename}`;
}
