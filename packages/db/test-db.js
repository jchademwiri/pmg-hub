import { Client } from 'pg';
import "dotenv/config";
const client = new Client({ connectionString: process.env.DATABASE_URL_UNPOOLED });
await client.connect();
try {
  await client.query('ALTER TABLE "expenses" ADD COLUMN "client_id" uuid');
  console.log("Added client_id to expenses");
} catch(e) { console.error("Error expenses:", e.message); }
try {
  await client.query('ALTER TABLE "invitations" ADD COLUMN "name" text NOT NULL');
  console.log("Added name to invitations");
} catch(e) { console.error("Error invitations:", e.message); }
await client.end();
