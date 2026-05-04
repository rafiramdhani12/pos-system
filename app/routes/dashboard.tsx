"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "~/components/ui/button";
import Sidebar from "~/components/ui/sidebar";
import { createClient } from "~/lib/client";
import { Plus } from "lucide-react";

export default function Dashboard() {
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    totalActive: 0,
    lowStock: 0,
    totalSalesToday: 0,
    inactive: 0,
  });

  const [inventoryValue, setInventoryValue] = useState(0);
  const [byCategory, setByCategory] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [outOfStockItems, setOutOfStockItems] = useState<any[]>([]);

  // =========================
  // FETCH DATA
  // =========================
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);

    try {
      const { count: activeCount } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      const { count: inactiveCount } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("is_active", false);

      const { count: lowStockCount } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .lte("qty", 5);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: salesToday } = await supabase
        .from("transactions")
        .select("total_price")
        .gte("created_at", today.toISOString());

      const totalOmzet =
        salesToday?.reduce((acc, curr) => acc + (curr.total_price || 0), 0) || 0;

      const { data: categoryData } = await supabase
        .from("products")
        .select("category");

      const categoryMap: any = {};
      categoryData?.forEach((i) => {
        categoryMap[i.category] = (categoryMap[i.category] || 0) + 1;
      });

      const { data: lowStockData } = await supabase
        .from("products")
        .select("*")
        .lte("qty", 5);

      const { data: outStock } = await supabase
        .from("products")
        .select("*")
        .eq("qty", 0);

      const { data: inventoryData } = await supabase
        .from("products")
        .select("price, qty");

      const totalInventory =
        inventoryData?.reduce(
          (acc, item) => acc + item.price * item.qty,
          0
        ) || 0;

      setStats({
        totalActive: activeCount || 0,
        lowStock: lowStockCount || 0,
        totalSalesToday: totalOmzet,
        inactive: inactiveCount || 0,
      });

      setInventoryValue(totalInventory);

      setByCategory(
        Object.entries(categoryMap).map(([k, v]) => ({
          kategori: k,
          qty: v,
        }))
      );

      setLowStockItems(lowStockData || []);
      setOutOfStockItems(outStock || []);
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  }, [supabase]);

  // =========================
  // INIT
  // =========================
  useEffect(() => {
    const session = localStorage.getItem("user_session");

    if (!session) {
      window.location.href = "/login";
      return;
    }

    setUser(JSON.parse(session));
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (!user) return null;
  if (loading) return <div className="p-10">Loading...</div>;

  return (
    <div className="flex min-h-screen bg-zinc-950 text-white">
      <Sidebar />

      <main className="flex-1 p-8 space-y-8">

        {/* HEADER */}
        <div className="flex justify-between">
          <div>
            <h1 className="text-3xl font-black">DASHBOARD</h1>
            <p className="text-xs text-zinc-500">{user.name}</p>
          </div>

          <Button onClick={() => (window.location.href = "/pos")}>
            <Plus /> Transaksi
          </Button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">

          {/* TOTAL SKU */}
          <StatCard
            title="Total SKU"
            value={stats.totalActive}
            color="blue"
          />

          {/* LOW STOCK */}
          <StatCard
            title="Low Stock"
            value={stats.lowStock}
            color="yellow"
          />

          {/* INACTIVE */}
          <StatCard
            title="Inactive"
            value={stats.inactive}
            color="red"
          />

          {/* OMZET */}
          <StatCard
            title="Omzet"
            value={`Rp ${stats.totalSalesToday.toLocaleString("id-ID")}`}
            color="green"
          />

          {/* INVENTORY */}
          <StatCard
            title="Inventory Value"
            value={`Rp ${inventoryValue.toLocaleString("id-ID")}`}
            color="violet"
          />
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* LEFT */}
          <div className="space-y-8">

            {/* DISTRIBUSI KATEGORI */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950/50 flex items-center justify-between">
                <h2 className="font-black text-xs uppercase tracking-widest text-white">
                  Distribusi Kategori
                </h2>
                <div className="h-2 w-2 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)]"></div>
              </div>

              <ul className="divide-y divide-zinc-800/50">
                {byCategory.length === 0 ? (
                  <li className="px-6 py-10 text-center text-zinc-600 text-sm italic">
                    Belum ada kategori.
                  </li>
                ) : (
                  byCategory.map((row) => (
                    <li
                      key={row.kategori}
                      className="px-6 py-3.5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors"
                    >
                      <span className="text-sm font-semibold text-zinc-300">
                        {row.kategori}
                      </span>

                      <span className="px-2.5 py-0.5 rounded-md bg-zinc-800 text-xs font-black text-blue-400 tabular-nums border border-zinc-700">
                        {row.qty} SKU
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>

          </div>

          {/* RIGHT */}
          <div className="lg:col-span-2 space-y-6">

            {/* LOW STOCK */}
            <Box title="Stok Menipis">
              {lowStockItems.length === 0 ? (
                <Empty />
              ) : (
                lowStockItems.map((p) => (
                  <Row key={p.id} left={p.name} right={p.qty} />
                ))
              )}
            </Box>

            {/* OUT OF STOCK */}
            {outOfStockItems.length > 0 && (
              <Box title="Stok Habis" danger>
                {outOfStockItems.map((p) => (
                  <Row key={p.id} left={p.name} right="Kosong" danger />
                ))}
              </Box>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}

// =========================
// COMPONENTS
// =========================

function StatCard({ title, value, color }: any) {
  const colorMap: any = {
    blue: "hover:border-blue-500/50",
    yellow: "hover:border-yellow-500/50",
    red: "hover:border-red-500/50",
    green: "hover:border-green-500/50",
    violet: "hover:border-violet-500/50",
  };

  return (
    <div
      className={`bg-zinc-900 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden group transition-all ${colorMap[color]}`}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3">
        {title}
      </p>
      <p className="text-3xl font-black">{value}</p>
    </div>
  );
}

function Box({ title, children, danger }: any) {
  return (
    <div
      className={`rounded-2xl p-4 border ${
        danger
          ? "bg-red-500/5 border-red-500/30"
          : "bg-zinc-900 border-zinc-800"
      }`}
    >
      <h2 className="text-xs mb-3 font-bold uppercase">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ left, right, danger }: any) {
  return (
    <div className="flex justify-between text-sm">
      <span>{left}</span>
      <span className={danger ? "text-red-400" : ""}>{right}</span>
    </div>
  );
}

function Empty() {
  return (
    <p className="text-xs text-zinc-500 italic">
      Tidak ada data
    </p>
  );
}