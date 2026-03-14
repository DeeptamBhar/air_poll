import React from 'react';
import { Wind, Droplets, Thermometer, Gauge, Eye, Cloud, Flame, Sparkles, Factory, HardHat } from 'lucide-react';
import MetricCard from './MetricCard';

const Sidebar = () => {
    return (
        <aside className="w-80 h-full border-r border-slate-800 flex flex-col overflow-y-auto bg-slate-950/90 backdrop-blur-xl scrollbar-hide shrink-0 z-20">

            {/* Header Area */}
            <div className="p-6 border-b border-slate-800">
                <h1 className="text-xl font-bold tracking-tight text-slate-100">Project <span className="text-indigo-400">AEOLUS</span></h1>
                <p className="text-[10px] text-emerald-400 font-mono mt-1 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                    System Operational
                </p>
            </div>

            {/* Layer 1: Weather/AQI Stats */}
            <section className="p-5 border-b border-slate-800">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Core Environmental Metrics</h3>
                <div className="grid grid-cols-2 gap-3">
                    <MetricCard icon={Wind} title="WIND" value="14" unit="km/h" subtitle="North-Easterly" colorClass="bg-sky-400" delay={0.1} />
                    <MetricCard icon={Droplets} title="HUMIDITY" value="62" unit="%" subtitle="Dew: 18°C" colorClass="bg-indigo-400" delay={0.15} />
                    <MetricCard icon={Thermometer} title="TEMP" value="28" unit="°C" subtitle="Feels like 31°C" colorClass="bg-rose-400" delay={0.2} />
                    <MetricCard icon={Gauge} title="PRESSURE" value="1012" unit="hPa" subtitle="Steady" colorClass="bg-emerald-400" delay={0.25} />
                    <MetricCard icon={Eye} title="AOD" value="0.45" unit="τ" subtitle="High Particulates" colorClass="bg-amber-400" delay={0.3} />
                    <MetricCard icon={Cloud} title="CLOUDS" value="20" unit="%" subtitle="Scattered" colorClass="bg-slate-300" delay={0.35} />
                </div>
            </section>

            {/* Layer 2: NASA FIRMS & Festival Indicator */}
            <section className="p-5 border-b border-slate-800 flex flex-col gap-4">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Event Triggers</h3>

                {/* NASA FIRMS */}
                <div className="group cursor-pointer bg-slate-900/50 p-3 rounded-lg border border-slate-800 hover:border-orange-500/50 transition-colors">
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                            <Flame className="w-4 h-4 text-orange-500" />
                            <span className="text-xs font-semibold text-slate-200">NASA FIRMS Hotspots</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded">8 ACTIVE</span>
                    </div>
                    <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500 w-[65%]"></div>
                    </div>
                </div>

                {/* Festival Indicator */}
                <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-4 rounded-xl border border-amber-500/20">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-amber-500/20 rounded-lg">
                            <Sparkles className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-amber-500">DIWALI COUNTDOWN</p>
                            <p className="text-[10px] text-slate-300 mt-1">4 days away. Predicted impact: <span className="text-red-400 font-bold">+120 AQI</span></p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Layer 3: Permanent Polluters */}
            <section className="p-5 flex-1">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Local Impact Zones (5km)</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between group cursor-pointer">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center group-hover:bg-slate-700 transition-colors">
                                <Factory className="w-4 h-4 text-slate-400 group-hover:text-amber-400" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-200 group-hover:text-indigo-400 transition-colors">Peenya Industrial Area</p>
                                <p className="text-[10px] text-slate-500 italic">2.4km • Heavy Manufacturing</p>
                            </div>
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold bg-slate-800 px-2 py-0.5 rounded">MOD</div>
                    </div>

                    <div className="flex items-center justify-between group cursor-pointer">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center group-hover:bg-slate-700 transition-colors">
                                <HardHat className="w-4 h-4 text-slate-400 group-hover:text-red-400" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-200 group-hover:text-indigo-400 transition-colors">Metro Phase 2 Site</p>
                                <p className="text-[10px] text-slate-500 italic">0.8km • Dust/Excavation</p>
                            </div>
                        </div>
                        <div className="text-[10px] text-red-400 font-bold bg-red-950/50 border border-red-900/50 px-2 py-0.5 rounded">HIGH</div>
                    </div>
                </div>
            </section>
        </aside>
    );
};

export default Sidebar;
