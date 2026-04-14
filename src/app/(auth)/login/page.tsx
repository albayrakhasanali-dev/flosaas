"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Gecersiz e-posta veya sifre");
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0a2e] via-[#4a0e2a] to-[#1a0a2e] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white">
            <span className="text-[#89CFF0]">Flo</span>SaaS
          </h1>
          <p className="text-[#c9a0b0] mt-2">Filo Yonetim ve Operasyon Kokpiti</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white/95 backdrop-blur rounded-xl shadow-2xl p-8 space-y-5"
        >
          <h2 className="text-xl font-semibold text-slate-800">Giris Yap</h2>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              E-posta
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#6B1D3A] focus:border-transparent outline-none text-sm"
              placeholder="ornek@harmantemizlik.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Sifre
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#6B1D3A] focus:border-transparent outline-none text-sm"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#6B1D3A] to-[#2C3E8C] hover:from-[#7d2345] hover:to-[#3a4fa0] text-white py-2.5 rounded-lg font-medium transition-all disabled:opacity-50"
          >
            {loading ? "Giris yapiliyor..." : "Giris Yap"}
          </button>
        </form>
      </div>
    </div>
  );
}
