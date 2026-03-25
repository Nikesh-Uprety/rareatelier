import { db } from '../server/db';
import { readFile } from 'fs/promises';
import { join } from 'path';

async function applyMigration() {
  console.log('Applying migration 0002_add_performance_indexes...');

  const sqlPath = join(import.meta.dirname, '..', 'migrations', '0002_add_performance_indexes.sql');
  const sql = await readFile(sqlPath, 'utf-8');

  // Split by semicolon to execute each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let successCount = 0;
  let skipCount = 0;

  for (const statement of statements) {
    try {
      await db.execute(statement);
      successCount++;
      console.log('✓ Applied:', statement.substring(0, 60) + '...');
    } catch (err: any) {
      if (err.message?.includes('already exists')) {
        skipCount++;
        console.log('⊘ Already exists:', statement.substring(0, 60) + '...');
      } else {
        console.error('✗ Error:', err.message);
        console.error('Statement:', statement);
      }
    }
  }

  console.log(`\nMigration complete: ${successCount} created, ${skipCount} already existed`);
}

applyMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
