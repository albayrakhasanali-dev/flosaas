import { getServerSession } from "next-auth";
import { authOptions } from "./auth-options";

export type UserRole = "super_admin" | "sirket_yoneticisi" | "lokasyon_sefi";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  sirketId: number | null;
  lokasyonId: number | null;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user as unknown as SessionUser;
}

export function buildWhereClause(user: SessionUser): Record<string, unknown> {
  switch (user.role) {
    case "super_admin":
      return {};
    case "sirket_yoneticisi":
      return { sirketId: user.sirketId };
    case "lokasyon_sefi":
      return { lokasyonId: user.lokasyonId };
    default:
      return { id: -1 }; // no access
  }
}

export function canDelete(user: SessionUser): boolean {
  return user.role === "super_admin";
}

export function canCreate(user: SessionUser): boolean {
  return user.role === "super_admin" || user.role === "sirket_yoneticisi";
}

export function getEditableFields(user: SessionUser): string[] | null {
  switch (user.role) {
    case "super_admin":
      return null; // all fields
    case "sirket_yoneticisi":
      return null; // all fields within their company
    case "lokasyon_sefi":
      return ["guncelKmSaat", "zimmetMasrafMerkezi"];
    default:
      return [];
  }
}
