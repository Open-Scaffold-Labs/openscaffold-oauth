// Account lookup for oidc-provider.
// Reads from the shared `users` table in openfirehouse (ecosystem convention).
// Column shape: id, username, name, role, email, password, passwordHash.

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/openfirehouse',
});

class Account {
  constructor(user) {
    this.accountId = String(user.id);
    this.username = user.username;
    this.name = user.name;
    this.email = user.email;
    this.role = user.role;
  }

  // Claims returned for /me, id_token, and userinfo
  async claims(_use, _scope) {
    return {
      sub: this.accountId,
      username: this.username,
      name: this.name,
      email: this.email,
      role: this.role,
    };
  }
}

/**
 * Look up an account by its identifier (sub claim).
 * Called by oidc-provider when issuing tokens and userinfo.
 */
async function findAccount(_ctx, id) {
  const { rows } = await pool.query(
    'SELECT id, username, name, email, role FROM users WHERE id = $1',
    [parseInt(id, 10)]
  );
  if (!rows.length) return undefined;
  return new Account(rows[0]);
}

/**
 * Authenticate a username + password against the shared users table.
 * Returns an account ID (sub) on success, null otherwise.
 */
async function authenticate(username, password) {
  const { rows } = await pool.query(
    'SELECT id, username, name, email, role, password, "passwordHash" AS pw_hash FROM users WHERE username = $1',
    [username]
  );
  if (!rows.length) return null;
  const user = rows[0];
  const hash = user.pw_hash || user.password;
  if (!hash) return null;
  const ok = await bcrypt.compare(password, hash);
  if (!ok) return null;
  return String(user.id);
}

module.exports = { Account, findAccount, authenticate };
