import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

function Item({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `block px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${isActive
          ? 'bg-violet-600 text-white shadow-lg shadow-violet-200 translate-x-1'
          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
        }`
      }
      end
    >
      {label}
    </NavLink>
  )
}

export default function Sidebar() {
  const { user } = useAuth()
  const role = user?.role || 'student'

  return (
    <aside className="w-72 border-r border-slate-200 bg-white/40 backdrop-blur-xl p-6 hidden lg:block sticky top-14 h-[calc(100vh-56px)] overflow-y-auto">
      <div className="mb-10">
        <div className="flex items-center gap-3 p-2 bg-white/60 rounded-2xl border border-white shadow-sm mb-6">
          <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-black shadow-inner">
            IS
          </div>
          <div className="overflow-hidden text-ellipsis">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Authenticated</div>
            <div className="text-sm font-black text-slate-800 capitalize truncate">{role} Portal</div>
          </div>
        </div>
      </div>

      <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-4">Navigation</div>
      <nav className="space-y-1">
        {role === 'student' && (
          <>
            <Item to="/student" label="Overview" />
            <Item to="/student/deployments" label="Deployments" />
            <Item to="/student/monitoring" label="Monitoring" />
            <Item to="/student/autoscaling" label="Auto-Scaling" />
            <Item to="/student/loadtest" label="Load Testing" />
            <Item to="/student/billing" label="Billing" />
            <Item to="/student/guides" label="Deployment Guides" />
            <Item to="/student/profile" label="Profile" />
          </>
        )}
        {role === 'teacher' && (
          <>
            <Item to="/teacher" label="Overview" />
            <Item to="/teacher/deployments" label="Deployments" />
            <Item to="/teacher/monitoring" label="Monitoring" />
            <Item to="/teacher/billing" label="Billing" />
            <Item to="/teacher/guides" label="Deployment Guides" />
            <Item to="/teacher/classes" label="Classes" />
            <Item to="/teacher/profile" label="Profile" />
          </>
        )}
        {role === 'admin' && (
          <>
            <Item to="/admin" label="Overview" />
            <Item to="/admin/deployments" label="Deployments" />
            <Item to="/admin/monitoring" label="Monitoring" />
            <Item to="/admin/autoscaling" label="Auto-Scaling" />
            <Item to="/admin/loadtest" label="Load Testing" />
            <Item to="/admin/billing" label="Billing" />
            <Item to="/admin/guides" label="Deployment Guides" />
            <Item to="/admin/users" label="Users" />
            <Item to="/admin/systems" label="Systems" />
            <Item to="/admin/settings" label="Settings" />
          </>
        )}
      </nav>
    </aside>
  )
}
