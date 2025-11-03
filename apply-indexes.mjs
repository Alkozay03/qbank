// apply-indexes.mjs
import { config } from 'dotenv';
import pg from 'pg';
import { readFileSync } from 'fs';

config();

const { Client } = pg;

async function applyIndexes() {
  const client = new Client({
    connectionString: process.env.DIRECT_DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    const sql = readFileSync('add_comprehensive_performance_indexes.sql', 'utf-8');
    
    console.log('🔨 Creating indexes...');
    await client.query(sql);
    
    console.log('✅ All indexes created successfully!');
    console.log('\n📊 Verifying indexes...');
    
    const result = await client.query(`
      SELECT tablename, indexname
      FROM pg_indexes 
      WHERE indexname LIKE 'idx_%'
      AND tablename IN ('Choice', 'Question', 'QuestionOccurrence', 'Tag', 'QuestionTag', 'Quiz', 'PreClerkshipQuiz', 'QuestionComment', 'PreClerkshipQuestionComment')
      ORDER BY tablename, indexname;
    `);
    
    console.log('\n✅ Indexes created:');
    console.table(result.rows);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyIndexes();
