import React, { useState } from 'react'
import Sidebar from './sidebar'
import { Menu } from 'lucide-react'

const Layout = ({ children }) => {

  const [open, setOpen] = useState(false)

  return (
    <div className='flex min-h-screen bg-zinc-950 text-white'>

      {/* BURGER */}
      <button
        onClick={() => setOpen(true)}
        className='fixed top-4 left-4 z-40 md:hidden'
      >
        <Menu />
      </button>

      {/* OVERLAY */}
      {open && (
        <div
          className='fixed inset-0 bg-black/50 z-40 md:hidden'
          onClick={() => setOpen(false)}
        />
      )}

      <Sidebar open={open} setOpen={setOpen} />

      <main className='flex-1 overflow-y-auto overflow-x-hidden relative'>
        {children}
      </main>

    </div>
  )
}

export default Layout