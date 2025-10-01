// scripts/ingest-uworld-text.mjs
// Parse OCR'd .txt files (exported by your OCR extensions) and insert questions with tags.
// Usage:
//   DRY=1 node scripts/ingest-uworld-text.mjs [dir]
//   node scripts/ingest-uworld-text.mjs C:/Users/aramu/OneDrive/Desktop

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PrismaClient, Prisma, TagType } from '@prisma/client';

const prisma = new PrismaClient();

function listTxt(dir) {
  const out = [];
  const st = fs.statSync(dir);
  if (st.isFile() && dir.toLowerCase().endsWith('.txt')) return [dir];
  function walk(d) {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const de of entries) {
      const p = path.join(d, de.name);
      if (de.isDirectory()) walk(p);
      else if (de.isFile() && de.name.toLowerCase().endsWith('.txt')) out.push(p);
    }
  }
  if (st.isDirectory()) walk(dir);
  return out;
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
  return String(s || '')
    .replace(/[\u2000-\u20FF]/g, ' ')
    .replace(/[\u0080-\u00FF]/g, ' ')
    .replace(/[\uFF00-\uFFFF]/g, ' ')
    .replace(/[\u0000-\u001F]/g, ' ');
}

function splitChoices(text) {
  let all = asciiClean(text);
  all = normalizeText(all);
  const explIdx = all.search(/\b(Explanation|Rationale|Educational Objective)\b/i);
  const beforeExpl = explIdx >= 0 ? all.slice(0, explIdx).trim() : all;
  const explanation = explIdx >= 0 ? all.slice(explIdx).replace(/^.*?\b(Explanation|Rationale|Educational Objective)\b[:\s-]*/i, '').trim() : '';

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
      current.text += (current.text ? ' ' : '') + line.trim();
    }
  }
  if (current) blocks.push(current);

  let stem = cleaned;
  if (blocks.length) {
    const firstKey = blocks[0].key;
    const re = new RegExp(`\\n\\s*${firstKey}[\\)\\.:\\-\\s]`);
    const m2 = cleaned.match(re);
    if (m2 && typeof m2.index === 'number') stem = cleaned.slice(0, m2.index).trim();
  }

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

function generateShortNumericId(length = 6) {
  const min = Math.pow(10, Math.max(1, length) - 1);
  const span = min * 9;
  return Math.floor(min + Math.random() * span);
}

async function uniqueCustomId() {
  for (let i = 0; i < 6; i++) {
    const id = generateShortNumericId();
    const exists = await prisma.question.findFirst({ where: { customId: id }, select: { id: true } });
    if (!exists) return id;
  }
  for (;;) {
    const id = generateShortNumericId(7);
    const exists = await prisma.question.findFirst({ where: { customId: id }, select: { id: true } });
    if (!exists) return id;
  }
}

async function main() {
  const dir = process.argv[2] || process.env.INGEST_DIR || 'C:/Users/aramu/OneDrive/Desktop';
  const files = listTxt(dir);
  if (!files.length) { console.error('No .txt files found in', dir); process.exit(1); }
  const DRY = process.env.DRY === '1' || process.argv.includes('--dry');

  // Rotation id map
  const rotations = await prisma.$queryRaw(Prisma.sql`select id, name from "Rotation"`);
  const rotIdByName = Object.fromEntries((rotations || []).map((r) => [r.name, r.id]));
  const resourceTagId = DRY ? null : await ensureTag(TagType.RESOURCE, 'UWorld - Step 1');

  let ok = 0;
  for (const file of files) {
    try {
      const raw = fs.readFileSync(file, 'utf8');
      const { stem, choices, explanation, correctIndex } = splitChoices(raw);
      if (!stem || choices.length < 2) { continue; }
      let correctIdx = correctIndex; if (!(correctIdx >= 0 && correctIdx < choices.length)) correctIdx = 0;
      const customId = DRY ? generateShortNumericId() : await uniqueCustomId();
      const rotName = guessRotation(`${stem}\n${explanation}`);
      const rotationId = rotIdByName[rotName] || rotIdByName['Internal Medicine'] || Object.values(rotIdByName)[0];
      const qid = 'q_' + crypto.randomUUID();
      if (!DRY) {
        await prisma.$executeRaw(Prisma.sql`
          insert into "Question" (id, "rotationId", stem, explanation, "customId")
          values (${qid}, ${rotationId}, ${stem}, ${explanation || null}, ${customId})
        `);
        for (let i = 0; i < choices.length; i++) {
          const ch = choices[i];
          const cid = 'c_' + crypto.randomUUID();
          await prisma.$executeRaw(Prisma.sql`
            insert into "Choice" (id, "questionId", text, "isCorrect")
            values (${cid}, ${qid}, ${`${ch.key}. ${ch.text}`}, ${i === correctIdx})
          `);
        }
        if (resourceTagId) {
          await prisma.$executeRaw(Prisma.sql`insert into "QuestionTag" ("questionId","tagId") values (${qid}, ${resourceTagId}) on conflict do nothing`);
        }
      }
      ok++;
      console.warn(`${DRY ? '[DRY] ' : ''}Added ${path.basename(file)} -> ${customId} (${rotName})`);
    } catch (e) {
      console.error('Failed', file, e.message);
    }
  }
  console.warn('Done. Parsed files:', files.length, 'Inserted:', ok);
}

main().finally(async () => { await prisma.$disconnect(); });
