import React, { useState, useRef, useEffect } from 'react';
import { Send, Wind, User, ChevronDown, Activity, MapPin, Flame, Building2, X } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { sendChatMessage } from '../lib/api';

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#6366f1'];

export default function AeolusChatPanel({ onClose }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef(null);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    async function send(question) {
        const q = (question ?? input).trim();
        if (!q || loading) return;

        setInput('');
        setMessages((m) => [...m, { role: 'user', content: q }]);
        setLoading(true);

        try {
            const response = await sendChatMessage(q);
            setMessages((m) => [...m, response]);
        } catch (error) {
            setMessages((m) => [...m, {
                role: 'assistant',
                content: 'I lost connection to the environmental database. Please ensure the backend is running on port 8000.'
            }]);
        } finally {
            setLoading(false);
        }
    }

    const renderChart = (charts) => {
        if (!charts || charts.length === 0) return null;

        return (
            <div className="flex flex-col gap-4 mt-4">
                {charts.map((chartData, idx) => (
                    <div key={idx} className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm text-slate-800">
                        <h4 className="text-xs font-semibold text-slate-500 mb-4 uppercase tracking-wider">{chartData.title}</h4>
                        <div className="h-56 w-full">

                            {chartData.type === 'pie' ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={chartData.data} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value">
                                            {chartData.data.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <ChartTooltip />
                                    </PieChart>
                                </ResponsiveContainer>

                            ) : chartData.type === 'bar' ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData.data}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                        <ChartTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                        <Bar dataKey="PM2.5" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                        <Bar dataKey="Construction" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                        <Bar dataKey="Fires" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>

                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData.data}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                        <ChartTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}

                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full w-full bg-[#fafafa] font-sans">
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg"><Wind size={20} className="text-blue-500" /></div>
                    <div>
                        <h1 className="font-bold text-slate-800 text-lg leading-tight">AEOLUS</h1>
                        <p className="text-xs text-slate-500 font-medium">Hyper-Local Environmental Intelligence</p>
                    </div>
                </div>
                {onClose && (
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                        <X size={20} />
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
                        <Activity size={48} className="text-slate-200 mb-4" />
                        <h3 className="text-lg font-semibold text-slate-700 mb-2">Understand your air.</h3>
                        <p className="text-sm text-slate-500 mb-8">Ask about the air quality anywhere. I will analyze satellite data, local construction, and weather patterns to explain exactly what is going on.</p>

                        <div className="grid grid-cols-1 gap-2 w-full">
                            {[
                                { icon: MapPin, text: "Why is the air bad in Bengaluru today?" },
                                { icon: Flame, text: "Are there crop fires affecting Delhi?" },
                                { icon: Building2, text: "Show me a pollution trend chart for Mumbai." }
                            ].map((suggestion, i) => (
                                <button key={i} onClick={() => send(suggestion.text)} className="flex items-center gap-3 p-3 text-sm text-left bg-white border hover:border-blue-300 hover:shadow-md rounded-xl transition-all text-slate-600">
                                    <suggestion.icon size={16} className="text-blue-400" />
                                    {suggestion.text}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                        {msg.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center shrink-0 shadow-sm mt-1">
                                <Wind size={16} className="text-white" />
                            </div>
                        )}

                        <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-slate-800 text-white' : 'bg-transparent text-slate-800'}`}>
                            {msg.role === 'user' ? (
                                <div className="px-5 py-3 rounded-2xl rounded-tr-sm text-[15px] leading-relaxed">
                                    {msg.content}
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {msg.agentSteps && msg.agentSteps.length > 0 && (
                                        <details className="group">
                                            <summary className="flex items-center gap-2 text-xs font-medium text-slate-400 cursor-pointer hover:text-slate-600 transition-colors list-none">
                                                <ChevronDown size={14} className="group-open:rotate-180 transition-transform" />
                                                View analysis steps ({msg.agentSteps.length})
                                            </summary>
                                            <div className="mt-2 pl-6 border-l-2 border-slate-200 space-y-1.5">
                                                {msg.agentSteps.map((step, idx) => (
                                                    <div key={idx} className="text-xs text-slate-500 font-mono">{step}</div>
                                                ))}
                                            </div>
                                        </details>
                                    )}

                                    <div className="text-[15px] leading-relaxed mt-1 whitespace-pre-wrap">
                                        {msg.content}
                                    </div>
                                    {renderChart(msg.chartData)}
                                </div>
                            )}
                        </div>

                        {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mt-1">
                                <User size={16} className="text-slate-500" />
                            </div>
                        )}
                    </div>
                ))}

                {loading && (
                    <div className="flex gap-4 animate-fade-in">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center shrink-0 shadow-sm opacity-50">
                            <Wind size={16} className="text-white" />
                        </div>
                        <div className="flex gap-2 items-center text-sm font-medium text-blue-600 bg-blue-50 px-4 py-2 rounded-full w-fit">
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            Analyzing satellite and local data...
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            <div className="p-4 bg-white border-t">
                <form onSubmit={(e) => { e.preventDefault(); send(); }} className="relative flex items-center">
                    <input
                        className="w-full bg-slate-100 border-transparent rounded-2xl pl-5 pr-14 py-4 text-[15px] focus:bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-50 transition-all outline-none text-slate-800"
                        placeholder="Ask AEOLUS about a location..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || loading}
                        className="absolute right-2 p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        <Send size={18} className="ml-0.5" />
                    </button>
                </form>
            </div>
        </div>
    );
}
