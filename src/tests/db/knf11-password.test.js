// KNF11: cek isi tabel pengguna, password harus berupa hash bcrypt
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../db.js';

after(() => pool.end());

test('KNF11-TC01 tidak ada password yang tersimpan sebagai teks biasa', async () => {
  const { rows } = await pool.query("SELECT username, password_hash FROM pengguna WHERE password_hash <> 'tidak-dipakai'");
  for (const r of rows) {
    assert.ok(r.password_hash.startsWith('$2b$10$'), r.username);
  }
});
