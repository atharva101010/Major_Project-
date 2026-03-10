import React from 'react'
import Sidebar from './Sidebar'

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-[calc(100vh-64px)] flex w-full">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10 bg-gradient-to-b from-white/80 to-slate-50/60 overflow-x-hidden">
        <div className="max-w-[1400px] mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  )
}

export default DashboardLayout
