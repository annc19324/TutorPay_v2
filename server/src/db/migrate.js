const pool = require('./connection');
const bcrypt = require('bcryptjs');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🔄 Running migrations...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
        is_active BOOLEAN DEFAULT true,
        avatar_url TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Table users created');

    await client.query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Table subjects created');

    await client.query(`
      CREATE TABLE IF NOT EXISTS students (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        full_name VARCHAR(100) NOT NULL,
        grade VARCHAR(20),
        parent_name VARCHAR(100),
        parent_phone VARCHAR(20),
        address TEXT,
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Table students created');

    await client.query(`
      CREATE TABLE IF NOT EXISTS tutor_rates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
        student_id UUID REFERENCES students(id) ON DELETE SET NULL,
        rate_per_hour NUMERIC(12,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'VND',
        effective_from DATE DEFAULT CURRENT_DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Table tutor_rates created');

    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        student_id UUID REFERENCES students(id) ON DELETE SET NULL,
        subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
        session_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        duration_hours NUMERIC(4,2) GENERATED ALWAYS AS (
          EXTRACT(EPOCH FROM (end_time - start_time)) / 3600
        ) STORED,
        rate_per_hour NUMERIC(12,2) NOT NULL,
        total_amount NUMERIC(14,2) GENERATED ALWAYS AS (
          EXTRACT(EPOCH FROM (end_time - start_time)) / 3600 * rate_per_hour
        ) STORED,
        status VARCHAR(30) DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled', 'pending')),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Table sessions created');

    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        student_id UUID REFERENCES students(id) ON DELETE SET NULL,
        amount NUMERIC(14,2) NOT NULL,
        payment_date DATE NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'momo', 'zalopay', 'other')),
        reference_code VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Table payments created');

    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Table password_reset_tokens created');

    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        details JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Table activity_logs created');

    // Insert default subjects
    await client.query(`
      INSERT INTO subjects (name, description) VALUES
        ('Toán', 'Môn Toán học'),
        ('Văn', 'Môn Ngữ văn'),
        ('Anh', 'Môn Tiếng Anh'),
        ('Lý', 'Môn Vật lý'),
        ('Hóa', 'Môn Hóa học'),
        ('Sinh', 'Môn Sinh học'),
        ('Sử', 'Môn Lịch sử'),
        ('Địa', 'Môn Địa lý'),
        ('Tin', 'Môn Tin học'),
        ('GDCD', 'Giáo dục công dân')
      ON CONFLICT DO NOTHING;
    `);
    console.log('✅ Default subjects inserted');

    // Create admin account
    const adminPassword = process.env.ADMIN_PASSWORD || 'Zeanokai@1';
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    
    await client.query(`
      INSERT INTO users (username, email, password_hash, full_name, role)
      VALUES ($1, $2, $3, $4, 'admin')
      ON CONFLICT (username) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role = 'admin',
        updated_at = NOW();
    `, ['annc19324', 'admin@tutorpay.vn', hashedPassword, 'Administrator']);
    
    console.log('✅ Admin account created: annc19324');
    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
