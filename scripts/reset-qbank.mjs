// scripts/reset-qbank.mjs
// Clears training samples on disk and deletes all questions from the DB.
// Safe to run repeatedly. Use only if you intend to wipe data.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

function loadEnvFile(file) {
  try {
    const p = path.join(root, file);
    if (!fs.existsSync(p)) return;
    const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq <= 0) continue;
      const k = t.slice(0, eq).trim();
      let v = t.slice(eq + 1).trim();
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1);
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch {}
}

// Load env in priority: existing process.env, .env.local, .env
loadEnvFile('.env.local');
loadEnvFile('.env');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Aborting.');
  process.exit(1);
}

const prisma = new PrismaClient();

async function clearTrainingData() {
  const tdRoot = path.join(root, 'training_data');
  if (fs.existsSync(tdRoot)) {
    fs.rmSync(tdRoot, { recursive: true, force: true });
  }
  // Recreate empty structure
  const ensure = (p) => { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); };
  ensure(path.join(tdRoot, 'images'));
  ensure(path.join(tdRoot, 'labels'));
  ensure(path.join(tdRoot, 'meta'));
  return tdRoot;
}

async function clearQuestions() {
  // Delete QuizItems first to satisfy onDelete Restrict on Question
  const quizItemRes = await prisma.quizItem.deleteMany({});
  const qRes = await prisma.question.deleteMany({});
  return { quizItems: quizItemRes.count, questions: qRes.count };
}

async function main() {
  console.warn('Resetting QBank...');
  try {
    const url = new URL(process.env.DATABASE_URL);
    const redacted = `${url.protocol}//${url.username}:****@${url.host}${url.pathname}${url.search}`;
    console.warn('DB:', redacted);
  } catch {
    console.warn('DB:', '(unparsed)');
  }

  const tdPath = await clearTrainingData();
  console.warn('Cleared training_data at:', tdPath);

  const del = await clearQuestions();
  console.warn('Deleted quiz items:', del.quizItems);
  console.warn('Deleted questions  :', del.questions);

  console.warn('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
