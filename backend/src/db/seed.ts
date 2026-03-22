import bcrypt from 'bcryptjs';
import { pool } from './connection';

const DEFAULT_USERS = [
  { email: 'admin@inditronics.io',     password: 'password', name: 'Admin User',        role: 'admin' },
  { email: 'authority@inditronics.io', password: 'password', name: 'Authority User',     role: 'authority' },
  { email: 'support@inditronics.io',   password: 'password', name: 'Support Engineer',   role: 'support' },
  { email: 'admin@test.com',          password: 'password', name: 'Test Admin',         role: 'admin' },
  { email: 'user@test.com',           password: 'password', name: 'Test User',          role: 'user' },
];

export async function seedDefaultUsers() {
  try {
    const connection = await pool.getConnection();

    const [rows] = await connection.query('SELECT COUNT(*) as count FROM users');
    const count = (rows as any[])[0].count;

    if (count === 0) {
      console.log('🌱 Seeding default users...');
      for (const u of DEFAULT_USERS) {
        const hashed = await bcrypt.hash(u.password, 10);
        await connection.query(
          'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
          [u.email, hashed, u.name, u.role]
        );
      }
      console.log(`✓ ${DEFAULT_USERS.length} default users created`);
      console.log('   📧 admin@inditronics.io / password');
      console.log('   📧 authority@inditronics.io / password');
      console.log('   📧 support@inditronics.io / password');
    } else {
      console.log(`✓ Users already exist (${count} found) - skipping seed`);
    }

    connection.release();
  } catch (error) {
    console.warn('⚠️  Could not seed users (table may not exist yet):', (error as any).message);
  }
}
