import { useState, useEffect } from 'react'
import { api } from '../utils/api'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

interface Container {
    id: number
    name: string
    localhost_url?: string | null
    port?: number | null
}

interface LoadTestConfig {
    containerId: number | null
    totalRequests: number
    concurrency: number
    durationSeconds: number
}

interface LoadTestStatus {
    id: number
    status: string
    requests_sent?: number
    requests_completed?: number
    requests_failed?: number
    progress_percent?: number
    error_message?: string | null
    avg_response_time_ms?: number
    peak_cpu_percent?: number
    peak_memory_mb?: number
}

interface LiveMetric {
    timestamp: string
    cpu_percent: number
    cpu: number
    memory_mb: number
    memory: number
    requests_completed: number
    completed: number
    requests_failed: number
    failed: number
    progress: number
    active: number
}

export default function LoadTesting() {
    const [containers, setContainers] = useState<Container[]>([])
    const [config, setConfig] = useState<LoadTestConfig>({
        containerId: null,
        totalRequests: 100,
        concurrency: 10,
        durationSeconds: 30
    })
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [isRunning, setIsRunning] = useState(false)
    const [currentTest, setCurrentTest] = useState<LoadTestStatus | null>(null)
    const [liveMetrics, setLiveMetrics] = useState<LiveMetric[]>([])
    const [eventSource, setEventSource] = useState<EventSource | null>(null)
    const [lastTestError, setLastTestError] = useState<{ status: string, message: string, details: any } | null>(null)

    const ACTIVE_TEST_KEY = 'active_load_test_id'

    useEffect(() => {
        fetchContainers()
        checkForRunningTest()
    }, [])

    const fetchContainers = async () => {
        try {
            const response = await api.listContainers('running')
            setContainers(response.containers || [])
        } catch (error) {
            console.error('Failed to fetch containers:', error)
        }
    }

    const checkForRunningTest = async () => {
        const testId = sessionStorage.getItem(ACTIVE_TEST_KEY)
        if (testId) {
            try {
                const token = localStorage.getItem('token')
                const response = await fetch(`/api/loadtest/${testId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                })

                if (response.ok) {
                    const data = await response.json()
                    if (data.status === 'running' || data.status === 'pending') {
                        setIsRunning(true)
                        setCurrentTest(data)
                        setupSSE(parseInt(testId))
                        pollTestStatus(parseInt(testId))
                    } else {
                        sessionStorage.removeItem(ACTIVE_TEST_KEY)
                    }
                }
            } catch (error) {
                console.error('Failed to restore running test:', error)
                sessionStorage.removeItem(ACTIVE_TEST_KEY)
            }
        }
    }

    const validateConfig = (): boolean => {
        const newErrors: Record<string, string> = {}
        if (!config.containerId) newErrors.container = 'Please select a container'
        if (config.totalRequests > 1000) newErrors.requests = 'Maximum 1000 requests'
        if (config.concurrency > 50) newErrors.concurrency = 'Maximum 50 concurrent'
        if (config.durationSeconds > 300) newErrors.duration = 'Maximum 300 seconds'
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const startLoadTest = async () => {
        if (!validateConfig()) return

        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/loadtest/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    container_id: config.containerId,
                    total_requests: config.totalRequests,
                    concurrency: config.concurrency,
                    duration_seconds: config.durationSeconds
                })
            })

            if (!response.ok) {
                const error = await response.json()
                alert(error.detail || 'Failed to start load test')
                return
            }

            const data = await response.json()
            setLastTestError(null) // Clear any previous errors
            setIsRunning(true)
            sessionStorage.setItem(ACTIVE_TEST_KEY, data.id.toString())
            pollTestStatus(data.id)
            setupSSE(data.id)
        } catch (error: any) {
            alert(error.message || 'An unexpected error occurred')
        }
    }

    const pollTestStatus = async (testId: number) => {
        const interval = setInterval(async () => {
            try {
                const token = localStorage.getItem('token')
                const response = await fetch(`/api/loadtest/${testId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                const data = await response.json()
                setCurrentTest(data)
                if (['completed', 'failed', 'cancelled'].includes(data.status)) {
                    clearInterval(interval)
                    if (data.status === 'failed') {
                        // Store error to display banner
                        setLastTestError({
                            status: 'failed',
                            message: data.error_message || 'Test failed - most requests returned errors',
                            details: {
                                sent: data.requests_sent || 0,
                                completed: data.requests_completed || 0,
                                failed: data.requests_failed || 0
                            }
                        })
                    }
                    setIsRunning(false)
                    sessionStorage.removeItem(ACTIVE_TEST_KEY)
                }
            } catch (error) {
                console.error('Failed to fetch test status:', error)
            }
        }, 2000)
    }

    const setupSSE = (testId: number) => {
        const token = localStorage.getItem('token')
        const es = new EventSource(`/api/loadtest/${testId}/metrics/stream?token=${token}`)
        es.onmessage = (event) => {
            const metric = JSON.parse(event.data)
            setLiveMetrics(prev => [...prev.slice(-50), metric])
        }
        setEventSource(es)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8">
            <div className="max-w-5xl mx-auto">
                {/* Premium Header */}
                <div className="mb-10">
                    <div className="flex items-center gap-4 mb-3">
                        <div className="w-14 h-14 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-5xl font-black bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 bg-clip-text text-transparent">
                                Load Testing
                            </h1>
                            <p className="text-slate-600 text-lg mt-1">Simulate real-world traffic & measure performance</p>
                        </div>
                    </div>
                </div>

                {/* Error Banner */}
                {lastTestError && (
                    <div className="mb-6 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 rounded-2xl p-6">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-red-800 mb-2">❌ Last Test Failed</h3>
                                <p className="text-red-700 font-semibold mb-3">{lastTestError.message}</p>
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div className="bg-white/50 rounded-lg p-3">
                                        <div className="text-slate-600 font-medium">Sent</div>
                                        <div className="text-2xl font-bold text-slate-800">{lastTestError.details.sent}</div>
                                    </div>
                                    <div className="bg-white/50 rounded-lg p-3">
                                        <div className="text-slate-600 font-medium">Completed</div>
                                        <div className="text-2xl font-bold text-green-600">{lastTestError.details.completed}</div>
                                    </div>
                                    <div className="bg-white/50 rounded-lg p-3">
                                        <div className="text-slate-600 font-medium">Failed</div>
                                        <div className="text-2xl font-bold text-red-600">{lastTestError.details.failed}</div>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setLastTestError(null)}
                                className="text-red-500 hover:text-red-700 font-bold text-2xl leading-none"
                                title="Dismiss"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                )}

                {!isRunning ? (
                    <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-200/60 p-10 backdrop-blur-xl transform hover:scale-[1.005] transition-all duration-500">
                        {/* Card Header */}
                        <div className="flex items-center gap-4 mb-10 pb-6 border-b-2 border-slate-100">
                            <div className="w-14 h-14 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold text-slate-800">Configure Test</h2>
                                <p className="text-slate-500 font-medium">Fine-tune your performance simulation</p>
                            </div>
                        </div>

                        {/* Info Box */}
                        <div className="mb-8 p-6 bg-gradient-to-br from-violet-50 to-fuchsia-50 border-2 border-violet-100 rounded-2xl shadow-inner">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md shadow-violet-500/20">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-violet-900 mb-1">⚡ Dynamic Traffic Control</h4>
                                    <p className="text-violet-800/80 text-sm leading-relaxed font-medium">
                                        The system will automatically targets{' '}
                                        <span className="bg-violet-200/50 px-2 py-0.5 rounded-full font-bold text-violet-900 mx-1">
                                            {Math.floor(config.totalRequests / config.durationSeconds)} req/sec
                                        </span>{' '}
                                        to reach <span className="font-bold">{config.totalRequests}</span> requests within <span className="font-bold">{config.durationSeconds}s</span>.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Select Application */}
                        <div className="mb-10">
                            <label className="flex items-center gap-3 text-base font-bold text-slate-700 mb-4 ml-1">
                                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                </div>
                                Target Application
                            </label>
                            <select
                                value={config.containerId || ''}
                                onChange={(e) => setConfig({ ...config, containerId: parseInt(e.target.value) })}
                                className="w-full px-6 py-4 text-lg border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all bg-white hover:border-slate-300 font-bold shadow-sm appearance-none cursor-pointer"
                                style={{
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'right 1.5rem center',
                                    backgroundSize: '1.5rem'
                                }}
                            >
                                <option value="">Choose a running container...</option>
                                {containers.map(c => (
                                    <option key={c.id} value={c.id}>
                                        🚀 {c.name} ({c.localhost_url || `localhost:${c.port}`})
                                    </option>
                                ))}
                            </select>
                            {errors.container && <p className="text-red-500 text-sm mt-3 flex items-center gap-2 font-bold px-4 py-2 bg-red-50 rounded-xl border border-red-100 animate-shake">
                                <span>⚠️</span> {errors.container}
                            </p>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                            {/* Number of Requests */}
                            <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
                                <label className="flex items-center gap-3 text-base font-bold text-slate-700 mb-6 ml-1">
                                    <div className="w-8 h-8 bg-fuchsia-100 rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-fuchsia-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                        </svg>
                                    </div>
                                    Total Requests
                                </label>
                                <div className="space-y-6">
                                    <div className="flex justify-center">
                                        <input
                                            type="number"
                                            min="1"
                                            max="1000"
                                            value={config.totalRequests}
                                            onChange={(e) => setConfig({ ...config, totalRequests: Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)) })}
                                            className="w-full px-6 py-4 text-3xl font-black border-2 border-fuchsia-100 rounded-2xl focus:ring-4 focus:ring-fuchsia-500/20 focus:border-fuchsia-500 transition-all bg-white text-center shadow-lg text-fuchsia-700"
                                        />
                                    </div>
                                    <div className="px-2">
                                        <input
                                            type="range"
                                            min="1"
                                            max="1000"
                                            step="10"
                                            value={config.totalRequests}
                                            onChange={(e) => setConfig({ ...config, totalRequests: parseInt(e.target.value) })}
                                            className="w-full h-3 rounded-full cursor-pointer appearance-none bg-slate-200"
                                            style={{
                                                background: `linear-gradient(to right, #d946ef 0%, #d946ef ${(config.totalRequests / 1000) * 100}%, #e2e8f0 ${(config.totalRequests / 1000) * 100}%, #e2e8f0 100%)`
                                            }}
                                        />
                                        <div className="flex justify-between mt-3 text-xs font-black text-slate-400 tracking-wider">
                                            <span>MIN: 1</span>
                                            <span>MAX: 1000</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Concurrency Level */}
                            <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
                                <label className="flex items-center gap-3 text-base font-bold text-slate-700 mb-6 ml-1">
                                    <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                    Concurrency
                                </label>
                                <div className="space-y-6">
                                    <div className="flex justify-center">
                                        <input
                                            type="number"
                                            min="1"
                                            max="50"
                                            value={config.concurrency}
                                            onChange={(e) => setConfig({ ...config, concurrency: Math.max(1, Math.min(50, parseInt(e.target.value) || 1)) })}
                                            className="w-full px-6 py-4 text-3xl font-black border-2 border-cyan-100 rounded-2xl focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all bg-white text-center shadow-lg text-cyan-700"
                                        />
                                    </div>
                                    <div className="px-2">
                                        <input
                                            type="range"
                                            min="1"
                                            max="50"
                                            value={config.concurrency}
                                            onChange={(e) => setConfig({ ...config, concurrency: parseInt(e.target.value) })}
                                            className="w-full h-3 rounded-full cursor-pointer appearance-none bg-slate-200"
                                            style={{
                                                background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${(config.concurrency / 50) * 100}%, #e2e8f0 ${(config.concurrency / 50) * 100}%, #e2e8f0 100%)`
                                            }}
                                        />
                                        <div className="flex justify-between mt-3 text-xs font-black text-slate-400 tracking-wider">
                                            <span>MIN: 1</span>
                                            <span>MAX: 50</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Test Duration */}
                        <div className="mb-12 bg-amber-50/30 p-8 rounded-[2rem] border-2 border-amber-100/50">
                            <label className="flex items-center gap-3 text-base font-bold text-slate-700 mb-6 ml-1">
                                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                Test Duration
                            </label>
                            <div className="flex flex-col md:flex-row gap-8 items-center">
                                <div className="w-full md:w-48 text-center bg-white p-4 rounded-2xl shadow-md border border-amber-50">
                                    <div className="text-4xl font-black text-amber-600">{config.durationSeconds}s</div>
                                    <div className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Seconds</div>
                                </div>
                                <div className="flex-1 w-full px-2">
                                    <input
                                        type="range"
                                        min="10"
                                        max="300"
                                        value={config.durationSeconds}
                                        onChange={(e) => setConfig({ ...config, durationSeconds: parseInt(e.target.value) })}
                                        className="w-full h-4 rounded-full cursor-pointer appearance-none bg-slate-200"
                                        style={{
                                            background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${(config.durationSeconds / 300) * 100}%, #e2e8f0 ${(config.durationSeconds / 300) * 100}%, #e2e8f0 100%)`
                                        }}
                                    />
                                    <div className="flex justify-between mt-4 text-sm font-black text-amber-700/60 tracking-wider">
                                        <span>10s</span>
                                        <span>{Math.floor(config.durationSeconds / 60)}m {config.durationSeconds % 60}s</span>
                                        <span>300s</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Start Button */}
                        <button
                            onClick={startLoadTest}
                            disabled={!config.containerId}
                            className="w-full group relative overflow-hidden bg-slate-900 text-white py-6 px-10 rounded-[2rem] font-black text-2xl shadow-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 opacity-100 group-hover:scale-110 transition-transform duration-500" />
                            <div className="relative flex items-center justify-center gap-4">
                                <span className="animate-bounce-horizontal">🚀</span>
                                <span>Initialize Stress Test</span>
                                <svg className="w-8 h-8 group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </div>
                        </button>
                    </div>
                ) : (
                    <div className="space-y-10 animate-fade-in">
                        {/* Status Header */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/60 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/40 shadow-xl">
                            <div className="flex items-center gap-5">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-500 ${isRunning ? 'bg-violet-600 animate-pulse' : 'bg-emerald-500'}`}>
                                    {isRunning ? (
                                        <svg className="w-10 h-10 text-white animate-spin-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    ) : (
                                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                                        {isRunning ? 'Load Sequence Active' : 'Sequence Analysis Complete'}
                                    </h2>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${isRunning ? 'bg-violet-100 text-violet-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                            {isRunning ? 'Stress Test' : 'Diagnostic Complete'}
                                        </span>
                                        {currentTest && (
                                            <span className="text-slate-400 font-bold text-sm tracking-wide flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                                {currentTest.requests_completed} / {config.totalRequests} REQS
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {!isRunning && (
                                <button
                                    onClick={() => {
                                        setIsRunning(false)
                                        setCurrentTest(null)
                                        setLiveMetrics([])
                                    }}
                                    className="px-8 py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black tracking-wide transition-all hover:scale-105 active:scale-95 shadow-xl"
                                >
                                    New Benchmark
                                </button>
                            )}
                        </div>

                        {/* Progress Visualization */}
                        <div className="bg-white/40 backdrop-blur-md p-2 rounded-full border border-white/60 shadow-inner overflow-hidden relative">
                            <div
                                className="h-6 rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 transition-all duration-1000 relative group overflow-hidden"
                                style={{ width: `${currentTest?.progress_percent || 0}%` }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Live Metric Cards */}
                            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white/60 shadow-xl hover:translate-y-[-4px] transition-all duration-300">
                                <div className="p-3 bg-violet-100 rounded-2xl w-fit mb-6 shadow-sm">
                                    <svg className="w-8 h-8 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">CPU Stress</div>
                                <div className="text-5xl font-black text-slate-800 tabular-nums">
                                    {(liveMetrics[liveMetrics.length - 1]?.cpu || 0).toFixed(1)}
                                    <span className="text-2xl text-slate-400 ml-1">%</span>
                                </div>
                            </div>

                            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white/60 shadow-xl hover:translate-y-[-4px] transition-all duration-300">
                                <div className="p-3 bg-fuchsia-100 rounded-2xl w-fit mb-6 shadow-sm">
                                    <svg className="w-8 h-8 text-fuchsia-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Memory Allocation</div>
                                <div className="text-5xl font-black text-slate-800 tabular-nums">
                                    {(liveMetrics[liveMetrics.length - 1]?.memory || 0).toFixed(0)}
                                    <span className="text-2xl text-slate-400 ml-1">MB</span>
                                </div>
                            </div>

                            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white/60 shadow-xl hover:translate-y-[-4px] transition-all duration-300">
                                <div className="p-3 bg-emerald-100 rounded-2xl w-fit mb-6 shadow-sm">
                                    <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Success Flow</div>
                                <div className="text-5xl font-black text-emerald-600 tabular-nums">
                                    {currentTest?.requests_completed || 0}
                                    <span className="text-2xl text-slate-300 ml-2">/</span>
                                    <span className="text-xl text-slate-300">{currentTest?.requests_failed || 0}</span>
                                </div>
                            </div>

                            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white/60 shadow-xl hover:translate-y-[-4px] transition-all duration-300">
                                <div className="p-3 bg-amber-100 rounded-2xl w-fit mb-6 shadow-sm">
                                    <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Concurrency</div>
                                <div className="text-5xl font-black text-slate-800 tabular-nums">
                                    {liveMetrics[liveMetrics.length - 1]?.active || 0}
                                    <span className="text-xl text-slate-400 ml-1">WORKERS</span>
                                </div>
                            </div>
                        </div>

                        {/* Advanced Visuals */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                            {/* Performance Over Time */}
                            <div className="lg:col-span-8 bg-white/60 backdrop-blur-xl p-10 rounded-[3rem] border border-white/40 shadow-2xl">
                                <div className="flex items-center justify-between mb-10">
                                    <div>
                                        <h4 className="text-2xl font-black text-slate-800 mb-1">Live Telemetry</h4>
                                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Real-time throughput metrics</p>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-violet-600"></div>
                                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">CPU LOAD</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-fuchsia-500"></div>
                                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">MEM USAGE</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-[400px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={liveMetrics}>
                                            <defs>
                                                <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#d946ef" stopOpacity={0.15} />
                                                    <stop offset="95%" stopColor="#d946ef" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="timestamp" hide />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 900 }} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                            />
                                            <Area type="monotone" dataKey="cpu" stroke="#7c3aed" strokeWidth={4} fillOpacity={1} fill="url(#colorCpu)" animationDuration={1000} />
                                            <Area type="monotone" dataKey="memory" stroke="#d946ef" strokeWidth={4} fillOpacity={1} fill="url(#colorMem)" animationDuration={1000} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Detailed Analytics Summary */}
                            <div className="lg:col-span-4 bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-48 h-48 bg-violet-600/10 blur-[80px] rounded-full -mr-24 -mt-24 group-hover:bg-violet-600/20 transition-all duration-1000" />

                                <h4 className="text-xl font-black mb-10 flex items-center gap-3">
                                    <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">📈</div>
                                    Analysis Data
                                </h4>

                                <div className="space-y-6">
                                    <div className="p-6 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Avg Response</div>
                                        <div className="text-3xl font-black">
                                            {(currentTest?.avg_response_time_ms || 0).toFixed(0)}
                                            <span className="text-sm text-slate-500 ml-1 underline decoration-violet-500 decoration-2 underline-offset-4">MS</span>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">System Utilization</div>
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <div className="text-xl font-black">{(currentTest?.peak_cpu_percent || 0).toFixed(1)}%</div>
                                                <div className="text-[8px] font-black text-slate-600 uppercase mt-1">CPU peak</div>
                                            </div>
                                            <div className="w-px h-8 bg-white/10 mt-1"></div>
                                            <div className="flex-1">
                                                <div className="text-xl font-black">{(currentTest?.peak_memory_mb || 0).toFixed(0)}</div>
                                                <div className="text-[8px] font-black text-slate-600 uppercase mt-1">MEM peak</div>
                                            </div>
                                        </div>
                                    </div>

                                    {!isRunning && (
                                        <div className="pt-6">
                                            <div className="p-6 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-3xl shadow-lg transform transition-transform hover:scale-[1.03]">
                                                <div className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Diagnostic Report</div>
                                                <div className="text-lg font-black leading-tight">Sequence Analyzed Successfully</div>
                                                <div className="flex items-center gap-2 mt-4 text-[10px] font-black text-white/80">
                                                    <span>VIEW FULL REPORT</span>
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
