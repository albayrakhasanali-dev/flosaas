"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Plus, ChevronLeft, ChevronRight, Eye } from "lucide-react";

interface Arac {
  id: number;
  plaka: string;
  durum: { durumAdi: string } | null;
  sirket: { sirketAdi: string } | null;
  lokasyon: { lokasyonAdi: string } | null;
  mulkiyetTipi: string | null;
  markaModelTicariAdi: string | null;
  kullanimSekli: string | null;
  uttsDurum: string | null;
  muayeneAlarm: string;
  sigortaAlarm: string;
  muayeneKalanGun: number | null;
  sigortaKalanGun: number | null;
}

interface PaginatedResponse {
  data: Arac[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const filterLabels: Record<string, string> = {
  all: "Tum Filo",
  aktif: "🟢 Aktif Filo",
  pasif: "⚫ Pasif / Yatan Araclar",
  hukuki: "🔴 Hukuki ve Satis",
  utts_eksik: "⚠️ UTTS Montaj Bekleyenler",
};

export default function FiloClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const filter = searchParams.get("filter") || "all";

  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter !== "all") params.set("filter", filter);
    if (search) params.set("search", search);
    params.set("page", String(page));
    params.set("limit", "25");

    const res = await fetch(`/api/araclar?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [filter, search, page]);

  useEffect(() => {
    setPage(1);
  }, [filter, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {filterLabels[filter] || "Filo"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {data ? `${data.pagination.total} arac listeleniyor` : "Yukleniyor..."}
          </p>
        </div>
        <button
          onClick={() => router.push("/arac/new")}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Yeni Arac
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Plaka, marka veya model ara..."
          className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Data Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="data-grid">
                <thead>
                  <tr>
                    <th>Plaka</th>
                    <th>Durum</th>
                    <th>Sirket</th>
                    <th>Lokasyon</th>
                    <th>Mulkiyet</th>
                    <th>Marka/Model</th>
                    <th>Kullanim</th>
                    <th>UTTS</th>
                    <th>Muayene</th>
                    <th>Sigorta</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data.map((a) => (
                    <tr key={a.id} className="cursor-pointer" onClick={() => router.push(`/arac/${a.id}`)}>
                      <td className="font-bold text-blue-600">{a.plaka}</td>
                      <td>
                        <span className={`badge ${
                          a.durum?.durumAdi.includes("AKTİF") ? "badge-success" :
                          a.durum?.durumAdi.includes("HUKUKİ") ? "badge-danger" :
                          a.durum?.durumAdi.includes("BAKIMDA") ? "badge-warning" :
                          "badge-neutral"
                        }`}>
                          {a.durum?.durumAdi || "-"}
                        </span>
                      </td>
                      <td className="text-xs">{a.sirket?.sirketAdi || "-"}</td>
                      <td className="text-xs">{a.lokasyon?.lokasyonAdi || "-"}</td>
                      <td>
                        <span className={`badge ${a.mulkiyetTipi === "Kiralık" ? "badge-warning" : "badge-neutral"}`}>
                          {a.mulkiyetTipi || "-"}
                        </span>
                      </td>
                      <td className="text-xs">{a.markaModelTicariAdi || "-"}</td>
                      <td className="text-xs">{a.kullanimSekli || "-"}</td>
                      <td>
                        <span className={`badge ${
                          a.uttsDurum === "Takılı" ? "badge-success" :
                          a.uttsDurum === "Eksik" ? "badge-danger" : "badge-neutral"
                        }`}>
                          {a.uttsDurum || "-"}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${
                          a.muayeneAlarm.includes("GEÇTİ") ? "badge-danger" :
                          a.muayeneAlarm.includes("YAKLAŞIYOR") ? "badge-warning" :
                          a.muayeneAlarm.includes("GEÇERLİ") ? "badge-success" : "badge-neutral"
                        }`}>
                          {a.muayeneKalanGun !== null ? `${a.muayeneKalanGun}g` : "-"}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${
                          a.sigortaAlarm.includes("GEÇTİ") ? "badge-danger" :
                          a.sigortaAlarm.includes("YAKLAŞIYOR") ? "badge-warning" :
                          a.sigortaAlarm.includes("GEÇERLİ") ? "badge-success" : "badge-neutral"
                        }`}>
                          {a.sigortaKalanGun !== null ? `${a.sigortaKalanGun}g` : "-"}
                        </span>
                      </td>
                      <td>
                        <button className="text-slate-400 hover:text-blue-600">
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {data?.data.length === 0 && (
                    <tr>
                      <td colSpan={11} className="text-center py-12 text-slate-400">
                        Sonuc bulunamadi
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data && data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200">
                <p className="text-sm text-slate-500">
                  Sayfa {data.pagination.page} / {data.pagination.totalPages} ({data.pagination.total} kayit)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                    disabled={page >= data.pagination.totalPages}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
