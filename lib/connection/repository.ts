import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  connections,
  domains,
  type ConnectionRow,
  type DomainRow,
} from "@/lib/db/schema";
import type {
  Connection,
  ConnectionDomain,
} from "@/lib/connection/types";

export async function listConnections(): Promise<Connection[]> {
  const [connectionRows, domainRows] = await Promise.all([
    db
      .select()
      .from(connections)
      .orderBy(asc(connections.label)),
    db.select().from(domains).orderBy(asc(domains.name)),
  ]);
  const domainsByConnection = Map.groupBy(
    domainRows,
    (domain) => domain.connectionId,
  );

  return connectionRows.map((connection) =>
    toConnection(connection, domainsByConnection.get(connection.id) ?? []),
  );
}

export async function getConnection(id: string) {
  const [connection] = await db
    .select()
    .from(connections)
    .where(eq(connections.id, id))
    .limit(1);

  return connection;
}

export async function getConnectionByWebhookToken(token: string) {
  const [connection] = await db
    .select()
    .from(connections)
    .where(eq(connections.webhookEndpointToken, token))
    .limit(1);

  return connection;
}

export async function findConnectionByAccountMarkers(markers: string[]) {
  if (!markers.length) return undefined;

  const markerSet = new Set(markers);
  const rows = await db
    .select({
      id: connections.id,
      label: connections.label,
      accountMarkers: connections.accountMarkers,
    })
    .from(connections);

  return rows.find((row) =>
    row.accountMarkers.some((marker) => markerSet.has(marker)),
  );
}

export async function getDomain(id: string, connectionId?: string) {
  const [domain] = await db
    .select()
    .from(domains)
    .where(
      and(
        eq(domains.id, id),
        connectionId ? eq(domains.connectionId, connectionId) : undefined,
      ),
    )
    .limit(1);

  return domain ? toDomain(domain) : undefined;
}

export async function createConnection(input: {
  id: string;
  label: string;
  authType: "api_key" | "oauth";
  encryptedApiKey?: string;
  encryptedAccessToken?: string;
  encryptedRefreshToken?: string;
  tokenExpiresAt?: Date;
  credentialFingerprint: string;
  accountMarkers: string[];
  webhookEndpointToken: string;
  encryptedWebhookSecret?: string;
  domains: Array<{
    id: string;
    name: string;
    status: string;
    sending: boolean;
    receiving: boolean;
  }>;
}) {
  return db.transaction(async (transaction) => {
    const [connection] = await transaction
      .insert(connections)
      .values({
        id: input.id,
        label: input.label,
        authType: input.authType,
        encryptedApiKey: input.encryptedApiKey,
        encryptedAccessToken: input.encryptedAccessToken,
        encryptedRefreshToken: input.encryptedRefreshToken,
        tokenExpiresAt: input.tokenExpiresAt,
        credentialFingerprint: input.credentialFingerprint,
        accountMarkers: input.accountMarkers,
        webhookEndpointToken: input.webhookEndpointToken,
        encryptedWebhookSecret: input.encryptedWebhookSecret,
        lastVerifiedAt: new Date(),
      })
      .returning();

    const domainRows = input.domains.length
      ? await transaction
          .insert(domains)
          .values(
            input.domains.map((domain) => ({
              id: domain.id,
              connectionId: connection.id,
              name: domain.name,
              status: domain.status,
              sendingEnabled: domain.sending,
              receivingEnabled: domain.receiving,
            })),
          )
          .returning()
      : [];

    return toConnection(connection, domainRows);
  });
}

export async function setWebhookSecret(id: string, encryptedSecret: string) {
  const [updated] = await db
    .update(connections)
    .set({ encryptedWebhookSecret: encryptedSecret, updatedAt: new Date() })
    .where(eq(connections.id, id))
    .returning({ id: connections.id });

  return Boolean(updated);
}

export async function setConnectionStatus(
  id: string,
  status: "active" | "error" | "revoked",
) {
  await db
    .update(connections)
    .set({ status, updatedAt: new Date() })
    .where(eq(connections.id, id));
}

export async function updateConnectionLabel(id: string, label: string) {
  const [updated] = await db
    .update(connections)
    .set({ label, updatedAt: new Date() })
    .where(eq(connections.id, id))
    .returning({ id: connections.id });

  return Boolean(updated);
}

export async function replaceConnectionApiKey(input: {
  id: string;
  encryptedApiKey: string;
  credentialFingerprint: string;
  accountMarkers: string[];
  domains: Array<{
    id: string;
    name: string;
    status: string;
    sending: boolean;
    receiving: boolean;
  }>;
}) {
  return db.transaction(async (transaction) => {
    const [updated] = await transaction
      .update(connections)
      .set({
        authType: "api_key",
        encryptedApiKey: input.encryptedApiKey,
        encryptedAccessToken: null,
        encryptedRefreshToken: null,
        tokenExpiresAt: null,
        credentialFingerprint: input.credentialFingerprint,
        accountMarkers: input.accountMarkers,
        status: "active",
        lastVerifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(connections.id, input.id))
      .returning({ id: connections.id });

    if (!updated) return false;

    if (input.domains.length) {
      await transaction
        .insert(domains)
        .values(
          input.domains.map((domain) => ({
            id: domain.id,
            connectionId: input.id,
            name: domain.name,
            status: domain.status,
            sendingEnabled: domain.sending,
            receivingEnabled: domain.receiving,
            updatedAt: new Date(),
          })),
        )
        .onConflictDoUpdate({
          target: domains.id,
          set: {
            name: sql`excluded.name`,
            status: sql`excluded.status`,
            sendingEnabled: sql`excluded.sending_enabled`,
            receivingEnabled: sql`excluded.receiving_enabled`,
            updatedAt: new Date(),
          },
        });
    }

    return true;
  });
}

export async function deleteConnection(id: string) {
  const [deleted] = await db
    .delete(connections)
    .where(eq(connections.id, id))
    .returning({ id: connections.id });
  return Boolean(deleted);
}

function toConnection(
  row: ConnectionRow,
  domainRows: DomainRow[],
): Connection {
  return {
    id: row.id,
    label: row.label,
    authType: row.authType,
    access: "full_access",
    status: row.status,
    webhookConfigured: Boolean(row.encryptedWebhookSecret),
    webhookPath: `/api/webhooks/resend/${row.webhookEndpointToken}`,
    domains: domainRows.map(toDomain),
  };
}

function toDomain(row: DomainRow): ConnectionDomain {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    sending: row.sendingEnabled,
    receiving: row.receivingEnabled,
  };
}
