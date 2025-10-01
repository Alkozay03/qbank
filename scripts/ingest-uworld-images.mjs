// scripts/ingest-uworld-images.mjs
// OCR images from a directory and insert questions with tags into DB.
// Usage: node scripts/ingest-uworld-images.mjs [dir]

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import { PrismaClient, Prisma, TagType } from '@prisma/client';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

function generateShortNumericId(length = 6) {
  const min = Math.pow(10, Math.max(1, length) - 1);
  const span = min * 9;
  return Math.floor(min + Math.random() * span);
}

function listImages(dir) {
  const exts = new Set(['.png', '.jpg', '.jpeg', '.webp']);
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((de) => de.isFile() && exts.has(path.extname(de.name).toLowerCase()))
      .map((de) => path.join(dir, de.name));
  } catch (e) {
    console.error('Failed to read dir', dir, e.message);
    return [];
  }
}

function normalizeText(s) {
  return String(s || '')
    .replace(/\r\n/g, '\n')
    .replace(/[\t\f\v]+/g, ' ')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function asciiClean(s) {
  // Remove most non-ASCII noise; keep basic punctuation
  return String(s || '')
    .replace(/[\u2000-\u20FF]/g, ' ')
    .replace(/[\u0080-\u00FF]/g, ' ')
    .replace(/[\uFF00-\uFFFF]/g, ' ')
    .replace(/[\u0000-\u001F]/g, ' ');
}

function splitChoices(text) {
  // Returns { stem, choices: [{key, text}], explanation, correctIndex }
  let all = asciiClean(text);
  all = normalizeText(all);

  // Try to locate explanation section
  const explIdx = all.search(/\b(Explanation|Rationale|Educational Objective)\b/i);
  const beforeExpl = explIdx >= 0 ? all.slice(0, explIdx).trim() : all;
  const explanation = explIdx >= 0 ? all.slice(explIdx).replace(/^.*?\b(Explanation|Rationale|Educational Objective)\b[:\s-]*/i, '').trim() : '';

  // Split choices using lines beginning with A-F and delimiter . ) : or space
  // Remove obvious header/footer boilerplate
  const cleaned = beforeExpl
    .replace(/Question\s*Id\s*:\s*\d+.*/i, '')
    .replace(/Previous\s+Next.*$/i, '')
    .replace(/Full\s*Screen|Tutorial|LabValues|Notes|Calculator|Reverse\s*Color|TextZoom|Settings/gi, '')
    .replace(/Block\s*Time\s*Elapsed.*$/i, '')
    .trim();

  const lines = cleaned.split(/\n+/);
  const blocks = [];
  let current = null;
  for (const line of lines) {
    const m = line.match(/^\s*(?:[Oo·•\(]?\s*)?([A-F])[\)\.:\-\s]+(.*)$/);
    if (m) {
      if (current) blocks.push(current);
      current = { key: m[1], text: m[2].trim() };
    } else if (current) {
      // continuation of the previous choice
      current.text += (current.text ? ' ' : '') + line.trim();
    }
  }
  if (current) blocks.push(current);

  // If no choices detected, keep stem only (skip alt inline split)

  // Stem is the text before first choice marker
  let stem = cleaned;
  if (blocks.length) {
    const firstKey = blocks[0].key;
    const idx = cleaned.indexOf(firstKey);
    if (idx > 0) {
      const re = new RegExp(`\\n\\s*${firstKey}[\\)\\.:\\-\\s]`);
      const m2 = cleaned.match(re);
      if (m2 && m2.index) stem = beforeExpl.slice(0, m2.index).trim();
      else stem = cleaned; // fallback keep cleaned
    }
  }

  // Detect correct answer from explanation
  let correctIndex = -1;
  if (explanation) {
    const m = explanation.match(/\b(Correct\s*Answer|Correct\s*answer|Answer)\s*(is|=|:)\s*([A-F])\b/i);
    if (m) {
      const letter = (m[3] || m[0]).toString().trim().slice(-1).toUpperCase();
      correctIndex = blocks.findIndex((b) => b.key === letter);
    }
  }

  return { stem: stem.trim(), choices: blocks, explanation, correctIndex };
}

function guessRotation(text) {
  const s = text.toLowerCase();
  if (/pregnan|gravida|obstetric|preeclamp|labor|delivery|gestation|uterus|placenta|gyneco|gynaeco/.test(s)) return 'Obstetrics and Gynaecology';
  if (/(child|infant|neonate|pediatric|pediatr)/.test(s)) return 'Pediatrics';
  if (/(surgery|operative|preoperative|postoperative|trauma|fracture|lapar|hernia|appendectomy|cholecystectomy)/.test(s)) return 'General Surgery';
  return 'Internal Medicine';
}

async function ensureTag(type, value) {
  const tag = await prisma.tag.upsert({
    where: { type_value: { type, value } },
    update: {},
    create: { type, value },
  });
  return tag.id;
}

async function uniqueCustomId() {
  for (let i = 0; i < 6; i++) {
    const id = generateShortNumericId();
    const exists = await prisma.question.findFirst({ where: { customId: id }, select: { id: true } });
    if (!exists) return id;
  }
  // last resort, random 7 digits
  for (;;) {
    const id = generateShortNumericId(7);
    const exists = await prisma.question.findFirst({ where: { customId: id }, select: { id: true } });
    if (!exists) return id;
  }
}

async function ocrFile(file) {
  // Preprocess image for better OCR
  const tmp = path.join(os.tmpdir(), path.basename(file) + '.prep.png');
  try {
    // upscale moderately, grayscale, normalize, threshold
    const img = sharp(file).rotate().grayscale().normalize().sharpen(1.2).gamma(1.1);
    const meta = await img.metadata();
    const width = Math.max(1400, Math.min(2200, (meta.width || 1400)));
    await img.resize({ width, withoutEnlargement: false }).toColourspace('b-w').threshold(170).toFile(tmp);
  } catch {}

  const cfg = {
    logger: () => {},
    tessedit_pageseg_mode: '6',
    preserve_interword_spaces: '1',
    user_defined_dpi: '300'
  };
  const target = fs.existsSync(tmp) ? tmp : file;
  const res = await Tesseract.recognize(target, 'eng', cfg);
  const raw = res.data?.text ?? '';
  return normalizeText(asciiClean(raw));
}

async function main() {
  let dir = process.argv[2] || process.env.INGEST_DIR || 'C:/Users/aramu/OneDrive/Desktop/Questions';
  if (!fs.existsSync(dir)) {
    const alt = 'C:/Users/aramu/OneDrive/Desktop';
    if (fs.existsSync(alt)) dir = alt;
  }
  const DRY = process.env.DRY === '1' || process.argv.includes('--dry');
  const files = listImages(dir);
  if (!files.length) {
    console.error('No image files found in', dir);
    process.exit(1);
  }
  console.warn('Found', files.length, 'image(s)');

  const out = [];
  const preview = [];

  // Ensure resource tag
  const resourceTagValue = 'UWorld - Step 1';
  const resourceTagId = DRY ? null : await ensureTag(TagType.RESOURCE, resourceTagValue);

  // Rotation map (DB requires rotationId on Question)
  const rotations = await prisma.$queryRaw(Prisma.sql`select id, name from "Rotation"`);
  const rotIdByName = Object.fromEntries((rotations || []).map((r) => [r.name, r.id]));

  for (const file of files) {
    try {
      console.warn('OCR:', path.basename(file));
      const text = await ocrFile(file);
      const { stem, choices, explanation, correctIndex } = splitChoices(text);
      if (!stem || !choices.length) {
        console.warn('Skip (no stem/choices):', file);
        out.push({ file, skipped: true, reason: 'no_stem_or_choices' });
        preview.push({ file, stem, choices, explanation });
        continue;
      }

      let correctIdx = correctIndex;
      if (!(correctIdx >= 0 && correctIdx < choices.length)) correctIdx = 0; // fallback

      // De-duplication: skip if identical stem exists
      const existing = DRY ? null : await prisma.$queryRaw(Prisma.sql`select id from "Question" where lower(stem) = lower(${stem}) limit 1`);
      if (existing && Array.isArray(existing) && existing.length) {
        out.push({ file, skipped: true, reason: 'duplicate_db' });
        preview.push({ file, stem, choices, correctIndex: correctIdx, explanation, rotation: null });
        continue;
      }

      const customId = DRY ? generateShortNumericId() : await uniqueCustomId();

      // Rotation id (fallback to IM)
      const rotName = guessRotation(`${stem}\n${explanation}`);
      const rotationId = rotIdByName[rotName] || rotIdByName['Internal Medicine'] || Object.values(rotIdByName)[0];

      // Insert Question raw aligned with DB schema: (id, rotationId, stem, explanation, customId)
      const qid = 'q_' + crypto.randomUUID();
      if (!DRY) {
        await prisma.$executeRaw(Prisma.sql`
          insert into "Question" (id, "rotationId", stem, explanation, "customId")
          values (${qid}, ${rotationId}, ${stem}, ${explanation || null}, ${customId})
        `);
      }

      // Insert Choices
      if (!DRY) {
        for (let i = 0; i < choices.length; i++) {
          const ch = choices[i];
          const cid = 'c_' + crypto.randomUUID();
          await prisma.$executeRaw(Prisma.sql`
            insert into "Choice" (id, "questionId", text, "isCorrect")
            values (${cid}, ${qid}, ${`${ch.key}. ${ch.text}`}, ${i === correctIdx})
          `);
        }
      }

      // Attach Resource tag via QuestionTag (if Tag table exists)
      if (!DRY && resourceTagId) {
        await prisma.$executeRaw(Prisma.sql`
          insert into "QuestionTag" ("questionId", "tagId") values (${qid}, ${resourceTagId})
          on conflict do nothing
        `);
      }

      out.push({ file, customId, id: DRY ? 'dry_' + customId : qid, rotation: rotName });
      preview.push({ file, customId, stem, choices, correctIndex: correctIdx, explanation, rotation: rotName });
    } catch (e) {
      console.error('Failed for', file, e.message);
      out.push({ file, error: e.message });
    }
  }

  const outPath = path.join(process.cwd(), 'ingest-output.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  const prevPath = path.join(process.cwd(), 'ocr-records.json');
  fs.writeFileSync(prevPath, JSON.stringify(preview, null, 2));
  console.warn('Done. Wrote', out.length, 'records to', outPath);
  console.warn('Wrote OCR preview to', prevPath);
  const ok = out.filter((x) => x?.customId).map((x) => ({ file: x.file, customId: x.customId, rotation: x.rotation }));
  console.warn('Inserted questions (file -> customId):');
  for (const r of ok) console.warn('-', path.basename(r.file), '=>', r.customId, '(', r.rotation, ')');
}

main().finally(async () => { await prisma.$disconnect(); });
