import React from 'react';
import { AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

const forecastData = [
    { time: 'T+0h', aqi: 155, threshold: 200 },
    { time: 'T+12h', aqi: 162, threshold: 200 },
    { time: 'T+24h', aqi: 185, threshold: 200 },
    { time: 'T+36h', aqi: 210, threshold: 200 },
    { time: 'T+48h', aqi: 245, threshold: 200 },
    { time: 'T+60h', aqi: 190, threshold: 200 },
    { time: 'T+72h', aqi: 165, threshold: 200 },
];

const factorData = [
    { name: 'Wind Dist.', value: 35, color: '#0ea5e9' },
    { name: 'Fire Spots', value: 25, color: '#f97316' },
    { name: 'AOD', value: 20, color: '#eab308' },
    { name: 'Humidity', value: 12, color: '#6366f1' },
    { name: 'Traffic', value: 8, color: '#64748b' },
];

// Custom Tooltip for Forecast
const CustomForecastTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const isHighRisk = payload[0].value >= 200;
        return (
            <div className="bg-slate-900 border border-slate-700/80 p-3 rounded-lg shadow-xl backdrop-blur-md">
                <p className="text-slate-400 text-xs mb-1 font-mono">{label}</p>
                <p className={`text-xl font-bold ${isHighRisk ? 'text-red-400' : 'text-indigo-400'}`}>
                    AQI: {payload[0].value}
                </p>
            </div>
        );
    }
    return null;
};

// Custom Tooltip for Factors
const CustomFactorTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900 border border-slate-700 p-2 rounded shadow-lg backdrop-blur text-xs text-slate-200">
                <span className="font-semibold">{payload[0].payload.name}:</span> {payload[0].value}% Impact
            </div>
        );
    }
    return null;
};

const AnalyticsFooter = () => {
    return (
        <footer className="h-72 border-t border-slate-800 bg-slate-950/80 backdrop-blur-xl p-6 flex gap-10 shrink-0 z-20">

            {/* 72-Hour Forecast Section */}
            <div className="flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">72-Hour AQI Predictive Forecast</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">Short-term meteorology & satellite pattern fusion</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                            <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">Predicted AQI</span>
                        </div>
                        <div className="flex items-center gap-2 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            <span className="text-[10px] uppercase font-semibold tracking-wider text-red-400">Risk Threshold (200)</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 w-full min-h-0 relative -ml-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={forecastData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorAqi" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.5} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                            <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                            <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} domain={[50, 300]} dx={-10} />
                            <Tooltip content={<CustomForecastTooltip />} cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '5 5' }} />
                            <ReferenceLine y={200} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5} />
                            <Area
                                type="monotone"
                                dataKey="aqi"
                                stroke="#818cf8"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorAqi)"
                                activeDot={{ r: 6, strokeWidth: 0, fill: '#818cf8' }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Factor Influence Section */}
            <div className="w-[350px] flex flex-col border-l border-slate-800/80 pl-10">
                <div className="mb-6">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">Factor Influence Matrix</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Relative impact on current prediction</p>
                </div>
                <div className="flex-1 w-full min-h-0 relative -mb-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            layout="vertical"
                            data={factorData}
                            margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                            barSize={16}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
                            <XAxis type="number" hide domain={[0, 40]} />
                            <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} width={80} />
                            <Tooltip cursor={{ fill: 'rgba(30, 41, 59, 0.5)' }} content={<CustomFactorTooltip />} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                {factorData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

        </footer>
    );
};

export default AnalyticsFooter;
