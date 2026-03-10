import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { dashboard, DashboardMetrics } from '../utils/api'

export default function StudentDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  const fetchMetrics = async () => {
    try {
      const data = await dashboard.getMetrics()
      setMetrics(data)
    } catch (error) {
      console.error('Failed to fetch dashboard metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-10 animate-fade-in p-2">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 bg-clip-text text-transparent">
            Student Console
          </h1>
          <p className="text-slate-500 font-bold mt-2 uppercase tracking-widest text-sm">Real-time system orchestration</p>
        </div>
        <div className="flex items-center gap-4 bg-white/60 backdrop-blur-xl p-3 rounded-2xl border border-white/60 shadow-lg">
          <div className={`w-3 h-3 rounded-full ${metrics?.system_status === 'healthy' ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]'} animate-pulse`}></div>
          <span className="text-sm font-black text-slate-700 uppercase tracking-widest">
            System: {metrics?.system_status || 'Checking...'}
          </span>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="group relative bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/60 shadow-xl hover:translate-y-[-4px] transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/5 blur-[50px] rounded-full -mr-16 -mt-16 group-hover:bg-violet-600/10 transition-colors"></div>
          <div className="p-3 bg-violet-100 rounded-2xl w-fit mb-6 shadow-sm">
            <svg className="w-8 h-8 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total Deployments</div>
          <div className="text-5xl font-black text-slate-800 tabular-nums">{metrics?.total_containers || 0}</div>
        </div>

        <div className="group relative bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/60 shadow-xl hover:translate-y-[-4px] transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/5 blur-[50px] rounded-full -mr-16 -mt-16 group-hover:bg-emerald-600/10 transition-colors"></div>
          <div className="p-3 bg-emerald-100 rounded-2xl w-fit mb-6 shadow-sm">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Running Instances</div>
          <div className="text-5xl font-black text-emerald-600 tabular-nums">{metrics?.running_containers || 0}</div>
        </div>

        <div className="group relative bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/60 shadow-xl hover:translate-y-[-4px] transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-600/5 blur-[50px] rounded-full -mr-16 -mt-16 group-hover:bg-amber-600/10 transition-colors"></div>
          <div className="p-3 bg-amber-100 rounded-2xl w-fit mb-6 shadow-sm">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Dormant States</div>
          <div className="text-5xl font-black text-slate-800 tabular-nums">{metrics?.stopped_containers || 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Recent Load Tests */}
        <div className="lg:col-span-8 bg-white/70 backdrop-blur-2xl p-8 md:p-12 rounded-[3.5rem] border border-white/60 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between mb-10">
            <h4 className="text-2xl font-black text-slate-800 flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-violet-500/20">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              Load Test History
            </h4>
            <div className="text-xs font-black text-slate-400 bg-slate-100/50 px-4 py-2 rounded-full uppercase tracking-widest">
              Live Feed
            </div>
          </div>

          {metrics?.recent_load_tests && metrics.recent_load_tests.length > 0 ? (
            <div className="space-y-5">
              {metrics.recent_load_tests.map((test) => (
                <div key={test.id} className="flex items-center justify-between p-7 bg-white/40 rounded-[2.5rem] border border-white/80 hover:bg-white/80 hover:border-violet-100 hover:shadow-xl hover:shadow-violet-500/5 transition-all cursor-default group">
                  <div className="flex items-center gap-8">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${test.status === 'completed' ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100' : 'bg-amber-50 text-amber-600 group-hover:bg-amber-100'}`}>
                      {test.status === 'completed' ? (
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-7 h-7 animate-spin-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="text-xl font-black text-slate-800 mb-1">Sequence #{test.id}</div>
                      <div className="text-[10px] font-black text-slate-400 tracking-[0.15em] uppercase">
                        {new Date(test.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • {new Date(test.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-10">
                    <div className="text-right hidden sm:block">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Hits</div>
                      <div className="text-2xl font-black text-slate-800 tabular-nums">{test.requests}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Latency</div>
                      <div className={`text-2xl font-black tabular-nums transition-colors ${test.avg_response_time ? 'text-violet-600' : 'text-slate-300'}`}>
                        {test.avg_response_time?.toFixed(1) || '--'} <span className="text-[10px] font-black ml-0.5">MS</span>
                      </div>
                    </div>
                    <Link to="/student/loadtest" className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 shadow-lg shadow-black/20 hover:bg-violet-600 hover:shadow-violet-600/30">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-24 flex flex-col items-center justify-center bg-slate-50/40 rounded-[3rem] border-2 border-dashed border-slate-200/60 mt-4">
              <div className="w-20 h-20 bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 flex items-center justify-center mb-6 relative">
                <div className="absolute inset-0 bg-violet-500/10 rounded-[2rem] animate-pulse"></div>
                <svg className="w-10 h-10 text-slate-300 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-slate-400 font-bold mb-6">No load sequences recorded yet</p>
              <Link to="/student/loadtest" className="px-8 py-4 bg-violet-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-lg shadow-violet-200 hover:bg-violet-700 hover:shadow-violet-300 hover:scale-105 transition-all active:scale-95">
                Launch Sequence →
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions & Info */}
        <div className="lg:col-span-4 space-y-10">
          <div className="bg-slate-900 rounded-[3.5rem] p-10 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-600/20 blur-[100px] rounded-full -mr-32 -mt-32 group-hover:scale-125 transition-transform duration-1000" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-violet-600/10 blur-[60px] rounded-full -ml-16 -mb-16" />

            <h4 className="text-xl font-black mb-10 flex items-center gap-4 relative z-10">
              <span className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-xl">⚡</span>
              Rapid Control
            </h4>

            <div className="space-y-4 relative z-10">
              {[
                { to: '/student/loadtest', label: 'New Load Test', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
                { to: '/student/deployment', label: 'Deploy Instance', icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6' },
                { to: '/student/monitoring', label: 'System Telemetry', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
              ].map((action) => (
                <Link key={action.to} to={action.to} className="flex items-center justify-between p-6 bg-white/5 hover:bg-white/10 rounded-3xl border border-white/5 hover:border-white/10 transition-all group/btn active:scale-[0.98]">
                  <div className="flex items-center gap-4">
                    <svg className="w-5 h-5 text-white/40 group-hover/btn:text-fuchsia-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.icon} />
                    </svg>
                    <span className="font-black text-sm uppercase tracking-widest">{action.label}</span>
                  </div>
                  <svg className="w-5 h-5 text-white/20 group-hover/btn:text-white group-hover/btn:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>

            <div className="mt-12 p-8 bg-gradient-to-br from-violet-600 via-violet-600 to-fuchsia-600 rounded-[2.5rem] shadow-xl relative z-10 overflow-hidden group/tip">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 blur-2xl rounded-full -mr-12 -mt-12 group-hover/tip:scale-150 transition-transform duration-700"></div>
              <div className="flex items-start gap-5">
                <div className="text-3xl filter drop-shadow-lg">💡</div>
                <div>
                  <div className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mb-2 leading-none">Architect's Note</div>
                  <div className="text-sm font-bold leading-relaxed text-white">
                    Optimize cold starts by maintaining a minimum cluster size of 1 instance.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/50 backdrop-blur-3xl p-10 rounded-[3.5rem] border border-white/80 shadow-2xl shadow-slate-200/50">
            <h4 className="text-[10px] font-black text-slate-400 mb-8 uppercase tracking-[0.3em]">Operational Environment</h4>
            <div className="space-y-6">
              {[
                { label: 'Cluster', value: 'sim-eu-west-1', color: 'text-slate-800' },
                { label: 'Scaling', value: 'Reactive V2', color: 'text-violet-600' },
                { label: 'Tier', value: 'Pro Developer', color: 'text-slate-800' },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-end pb-2 border-b border-slate-100/50 group/item">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover/item:text-slate-500 transition-colors uppercase">{item.label}</span>
                  <span className={`text-sm font-black ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
