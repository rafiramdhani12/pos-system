import React from 'react'
import Sidebar from './sidebar'

const Layout = ({children}) => {
  return (
    <>
    <div className='flex min-h-screen bg-zinc-950 text-white'>
    <Sidebar/>
    <main className='flex-1 overflow-y-auto  overflow-x-hidden relative'>
    {children}
    </main>
    </div>
    </>
  )
}

export default Layout