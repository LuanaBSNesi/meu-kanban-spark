import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

type Database = ReturnType<typeof create>;

function create() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL missing');
  return drizzle(neon(process.env.DATABASE_URL), { schema });
}

let instance: Database | undefined;

/**
 * Built on first query, not on import: a missing DATABASE_URL should fail the
 * request that needs it, not the build that merely loads this module.
 */
export const db = new Proxy({} as Database, {
  get(_target, property) {
    instance ??= create();
    return Reflect.get(instance, property, instance);
  },
});

export * from './schema';
