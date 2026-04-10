import { getServerSession } from "next-auth";
import { authOptions } from "./auth-options";

export type UserRole = "admin" | "personel";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  lokasyonIds: number[];
  sirketId: number | null;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user as unknown as SessionUser;
}

export function buildWhereClause(user: SessionUser): Record<string, unknown> {
  if (user.role === "admin") return {};
  // Personel: filter by assigned locations
  const ids = user.lokasyonIds || [];
  if (ids.length === 0) return { id: -1 }; // no locations = no access
  return { lokasyonId: { in: ids } };
}

export function isAdmin(user: SessionUser): boolean {
  return user.role === "admin";
}

// Personel can only edit muayene and sigorta modules
export function canEditModule(user: SessionUser, module: "muayene" | "sigorta" | "other"): boolean {
  if (user.role === "admin") return true;
  return module === "muayene" || module === "sigorta";
}
