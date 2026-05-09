import React from 'react'
import { Button } from './button'
import {
  History,
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingCart,
  User,
  X
} from 'lucide-react'

import { useNavigate } from 'react-router'

const Sidebar = ({ open, setOpen }) => {

  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem("user_session");
    window.location.href = "/";
  };

  const sidebarItems = [
    { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={18} /> },
    { label: "Kasir", href: "/kasir", icon: <ShoppingCart size={18} /> },
    { label: "Barang", href: "/barang", icon: <Package size={18} /> },
    { label: "Riwayat Penjualan", href: "/penjualan", icon: <History size={18} /> },
    { label: "Users", href: "/users", icon: <User size={18} /> },
  ];

  return (
    <aside
      className={`
        fixed md:relative top-0 left-0 z-50
        w-64 h-screen
        border-r border-zinc-800
        bg-zinc-900 p-6
        transition-transform duration-300
        ${open ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0
      `}
    >

      {/* CLOSE MOBILE */}
      <div className="flex justify-end md:hidden mb-4">
        <button onClick={() => setOpen(false)}>
          <X />
        </button>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-bold text-blue-500">
          POS SYSTEM
        </h2>
      </div>

      <nav className="space-y-2">
        {sidebarItems.map((item) => (
          <Button
            key={item.href}
            variant="ghost"
            className="w-full justify-start gap-2 text-zinc-400 hover:text-white hover:bg-zinc-800"
            onClick={() => {
              navigate(item.href)
              setOpen(false)
            }}
          >
            {item.icon}
            {item.label}
          </Button>
        ))}
      </nav>

      <div className="pt-10">
        <Button
          onClick={handleLogout}
          variant="destructive"
          className="w-full gap-2"
        >
          <LogOut size={18} />
          Keluar
        </Button>
      </div>
    </aside>
  )
}

export default Sidebar