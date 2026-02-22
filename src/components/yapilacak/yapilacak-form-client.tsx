"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Save,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
} from "lucide-react";

interface AracOption {
  id: number;
  plaka: string;
  sirket: { sirketAdi: string } | null;
  lokasyon: { lokasyonAdi: string } | null;
  markaModelTicariAdi: string | null;
}

interface KullaniciOption {
  id: number;
  name: string | null;
  email: string;
  role: string;
}

interface FormData {
  baslik: string;
  aciklama: string;
  durum: string;
  oncelik: string;
  aracId: string;
  atananKullaniciId: string;
  sonTarih: string;
  kategori: string;
  notlar: string;
}

const emptyForm: FormData = {
  baslik: "",
  aciklama: "",
  durum: "acik",
  oncelik: "normal",
  aracId: "",
  atananKullaniciId: "",
  sonTarih: "",
  kategori: "",
  notlar: "",
};

const durumLabels: Record<string, string> = {
  acik: "Acik",
  devam_ediyor: "Devam Ediyor",
  tamamlandi: "Tamamlandi",
  iptal: "Iptal",
};

const oncelikLabels: Record<string, string> = {
  dusuk: "Dusuk",
  normal: "Normal",
  yuksek: "Yuksek",
  kritik: "Kritik",
};

const kategoriLabels: Record<string, string> = {
  bakim: "Bakim",
  transfer: "Transfer",
  idari: "Idari",
  diger: "Diger",
};

function formatDateForInput(val: string | null | undefined): string {
  if (!val) return "";
  try {
    return new Date(val).toISOString().split("T")[0];
  } catch {
    return "";
  }
}

export default function YapilacakFormClient({ yapilacakId }: { yapilacakId?: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const isNew = !yapilacakId;
  const userRole = (session?.user as Record<string, unknown>)?.role as string;

  const [form, setForm] = useState<FormData>(emptyForm);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  // Extra detail info (for display when editing)
  const [tamamlanmaTarihi, setTamamlanmaTarihi] = useState<string | null>(null);
  const [ekleyen, setEkleyen] = useState<{ name: string | null } | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  // Arac dropdown
  const [araclar, setAraclar] = useState<AracOption[]>([]);
  const [aracSearch, setAracSearch] = useState("");
  const [showAracDropdown, setShowAracDropdown] = useState(false);
  const [selectedAracPlaka, setSelectedAracPlaka] = useState("");
  const aracDropdownRef = useRef<HTMLDivElement>(null);

  // Kullanici dropdown
  const [kullanicilar, setKullanicilar] = useState<KullaniciOption[]>([]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (aracDropdownRef.current && !aracDropdownRef.current.contains(e.target as Node)) {
        setShowAracDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load araclar and kullanicilar
  useEffect(() => {
    Promise.all([
      fetch("/api/araclar?limit=500").then((r) => r.json()),
      fetch("/api/kullanicilar?mode=simple").then((r) => r.json()),
    ]).then(([aracRes, kullaniciRes]) => {
      if (aracRes?.data) setAraclar(aracRes.data);
      if (Array.isArray(kullaniciRes)) setKullanicilar(kullaniciRes);
    });
  }, []);

  // Load existing record
  useEffect(() => {
    if (!isNew && yapilacakId) {
      fetch(`/api/yapilacaklar/${yapilacakId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data && !data.error) {
            setForm({
              baslik: data.baslik || "",
              aciklama: data.aciklama || "",
              durum: data.durum || "acik",
              oncelik: data.oncelik || "normal",
              aracId: data.aracId ? String(data.aracId) : "",
              atananKullaniciId: data.atananKullaniciId ? String(data.atananKullaniciId) : "",
              sonTarih: formatDateForInput(data.sonTarih),
              kategori: data.kategori || "",
              notlar: data.notlar || "",
            });
            if (data.arac) {
              setSelectedAracPlaka(data.arac.plaka);
            }
            setTamamlanmaTarihi(data.tamamlanmaTarihi);
            setEkleyen(data.ekleyen);
            setCreatedAt(data.createdAt);
            setUpdatedAt(data.updatedAt);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [yapilacakId, isNew]);

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.baslik.trim()) {
      setMessage({ type: "error", text: "Gorev basligi zorunlu" });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const url = isNew ? "/api/yapilacaklar" : `/api/yapilacaklar/${yapilacakId}`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baslik: form.baslik,
          aciklama: form.aciklama || null,
          durum: form.durum,
          oncelik: form.oncelik,
          aracId: form.aracId ? parseInt(form.aracId) : null,
          atananKullaniciId: form.atananKullaniciId ? parseInt(form.atananKullaniciId) : null,
          sonTarih: form.sonTarih || null,
          kategori: form.kategori || null,
          notlar: form.notlar || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessage({ type: "success", text: isNew ? "Gorev basariyla eklendi" : "Gorev guncellendi" });
        if (isNew) {
          router.push(`/yapilacak/${data.id}`);
        } else {
          // Refresh tamamlanmaTarihi
          if (data.tamamlanmaTarihi) setTamamlanmaTarihi(data.tamamlanmaTarihi);
          else setTamamlanmaTarihi(null);
          if (data.updatedAt) setUpdatedAt(data.updatedAt);
        }
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Hata olustu" });
      }
    } catch {
      setMessage({ type: "error", text: "Baglanti hatasi" });
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm("Bu gorevi silmek istediginize emin misiniz?")) return;
    const res = await fetch(`/api/yapilacaklar/${yapilacakId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/yapilacaklar");
    } else {
      const err = await res.json();
      setMessage({ type: "error", text: err.error || "Silinirken hata olustu" });
    }
  };

  // Filtered araclar for dropdown
  const filteredAraclar = araclar.filter(
    (a) =>
      a.plaka.toLowerCase().includes(aracSearch.toLowerCase()) ||
      (a.markaModelTicariAdi && a.markaModelTicariAdi.toLowerCase().includes(aracSearch.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const tabs = ["Gorev Bilgileri", "Durum & Notlar"];
  const inputClass = "w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none";
  const labelClass = "block text-xs font-medium text-slate-500 mb-1";

  // Compute deadline status for display
  const kalanGun = form.sonTarih
    ? Math.ceil((new Date(form.sonTarih).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const isGecikmis = kalanGun !== null && kalanGun < 0 && form.durum !== "tamamlandi" && form.durum !== "iptal";

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/yapilacaklar")}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {isNew ? "Yeni Gorev Ekle" : form.baslik || "Gorev Detay"}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {isNew ? "Yeni is takip gorevi olustur" : `Gorev #${yapilacakId}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && userRole !== "lokasyon_sefi" && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm transition-colors"
            >
              <Trash2 size={16} />
              Sil
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === i
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        {/* Tab 1: Gorev Bilgileri */}
        {activeTab === 0 && (
          <div className="space-y-4">
            {/* Baslik */}
            <div>
              <label className={labelClass}>Gorev Basligi *</label>
              <input
                type="text"
                value={form.baslik}
                onChange={(e) => handleChange("baslik", e.target.value)}
                placeholder="Ornek: 06BKZ030 Giresun projeye goturulecek"
                className={inputClass}
              />
            </div>

            {/* Aciklama */}
            <div>
              <label className={labelClass}>Aciklama</label>
              <textarea
                value={form.aciklama}
                onChange={(e) => handleChange("aciklama", e.target.value)}
                placeholder="Gorev detaylari..."
                rows={3}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Arac dropdown (searchable) */}
              <div>
                <label className={labelClass}>Arac (Opsiyonel)</label>
                <div className="relative" ref={aracDropdownRef}>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={showAracDropdown ? aracSearch : selectedAracPlaka}
                      onChange={(e) => {
                        setAracSearch(e.target.value);
                        setShowAracDropdown(true);
                      }}
                      onFocus={() => {
                        setAracSearch("");
                        setShowAracDropdown(true);
                      }}
                      placeholder="Plaka ile ara..."
                      className={`${inputClass} pl-9`}
                    />
                    {selectedAracPlaka && (
                      <button
                        type="button"
                        onClick={() => {
                          handleChange("aracId", "");
                          setSelectedAracPlaka("");
                          setAracSearch("");
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {showAracDropdown && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredAraclar.slice(0, 50).map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => {
                            handleChange("aracId", String(a.id));
                            setSelectedAracPlaka(a.plaka);
                            setShowAracDropdown(false);
                            setAracSearch("");
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 transition-colors border-b border-slate-100 last:border-0"
                        >
                          <span className="font-bold text-blue-600">{a.plaka}</span>
                          {a.markaModelTicariAdi && (
                            <span className="text-slate-500 ml-2">{a.markaModelTicariAdi}</span>
                          )}
                          {a.sirket && (
                            <span className="text-slate-400 text-xs ml-2">({a.sirket.sirketAdi})</span>
                          )}
                        </button>
                      ))}
                      {filteredAraclar.length === 0 && (
                        <div className="px-4 py-3 text-sm text-slate-400">Arac bulunamadi</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Atanan Kullanici */}
              <div>
                <label className={labelClass}>Atanan Kullanici</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    value={form.atananKullaniciId}
                    onChange={(e) => handleChange("atananKullaniciId", e.target.value)}
                    className={`${inputClass} pl-9`}
                  >
                    <option value="">Atanmadi</option>
                    {kullanicilar.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.name || k.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Kategori */}
              <div>
                <label className={labelClass}>Kategori</label>
                <select
                  value={form.kategori}
                  onChange={(e) => handleChange("kategori", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Seciniz</option>
                  {Object.entries(kategoriLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Oncelik */}
              <div>
                <label className={labelClass}>Oncelik</label>
                <select
                  value={form.oncelik}
                  onChange={(e) => handleChange("oncelik", e.target.value)}
                  className={inputClass}
                >
                  {Object.entries(oncelikLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Son Tarih */}
              <div>
                <label className={labelClass}>Son Tarih (Deadline)</label>
                <input
                  type="date"
                  value={form.sonTarih}
                  onChange={(e) => handleChange("sonTarih", e.target.value)}
                  className={inputClass}
                />
                {kalanGun !== null && form.durum !== "tamamlandi" && form.durum !== "iptal" && (
                  <p
                    className={`text-xs mt-1 ${
                      kalanGun < 0 ? "text-red-600" : kalanGun <= 3 ? "text-amber-600" : "text-green-600"
                    }`}
                  >
                    {kalanGun < 0
                      ? `${Math.abs(kalanGun)} gun gecmis!`
                      : kalanGun === 0
                      ? "Bugun son gun!"
                      : `${kalanGun} gun kaldi`}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Durum & Notlar */}
        {activeTab === 1 && (
          <div className="space-y-4">
            {/* Durum */}
            <div className="max-w-md">
              <label className={labelClass}>Gorev Durumu</label>
              <select
                value={form.durum}
                onChange={(e) => handleChange("durum", e.target.value)}
                className={inputClass}
              >
                {Object.entries(durumLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {/* Status banners */}
            {form.durum === "tamamlandi" && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle2 size={20} className="text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">Gorev Tamamlandi</p>
                  {tamamlanmaTarihi && (
                    <p className="text-xs text-green-600 mt-0.5">
                      Tamamlanma tarihi: {new Date(tamamlanmaTarihi).toLocaleDateString("tr-TR")}
                    </p>
                  )}
                </div>
              </div>
            )}

            {isGecikmis && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle size={20} className="text-red-600" />
                <div>
                  <p className="text-sm font-medium text-red-800">Bu gorev gecikmis!</p>
                  <p className="text-xs text-red-600 mt-0.5">
                    Son tarih: {form.sonTarih ? new Date(form.sonTarih).toLocaleDateString("tr-TR") : ""} — {kalanGun && Math.abs(kalanGun)} gun gecmis
                  </p>
                </div>
              </div>
            )}

            {form.durum === "iptal" && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center gap-3">
                <Clock size={20} className="text-slate-500" />
                <p className="text-sm text-slate-600">Bu gorev iptal edilmis.</p>
              </div>
            )}

            {/* Notlar */}
            <div>
              <label className={labelClass}>Notlar</label>
              <textarea
                value={form.notlar}
                onChange={(e) => handleChange("notlar", e.target.value)}
                placeholder="Ek notlar..."
                rows={4}
                className={inputClass}
              />
            </div>

            {/* Info box for existing records */}
            {!isNew && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gorev Bilgileri</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-slate-400">Olusturan:</span>{" "}
                    <span className="font-medium text-slate-700">{ekleyen?.name || "-"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Olusturma Tarihi:</span>{" "}
                    <span className="font-medium text-slate-700">
                      {createdAt ? new Date(createdAt).toLocaleDateString("tr-TR") : "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Son Guncelleme:</span>{" "}
                    <span className="font-medium text-slate-700">
                      {updatedAt ? new Date(updatedAt).toLocaleString("tr-TR") : "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Gorev No:</span>{" "}
                    <span className="font-medium text-slate-700">#{yapilacakId}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
