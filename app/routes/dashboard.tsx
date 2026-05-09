"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "~/lib/client";
import Layout from "~/components/ui/layout";
import {
  TrendingUp, Package, AlertTriangle, XCircle,
  LayoutGrid, ShoppingBag, ArrowRight, Zap
} from "lucide-react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface Stats {
  totalSku: number;
  lowStock: number;
  inactive: number;
  omzetHariIni: number;
  inventoryValue: number;
}

interface CategoryRow { kategori: string; jumlah: number; }
interface ProductRow  { id: number; nama_product: string; qty: number; harga: number; }

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function formatRp(n: number) {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000)     return `Rp ${(n / 1_000).toFixed(0)}rb`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}
function formatRpFull(n: number) {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
export default function Dashboard() {
  const supabase = createClient();

  const [user, setUser]               = useState<any>(null);
  const [loading, setLoading]         = useState(true);
  const [stats, setStats]             = useState<Stats>({
    totalSku: 0, lowStock: 0, inactive: 0,
    omzetHariIni: 0, inventoryValue: 0,
  });
  const [byCategory, setByCategory]   = useState<CategoryRow[]>([]);
  const [lowStockItems, setLowItems]  = useState<ProductRow[]>([]);
  const [outOfStock, setOutOfStock]   = useState<ProductRow[]>([]);
  const [recentTrx, setRecentTrx]     = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // ── Total SKU aktif ──
      const { count: activeCnt } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      // ── Inactive ──
      const { count: inactiveCnt } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("is_active", false);

      // ── Low stock (qty <= 5, lebih dari 0) ──
      const { count: lowCnt } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .gt("qty", 0)
        .lte("qty", 5);

      // ── Omzet hari ini ──
      // FIX: tabel "transaction" (bukan "transactions"), kolom "total" (bukan "total_price")
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: trxToday } = await supabase
        .from("transaction")
        .select("total")
        .gte("created_at", todayStart.toISOString());

      const omzet = trxToday?.reduce((s, t) => s + (t.total || 0), 0) ?? 0;

      // ── Inventory value ──
      // FIX: kolom "harga" (bukan "price")
      const { data: invData } = await supabase
        .from("products")
        .select("harga, qty")
        .eq("is_active", true);

      const invValue = invData?.reduce((s, p) => s + (p.harga ?? 0) * (p.qty ?? 0), 0) ?? 0;

      // ── Distribusi kategori ──
      // FIX: kolom "kategori" (bukan "category")
      const { data: catData } = await supabase
        .from("products")
        .select("kategori")
        .eq("is_active", true);

      const catMap: Record<string, number> = {};
      catData?.forEach((p) => {
  // normalize dulu sebelum dijadiin key
  const raw = p.kategori?.trim() || "Tanpa Kategori";
  const k = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  catMap[k] = (catMap[k] || 0) + 1;
});
      // ── Low stock items ──
      // FIX: kolom "nama_product" (bukan "name")
      const { data: lowData } = await supabase
        .from("products")
        .select("id, nama_product, qty, harga")
        .gt("qty", 0)
        .lte("qty", 5)
        .order("qty", { ascending: true })
        .limit(8);

      // ── Out of stock ──
      const { data: outData } = await supabase
        .from("products")
        .select("id, nama_product, qty, harga")
        .eq("qty", 0)
        .eq("is_active", true)
        .limit(5);

      // ── Transaksi terbaru ──
      const { data: recentData } = await supabase
        .from("transaction")
        .select("id, total, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      // ── Set state ──
      setStats({
        totalSku:       activeCnt    ?? 0,
        lowStock:       lowCnt       ?? 0,
        inactive:       inactiveCnt  ?? 0,
        omzetHariIni:   omzet,
        inventoryValue: invValue,
      });
      setByCategory(
        Object.entries(catMap)
          .map(([k, v]) => ({ kategori: k, jumlah: v as number }))
          .sort((a, b) => b.jumlah - a.jumlah)
      );
      setLowItems(lowData   ?? []);
      setOutOfStock(outData ?? []);
      setRecentTrx(recentData ?? []);

    } catch (err: any) {
      console.error("Dashboard fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    const session = localStorage.getItem("user_session");
    if (!session) { window.location.href = "/login"; return; }
    setUser(JSON.parse(session));
    fetchData();
  }, [fetchData]);

  if (!user) return null;

  const statCards = [
    {
      label: "Total SKU",
      value: stats.totalSku,
      icon: Package,
      accent: "#3b82f6",
      glow: "rgba(59,130,246,0.15)",
    },
    {
      label: "Low Stock",
      value: stats.lowStock,
      icon: AlertTriangle,
      accent: "#f59e0b",
      glow: "rgba(245,158,11,0.15)",
    },
    {
      label: "Inactive",
      value: stats.inactive,
      icon: XCircle,
      accent: "#ef4444",
      glow: "rgba(239,68,68,0.15)",
    },
    {
      label: "Omzet Hari Ini",
      value: formatRp(stats.omzetHariIni),
      icon: TrendingUp,
      accent: "#10b981",
      glow: "rgba(16,185,129,0.15)",
    },
    {
      label: "Nilai Inventori",
      value: formatRp(stats.inventoryValue),
      icon: ShoppingBag,
      accent: "#8b5cf6",
      glow: "rgba(139,92,246,0.15)",
    },
  ];

  return (
    <Layout>
      <div className="p-6 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap size={14} className="text-yellow-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
                Overview
              </span>
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-white leading-none">
              Dashboard
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              Selamat datang, <span className="text-zinc-300 font-semibold">{user.name}</span>
            </p>
          </div>
          <button
            onClick={() => window.location.href = "/kasir"}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black uppercase rounded-xl transition-colors shadow-[0_0_20px_rgba(16,185,129,0.2)]"
          >
            <ShoppingBag size={15} /> Buka Kasir
          </button>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-5 overflow-hidden group transition-all hover:border-zinc-700"
                style={{ boxShadow: loading ? "none" : `inset 0 0 40px ${card.glow}` }}
              >
                {/* accent line top */}
                <div
                  className="absolute top-0 left-6 right-6 h-[2px] rounded-b-full opacity-60"
                  style={{ background: card.accent }}
                />
                <div className="flex items-start justify-between mb-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-500">
                    {card.label}
                  </p>
                  <Icon size={14} style={{ color: card.accent }} className="opacity-60" />
                </div>
                {loading ? (
                  <div className="h-8 w-20 bg-zinc-800 rounded animate-pulse" />
                ) : (
                  <p className="text-2xl font-black text-white leading-none">
                    {card.value}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ── Kiri: Kategori + Transaksi Terbaru ── */}
          <div className="space-y-4">

            {/* Distribusi Kategori */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
                <LayoutGrid size={13} className="text-blue-400" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-300">
                  Distribusi Kategori
                </h2>
              </div>
              {loading ? (
                <div className="p-5 space-y-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="flex justify-between">
                      <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
                      <div className="h-4 w-12 bg-zinc-800 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : byCategory.length === 0 ? (
                <EmptyState text="Belum ada kategori" />
              ) : (
                <ul className="divide-y divide-zinc-800/50">
                  {byCategory.map((row) => {
                    const max = byCategory[0].jumlah;
                    return (
                      <li key={row.kategori} className="px-5 py-3 hover:bg-zinc-800/30 transition-colors">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-semibold text-zinc-200 truncate pr-2">
                            {row.kategori}
                          </span>
                          <span className="text-xs font-black text-blue-400 shrink-0">
                            {row.jumlah} SKU
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Transaksi Terbaru */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp size={13} className="text-emerald-400" />
                  <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-300">
                    Transaksi Terbaru
                  </h2>
                </div>
                <a
                  href="/penjualan"
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
                >
                  Semua <ArrowRight size={10} />
                </a>
              </div>
              {loading ? (
                <div className="p-5 space-y-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-4 bg-zinc-800 rounded animate-pulse" />
                  ))}
                </div>
              ) : recentTrx.length === 0 ? (
                <EmptyState text="Belum ada transaksi" />
              ) : (
                <ul className="divide-y divide-zinc-800/50">
                  {recentTrx.map((trx) => {
                    const d = new Date(trx.created_at);
                    const timeStr = d.toLocaleTimeString("id-ID", {
                      hour: "2-digit", minute: "2-digit"
                    });
                    return (
                      <li
                        key={trx.id}
                        className="px-5 py-3 flex items-center justify-between hover:bg-zinc-800/30 transition-colors"
                      >
                        <div>
                          <p className="text-xs font-bold text-zinc-200">
                            #{String(trx.id).padStart(4, "0")}
                          </p>
                          <p className="text-[10px] text-zinc-500">{timeStr}</p>
                        </div>
                        <span className="text-sm font-black text-emerald-400">
                          {formatRpFull(trx.total)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* ── Kanan: Stok Menipis + Habis ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Stok Menipis */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
                <AlertTriangle size={13} className="text-yellow-400" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-300">
                  Stok Menipis
                </h2>
                {stats.lowStock > 0 && (
                  <span className="ml-auto text-[9px] font-black bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full">
                    {stats.lowStock} produk
                  </span>
                )}
              </div>
              {loading ? (
                <LoadingSkeleton rows={4} />
              ) : lowStockItems.length === 0 ? (
                <EmptyState text="Semua stok aman 👍" positive />
              ) : (
                <div className="divide-y divide-zinc-800/50">
                  {lowStockItems.map((p) => (
                    <StockRow
                      key={p.id}
                      nama={p.nama_product}
                      qty={p.qty}
                      harga={p.harga}
                      variant="warning"
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Stok Habis */}
            {(loading || outOfStock.length > 0) && (
              <div className="bg-zinc-900 border border-red-500/20 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-red-500/20 bg-red-500/5 flex items-center gap-2">
                  <XCircle size={13} className="text-red-400" />
                  <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-red-300">
                    Stok Habis
                  </h2>
                  {outOfStock.length > 0 && (
                    <span className="ml-auto text-[9px] font-black bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full">
                      {outOfStock.length} produk
                    </span>
                  )}
                </div>
                {loading ? (
                  <LoadingSkeleton rows={2} />
                ) : (
                  <div className="divide-y divide-red-500/10">
                    {outOfStock.map((p) => (
                      <StockRow
                        key={p.id}
                        nama={p.nama_product}
                        qty={p.qty}
                        harga={p.harga}
                        variant="danger"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-3">
              <QuickAction
                label="Tambah Produk"
                desc="Batch input inventory baru"
                href="/barang"
                color="emerald"
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function StockRow({ nama, qty, harga, variant }: {
  nama: string; qty: number; harga: number; variant: "warning" | "danger";
}) {
  return (
    <div className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-zinc-800/20 transition-colors">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-zinc-200 truncate">{nama}</p>
        <p className="text-[10px] text-zinc-500">{formatRpFull(harga)}</p>
      </div>
      <div className="text-right shrink-0">
        <span
          className={`text-xs font-black px-2 py-0.5 rounded-md ${
            variant === "danger"
              ? "bg-red-500/10 text-red-400 border border-red-500/20"
              : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
          }`}
        >
          {variant === "danger" ? "HABIS" : `Sisa ${qty}`}
        </span>
      </div>
    </div>
  );
}

function EmptyState({ text, positive }: { text: string; positive?: boolean }) {
  return (
    <div className="px-5 py-10 text-center">
      <p className={`text-sm ${positive ? "text-emerald-500" : "text-zinc-600"} font-medium`}>
        {text}
      </p>
    </div>
  );
}

function LoadingSkeleton({ rows }: { rows: number }) {
  return (
    <div className="p-5 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex justify-between items-center">
          <div className="space-y-1.5">
            <div className="h-3.5 w-32 bg-zinc-800 rounded animate-pulse" />
            <div className="h-2.5 w-20 bg-zinc-800/60 rounded animate-pulse" />
          </div>
          <div className="h-6 w-16 bg-zinc-800 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function QuickAction({ label, desc, href, color }: {
  label: string; desc: string; href: string; color: "emerald" | "blue";
}) {
  const cls = color === "emerald"
    ? "border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/5"
    : "border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-500/5";
  const textCls = color === "emerald" ? "text-emerald-400" : "text-blue-400";

  return (
    <a
      href={href}
      className={`block bg-zinc-900 border rounded-2xl p-4 transition-all group ${cls}`}
    >
      <p className={`text-sm font-black ${textCls} mb-1`}>{label}</p>
      <p className="text-[10px] text-zinc-500">{desc}</p>
      <ArrowRight
        size={12}
        className={`mt-2 ${textCls} opacity-0 group-hover:opacity-100 transition-opacity`}
      />
    </a>
  );
}