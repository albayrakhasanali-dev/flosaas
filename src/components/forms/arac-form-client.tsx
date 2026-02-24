"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Save, Trash2, Upload, FileText, X, Download, Eye, Plus, ExternalLink } from "lucide-react";

interface Lookup {
  sirketler: { id: number; sirketAdi: string }[];
  lokasyonlar: { id: number; lokasyonAdi: string }[];
  durumlar: { id: number; durumAdi: string }[];
}

interface FormData {
  plaka: string;
  durumId: number | null;
  sirketId: number | null;
  lokasyonId: number | null;
  mulkiyetTipi: string;
  markaModelTicariAdi: string;
  kullanimSekli: string;
  modelYili: number | null;
  kapasite: string;
  aracMarka: string;
  kasaMarka: string;
  ruhsatSeriNo: string;
  sasiNo: string;
  motorNo: string;
  guncelKmSaat: number | null;
  zimmetMasrafMerkezi: string;
  uttsDurum: string;
  seyirTakipCihazNo: string;
  hgsEtiketNo: string;
  tescilTarihi: string;
  muayeneBitisTarihi: string;
  sigortaBitisTarihi: string;
  kaskoBitisTarihi: string;
  k1YetkiBelgesi: string;
  muayeneGerekli: boolean;
  sigortaGerekli: boolean;
  aciklamaNot: string;
  // Computed (read-only)
  muayeneAlarm?: string;
  sigortaAlarm?: string;
  muayeneKalanGun?: number | null;
  sigortaKalanGun?: number | null;
}

interface Belge {
  id: number;
  belgeTipi: string;
  dosyaAdi: string;
  dosyaBoyut: number;
  mimeType: string;
  aciklama: string | null;
  createdAt: string;
}

interface MuayeneRecord {
  id: number;
  muayeneTarihi: string;
  gecerlilikBitisTarihi: string;
  sonuc: string;
  muayeneIstasyonu: string | null;
  raporNo: string | null;
  muayeneTipi: string;
  muayeneUcreti: number | null;
  basarisizNeden: string | null;
}

interface SigortaRecord {
  id: number;
  sigortaTuru: string;
  policeNo: string | null;
  sigortaSirketi: string | null;
  baslangicTarihi: string;
  bitisTarihi: string;
  primTutari: number | null;
  odemeDurumu: string;
}

const sonucLabels: Record<string, string> = { gecti: "Gecti", kaldi: "Kaldi" };
const muayeneTipiLabels: Record<string, string> = { periyodik: "Periyodik", ek_muayene: "Ek Muayene", ozel: "Ozel" };
const sigortaTuruLabels: Record<string, string> = { trafik: "Zorunlu Trafik", kasko: "Kasko", imm: "IMM" };
const odemeDurumuLabels: Record<string, string> = { odenmedi: "Odenmedi", odendi: "Odendi", kismen_odendi: "Kismen Odendi" };

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(value);

const computeKalanGun = (bitisTarihi: string) =>
  Math.ceil((new Date(bitisTarihi).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

const belgeTipiLabels: Record<string, string> = {
  ruhsat: "Ruhsat",
  sigorta: "Sigorta Policesi",
  kasko: "Kasko Policesi",
  muayene: "Muayene Belgesi",
  diger: "Diger",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

const emptyForm: FormData = {
  plaka: "",
  durumId: null,
  sirketId: null,
  lokasyonId: null,
  mulkiyetTipi: "",
  markaModelTicariAdi: "",
  kullanimSekli: "",
  modelYili: null,
  kapasite: "",
  aracMarka: "",
  kasaMarka: "",
  ruhsatSeriNo: "",
  sasiNo: "",
  motorNo: "",
  guncelKmSaat: null,
  zimmetMasrafMerkezi: "",
  uttsDurum: "",
  seyirTakipCihazNo: "",
  hgsEtiketNo: "",
  tescilTarihi: "",
  muayeneBitisTarihi: "",
  sigortaBitisTarihi: "",
  kaskoBitisTarihi: "",
  k1YetkiBelgesi: "",
  muayeneGerekli: true,
  sigortaGerekli: true,
  aciklamaNot: "",
};

function formatDateForInput(val: string | null | undefined): string {
  if (!val) return "";
  try {
    return new Date(val).toISOString().split("T")[0];
  } catch {
    return "";
  }
}

export default function AracFormClient({ aracId }: { aracId: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const isNew = aracId === "new";
  const userRole = (session?.user as Record<string, unknown>)?.role as string;
  const isLokasyonSefi = userRole === "lokasyon_sefi";

  const [activeTab, setActiveTab] = useState(0);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [lookups, setLookups] = useState<Lookup | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [belgeler, setBelgeler] = useState<Belge[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadBelgeTipi, setUploadBelgeTipi] = useState("ruhsat");
  const [muayeneler, setMuayeneler] = useState<MuayeneRecord[]>([]);
  const [sigortalar, setSigortalar] = useState<SigortaRecord[]>([]);
  const [showNewLokasyon, setShowNewLokasyon] = useState(false);
  const [showNewSirket, setShowNewSirket] = useState(false);
  const [newLokasyonAdi, setNewLokasyonAdi] = useState("");
  const [newSirketAdi, setNewSirketAdi] = useState("");
  const [addingLookup, setAddingLookup] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [lookupsRes, aracRes] = await Promise.all([
        fetch("/api/lookups").then((r) => r.json()),
        !isNew ? fetch(`/api/araclar/${aracId}`).then((r) => r.json()) : null,
      ]);
      setLookups(lookupsRes);
      if (aracRes && !aracRes.error) {
        setForm({
          plaka: aracRes.plaka || "",
          durumId: aracRes.durumId,
          sirketId: aracRes.sirketId,
          lokasyonId: aracRes.lokasyonId,
          mulkiyetTipi: aracRes.mulkiyetTipi || "",
          markaModelTicariAdi: aracRes.markaModelTicariAdi || "",
          kullanimSekli: aracRes.kullanimSekli || "",
          modelYili: aracRes.modelYili,
          kapasite: aracRes.kapasite || "",
          aracMarka: aracRes.aracMarka || "",
          kasaMarka: aracRes.kasaMarka || "",
          ruhsatSeriNo: aracRes.ruhsatSeriNo || "",
          sasiNo: aracRes.sasiNo || "",
          motorNo: aracRes.motorNo || "",
          guncelKmSaat: aracRes.guncelKmSaat,
          zimmetMasrafMerkezi: aracRes.zimmetMasrafMerkezi || "",
          uttsDurum: aracRes.uttsDurum || "",
          seyirTakipCihazNo: aracRes.seyirTakipCihazNo || "",
          hgsEtiketNo: aracRes.hgsEtiketNo || "",
          tescilTarihi: formatDateForInput(aracRes.tescilTarihi),
          muayeneBitisTarihi: formatDateForInput(aracRes.muayeneBitisTarihi),
          sigortaBitisTarihi: formatDateForInput(aracRes.sigortaBitisTarihi),
          kaskoBitisTarihi: formatDateForInput(aracRes.kaskoBitisTarihi),
          k1YetkiBelgesi: aracRes.k1YetkiBelgesi || "",
          muayeneGerekli: aracRes.muayeneGerekli !== false,
          sigortaGerekli: aracRes.sigortaGerekli !== false,
          aciklamaNot: aracRes.aciklamaNot || "",
          muayeneAlarm: aracRes.muayeneAlarm,
          sigortaAlarm: aracRes.sigortaAlarm,
          muayeneKalanGun: aracRes.muayeneKalanGun,
          sigortaKalanGun: aracRes.sigortaKalanGun,
        });
      }
      // Load belgeler + muayene/sigorta history
      if (!isNew) {
        const [belgeRes, muayeneRes, sigortaRes] = await Promise.all([
          fetch(`/api/belgeler?aracId=${aracId}`).then((r) => r.json()),
          fetch(`/api/muayeneler?aracId=${aracId}&limit=50`).then((r) => r.json()),
          fetch(`/api/sigortalar?aracId=${aracId}&limit=50`).then((r) => r.json()),
        ]);
        if (Array.isArray(belgeRes)) setBelgeler(belgeRes);
        if (muayeneRes?.data) setMuayeneler(muayeneRes.data);
        if (sigortaRes?.data) setSigortalar(sigortaRes.data);
      }
      setLoading(false);
    };
    load();
  }, [aracId, isNew]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const url = isNew ? "/api/araclar" : `/api/araclar/${aracId}`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          modelYili: form.modelYili ? Number(form.modelYili) : null,
          guncelKmSaat: form.guncelKmSaat ? Number(form.guncelKmSaat) : null,
          tescilTarihi: form.tescilTarihi || null,
          ruhsatSeriNo: form.ruhsatSeriNo || null,
          k1YetkiBelgesi: form.k1YetkiBelgesi || null,
          muayeneGerekli: form.muayeneGerekli,
          sigortaGerekli: form.sigortaGerekli,
          // Date fields managed by Takip Modulleri — exclude from save
          muayeneBitisTarihi: undefined,
          sigortaBitisTarihi: undefined,
          kaskoBitisTarihi: undefined,
        }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Kayit basariyla guncellendi" });
        if (isNew) {
          const data = await res.json();
          router.push(`/arac/${data.id}`);
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
    if (!confirm("Bu araci silmek istediginize emin misiniz?")) return;
    const res = await fetch(`/api/araclar/${aracId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/filo?filter=all");
    }
  };

  const updateField = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddLokasyon = async () => {
    if (!newLokasyonAdi.trim()) return;
    setAddingLookup(true);
    try {
      const res = await fetch("/api/lokasyonlar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lokasyonAdi: newLokasyonAdi.trim() }),
      });
      if (res.ok) {
        const created = await res.json();
        setLookups((prev) => prev ? {
          ...prev,
          lokasyonlar: [...prev.lokasyonlar, { id: created.id, lokasyonAdi: created.lokasyonAdi }].sort((a, b) => a.lokasyonAdi.localeCompare(b.lokasyonAdi)),
        } : prev);
        updateField("lokasyonId", created.id);
        setNewLokasyonAdi("");
        setShowNewLokasyon(false);
        setMessage({ type: "success", text: `"${created.lokasyonAdi}" lokasyonu eklendi` });
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Lokasyon eklenemedi" });
      }
    } catch {
      setMessage({ type: "error", text: "Baglanti hatasi" });
    }
    setAddingLookup(false);
  };

  const handleAddSirket = async () => {
    if (!newSirketAdi.trim()) return;
    setAddingLookup(true);
    try {
      const res = await fetch("/api/sirketler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sirketAdi: newSirketAdi.trim() }),
      });
      if (res.ok) {
        const created = await res.json();
        setLookups((prev) => prev ? {
          ...prev,
          sirketler: [...prev.sirketler, { id: created.id, sirketAdi: created.sirketAdi }].sort((a, b) => a.sirketAdi.localeCompare(b.sirketAdi)),
        } : prev);
        updateField("sirketId", created.id);
        setNewSirketAdi("");
        setShowNewSirket(false);
        setMessage({ type: "success", text: `"${created.sirketAdi}" sirketi eklendi` });
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Sirket eklenemedi" });
      }
    } catch {
      setMessage({ type: "error", text: "Baglanti hatasi" });
    }
    setAddingLookup(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || isNew) return;
    setUploading(true);
    setMessage(null);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fd = new FormData();
      fd.append("file", file);
      fd.append("aracId", aracId);
      fd.append("belgeTipi", uploadBelgeTipi);
      try {
        const res = await fetch("/api/belgeler", { method: "POST", body: fd });
        if (res.ok) {
          const newBelge = await res.json();
          setBelgeler((prev) => [newBelge, ...prev]);
        } else {
          const err = await res.json();
          setMessage({ type: "error", text: `${file.name}: ${err.error}` });
        }
      } catch {
        setMessage({ type: "error", text: `${file.name}: Yukleme hatasi` });
      }
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleDeleteBelge = async (belgeId: number) => {
    if (!confirm("Bu belgeyi silmek istediginize emin misiniz?")) return;
    const res = await fetch(`/api/belgeler/${belgeId}`, { method: "DELETE" });
    if (res.ok) {
      setBelgeler((prev) => prev.filter((b) => b.id !== belgeId));
    } else {
      const err = await res.json();
      setMessage({ type: "error", text: err.error || "Belge silinemedi" });
    }
  };

  const isFieldDisabled = (field: string): boolean => {
    if (isNew) return false;
    if (isLokasyonSefi && field !== "guncelKmSaat" && field !== "zimmetMasrafMerkezi") return true;
    return false;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const tabs = ["Kimlik Bilgileri", "Operasyon ve Konum", "Evrak ve Tarihler", "Muayene Gecmisi", "Sigorta Gecmisi"];

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {isNew ? "Yeni Arac Ekle" : form.plaka}
            </h1>
            {!isNew && form.muayeneAlarm && (
              <div className="flex gap-2 mt-1">
                <span className={`badge ${form.muayeneAlarm.includes("GEÇTİ") ? "badge-danger" : form.muayeneAlarm.includes("YAKLAŞIYOR") ? "badge-warning" : "badge-success"}`}>
                  Muayene: {form.muayeneAlarm} ({form.muayeneKalanGun}g)
                </span>
                <span className={`badge ${form.sigortaAlarm?.includes("GEÇTİ") ? "badge-danger" : form.sigortaAlarm?.includes("YAKLAŞIYOR") ? "badge-warning" : "badge-success"}`}>
                  Sigorta: {form.sigortaAlarm} ({form.sigortaKalanGun}g)
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {!isNew && userRole === "super_admin" && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2.5 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50"
            >
              <Trash2 size={16} />
              Sil
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex border-b border-slate-200">
          {tabs.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === i ? "tab-active" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Sekme 1: Kimlik Bilgileri */}
          {activeTab === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Plaka *</label>
                <input type="text" value={form.plaka} onChange={(e) => updateField("plaka", e.target.value)} disabled={!isNew} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Durum</label>
                <select value={form.durumId || ""} onChange={(e) => updateField("durumId", e.target.value ? Number(e.target.value) : null)} disabled={isFieldDisabled("durumId")} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-50">
                  <option value="">Seciniz</option>
                  {lookups?.durumlar.map((d) => <option key={d.id} value={d.id}>{d.durumAdi}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Sirket</label>
                <div className="flex gap-1.5">
                  <select value={form.sirketId || ""} onChange={(e) => updateField("sirketId", e.target.value ? Number(e.target.value) : null)} disabled={isFieldDisabled("sirketId")} className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-50">
                    <option value="">Seciniz</option>
                    {lookups?.sirketler.map((s) => <option key={s.id} value={s.id}>{s.sirketAdi}</option>)}
                  </select>
                  {!isLokasyonSefi && (
                    <button
                      type="button"
                      onClick={() => setShowNewSirket(true)}
                      className="px-2.5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex-shrink-0"
                      title="Yeni Sirket Ekle"
                    >
                      <Plus size={16} />
                    </button>
                  )}
                </div>
                {showNewSirket && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xs font-medium text-green-800 mb-2">Yeni Sirket Ekle</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSirketAdi}
                        onChange={(e) => setNewSirketAdi(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddSirket()}
                        placeholder="Sirket adi"
                        className="flex-1 px-3 py-1.5 border border-green-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                        autoFocus
                        disabled={addingLookup}
                      />
                      <button
                        type="button"
                        onClick={handleAddSirket}
                        disabled={addingLookup || !newSirketAdi.trim()}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                      >
                        {addingLookup ? "..." : "Ekle"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowNewSirket(false); setNewSirketAdi(""); }}
                        className="px-2 py-1.5 text-slate-500 hover:text-slate-700"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Mulkiyet Tipi</label>
                <select value={form.mulkiyetTipi} onChange={(e) => updateField("mulkiyetTipi", e.target.value)} disabled={isFieldDisabled("mulkiyetTipi")} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-50">
                  <option value="">Seciniz</option>
                  <option value="Özmal">Ozmal</option>
                  <option value="Kiralık">Kiralik</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Marka Model</label>
                <input type="text" value={form.markaModelTicariAdi} onChange={(e) => updateField("markaModelTicariAdi", e.target.value)} disabled={isFieldDisabled("markaModelTicariAdi")} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Model Yili</label>
                <input type="number" value={form.modelYili || ""} onChange={(e) => updateField("modelYili", e.target.value ? Number(e.target.value) : null)} disabled={isFieldDisabled("modelYili")} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Arac Marka</label>
                <input type="text" value={form.aracMarka} onChange={(e) => updateField("aracMarka", e.target.value)} disabled={isFieldDisabled("aracMarka")} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Kasa Marka</label>
                <input type="text" value={form.kasaMarka} onChange={(e) => updateField("kasaMarka", e.target.value)} disabled={isFieldDisabled("kasaMarka")} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Kullanim Sekli</label>
                <input type="text" value={form.kullanimSekli} onChange={(e) => updateField("kullanimSekli", e.target.value)} disabled={isFieldDisabled("kullanimSekli")} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Ruhsat Seri No</label>
                <input type="text" value={form.ruhsatSeriNo} onChange={(e) => updateField("ruhsatSeriNo", e.target.value)} disabled={isFieldDisabled("ruhsatSeriNo")} placeholder="Orn: AA123456" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Sasi No</label>
                <input type="text" value={form.sasiNo} onChange={(e) => updateField("sasiNo", e.target.value)} disabled={isFieldDisabled("sasiNo")} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Motor No</label>
                <input type="text" value={form.motorNo} onChange={(e) => updateField("motorNo", e.target.value)} disabled={isFieldDisabled("motorNo")} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Kapasite</label>
                <input type="text" value={form.kapasite} onChange={(e) => updateField("kapasite", e.target.value)} disabled={isFieldDisabled("kapasite")} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-50" />
              </div>
            </div>
          )}

          {/* Sekme 2: Operasyon ve Konum */}
          {activeTab === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Lokasyon</label>
                <div className="flex gap-1.5">
                  <select value={form.lokasyonId || ""} onChange={(e) => updateField("lokasyonId", e.target.value ? Number(e.target.value) : null)} disabled={isFieldDisabled("lokasyonId")} className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-50">
                    <option value="">Seciniz</option>
                    {lookups?.lokasyonlar.map((l) => <option key={l.id} value={l.id}>{l.lokasyonAdi}</option>)}
                  </select>
                  {!isLokasyonSefi && (
                    <button
                      type="button"
                      onClick={() => setShowNewLokasyon(true)}
                      className="px-2.5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex-shrink-0"
                      title="Yeni Lokasyon Ekle"
                    >
                      <Plus size={16} />
                    </button>
                  )}
                </div>
                {showNewLokasyon && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xs font-medium text-green-800 mb-2">Yeni Lokasyon Ekle</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newLokasyonAdi}
                        onChange={(e) => setNewLokasyonAdi(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddLokasyon()}
                        placeholder="Lokasyon adi"
                        className="flex-1 px-3 py-1.5 border border-green-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                        autoFocus
                        disabled={addingLookup}
                      />
                      <button
                        type="button"
                        onClick={handleAddLokasyon}
                        disabled={addingLookup || !newLokasyonAdi.trim()}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                      >
                        {addingLookup ? "..." : "Ekle"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowNewLokasyon(false); setNewLokasyonAdi(""); }}
                        className="px-2 py-1.5 text-slate-500 hover:text-slate-700"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Zimmet / Masraf Merkezi</label>
                <input type="text" value={form.zimmetMasrafMerkezi} onChange={(e) => updateField("zimmetMasrafMerkezi", e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Guncel KM/Saat</label>
                <input type="number" value={form.guncelKmSaat || ""} onChange={(e) => updateField("guncelKmSaat", e.target.value ? Number(e.target.value) : null)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">UTTS Durum</label>
                <select value={form.uttsDurum} onChange={(e) => updateField("uttsDurum", e.target.value)} disabled={isFieldDisabled("uttsDurum")} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-50">
                  <option value="">Seciniz</option>
                  <option value="Takılı">Takili</option>
                  <option value="Eksik">Eksik</option>
                  <option value="Bilinmiyor">Bilinmiyor</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Seyir Takip Cihaz No</label>
                <input type="text" value={form.seyirTakipCihazNo} onChange={(e) => updateField("seyirTakipCihazNo", e.target.value)} disabled={isFieldDisabled("seyirTakipCihazNo")} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">HGS Etiket No</label>
                <input type="text" value={form.hgsEtiketNo} onChange={(e) => updateField("hgsEtiketNo", e.target.value)} disabled={isFieldDisabled("hgsEtiketNo")} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-50" />
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-xs font-medium text-slate-600 mb-1">Aciklama / Not</label>
                <textarea value={form.aciklamaNot} onChange={(e) => updateField("aciklamaNot", e.target.value)} disabled={isFieldDisabled("aciklamaNot")} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-50" />
              </div>
            </div>
          )}

          {/* Sekme 3: Evrak ve Tarihler */}
          {activeTab === 2 && (
            <div className="space-y-6">
              {/* Tarihler - read-only, managed by tracking modules */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                <p className="text-xs text-blue-700">
                  Muayene, sigorta ve kasko tarihleri <strong>Takip Modulleri</strong> uzerinden otomatik guncellenir.
                  Yeni kayit eklemek icin ilgili sekmeleri kullanin.
                </p>
              </div>
              {/* Takip Gereklilikleri */}
              {!isNew && !isLokasyonSefi && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className={`flex items-center justify-between p-3 rounded-lg border ${form.muayeneGerekli ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200"}`}>
                    <div>
                      <p className="text-sm font-medium text-slate-700">Muayene Takibi</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {form.muayeneGerekli ? "Bu arac muayene takibinde" : "Bu arac icin muayene takibi yapilmiyor"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateField("muayeneGerekli", !form.muayeneGerekli)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.muayeneGerekli ? "bg-green-500" : "bg-slate-300"}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.muayeneGerekli ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                  </div>
                  <div className={`flex items-center justify-between p-3 rounded-lg border ${form.sigortaGerekli ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200"}`}>
                    <div>
                      <p className="text-sm font-medium text-slate-700">Sigorta Takibi</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {form.sigortaGerekli ? "Bu arac sigorta takibinde" : "Bu arac icin sigorta takibi yapilmiyor"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateField("sigortaGerekli", !form.sigortaGerekli)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.sigortaGerekli ? "bg-green-500" : "bg-slate-300"}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.sigortaGerekli ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">K1 Yetki Belgesi</label>
                  <select value={form.k1YetkiBelgesi} onChange={(e) => updateField("k1YetkiBelgesi", e.target.value)} disabled={isFieldDisabled("k1YetkiBelgesi")} className={`w-full px-3 py-2 border rounded-lg text-sm disabled:bg-slate-50 ${form.k1YetkiBelgesi === "var" ? "border-green-400 bg-green-50 text-green-700 font-medium" : form.k1YetkiBelgesi === "yok" ? "border-red-300 bg-red-50 text-red-700 font-medium" : "border-slate-300"}`}>
                    <option value="">Belirtilmedi</option>
                    <option value="var">Var</option>
                    <option value="yok">Yok</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tescil Tarihi</label>
                  <input type="date" value={form.tescilTarihi} onChange={(e) => updateField("tescilTarihi", e.target.value)} disabled={isFieldDisabled("tescilTarihi")} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-50" />
                </div>
                <div className={!form.muayeneGerekli ? "opacity-50" : ""}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Muayene Bitis Tarihi</label>
                  <input type="date" value={form.muayeneBitisTarihi} disabled className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 cursor-not-allowed" />
                  {form.muayeneGerekli && form.muayeneAlarm && (
                    <p className={`text-xs mt-1 ${form.muayeneAlarm.includes("GEÇTİ") ? "text-red-600" : form.muayeneAlarm.includes("YAKLAŞIYOR") ? "text-amber-600" : "text-green-600"}`}>
                      {form.muayeneAlarm} ({form.muayeneKalanGun} gun)
                    </p>
                  )}
                </div>
                <div className={!form.sigortaGerekli ? "opacity-50" : ""}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Sigorta Bitis Tarihi</label>
                  <input type="date" value={form.sigortaBitisTarihi} disabled className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 cursor-not-allowed" />
                  {form.sigortaGerekli && form.sigortaAlarm && (
                    <p className={`text-xs mt-1 ${form.sigortaAlarm.includes("GEÇTİ") ? "text-red-600" : form.sigortaAlarm.includes("YAKLAŞIYOR") ? "text-amber-600" : "text-green-600"}`}>
                      {form.sigortaAlarm} ({form.sigortaKalanGun} gun)
                    </p>
                  )}
                </div>
                <div className={!form.sigortaGerekli ? "opacity-50" : ""}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Kasko Bitis Tarihi</label>
                  <input type="date" value={form.kaskoBitisTarihi} disabled className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 cursor-not-allowed" />
                </div>
              </div>

              {/* Belge Yukleme */}
              {!isNew && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <FileText size={16} />
                    Belgeler ve Dosyalar
                  </h3>

                  {/* Yukleme alani */}
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-5 mb-4 bg-slate-50/50">
                    <div className="flex flex-wrap items-center gap-3">
                      <select
                        value={uploadBelgeTipi}
                        onChange={(e) => setUploadBelgeTipi(e.target.value)}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                      >
                        <option value="ruhsat">Ruhsat</option>
                        <option value="sigorta">Sigorta Policesi</option>
                        <option value="kasko">Kasko Policesi</option>
                        <option value="muayene">Muayene Belgesi</option>
                        <option value="diger">Diger</option>
                      </select>
                      <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium cursor-pointer transition-colors">
                        <Upload size={16} />
                        {uploading ? "Yukleniyor..." : "Dosya Sec"}
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          onChange={handleFileUpload}
                          disabled={uploading}
                          className="hidden"
                        />
                      </label>
                      <span className="text-xs text-slate-400">PDF, JPEG, PNG (maks. 5MB)</span>
                    </div>
                  </div>

                  {/* Belge listesi */}
                  {belgeler.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      Henuz belge yuklenmemis
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {belgeler.map((belge) => (
                        <div
                          key={belge.id}
                          className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                              <FileText size={20} className="text-red-500" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-700">{belge.dosyaAdi}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">
                                  {belgeTipiLabels[belge.belgeTipi] || belge.belgeTipi}
                                </span>
                                <span className="text-xs text-slate-400">{formatFileSize(belge.dosyaBoyut)}</span>
                                <span className="text-xs text-slate-400">
                                  {new Date(belge.createdAt).toLocaleDateString("tr-TR")}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <a
                              href={`/api/belgeler/${belge.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Goruntule"
                            >
                              <Eye size={16} />
                            </a>
                            <a
                              href={`/api/belgeler/${belge.id}`}
                              download={belge.dosyaAdi}
                              className="p-2 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Indir"
                            >
                              <Download size={16} />
                            </a>
                            {userRole !== "lokasyon_sefi" && (
                              <button
                                onClick={() => handleDeleteBelge(belge.id)}
                                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Sil"
                              >
                                <X size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {/* Sekme 4: Muayene Gecmisi */}
          {activeTab === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">Muayene Gecmisi ({muayeneler.length} kayit)</h3>
                <button
                  onClick={() => router.push("/muayene/new")}
                  className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  <Plus size={14} />
                  Yeni Muayene Ekle
                </button>
              </div>
              {muayeneler.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  Bu araca ait muayene kaydi yok
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-grid">
                    <thead>
                      <tr>
                        <th>Muayene Tarihi</th>
                        <th>Gecerlilik Bitis</th>
                        <th>Kalan Gun</th>
                        <th>Sonuc</th>
                        <th>Istasyon</th>
                        <th>Tipi</th>
                        <th>Rapor No</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {muayeneler.map((m) => {
                        const kalanGun = computeKalanGun(m.gecerlilikBitisTarihi);
                        return (
                          <tr
                            key={m.id}
                            className={`cursor-pointer ${
                              kalanGun < 0 && m.sonuc === "gecti" ? "bg-red-50" :
                              kalanGun <= 30 && kalanGun >= 0 && m.sonuc === "gecti" ? "bg-amber-50" : ""
                            }`}
                            onClick={() => router.push(`/muayene/${m.id}`)}
                          >
                            <td className="text-xs">{new Date(m.muayeneTarihi).toLocaleDateString("tr-TR")}</td>
                            <td className="text-xs">{new Date(m.gecerlilikBitisTarihi).toLocaleDateString("tr-TR")}</td>
                            <td>
                              <span className={`text-xs font-semibold ${kalanGun < 0 ? "text-red-600" : kalanGun <= 30 ? "text-amber-600" : "text-green-600"}`}>
                                {kalanGun < 0 ? `${Math.abs(kalanGun)}g gecmis` : `${kalanGun}g`}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${m.sonuc === "gecti" ? "badge-success" : "badge-danger"}`}>
                                {sonucLabels[m.sonuc] || m.sonuc}
                              </span>
                            </td>
                            <td className="text-xs">{m.muayeneIstasyonu || "-"}</td>
                            <td>
                              <span className="badge badge-neutral text-xs">{muayeneTipiLabels[m.muayeneTipi] || m.muayeneTipi}</span>
                            </td>
                            <td className="text-xs font-mono">{m.raporNo || "-"}</td>
                            <td>
                              <button className="text-slate-400 hover:text-blue-600">
                                <ExternalLink size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Sekme 5: Sigorta Gecmisi */}
          {activeTab === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">Sigorta Gecmisi ({sigortalar.length} kayit)</h3>
                <button
                  onClick={() => router.push("/sigorta/new")}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  <Plus size={14} />
                  Yeni Police Ekle
                </button>
              </div>
              {sigortalar.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  Bu araca ait sigorta kaydi yok
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-grid">
                    <thead>
                      <tr>
                        <th>Sigorta Turu</th>
                        <th>Police No</th>
                        <th>Sigorta Sirketi</th>
                        <th>Baslangic</th>
                        <th>Bitis</th>
                        <th>Kalan Gun</th>
                        <th>Prim</th>
                        <th>Odeme</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sigortalar.map((s) => {
                        const kalanGun = computeKalanGun(s.bitisTarihi);
                        return (
                          <tr
                            key={s.id}
                            className={`cursor-pointer ${kalanGun < 0 ? "bg-red-50" : kalanGun <= 30 ? "bg-amber-50" : ""}`}
                            onClick={() => router.push(`/sigorta/${s.id}`)}
                          >
                            <td>
                              <span className={`badge text-xs ${s.sigortaTuru === "trafik" ? "badge-info" : s.sigortaTuru === "kasko" ? "badge-purple" : "badge-neutral"}`}>
                                {sigortaTuruLabels[s.sigortaTuru] || s.sigortaTuru}
                              </span>
                            </td>
                            <td className="text-xs font-mono">{s.policeNo || "-"}</td>
                            <td className="text-xs">{s.sigortaSirketi || "-"}</td>
                            <td className="text-xs">{new Date(s.baslangicTarihi).toLocaleDateString("tr-TR")}</td>
                            <td className="text-xs">{new Date(s.bitisTarihi).toLocaleDateString("tr-TR")}</td>
                            <td>
                              <span className={`text-xs font-semibold ${kalanGun < 0 ? "text-red-600" : kalanGun <= 30 ? "text-amber-600" : "text-green-600"}`}>
                                {kalanGun < 0 ? `${Math.abs(kalanGun)}g gecmis` : `${kalanGun}g`}
                              </span>
                            </td>
                            <td className="text-sm font-semibold">{s.primTutari ? formatCurrency(s.primTutari) : "-"}</td>
                            <td>
                              <span className={`badge ${s.odemeDurumu === "odendi" ? "badge-success" : s.odemeDurumu === "kismen_odendi" ? "badge-warning" : "badge-danger"}`}>
                                {odemeDurumuLabels[s.odemeDurumu] || s.odemeDurumu}
                              </span>
                            </td>
                            <td>
                              <button className="text-slate-400 hover:text-blue-600">
                                <ExternalLink size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
