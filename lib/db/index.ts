import "server-only";

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

import { getServerEnv } from "@/lib/server/env";

import * as schema from "./schema";

type Database = PostgresJsDatabase<typeof schema>;

type GlobalWithDatabase = typeof globalThis & {
  inboundDatabaseClient?: Sql;
  inboundDrizzleDatabase?: Database;
};

const globalWithDatabase = globalThis as GlobalWithDatabase;

const client =
  globalWithDatabase.inboundDatabaseClient ??
  postgres(getServerEnv("DATABASE_URL"), {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });

export const db =
  globalWithDatabase.inboundDrizzleDatabase ?? drizzle(client, { schema });

if (process.env.NODE_ENV !== "production") {
  globalWithDatabase.inboundDatabaseClient = client;
  globalWithDatabase.inboundDrizzleDatabase = db;
}
