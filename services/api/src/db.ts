import pg from 'pg';
import { config } from './config.js';
import { getSecret } from './secrets.js';

let pool: pg.Pool | undefined;

/** Lazily creates a single connection pool, reused across warm invocations. */
export async function getPool(): Promise<pg.Pool> {
  if (pool) return pool;
  const dbSecret = await getSecret(config.dbSecretArn);
  pool = new pg.Pool({
    host: dbSecret.host,
    port: Number(dbSecret.port ?? '5432'),
    user: dbSecret.username,
    password: dbSecret.password,
    database: config.dbName,
    max: 2,
    // Traffic stays inside the VPC; pin the RDS CA bundle before going to production.
    ssl: { rejectUnauthorized: false },
  });
  return pool;
}

export interface UserRow {
  id: string;
  email: string;
  auth_provider: string;
  subscription: 'free' | 'active';
  created_at: Date;
}

export interface UsageRow {
  user_id: string;
  messages_used: number;
  last_reset: Date;
}

/** Creates the user (and its usage row) on first contact; returns the user. */
export async function getOrCreateUser(
  id: string,
  email: string,
  authProvider: string,
): Promise<UserRow> {
  const db = await getPool();
  const result = await db.query<UserRow>(
    `insert into users (id, email, auth_provider)
     values ($1, $2, $3)
     on conflict (id) do update set email = excluded.email
     returning *`,
    [id, email, authProvider],
  );
  const user = result.rows[0];
  if (!user) throw new Error('User upsert returned no row');
  await db.query(`insert into usage (user_id) values ($1) on conflict (user_id) do nothing`, [id]);
  return user;
}

export async function getUsage(userId: string): Promise<UsageRow> {
  const db = await getPool();
  const result = await db.query<UsageRow>(`select * from usage where user_id = $1`, [userId]);
  const usage = result.rows[0];
  if (!usage) throw new Error(`No usage row for user ${userId}`);
  return usage;
}

export async function resetUsage(userId: string): Promise<void> {
  const db = await getPool();
  await db.query(`update usage set messages_used = 0, last_reset = now() where user_id = $1`, [
    userId,
  ]);
}

export async function incrementUsage(userId: string): Promise<void> {
  const db = await getPool();
  await db.query(`update usage set messages_used = messages_used + 1 where user_id = $1`, [userId]);
}

export async function setSubscriptionStatus(
  userId: string,
  status: 'free' | 'active',
): Promise<void> {
  const db = await getPool();
  await db.query(`update users set subscription = $2 where id = $1`, [userId, status]);
}
