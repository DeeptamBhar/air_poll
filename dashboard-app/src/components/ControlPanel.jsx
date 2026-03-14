import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LocateFixed, Clock, Navigation } from 'lucide-react';

const ControlPanel = ({ location, setLocation, time, setTime }) => {
    // Local state for inputs before applying
    const [latInput, setLatInput] = useState(location.lat.toFixed(4));
    const [lngInput, setLngInput] = useState(location.lng.toFixed(4));

    // Keep local state in sync when map is clicked (props update)
    React.useEffect(() => {
        setLatInput(location.lat.toFixed(4));
        setLngInput(location.lng.toFixed(4));
    }, [location.lat, location.lng]);

    const handleApply = () => {
        const lat = parseFloat(latInput);
        const lng = parseFloat(lngInput);
        if (!isNaN(lat) && !isNaN(lng)) {
            setLocation({ lat, lng });
        }
    };

    const handleTimeChange = (e) => {
        setTime(e.target.value);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute top-6 left-[45%] -translate-x-1/2 z-[500] flex gap-4 pointer-events-auto"
        >
            <div className="glass-panel rounded-xl p-3 flex items-center gap-4 bg-slate-900/80 backdrop-blur-xl border-slate-700/80 shadow-2xl">

                {/* Coordinates Input */}
                <div className="flex items-center gap-3 border-r border-slate-700/80 pr-4">
                    <LocateFixed className="w-4 h-4 text-indigo-400" />
                    <div className="flex flex-col">
                        <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-0.5">Latitude</span>
                        <input
                            type="text"
                            value={latInput}
                            onChange={(e) => setLatInput(e.target.value)}
                            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono w-24 focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-0.5">Longitude</span>
                        <input
                            type="text"
                            value={lngInput}
                            onChange={(e) => setLngInput(e.target.value)}
                            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono w-24 focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                    </div>
                </div>

                {/* Time Input */}
                <div className="flex items-center gap-3 border-r border-slate-700/80 pr-4">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <div className="flex flex-col">
                        <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-0.5">Target Time</span>
                        <input
                            type="datetime-local"
                            value={time}
                            onChange={handleTimeChange}
                            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 w-[160px] focus:outline-none focus:border-emerald-500 transition-colors custom-datetime"
                        />
                    </div>
                </div>

                {/* Apply Button */}
                <button
                    onClick={handleApply}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-lg hover:shadow-indigo-500/25 active:scale-95"
                >
                    <Navigation className="w-3.5 h-3.5" />
                    FETCH DATA
                </button>

            </div>
        </motion.div>
    );
};

export default ControlPanel;
