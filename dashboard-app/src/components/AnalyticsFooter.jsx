import React, { useState, useEffect } from 'react';
import {
    ComposedChart, Line, Area,
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine,
} from 'recharts';
import Papa from 'papaparse';

// ─── Fallback mock data (shown until real CSV loads) ─────────────────────────
const MOCK_FORECAST = [
    { time: 'T+0h', actual: 155, predicted: 158 },
    { time: 'T+12h', actual: 162, predicted: 170 },
    { time: 'T+24h', actual: 185, predicted: 181 },
    { time: 'T+36h', actual: 210, predicted: 217 },
    { time: 'T+48h', actual: 245, predicted: 239 },
    { time: 'T+60h', actual: 190, predicted: 195 },
    { time: 'T+72h', actual: 165, predicted: 160 },
];


// ─── Parse CSV rows into chart points, filtered to nearby lat/lng (DEPRECATED) ─

// ─── Tooltip ─────────────────────────────────────────────────────────────────
const ForecastTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-slate-900 border border-slate-700/80 p-3 rounded-lg shadow-xl text-xs">
            <p className="text-slate-400 font-mono mb-2">{String(label).substring(0, 22)}</p>
            {payload.map(p => (
                <p key={p.dataKey} style={{ color: p.color }} className="font-bold">
                    {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
                </p>
            ))}
        </div>
    );
};


// ─── Component ───────────────────────────────────────────────────────────────
const AnalyticsFooter = ({ location }) => {
    const [chartData, setChartData] = useState(MOCK_FORECAST);
    const [loadStatus, setLoadStatus] = useState('idle'); // 'idle' | 'loading' | 'ok' | 'error'

    // Fetch projection series dynamically from ML backend
    useEffect(() => {
        const lat = location?.lat ?? 12.9716;
        const lng = location?.lng ?? 77.5946;

        setLoadStatus('loading');
        fetch(`http://127.0.0.1:8000/predict_pm_series?lat=${lat}&lon=${lng}`)
            .then(res => {
                if (!res.ok) throw new Error('API failed');
                return res.json();
            })
            .then(data => {
                if (data && data.length > 0) {
                    setChartData(data);
                    setLoadStatus('ok');
                } else {
                    setLoadStatus('error');
                }
            })
            .catch(err => {
                console.error("Chart fetch err:", err);
                setLoadStatus('error');
            });
    }, [location]);

    const isRealData = loadStatus === 'ok';

    return (
        <footer className="h-72 border-t border-slate-800 bg-slate-950/80 backdrop-blur-xl p-6 flex gap-10 shrink-0 z-20">

            {/* ── Forecast Chart ────────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                            {isRealData ? 'Actual vs Predicted PM2.5 (14-Month Context)' : '72-Hour AQI Predictive Forecast'}
                        </h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                            {isRealData
                                ? `CatBoost V2 Temporal Projection${location ? ` · near (${location.lat.toFixed(3)}, ${location.lng.toFixed(3)})` : ''}`
                                : loadStatus === 'error'
                                    ? '⚠ ML Backend Unreachable'
                                    : 'Loading Predictive Analytics...'}
                        </p>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-4">
                        {isRealData && (
                            <div className="flex items-center gap-1.5">
                                {/* Solid green line swatch */}
                                <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="#34d399" strokeWidth="2.5" /></svg>
                                <span className="text-[10px] uppercase font-semibold text-emerald-400 tracking-wider">Actual</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1.5">
                            {/* Dashed indigo line swatch */}
                            <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="#818cf8" strokeWidth="2.5" strokeDasharray="4 2" /></svg>
                            <span className="text-[10px] uppercase font-semibold text-indigo-400 tracking-wider">Predicted</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            <span className="text-[10px] uppercase font-semibold text-red-400 tracking-wider">Risk (200)</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 w-full min-h-0 relative -ml-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gradPred" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                                {isRealData && (
                                    <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                                    </linearGradient>
                                )}
                            </defs>

                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                            <XAxis
                                dataKey="time"
                                stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} dy={10}
                                tickFormatter={v => String(v).substring(0, 10)}
                            />
                            <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} dx={-10} />
                            <Tooltip content={<ForecastTooltip />} cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '5 5' }} />
                            <ReferenceLine y={200} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5} />

                            {/* 🟣 Predicted — dashed indigo with filled gradient below */}
                            <Area
                                type="monotone"
                                dataKey="predicted"
                                name="Predicted"
                                stroke="#818cf8"
                                strokeWidth={2}
                                strokeDasharray="6 3"
                                fill="url(#gradPred)"
                                dot={false}
                                activeDot={{ r: 5, strokeWidth: 0, fill: '#818cf8' }}
                            />

                            {/* 🟢 Actual — solid emerald green line (only when real data is loaded) */}
                            {isRealData && (
                                <Line
                                    type="monotone"
                                    dataKey="actual"
                                    name="Actual"
                                    stroke="#34d399"
                                    strokeWidth={2.5}
                                    dot={false}
                                    activeDot={{ r: 5, strokeWidth: 0, fill: '#34d399' }}
                                    connectNulls={false}
                                />
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>


        </footer>
    );
};

export default AnalyticsFooter;
