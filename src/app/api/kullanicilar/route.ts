import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";
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
    if (user.role === "sirket_yoneticisi") where.sirketId = user.sirketId;
    else if (user.role === "lokasyon_sefi") where.lokasyonId = user.lokasyonId;

    const kullanicilar = await prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(kullanicilar);
  }

  // Full mode: management view (admin only)
  if (user.role === "lokasyon_sefi") {
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
  if (user.role === "sirket_yoneticisi") {
    filters.push({ sirketId: user.sirketId });
  }

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
  const baseWhere = user.role === "sirket_yoneticisi" ? { sirketId: user.sirketId } : {};

  const [toplamKullanici, aktifKullanici, pasifKullanici, superAdminSayisi, yoneticiSayisi, sefSayisi] =
    await Promise.all([
      prisma.user.count({ where: baseWhere }),
      prisma.user.count({ where: { ...baseWhere, isActive: true } }),
      prisma.user.count({ where: { ...baseWhere, isActive: false } }),
      prisma.user.count({ where: { ...baseWhere, role: "super_admin" } }),
      prisma.user.count({ where: { ...baseWhere, role: "sirket_yoneticisi" } }),
      prisma.user.count({ where: { ...baseWhere, role: "lokasyon_sefi" } }),
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
      superAdminSayisi,
      yoneticiSayisi,
      sefSayisi,
    },
  });
}

// POST - Create a new user
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only super_admin and sirket_yoneticisi can create
  if (user.role === "lokasyon_sefi") {
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
    const validRoles = ["super_admin", "sirket_yoneticisi", "lokasyon_sefi"];
    if (!validRoles.includes(body.role)) {
      return NextResponse.json({ error: "Gecersiz rol" }, { status: 400 });
    }

    // sirket_yoneticisi cannot create super_admin
    if (user.role === "sirket_yoneticisi" && body.role === "super_admin") {
      return NextResponse.json({ error: "Super admin olusturma yetkiniz yok" }, { status: 403 });
    }

    // sirket_yoneticisi must assign to own company
    if (user.role === "sirket_yoneticisi") {
      body.sirketId = user.sirketId;
    }

    // Check email uniqueness
    const existing = await prisma.user.findUnique({
      where: { email: body.email },
    });
    if (existing) {
      return NextResponse.json({ error: "Bu email adresi zaten kayitli" }, { status: 409 });
    }

    const newUser = await prisma.user.create({
      data: {
        email: body.email,
        password: hashPassword(body.password),
        name: body.name || null,
        role: body.role,
        sirketId: body.sirketId ? parseInt(body.sirketId) : null,
        lokasyonId: body.lokasyonId ? parseInt(body.lokasyonId) : null,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        sirket: { select: { sirketAdi: true } },
        lokasyon: { select: { lokasyonAdi: true } },
        createdAt: true,
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error("User create error:", error);
    return NextResponse.json({ error: "Kullanici olusturulurken hata olustu" }, { status: 500 });
  }
}
