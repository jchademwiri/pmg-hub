import { db } from '../client';
import { clients, income } from '../schema/index';
import type { Client } from '../schema/clients';
import { sql, eq, asc } from 'drizzle-orm';

export type ClientWithIncomeCount = {
  id: string;
  name: string;
  businessName: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
  incomeCount: number;
  portalInvitationSentAt: Date | null;
  userId: string | null;
};

export async function getAllClients(): Promise<
  { id: string; name: string; businessName: string | null; email: string | null }[]
> {
  return db
    .select({
      id: clients.id,
      name: clients.name,
      businessName: clients.businessName,
      email: clients.email,
    })
    .from(clients)
    .orderBy(asc(clients.name));
}

/**
 * Returns all clients joined with a count of their associated income entries,
 * ordered by client name ascending.
 */
export async function getClientsWithIncomeCount(): Promise<ClientWithIncomeCount[]> {
  const result = await db
    .select({
      id: clients.id,
      name: clients.name,
      businessName: clients.businessName,
      email: clients.email,
      phone: clients.phone,
      isActive: clients.isActive,
      createdAt: clients.createdAt,
      portalInvitationSentAt: clients.portalInvitationSentAt,
      userId: clients.userId,
      incomeCount: sql<number>`CAST(COUNT(${income.id}) AS INTEGER)`,
    })
    .from(clients)
    .leftJoin(income, eq(income.clientId, clients.id))
    .groupBy(clients.id)
    .orderBy(asc(clients.name));

  return result;
}

/**
 * Returns a single client row by primary key, or null if no matching row exists.
 */
export async function getClientById(id: string): Promise<Client | null> {
  const result = await db.select().from(clients).where(eq(clients.id, id));

  return result[0] ?? null;
}

/**
 * Sets isActive to the given value for the client with the given id.
 */
export async function setClientActive(id: string, isActive: boolean): Promise<void> {
  await db.update(clients).set({ isActive, updatedAt: new Date() }).where(eq(clients.id, id));
}
