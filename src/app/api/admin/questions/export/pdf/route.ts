export const runtime = "nodejs";
export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { Prisma, TagType } from "@prisma/client";
import { prisma } from "@/server/db";
import { HttpError, requireRole } from "@/lib/rbac";
import { expandTagValues, labelForTag } from "@/lib/tags/server";

type ExportRequestBody = {
  year?: string;
  rotations?: string[];
  topics?: string[];
  questionIds?: string[];
};

type ExportQuestion = {
  id: string;
  customId: number | null;
  text: string | null;
  explanation: string | null;
  objective: string | null;
  references: string | null;
  questionType: "MCQ" | "EMQ";
  emqTheme: string | null;
  emqOptions: unknown;
  questionImageUrl: string | null;
  explanationImageUrl: string | null;
  iduScreenshotUrl: string | null;
  yearCaptured: string | null;
  rotationNumber: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  Choice: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
    correctOptionIds: unknown;
    stemImageUrl: string | null;
  }>;
  QuestionTag: Array<{
    Tag: {
      type: TagType;
      value: string;
    };
  }>;
  QuestionOccurrence: Array<{
    year: string | null;
    rotation: string | null;
    orderIndex: number;
  }>;
};

const MAX_QUESTIONS_PER_EXPORT = 2500;
const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

function normalizeList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  raw.forEach((value) => {
    if (typeof value !== "string") return;
    const v = value.trim();
    if (!v) return;
    if (seen.has(v)) return;
    seen.add(v);
    out.push(v);
  });
  return out;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));
}

function buildTutoredTagFilter(type: TagType, rawValues: string[]): Prisma.QuestionWhereInput | null {
  const variants = expandTagValues(type, rawValues);
  if (!variants.length) return null;

  const explicit = variants
    .map((v) => v.trim())
    .filter((v) => v.length > 0 && v !== "topic_not_selected");

  const includeNotSelected =
    type === TagType.TOPIC && (variants.includes("topic_not_selected") || explicit.length > 0);

  if (type === TagType.TOPIC && includeNotSelected && explicit.length === 0) {
    return null;
  }

  if (type === TagType.TOPIC && includeNotSelected) {
    const explicitValues = unique(explicit);
    const explicitClause =
      explicitValues.length > 0
        ? {
            QuestionTag: {
              some: {
                Tag: {
                  type,
                  value: { in: explicitValues, mode: "insensitive" as const },
                },
              },
            },
          }
        : null;

    return {
      OR: [
        ...(explicitClause ? [explicitClause] : []),
        {
          NOT: {
            QuestionTag: {
              some: {
                Tag: { type: TagType.TOPIC },
              },
            },
          },
        },
      ],
    };
  }

  const values = unique(explicit);
  if (!values.length) return null;

  return {
    QuestionTag: {
      some: {
        Tag: {
          type,
          value: { in: values, mode: "insensitive" as const },
        },
      },
    },
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeHtmlOrPlaceholder(html: string | null | undefined, placeholder = "<em>Not provided</em>"): string {
  if (!html) return placeholder;
  const trimmed = html.trim();
  return trimmed.length > 0 ? trimmed : placeholder;
}

function toAbsoluteUrl(raw: string, origin: string): string {
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^data:/i.test(raw)) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  if (raw.startsWith("/")) return `${origin}${raw}`;
  return `${origin}/${raw.replace(/^\/+/, "")}`;
}

function parseUrlList(raw?: string | null): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return unique(
          parsed
            .filter((entry) => typeof entry === "string")
            .map((entry) => (entry as string).trim())
            .filter(Boolean)
        );
      }
    } catch {
      return [trimmed];
    }
  }
  return [trimmed];
}

function parseReferences(raw?: string | null): string[] {
  if (!raw) return [];
  return unique(
    raw
      .replace(/\r/g, "")
      .replace(/[•\u2022\u2023\u25E6]/g, "\n")
      .split(/\n+|;/g)
      .map((piece) => piece.trim())
      .filter(Boolean)
  );
}

function displayTagType(type: TagType): string {
  if (type === TagType.ROTATION) return "Rotation";
  if (type === TagType.TOPIC) return "Topic";
  if (type === TagType.SUBJECT) return "Discipline";
  if (type === TagType.SYSTEM) return "System";
  if (type === TagType.RESOURCE) return "Resource";
  if (type === TagType.MODE) return "Mode";
  return type;
}

function getBatchYear(question: ExportQuestion): string {
  const fromOccurrence = question.QuestionOccurrence.find((occ) => (occ.year ?? "").trim().length > 0)?.year?.trim();
  if (fromOccurrence) return fromOccurrence;
  return question.yearCaptured?.trim() || "N/A";
}

function getRotationLabel(question: ExportQuestion): string {
  const rotationTag = question.QuestionTag.find((qt) => qt.Tag.type === TagType.ROTATION)?.Tag.value;
  if (rotationTag) return labelForTag(TagType.ROTATION, rotationTag);
  const fromOccurrence = question.QuestionOccurrence.find((occ) => (occ.rotation ?? "").trim().length > 0)?.rotation?.trim();
  if (fromOccurrence) return fromOccurrence;
  return question.rotationNumber?.trim() || "N/A";
}

function normalizeEmqOptions(raw: unknown): Array<{ id: string; text: string }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((option, idx) => {
      if (!option || typeof option !== "object") return null;
      const candidate = option as { id?: unknown; text?: unknown };
      const id = typeof candidate.id === "string" ? candidate.id.trim() : `opt-${idx + 1}`;
      const text = typeof candidate.text === "string" ? candidate.text : "";
      return { id, text };
    })
    .filter((entry): entry is { id: string; text: string } => Boolean(entry));
}

function normalizeCorrectOptionIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return unique(
    raw
      .filter((entry) => typeof entry === "string")
      .map((entry) => (entry as string).trim())
      .filter(Boolean)
  );
}

function renderImageSection(title: string, urls: string[]): string {
  if (!urls.length) return "";
  return `
    <section class="block">
      <h3>${escapeHtml(title)}</h3>
      <div class="image-grid">
        ${urls
          .map(
            (url, idx) => `
          <figure class="image-card">
            <img src="${escapeHtml(url)}" alt="${escapeHtml(`${title} ${idx + 1}`)}" />
          </figure>
        `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderTags(tags: ExportQuestion["QuestionTag"]): string {
  if (!tags.length) return "<p class=\"muted\">No tags</p>";
  const chips = tags
    .map((entry) => {
      const type = displayTagType(entry.Tag.type);
      const value = labelForTag(entry.Tag.type, entry.Tag.value);
      return `<span class="tag-chip">${escapeHtml(type)}: ${escapeHtml(value)}</span>`;
    })
    .join("");
  return `<div class="tag-wrap">${chips}</div>`;
}

function renderMcqAnswers(question: ExportQuestion): string {
  if (!question.Choice.length) return "<p class=\"muted\">No answers available.</p>";
  return `
    <div class="answers-wrap">
      ${question.Choice.map((choice, idx) => {
        const letter = LETTERS[idx] ?? String(idx + 1);
        const correctBadge = choice.isCorrect ? `<span class="correct-badge">Correct</span>` : "";
        return `
          <div class="answer-card ${choice.isCorrect ? "answer-correct" : ""}">
            <div class="answer-head">
              <span class="answer-letter">${escapeHtml(letter)}</span>
              ${correctBadge}
            </div>
            <div class="rich-content">${safeHtmlOrPlaceholder(choice.text, "<em>Empty answer</em>")}</div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderEmqAnswers(question: ExportQuestion, origin: string): string {
  const options = normalizeEmqOptions(question.emqOptions);
  const optionMap = new Map(options.map((opt) => [opt.id, opt.text]));

  const optionsHtml =
    options.length > 0
      ? `
        <div class="block">
          <h4>Options</h4>
          <div class="answers-wrap">
            ${options
              .map(
                (option) => `
                <div class="answer-card">
                  <div class="answer-head"><span class="answer-letter">${escapeHtml(option.id)}</span></div>
                  <div class="rich-content">${safeHtmlOrPlaceholder(option.text, "<em>Empty option</em>")}</div>
                </div>
              `
              )
              .join("")}
          </div>
        </div>
      `
      : "<p class=\"muted\">No EMQ options available.</p>";

  const stemsHtml =
    question.Choice.length > 0
      ? `
        <div class="block">
          <h4>Stems</h4>
          <div class="stems-wrap">
            ${question.Choice.map((stem, idx) => {
              const answerIds = normalizeCorrectOptionIds(stem.correctOptionIds);
              const mapped = answerIds.map((id) => {
                const optionText = optionMap.get(id);
                return optionText ? `${id}: ${optionText}` : id;
              });
              const stemImages = parseUrlList(stem.stemImageUrl).map((url) => toAbsoluteUrl(url, origin));
              return `
                <div class="stem-card">
                  <div class="stem-head">Stem ${idx + 1}</div>
                  <div class="rich-content">${safeHtmlOrPlaceholder(stem.text, "<em>Empty stem</em>")}</div>
                  ${stemImages.length ? renderImageSection("Stem Images", stemImages) : ""}
                  <div class="stem-answers">
                    <strong>Correct Option(s):</strong>
                    <ul>
                      ${mapped.map((entry) => `<li>${escapeHtml(entry)}</li>`).join("")}
                    </ul>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `
      : "<p class=\"muted\">No EMQ stems available.</p>";

  return `${optionsHtml}${stemsHtml}`;
}

function buildQuestionHtml(question: ExportQuestion, index: number, origin: string): string {
  const batchYear = getBatchYear(question);
  const rotation = getRotationLabel(question);
  const questionId = question.customId ?? question.id;
  const stem = question.questionType === "EMQ" ? (question.emqTheme ?? question.text ?? "") : (question.text ?? "");
  const questionImages = unique(
    [...parseUrlList(question.questionImageUrl), ...parseUrlList(question.iduScreenshotUrl)].map((url) =>
      toAbsoluteUrl(url, origin)
    )
  );
  const explanationImages = unique(
    parseUrlList(question.explanationImageUrl).map((url) => toAbsoluteUrl(url, origin))
  );
  const refs = parseReferences(question.references);

  const answersBlock =
    question.questionType === "EMQ" ? renderEmqAnswers(question, origin) : renderMcqAnswers(question);

  return `
    <article class="question-block">
      <header class="question-header">
        <h2>Question ${index + 1}</h2>
        <div class="meta-grid">
          <div><strong>Question ID:</strong> ${escapeHtml(String(questionId))}</div>
          <div><strong>Batch Year:</strong> ${escapeHtml(batchYear)}</div>
          <div><strong>Rotation:</strong> ${escapeHtml(rotation)}</div>
          <div><strong>Type:</strong> ${escapeHtml(question.questionType)}</div>
        </div>
      </header>

      <section class="block">
        <h3>Question Stem</h3>
        <div class="rich-content">${safeHtmlOrPlaceholder(stem, "<em>No stem provided</em>")}</div>
      </section>

      ${renderImageSection("Question Images", questionImages)}

      <section class="block">
        <h3>Answers</h3>
        ${answersBlock}
      </section>

      ${renderImageSection("Explanation Images", explanationImages)}

      <section class="block">
        <h3>Explanation</h3>
        <div class="rich-content">${safeHtmlOrPlaceholder(question.explanation, "<em>No explanation provided</em>")}</div>
      </section>

      <section class="block">
        <h3>Educational Objective</h3>
        <div class="rich-content">${safeHtmlOrPlaceholder(question.objective, "<em>No educational objective provided</em>")}</div>
      </section>

      <section class="block">
        <h3>References</h3>
        ${
          refs.length
            ? `<ul class="refs-list">${refs.map((ref) => `<li>${escapeHtml(ref)}</li>`).join("")}</ul>`
            : `<p class="muted">No references provided.</p>`
        }
      </section>

      <section class="block">
        <h3>Tags</h3>
        ${renderTags(question.QuestionTag)}
      </section>
    </article>
  `;
}

function buildDocumentHtml(questions: ExportQuestion[], origin: string, title: string): string {
  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(title)}</title>
        <style>
          @page { size: A4; margin: 14mm 12mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            color: #111827;
            font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
            font-size: 12px;
            line-height: 1.5;
            background: #ffffff;
          }
          .doc-header {
            border-bottom: 2px solid #0ea5e9;
            margin-bottom: 14px;
            padding-bottom: 8px;
          }
          .doc-header h1 {
            margin: 0;
            font-size: 18px;
            color: #0369a1;
          }
          .doc-header p {
            margin: 6px 0 0 0;
            color: #475569;
          }
          .question-block {
            border: 1px solid #cbd5e1;
            border-radius: 10px;
            padding: 12px;
            margin-bottom: 12px;
            page-break-inside: avoid;
          }
          .question-block + .question-block {
            page-break-before: auto;
          }
          .question-header h2 {
            margin: 0 0 8px 0;
            font-size: 16px;
            color: #0f172a;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 6px 10px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 8px;
          }
          .block {
            margin-top: 10px;
          }
          .block h3, .block h4 {
            margin: 0 0 6px 0;
            color: #0c4a6e;
            font-size: 13px;
          }
          .muted {
            color: #64748b;
            margin: 0;
          }
          .rich-content {
            line-height: 1.6;
          }
          .rich-content p { margin: 0 0 10px 0; }
          .rich-content p:last-child { margin-bottom: 0; }
          .rich-content ul, .rich-content ol {
            margin: 8px 0;
            padding-left: 18px;
          }
          .rich-content table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            margin: 8px 0;
          }
          .rich-content th, .rich-content td {
            border: 1px solid #cbd5e1;
            padding: 6px;
            vertical-align: top;
            word-break: break-word;
          }
          .rich-content img {
            max-width: 100%;
            height: auto;
            border-radius: 6px;
            margin: 6px 0;
          }
          .image-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
          }
          .image-card {
            margin: 0;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 6px;
            background: #f8fafc;
          }
          .image-card img {
            width: 100%;
            max-height: 300px;
            object-fit: contain;
          }
          .answers-wrap {
            display: grid;
            grid-template-columns: 1fr;
            gap: 8px;
          }
          .answer-card {
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 8px;
          }
          .answer-correct {
            border-color: #16a34a;
            background: #f0fdf4;
          }
          .answer-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 4px;
          }
          .answer-letter {
            display: inline-block;
            min-width: 24px;
            font-weight: 700;
            color: #0f172a;
          }
          .correct-badge {
            display: inline-block;
            font-size: 11px;
            font-weight: 700;
            color: #166534;
            background: #dcfce7;
            border: 1px solid #86efac;
            border-radius: 999px;
            padding: 2px 8px;
          }
          .stems-wrap {
            display: grid;
            gap: 8px;
          }
          .stem-card {
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 8px;
            background: #f8fafc;
          }
          .stem-head {
            font-weight: 700;
            margin-bottom: 4px;
            color: #0f172a;
          }
          .stem-answers {
            margin-top: 6px;
          }
          .stem-answers ul {
            margin: 6px 0 0 18px;
            padding: 0;
          }
          .refs-list {
            margin: 0;
            padding-left: 18px;
          }
          .tag-wrap {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
          }
          .tag-chip {
            display: inline-block;
            font-size: 11px;
            color: #0c4a6e;
            background: #e0f2fe;
            border: 1px solid #7dd3fc;
            border-radius: 999px;
            padding: 2px 8px;
          }
        </style>
      </head>
      <body>
        <header class="doc-header">
          <h1>${escapeHtml(title)}</h1>
          <p>Total questions: ${questions.length}</p>
        </header>
        ${questions.map((question, idx) => buildQuestionHtml(question, idx, origin)).join("")}
      </body>
    </html>
  `;
}

function buildFileName(year: string | null, rotations: string[]): string {
  const date = new Date().toISOString().slice(0, 10);
  const yearPart = (year && year.trim()) ? year.trim().toLowerCase() : "mixed";
  const rotationPart =
    rotations.length === 0
      ? "all-rotations"
      : rotations.length === 1
      ? rotations[0]
      : "multi-rotation";
  const safe = `${yearPart}-${rotationPart}-${date}`
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `questions-export-${safe || "file"}.pdf`;
}

async function waitForPageImages(page: { evaluate: (fn: () => Promise<void>) => Promise<unknown> }) {
  await page.evaluate(async () => {
    const waitForImage = (img: HTMLImageElement) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            const done = () => resolve();
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
          });
    await Promise.all(Array.from(document.images).map((img) => waitForImage(img)));
  });
}

async function renderPdfWithPlaywright(html: string): Promise<Buffer> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await waitForPageImages(page);

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", right: "10mm", bottom: "12mm", left: "10mm" },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

async function renderPdfWithPuppeteer(html: string): Promise<Buffer> {
  const [chromiumModule, puppeteerModule] = await Promise.all([
    import("@sparticuz/chromium"),
    import("puppeteer-core"),
  ]);

  const chromium = chromiumModule.default;
  const puppeteer = puppeteerModule.default;

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await waitForPageImages(page);

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", right: "10mm", bottom: "12mm", left: "10mm" },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

async function renderPdf(html: string): Promise<Buffer> {
  if (process.env.VERCEL === "1" || process.env.VERCEL === "true") {
    return renderPdfWithPuppeteer(html);
  }

  try {
    return await renderPdfWithPlaywright(html);
  } catch (playwrightError) {
    const message = playwrightError instanceof Error ? playwrightError.message : String(playwrightError);
    const needsFallback =
      message.toLowerCase().includes("playwright") ||
      message.toLowerCase().includes("executable") ||
      message.toLowerCase().includes("chromium");

    if (!needsFallback) throw playwrightError;
    return renderPdfWithPuppeteer(html);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(["ADMIN", "MASTER_ADMIN", "WEBSITE_CREATOR"]);

    const body = (await request.json()) as ExportRequestBody;
    const year = typeof body.year === "string" && body.year.trim().length > 0 ? body.year.trim() : null;
    const rotations = normalizeList(body.rotations);
    const topics = normalizeList(body.topics);
    const questionIds = normalizeList(body.questionIds);

    const whereClauses: Prisma.QuestionWhereInput[] = [];

    const rotationFilter = buildTutoredTagFilter(TagType.ROTATION, rotations);
    if (rotationFilter) whereClauses.push(rotationFilter);

    const topicFilter = buildTutoredTagFilter(TagType.TOPIC, topics);
    if (topicFilter) whereClauses.push(topicFilter);

    if (year) {
      whereClauses.push({
        OR: [
          { yearCaptured: year },
          {
            QuestionOccurrence: {
              some: { year },
            },
          },
        ],
      });
    }

    if (questionIds.length > 0) {
      whereClauses.push({ id: { in: questionIds } });
    }

    const where: Prisma.QuestionWhereInput = whereClauses.length ? { AND: whereClauses } : {};

    const questions = (await prisma.question.findMany({
      where,
      select: {
        id: true,
        customId: true,
        text: true,
        explanation: true,
        objective: true,
        references: true,
        questionType: true,
        emqTheme: true,
        emqOptions: true,
        questionImageUrl: true,
        explanationImageUrl: true,
        iduScreenshotUrl: true,
        yearCaptured: true,
        rotationNumber: true,
        createdAt: true,
        updatedAt: true,
        Choice: {
          orderBy: { id: "asc" },
          select: {
            id: true,
            text: true,
            isCorrect: true,
            correctOptionIds: true,
            stemImageUrl: true,
          },
        },
        QuestionTag: {
          select: {
            Tag: {
              select: {
                type: true,
                value: true,
              },
            },
          },
        },
        QuestionOccurrence: {
          select: {
            year: true,
            rotation: true,
            orderIndex: true,
          },
          orderBy: { orderIndex: "asc" },
        },
      },
      orderBy: [{ customId: "asc" }, { createdAt: "asc" }],
    })) as unknown as ExportQuestion[];

    if (!questions.length) {
      return NextResponse.json({ error: "No questions matched the selected rotation/topic filters." }, { status: 404 });
    }

    if (questions.length > MAX_QUESTIONS_PER_EXPORT) {
      return NextResponse.json(
        {
          error: `Too many questions in one export (${questions.length}). Please narrow filters or export in batches. Max ${MAX_QUESTIONS_PER_EXPORT}.`,
        },
        { status: 400 }
      );
    }

    const title = `Question Export${year ? ` - ${year}` : ""}`;
    const origin = new URL(request.url).origin;
    const html = buildDocumentHtml(questions, origin, title);

    const pdf = await renderPdf(html);
    const pdfBlob = new Blob([new Uint8Array(pdf)], { type: "application/pdf" });
    const filename = buildFileName(year, rotations);

    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("PDF export failed:", error);
    return NextResponse.json({ error: "Failed to export questions to PDF." }, { status: 500 });
  }
}
