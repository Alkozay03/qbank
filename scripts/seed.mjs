// scripts/seed.mjs
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function main() {
  const rotations = [
    'Obstetrics & Gynecology',
    'Pediatrics',
    'Internal Medicine',
    'General Surgery',
  ];

  // Create rotations if they don't exist
  for (const name of rotations) {
    await db.rotation.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // Add one sample question under Internal Medicine
  const im = await db.rotation.findUnique({ where: { name: 'Internal Medicine' } });

  if (im) {
    await db.question.upsert({
      where: { id: 'sample-im-q1' }, // stable ID so running seed twice won't duplicate
      update: {},
      create: {
        id: 'sample-im-q1',
        rotationId: im.id,
        stem:
          'A 65-year-old man with hypertension presents with progressive dyspnea and bilateral leg swelling. BP 160/95, JVP elevated, bibasilar crackles, pitting edema. Which drug provides mortality benefit in HFrEF?',
        difficulty: 'MEDIUM',
        status: 'PUBLISHED',
        choices: {
          create: [
            { label: 'A', text: 'Furosemide', isCorrect: false },
            { label: 'B', text: 'Digoxin', isCorrect: false },
            { label: 'C', text: 'Carvedilol', isCorrect: true },
            { label: 'D', text: 'Diltiazem', isCorrect: false },
            { label: 'E', text: 'Hydralazine (alone)', isCorrect: false },
          ],
        },
        explanation: {
          create: {
            text:
              'Evidence-based beta blockers (carvedilol, metoprolol succinate, bisoprolol) improve survival in HFrEF. Loop diuretics relieve symptoms; digoxin reduces hospitalizations; non-dihydropyridine CCBs can worsen HFrEF.',
          },
        },
      },
    });
  }

  console.log('Seed complete ✔');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
