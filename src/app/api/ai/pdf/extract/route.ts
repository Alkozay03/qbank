// src/app/api/ai/pdf/extract/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import pdfParse from "pdf-parse";

type Answer = { text: string; isCorrect: boolean };

function clean(s: string) {
  return String(s ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/[\t\f\v]+/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function splitSections(text: string) {
  // PDFs are expected to have headings like: Question, Answers, Explanation, Educational Objective, References, Tags
  const lines = clean(text).split(/\n+/);
  const sections: Record<string, string[]> = {};
  let cur: string = "Question";
  sections[cur] = [];
  for (const line of lines) {
    const hd = line.match(/^\s*(Question|Answers?|Explanation|Educational Objective|Objective|References?|Tags?)\s*[:\-]?\s*$/i);
    if (hd) {
      const h = hd[1].toLowerCase();
      if (h.startsWith("educational") || h === "objective") cur = "Educational Objective";
      else if (h.startsWith("answer")) cur = "Answers";
      else if (h.startsWith("reference")) cur = "References";
      else if (h.startsWith("explanation")) cur = "Explanation";
      else if (h.startsWith("tags")) cur = "Tags";
      else cur = "Question";
      if (!sections[cur]) sections[cur] = [];
      continue;
    }
    if (!sections[cur]) sections[cur] = [];
    sections[cur].push(line);
  }
  const get = (k: string) => clean((sections[k] || []).join("\n"));
  return {
    question: get("Question"),
    answersRaw: get("Answers"),
    explanation: get("Explanation"),
    objective: get("Educational Objective"),
    references: get("References"),
    tags: get("Tags"),
  };
}

type SectionBundle = {
  question: string;
  answersRaw: string;
  explanation: string;
  objective: string;
  references: string;
  tags: string;
};

/**
 * Split a whole-document string into repeated question sections.
 * Heuristics:
 *  - Start a new block when a line looks like a Question heading (e.g. "Question", "Question 12", "Q12")
 *  - Within a block, reuse splitSections() heading parsing to collect sub-sections
 */
function splitMultipleQuestions(fullText: string): SectionBundle[] {
  const lines = clean(fullText).split(/\n+/);
  const isQStart = (line: string) => /^(?:q(?:uestion)?\s*\d*\s*[:\.)]?|question\s*[:\.)]?)$/i.test(line.trim());

  // Identify start indices of blocks
  const starts: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (isQStart(l)) starts.push(i);
  }

  // Fallback: if no explicit Question headings found, treat whole doc as one block
  if (starts.length === 0) {
    return [splitSections(lines.join("\n"))];
  }

  // Ensure last sentinel
  const bounds = [...starts, lines.length];
  const bundles: SectionBundle[] = [];
  for (let bi = 0; bi < bounds.length - 1; bi++) {
    const a = bounds[bi];
    const b = bounds[bi + 1];
    const chunk = lines.slice(a, b).join("\n");
    const sec = splitSections(chunk);
    // Only include reasonably non-empty items
    const nonEmpty = [sec.question, sec.answersRaw, sec.explanation, sec.objective].some((s) => clean(s).length > 0);
    if (nonEmpty) bundles.push(sec);
  }
  return bundles;
}

function parseAnswers(raw: string): Answer[] {
  const s = clean(raw);
  const lines = s.split(/\n+/);
  const tickRe = /[âœ“âœ”âœ…]/;
  const out: Answer[] = [];
  let cur: Answer | null = null;
  for (const line of lines) {
    const m = line.match(/^\s*(?:[OoÂ·â€¢\(]?\s*)?([A-F])[\)\.:\-\s]+(.*)$/);
    const hasTick = tickRe.test(line);
    if (m) {
      if (cur) out.push(cur);
      const txt = clean((m[2] || "").replace(tickRe, ""))
        .replace(/\s*[\(\[\{]\s*\d{1,3}\s*%\s*[\)\]\}]\s*$/u, "")
        .replace(/\s*[\-â€“â€”]\s*\d{1,3}\s*%\s*$/u, "")
        .trim();
      cur = { text: txt, isCorrect: hasTick };
    } else if (cur) {
      const cont = clean(line.replace(tickRe, ""));
      cur.text += (cur.text ? " " : "") + cont;
      if (hasTick) cur.isCorrect = true;
    }
  }
  if (cur) out.push(cur);
  if (out.length === 0) {
    // fallback: one line per answer
    for (const line of lines) {
      const t = clean(line.replace(tickRe, ""));
      if (t) out.push({ text: t, isCorrect: tickRe.test(line) });
    }
  }
  return out;
}

function parseRefs(raw: string): string[] {
  const s = clean(raw);
  const tokens = s.split(/[\n,;]+/).map((t) => t.trim()).filter(Boolean);
  const urls = tokens.filter((t) => /^(https?:\/\/\S+)/i.test(t));
  return urls;
}

function parseTags(raw: string): string[] {
  const s = clean(raw);
  const tokens = s.split(/[\n,;]+/).map((t) => t.replace(/^[-â€¢\u2022\u25E6\u2219\s]+/, "").trim()).filter(Boolean);
  return tokens;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const f = form.get("file") as File | null;
    if (!f) return NextResponse.json({ error: "file required" }, { status: 400 });
    if (!/pdf/i.test(f.type) && !/\.pdf$/i.test(((f as unknown as { name?: string }).name ?? '') || "")) {
      return NextResponse.json({ error: "only PDF accepted" }, { status: 400 });
    }
    const buf = Buffer.from(await f.arrayBuffer());
    const data = await pdfParse(buf);
    const full = String(data?.text || "");
    const bundles = splitMultipleQuestions(full);

    const questions = bundles.map((b) => {
      const answers = parseAnswers(b.answersRaw);
      const refs = parseRefs(b.references).map((url) => ({ url }));
      const tagList = parseTags(b.tags).map((value) => ({ type: "TOPIC", value }));
      return {
        text: b.question,
        answers,
        explanation: b.explanation,
        objective: b.objective,
        refs,
        tags: tagList,
      };
    });

    // Backwards compatibility for older clients expecting single object
    if (questions.length === 1) {
      const q = questions[0];
      return NextResponse.json({ ok: true, ...q, questions });
    }
    return NextResponse.json({ ok: true, questions });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


