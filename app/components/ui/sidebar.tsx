import React from 'react'
import { Button } from './button'
import { History, LayoutDashboard, LogOut, Package, ShoppingCart, User } from 'lucide-react'
import { Link, NavLink, useNavigate } from 'react-router';

const Sidebar = () => {
    const navigate = useNavigate()
    const handleLogout = () => {
    localStorage.removeItem("user_session");
    window.location.href = "/login";
  };

  const sidebarItems = [
    { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={18} /> },
    { label: "Kasir", href: "/kasir", icon: <ShoppingCart size={18} /> },
    { label: "Barang", href: "/barang", icon: <Package size={18} /> },
    { label: "Riwayat Penjualan", href: "/penjualan", icon: <History size={18} /> },
    { label: "Users", href: "/users", icon: <User size={18} /> },
  ];

  return (
   <>
   <aside className="w-64 border-r border-zinc-800 bg-zinc-900 p-6 hidden md:block">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-blue-500">POS SYSTEM</h2>
        </div>
        
        <nav className="space-y-2">
            {sidebarItems.map((item) => (
              <Button key={item.href} variant="ghost" className="w-full justify-start gap-2 text-zinc-400 hover:text-white hover:bg-zinc-800" onClick={() => navigate(item.href)}>
                {item.icon} {item.label}
              </Button>
            ))}
        </nav>

        <div className="mt-auto pt-10">
          <Button onClick={handleLogout} variant="destructive" className="w-full gap-2">
            <LogOut size={18} /> Keluar
          </Button>
        </div>
      </aside>
   </>
  )
}

export default Sidebar