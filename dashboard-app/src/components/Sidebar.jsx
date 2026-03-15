import React, { useState, useEffect } from 'react';
import { Wind, Droplets, Thermometer, Gauge, Eye, Cloud, Flame, Sparkles, Factory, HardHat, BrainCircuit } from 'lucide-react';
import MetricCard from './MetricCard';

const getDaysUntilDiwali = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // List of upcoming Diwali dates
    const diwaliDates = [
        new Date('2024-10-31'),
        new Date('2025-10-20'),
        new Date('2026-11-08'),
        new Date('2027-10-29'),
        new Date('2028-10-17'),
        new Date('2029-11-05'),
        new Date('2030-10-26')
    ];

    // Find the first Diwali date that is strictly >= today
    let nextDiwali = diwaliDates.find(d => d >= today);
    if (!nextDiwali) nextDiwali = diwaliDates[diwaliDates.length - 1]; // fallback

    const diffTime = nextDiwali - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const Sidebar = ({ location }) => {
    const [metrics, setMetrics] = useState({
        temp: '--', humidity: '--', wind: '--', pressure: '--', clouds: '--', aod: '--', activeFires: '--'
    });
    const [impactZones, setImpactZones] = useState([]);
    const [loadingZones, setLoadingZones] = useState(false);

    // Haversine distance in KM
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    useEffect(() => {
        if (!location) return;

        const fetchMetrics = async () => {
            try {
                // Fetch Weather (Temp, Humidity, Wind, Pressure, Clouds)
                const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lng}&current=temperature_2m,relative_humidity_2m,surface_pressure,cloud_cover,wind_speed_10m`;
                // Fetch AQ (AOD)
                const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${location.lat}&longitude=${location.lng}&current=aerosol_optical_depth`;

                const [resWeather, resAq] = await Promise.all([
                    fetch(weatherUrl).then(r => r.json()),
                    fetch(aqUrl).then(r => r.json())
                ]);

                const currentW = resWeather.current || {};
                const currentAq = resAq.current || {};

                // NASA FIRMS Fetch (Existing code omitted for brevity in thought, but included here clearly)
                let fireCount = '--';
                const firmsKey = import.meta.env.VITE_FIRMS_MAP_KEY;
                if (!firmsKey || firmsKey === 'your_nasa_firms_key_here') {
                    fireCount = 'KEY REQ.';
                } else {
                    const w = location.lng - 0.5;
                    const s = location.lat - 0.5;
                    const e = location.lng + 0.5;
                    const n = location.lat + 0.5;
                    const firmsUrl = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${firmsKey}/VIIRS_SNPP_NRT/${w},${s},${e},${n}/1`;

                    try {
                        const resFirms = await fetch(firmsUrl);
                        if (resFirms.ok) {
                            const csvText = await resFirms.text();
                            const rows = csvText.split('\n').filter(line => line.trim() !== '');
                            fireCount = Math.max(0, rows.length - 1);
                        } else {
                            fireCount = 'ERR';
                        }
                    } catch (err) {
                        fireCount = 'ERR';
                    }
                }

                // AI ML Model Inference Fetch
                let mlPred = '--';
                let mlActive = false;
                try {
                    const mlUrl = `http://127.0.0.1:8000/predict_pm?lat=${location.lat}&lon=${location.lng}`;
                    const resMl = await fetch(mlUrl, { timeout: 3000 });
                    if (resMl.ok) {
                        const mlData = await resMl.json();
                        mlPred = mlData.final_pm25;
                        mlActive = mlData.model_active;
                    }
                } catch (err) {
                    console.warn('ML Backend offline or unreachable.');
                }

                setMetrics({
                    temp: currentW.temperature_2m !== undefined ? Math.round(currentW.temperature_2m) : '--',
                    humidity: currentW.relative_humidity_2m !== undefined ? currentW.relative_humidity_2m : '--',
                    wind: currentW.wind_speed_10m !== undefined ? Math.round(currentW.wind_speed_10m) : '--',
                    pressure: currentW.surface_pressure !== undefined ? Math.round(currentW.surface_pressure) : '--',
                    clouds: currentW.cloud_cover !== undefined ? currentW.cloud_cover : '--',
                    aod: currentAq.aerosol_optical_depth !== undefined ? currentAq.aerosol_optical_depth.toFixed(2) : '--',
                    activeFires: fireCount,
                    mlPrediction: mlPred,
                    mlActive: mlActive
                });
            } catch (err) {
                console.warn('Failed to fetch live meteo data:', err);
            }
        };

        fetchMetrics();
    }, [location.lat, location.lng]);

    // Fetch Local Impact Zones from OpenStreetMap (Overpass API)
    useEffect(() => {
        if (!location) return;

        const fetchZones = async () => {
            setLoadingZones(true);
            try {
                const query = `
                    [out:json][timeout:25];
                    (
                      node["landuse"="industrial"](around:5000,${location.lat},${location.lng});
                      way["landuse"="industrial"](around:5000,${location.lat},${location.lng});
                      node["power"="plant"](around:5000,${location.lat},${location.lng});
                      node["highway"~"motorway|trunk"](around:5000,${location.lat},${location.lng});
                      way["highway"~"motorway|trunk"](around:5000,${location.lat},${location.lng});
                    );
                    out center;
                `;
                const res = await fetch("https://overpass-api.de/api/interpreter", {
                    method: "POST",
                    body: query
                });
                const data = await res.json();

                const processed = data.elements.map(el => {
                    const lat = el.lat || el.center?.lat;
                    const lon = el.lon || el.center?.lon;
                    const dist = calculateDistance(location.lat, location.lng, lat, lon);

                    let name = el.tags.name || el.tags.operator || "Industrial Sector";
                    if (el.tags.highway) name = el.tags.name || "Main Traffic Vein";

                    let type = "Industrial";
                    if (el.tags.power) type = "Power Plant";
                    if (el.tags.highway) type = "Heavy Traffic";

                    return {
                        id: el.id,
                        name,
                        type,
                        distance: dist.toFixed(1),
                        severity: dist < 1.5 ? "HIGH" : "MOD",
                        tag: el.tags.highway ? "Traffic" : "Factory"
                    };
                })
                    .sort((a, b) => a.distance - b.distance)
                    .slice(0, 3);

                setImpactZones(processed);
            } catch (err) {
                console.error("Overpass error:", err);
            } finally {
                setLoadingZones(false);
            }
        };

        fetchZones();
    }, [location.lat, location.lng]);

    // Calculate a simple danger level percentage for the fire bar
    const firePct = typeof metrics.activeFires === 'number' ? Math.min(100, (metrics.activeFires / 20) * 100) : 0;

    return (
        <aside className="w-80 h-full border-r border-slate-800 flex flex-col overflow-y-auto bg-slate-950/90 backdrop-blur-xl scrollbar-hide shrink-0 z-20 relative shadow-2xl">

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
                    <MetricCard icon={Wind} title="WIND" value={metrics.wind} unit="km/h" subtitle="Current Speed" colorClass="bg-sky-400" delay={0.1} />
                    <MetricCard icon={Droplets} title="HUMIDITY" value={metrics.humidity} unit="%" subtitle="Relative" colorClass="bg-indigo-400" delay={0.15} />
                    <MetricCard icon={Thermometer} title="TEMP" value={metrics.temp} unit="°C" subtitle="2m Surface" colorClass="bg-rose-400" delay={0.2} />
                    <MetricCard icon={Gauge} title="PRESSURE" value={metrics.pressure} unit="hPa" subtitle="Surface Level" colorClass="bg-emerald-400" delay={0.25} />
                    <MetricCard icon={Eye} title="AOD" value={metrics.aod} unit="τ" subtitle="Aerosol Opt. Depth" colorClass="bg-amber-400" delay={0.3} />
                    <MetricCard icon={Cloud} title="CLOUDS" value={metrics.clouds} unit="%" subtitle="Cloud Cover" colorClass="bg-slate-300" delay={0.35} />
                </div>
            </section>

            {/* Layer 2: NASA FIRMS & Festival Indicator */}
            <section className="p-5 border-b border-slate-800 flex flex-col gap-4">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Event Triggers</h3>

                {/* NASA FIRMS */}
                <div className="group cursor-pointer bg-slate-900/50 p-3 rounded-lg border border-slate-800 hover:border-orange-500/50 transition-colors">
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                            <Flame className={`w-4 h-4 ${metrics.activeFires > 0 ? 'text-orange-500 animate-pulse' : 'text-slate-500'}`} />
                            <span className="text-xs font-semibold text-slate-200">NASA FIRMS Hotspots</span>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 border rounded font-bold tracking-wide
                            ${typeof metrics.activeFires === 'number' && metrics.activeFires > 0 ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}
                        `}>
                            {metrics.activeFires} {typeof metrics.activeFires === 'number' ? 'ACTIVE' : ''}
                        </span>
                    </div>
                    <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden transition-all duration-1000">
                        <div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${firePct}%` }}></div>
                    </div>
                </div>

                {/* AI Model Prediction */}
                <div className="bg-gradient-to-br from-indigo-500/10 to-blue-500/5 p-4 rounded-xl border border-indigo-500/20">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-lg">
                            <BrainCircuit className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-indigo-400">CATBOOST V2</p>
                                {metrics.mlActive ? (
                                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] px-1.5 py-0.5 rounded font-mono">ONLINE</span>
                                ) : (
                                    <span className="bg-slate-800 text-slate-400 border border-slate-700 text-[9px] px-1.5 py-0.5 rounded font-mono">BASELINE</span>
                                )}
                            </div>
                            <p className="text-xl font-bold text-white mt-1">
                                {metrics.mlPrediction} <span className="text-xs text-slate-400 font-normal">PM2.5</span>
                            </p>
                        </div>
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
                            <p className="text-[10px] text-slate-300 mt-1">
                                {getDaysUntilDiwali() === 0 ? "Today! " : `${getDaysUntilDiwali()} days away. `}
                                Predicted impact: <span className="text-red-400 font-bold">+120 AQI</span>
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="p-5 flex-1">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Local Impact Zones (5km)</h3>
                <div className="space-y-4">
                    {loadingZones ? (
                        <p className="text-[10px] text-slate-500 italic animate-pulse">Scanning regional topography...</p>
                    ) : impactZones.length > 0 ? (
                        impactZones.map(zone => (
                            <div key={zone.id} className="flex items-center justify-between group cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center group-hover:bg-slate-700 transition-colors">
                                        {zone.tag === "Traffic" ? (
                                            <HardHat className="w-4 h-4 text-slate-400 group-hover:text-amber-400" />
                                        ) : (
                                            <Factory className="w-4 h-4 text-slate-400 group-hover:text-red-400" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-slate-200 group-hover:text-indigo-400 transition-colors truncate max-w-[120px]">
                                            {zone.name}
                                        </p>
                                        <p className="text-[10px] text-slate-500 italic">
                                            {zone.distance}km • {zone.type}
                                        </p>
                                    </div>
                                </div>
                                <div className={`text-[10px] font-bold px-2 py-0.5 rounded ${zone.severity === "HIGH"
                                    ? "text-red-400 bg-red-950/50 border border-red-900/50"
                                    : "text-slate-400 bg-slate-800"
                                    }`}>
                                    {zone.severity}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-[10px] text-slate-500 italic">No major industrial hazards detected within immediate radius.</p>
                    )}
                </div>
            </section>
        </aside>
    );
};

export default Sidebar;
