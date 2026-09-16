#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "../.env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    const value = line.slice(i + 1).trim();
    if (key && process.env[key] == null) process.env[key] = value;
  }
}

const migrationsDir = join(__dirname, "../supabase/migrations");

const databaseUrl =
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL;

if (!databaseUrl) {
  console.error(
    "Set SUPABASE_DB_URL (Supabase → Project Settings → Database → Connection string)."
  );
  process.exit(1);
}

function connectionCandidates(url) {
  const urls = [url];
  try {
    const parsed = new URL(url);
    const hostMatch = parsed.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
    if (hostMatch) {
      const ref = hostMatch[1];
      const password = decodeURIComponent(parsed.password);
      const user = `postgres.${ref}`;
      const regions = [
        "aws-0-ap-southeast-2",
        "aws-1-ap-southeast-2",
        "aws-0-ap-southeast-1",
        "aws-0-us-east-1",
        "aws-0-us-west-1",
        "aws-0-eu-west-1",
        "aws-0-eu-west-2",
      ];
      for (const region of regions) {
        const host = `${region}.pooler.supabase.com`;
        const auth = `${encodeURIComponent(user)}:${encodeURIComponent(password)}`;
        urls.push(`postgresql://${auth}@${host}:5432/postgres`);
        urls.push(`postgresql://${auth}@${host}:6543/postgres`);
      }
    }
  } catch {
    return urls;
  }
  return urls;
}

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

let client = null;
let lastError = null;
for (const url of connectionCandidates(databaseUrl)) {
  const host = new URL(url).host;
  const attempt = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  try {
    await attempt.connect();
    console.log(`Connected via ${host}`);
    client = attempt;
    break;
  } catch (err) {
    lastError = err;
    console.log(`  skip ${host}: ${err.code ?? err.message}`);
    try {
      await attempt.end();
    } catch {
      /* ignore */
    }
  }
}

if (!client) {
  console.error(lastError);
  process.exit(1);
}

try {
  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    console.log(`Applying ${file}...`);
    await client.query(sql);
    console.log(`  OK`);
  }
  console.log("Migrations applied.");
} catch (err) {
  console.error(err);
  process.exit(1);
} finally {
  await client.end();
}
