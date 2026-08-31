import { execSync } from 'child_process';
process.env.DATABASE_URL_UNPOOLED =
  'postgresql://neondb_owner:npg_Q4ls1RYbBaxS@ep-steep-boat-a4qsqjdh.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
execSync('bun run db:migrate', { stdio: 'inherit' });
