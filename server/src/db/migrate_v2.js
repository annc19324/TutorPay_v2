require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const pool = require('./connection');


async function migrate_v2() {
  const client = await pool.connect();
  try {
    console.log('🔄 Running v2 migrations...');

    // Create time_slots table
    await client.query(`
      CREATE TABLE IF NOT EXISTS time_slots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        student_id UUID REFERENCES students(id) ON DELETE CASCADE,
        subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
        day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        rate_type VARCHAR(20) DEFAULT 'hourly' CHECK (rate_type IN ('hourly', 'per_session')),
        rate_per_hour NUMERIC(12,2),
        rate_per_session NUMERIC(12,2),
        label VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Table time_slots created');

    // Add rate_type to sessions
    await client.query(`
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS rate_type VARCHAR(20) DEFAULT 'hourly'
        CHECK (rate_type IN ('hourly', 'per_session'));
    `);
    console.log('✅ sessions.rate_type added');

    // Add rate_per_session to sessions
    await client.query(`
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS rate_per_session NUMERIC(12,2);
    `);
    console.log('✅ sessions.rate_per_session added');

    // Drop the generated total_amount column and recreate as regular column
    try {
      await client.query(`ALTER TABLE sessions DROP COLUMN IF EXISTS total_amount;`);
      await client.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS total_amount NUMERIC(14,2);`);
      // Recompute total_amount for existing rows
      await client.query(`
        UPDATE sessions
        SET total_amount = duration_hours * rate_per_hour
        WHERE total_amount IS NULL;
      `);
      console.log('✅ sessions.total_amount converted to regular column');
    } catch(e) {
      console.log('⚠️  total_amount column already regular or error:', e.message);
    }

    console.log('🎉 v2 Migration completed!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate_v2().catch(console.error);
