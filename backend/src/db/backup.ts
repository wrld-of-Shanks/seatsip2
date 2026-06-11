import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { prisma } from './index';

const recipient = process.env.BACKUP_ENCRYPTION_RECIPIENT;
const destination = process.env.BACKUP_S3_URI;
const databaseUrl = process.env.DATABASE_URL;

if (!recipient) throw new Error('BACKUP_ENCRYPTION_RECIPIENT is required');
if (!destination) throw new Error('BACKUP_S3_URI is required');
if (!databaseUrl) throw new Error('DATABASE_URL is required');

async function backup() {
  await prisma.$disconnect();

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seatsip-backup-'));
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const plain = path.join(dir, `seatsip-${stamp}.dump`);
  const encrypted = `${plain}.age`;

  let dbPath = databaseUrl;
  if (dbPath.startsWith('file:')) {
    dbPath = dbPath.slice(5);
  }

  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database file not found at: ${dbPath}`);
  }

  fs.copyFileSync(dbPath, plain);
  execFileSync('age', ['-r', recipient, '-o', encrypted, plain], { stdio: 'inherit' });
  execFileSync('aws', ['s3', 'cp', encrypted, `${destination}/seatsip-${stamp}.dump.age`], { stdio: 'inherit' });
  fs.rmSync(dir, { recursive: true, force: true });
}

backup().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
