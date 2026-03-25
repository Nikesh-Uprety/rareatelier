import { db } from '../server/db';

async function applyPromoIndexes() {
  console.log('Applying remaining promo_codes indexes...');

  try {
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
    `);
    console.log('✓ Created idx_promo_codes_code');
  } catch (err: any) {
    console.log('⊘ idx_promo_codes_code already exists or table missing:', err.message);
  }

  try {
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(active) WHERE active = true;
    `);
    console.log('✓ Created idx_promo_codes_active');
  } catch (err: any) {
    console.log('⊘ idx_promo_codes_active already exists or table missing:', err.message);
  }

  try {
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_promo_codes_expires_at ON promo_codes(expires_at) WHERE expires_at IS NOT NULL;
    `);
    console.log('✓ Created idx_promo_codes_expires_at');
  } catch (err: any) {
    console.log('⊘ idx_promo_codes_expires_at already exists or table missing:', err.message);
  }

  console.log('Done!');
}

applyPromoIndexes().catch(console.error);
