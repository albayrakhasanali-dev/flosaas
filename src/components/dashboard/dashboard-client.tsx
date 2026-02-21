"use client";

import { useEffect, useState } from "react";
import { Truck, CheckCircle, PauseCircle, Radio } from "lucide-react";

interface DashboardData {
  kpiCards: {
    toplamArac: number;
    aktifArac: number;
    yatanArac: number;
    uttsEksik: number;
  };
  pivotTable: {
    sirketler: string[];
    durumlar: string[];
    data: Record<string, Record<string, number>>;
  };
  alarmTable: {
    id: number;
    plaka: string;
    lokasyon: string;
    muayeneAlarm: string;
    sigortaAlarm: string;
    muayeneKalanGun: number | null;
    sigortaKalanGun: number | null;
  }[];
}

export default function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!data) return <p>Veri yuklenemedi</p>;

  const kpis = [
    {
      label: "Toplam Arac",
      value: data.kpiCards.toplamArac,
      icon: Truck,
      color: "bg-blue-50 text-blue-700",
      iconColor: "text-blue-500",
    },
    {
      label: "Aktif Arac",
      value: data.kpiCards.aktifArac,
      icon: CheckCircle,
      color: "bg-green-50 text-green-700",
      iconColor: "text-green-500",
    },
    {
      label: "Yatan Arac",
      value: data.kpiCards.yatanArac,
      icon: PauseCircle,
      color: "bg-gray-50 text-gray-700",
      iconColor: "text-gray-500",
    },
    {
      label: "UTTS Eksik",
      value: data.kpiCards.uttsEksik,
      icon: Radio,
      color: "bg-amber-50 text-amber-700",
      iconColor: "text-amber-500",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Yonetim Kokpiti</h1>
        <p className="text-sm text-slate-500 mt-1">
          Filo durumu ve acil aksiyonlara genel bakis
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{kpi.label}</p>
                  <p className="text-3xl font-bold mt-1">{kpi.value}</p>
                </div>
                <div
                  className={`w-12 h-12 rounded-lg ${kpi.color} flex items-center justify-center`}
                >
                  <Icon size={24} className={kpi.iconColor} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pivot Table (Altin Tablo) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-5 border-b border-slate-200">
          <h2 className="text-lg font-semibold">Sirket Bazli Ozet (Altin Tablo)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="data-grid">
            <thead>
              <tr>
                <th>Sirket</th>
                {data.pivotTable.durumlar.map((d) => (
                  <th key={d} className="text-center">
                    {d}
                  </th>
                ))}
                <th className="text-center">Toplam</th>
              </tr>
            </thead>
            <tbody>
              {data.pivotTable.sirketler.map((sirket) => {
                const row = data.pivotTable.data[sirket];
                const total = Object.values(row).reduce((a, b) => a + b, 0);
                if (total === 0) return null;
                return (
                  <tr key={sirket}>
                    <td className="font-medium">{sirket}</td>
                    {data.pivotTable.durumlar.map((d) => (
                      <td key={d} className="text-center">
                        {row[d] || "-"}
                      </td>
                    ))}
                    <td className="text-center font-bold">{total}</td>
                  </tr>
                );
              })}
              {/* Total row */}
              <tr className="bg-slate-50 font-bold">
                <td>TOPLAM</td>
                {data.pivotTable.durumlar.map((d) => (
                  <td key={d} className="text-center">
                    {data.pivotTable.sirketler.reduce(
                      (sum, s) => sum + (data.pivotTable.data[s]?.[d] || 0),
                      0
                    )}
                  </td>
                ))}
                <td className="text-center">
                  {data.kpiCards.toplamArac}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Alarm Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-red-600">
            Acil Aksiyon Tablosu
          </h2>
          <span className="badge badge-danger">{data.alarmTable.length} arac</span>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="data-grid">
            <thead>
              <tr>
                <th>Plaka</th>
                <th>Lokasyon</th>
                <th>Muayene Durumu</th>
                <th>Muayene Kalan Gun</th>
                <th>Sigorta Durumu</th>
                <th>Sigorta Kalan Gun</th>
              </tr>
            </thead>
            <tbody>
              {data.alarmTable.map((a) => (
                <tr key={a.id}>
                  <td className="font-bold">{a.plaka}</td>
                  <td>{a.lokasyon}</td>
                  <td>
                    <span
                      className={`badge ${
                        a.muayeneAlarm.includes("GECTi") || a.muayeneAlarm.includes("GEÇTİ")
                          ? "badge-danger"
                          : a.muayeneAlarm.includes("YAKLASIYOR") || a.muayeneAlarm.includes("YAKLAŞIYOR")
                          ? "badge-warning"
                          : "badge-success"
                      }`}
                    >
                      {a.muayeneAlarm}
                    </span>
                  </td>
                  <td className={`font-medium ${(a.muayeneKalanGun ?? 0) < 0 ? "text-red-600" : ""}`}>
                    {a.muayeneKalanGun ?? "-"}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        a.sigortaAlarm.includes("GECTi") || a.sigortaAlarm.includes("GEÇTİ")
                          ? "badge-danger"
                          : a.sigortaAlarm.includes("YAKLASIYOR") || a.sigortaAlarm.includes("YAKLAŞIYOR")
                          ? "badge-warning"
                          : "badge-success"
                      }`}
                    >
                      {a.sigortaAlarm}
                    </span>
                  </td>
                  <td className={`font-medium ${(a.sigortaKalanGun ?? 0) < 0 ? "text-red-600" : ""}`}>
                    {a.sigortaKalanGun ?? "-"}
                  </td>
                </tr>
              ))}
              {data.alarmTable.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    Acil aksiyon gerektiren arac bulunmuyor
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
