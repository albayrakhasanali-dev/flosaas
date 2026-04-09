import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/rbac";
import { hashPassword } from "@/lib/password";

// GET - List users with filters, pagination, summary
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode"); // "simple" for dropdown usage

  // Simple mode: return minimal data for dropdowns (backward compatible)
  if (mode === "simple") {
    const where: Record<string, unknown> = { isActive: true };

    const kullanicilar = await prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(kullanicilar);
  }

  // Full mode: management view (admin only)
  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
  }

  const search = searchParams.get("search");
  const role = searchParams.get("role");
  const isActive = searchParams.get("isActive");
  const sirketId = searchParams.get("sirketId");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "25");

  // RBAC filter
  const filters: Record<string, unknown>[] = [];

  if (role) filters.push({ role });
  if (isActive !== null && isActive !== "") {
    filters.push({ isActive: isActive === "true" });
  }
  if (sirketId) filters.push({ sirketId: parseInt(sirketId) });

  if (search) {
    filters.push({
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  const where = filters.length > 0 ? { AND: filters } : {};

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        sirketId: true,
        lokasyonId: true,
        sirket: { select: { sirketAdi: true } },
        lokasyon: { select: { lokasyonAdi: true } },
        createdAt: true,
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
  ]);

  // Summary stats
  const [toplamKullanici, aktifKullanici, pasifKullanici, adminSayisi, personelSayisi] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: false } }),
      prisma.user.count({ where: { role: "admin" } }),
      prisma.user.count({ where: { role: "personel" } }),
    ]);

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    summary: {
      toplamKullanici,
      aktifKullanici,
      pasifKullanici,
      adminSayisi,
      personelSayisi,
    },
  });
}

// POST - Create a new user
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only admin can create users
  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Kullanici olusturma yetkiniz yok" }, { status: 403 });
  }

  try {
    const body = await req.json();

    if (!body.email || !body.password || !body.role) {
      return NextResponse.json(
        { error: "Email, sifre ve rol zorunlu" },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ["admin", "personel"];
    if (!validRoles.includes(body.role)) {
      return NextResponse.json({ error: "Gecersiz rol" }, { status: 400 });
    }

    // Check email uniqueness
    const existing = await prisma.user.findUnique({
      where: { email: body.email },
    });
    if (existing) {
      return NextResponse.json({ error: "Bu email adresi zaten kayitli" }, { status: 409 });
    }

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email: body.email,
        password: hashPassword(body.password),
        name: body.name || null,
        role: body.role,
        sirketId: body.sirketId ? parseInt(body.sirketId) : null,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        sirket: { select: { sirketAdi: true } },
        createdAt: true,
      },
    });

    // Handle lokasyonIds: create UserLokasyon join records
    if (body.lokasyonIds && Array.isArray(body.lokasyonIds) && body.lokasyonIds.length > 0) {
      await prisma.userLokasyon.createMany({
        data: body.lokasyonIds.map((lokId: number) => ({
          userId: newUser.id,
          lokasyonId: typeof lokId === "string" ? parseInt(lokId) : lokId,
        })),
      });
    }

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error("User create error:", error);
    return NextResponse.json({ error: "Kullanici olusturulurken hata olustu" }, { status: 500 });
  }
}
