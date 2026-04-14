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
          <div className="flex justify-center mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 200" className="w-72 h-auto">
              <defs>
                <linearGradient id="loginOrangeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#fb923c" />
                </linearGradient>
              </defs>
              <g transform="translate(40, 50)">
                <rect x="0" y="0" width="18" height="100" fill="url(#loginOrangeGradient)" rx="3" />
                <rect x="28" y="25" width="18" height="75" fill="url(#loginOrangeGradient)" rx="3" />
                <rect x="56" y="50" width="18" height="50" fill="url(#loginOrangeGradient)" rx="3" />
              </g>
              <text x="130" y="132" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" fontSize="86" fontWeight="800" fill="url(#loginOrangeGradient)" letterSpacing="6">HARMAN</text>
              <rect x="135" y="150" width="390" height="5" fill="url(#loginOrangeGradient)" rx="2" />
            </svg>
          </div>
          <p className="text-[#c9a0b0] mt-1">Filo Yonetim ve Operasyon Kokpiti</p>
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
