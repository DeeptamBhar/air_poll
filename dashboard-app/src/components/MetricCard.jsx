import React from 'react';
import { motion } from 'framer-motion';

const MetricCard = ({ icon: Icon, title, value, unit, subtitle, colorClass, delay = 0 }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: delay }}
            whileHover={{ scale: 1.02 }}
            className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/50 hover:border-slate-500/50 transition-colors backdrop-blur-md relative overflow-hidden group"
        >
            <div className={`absolute top-0 left-0 w-1 h-full ${colorClass} opacity-50 group-hover:opacity-100 transition-opacity`} />
            <div className="flex items-center gap-2 mb-1 pl-2">
                <Icon className={`w-4 h-4 ${colorClass.replace('bg-', 'text-')}`} />
                <span className="text-[10px] text-slate-400 font-medium tracking-wider">{title}</span>
            </div>
            <div className="text-xl font-bold pl-2 text-slate-100">
                {value} <span className="text-xs text-slate-500 font-normal">{unit}</span>
            </div>
            <div className="text-[9px] text-slate-500 italic pl-2 mt-1">{subtitle}</div>
        </motion.div>
    );
};

export default MetricCard;
