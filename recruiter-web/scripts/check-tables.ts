import { databasePool } from './lib/database';

const r = await databasePool.query(
  "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
);
console.log(JSON.stringify(r.rows, null, 2));
await databasePool.end();
