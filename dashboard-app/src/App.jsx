import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import MapView from './components/MapView';
import AnalyticsFooter from './components/AnalyticsFooter';
import ControlPanel from './components/ControlPanel';
import AeolusChatPanel from './components/AeolusChatPanel';
import { BotMessageSquare } from 'lucide-react';

function App() {
  // Default to Bangalore coordinates
  const [location, setLocation] = useState({ lat: 12.9716, lng: 77.5946 });

  // Default to today's date, formatted for date input (YYYY-MM-DD)
  const getInitialTime = () => {
    const now = new Date();
    // Adjust for local timezone offset before grabbing the YYYY-MM-DD string
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().split('T')[0];
  };
  const [time, setTime] = useState(getInitialTime());

  // State for chat panel visibility
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-950 font-sans relative">
      <div className="flex-1 flex overflow-hidden">
        {/* Pass location data to Sidebar to display dynamic location if we had geocoding, 
            but for now we just show the static UI with the added map interaction. */}
        <Sidebar location={location} />

        <main className="flex-1 flex flex-col relative z-0">
          <ControlPanel
            location={location}
            setLocation={setLocation}
            time={time}
            setTime={setTime}
          />
          <MapView
            location={location}
            setLocation={setLocation}
            time={time}
          />
        </main>
      </div>

      {/* Floating Chat Button */}
      <button
        onClick={() => setIsChatOpen(true)}
        className="absolute bottom-[320px] right-6 p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg hover:shadow-cyan-500/20 transition-all z-40 group"
      >
        <BotMessageSquare size={24} className="group-hover:scale-110 transition-transform" />
      </button>

      {/* Sliding Chat Panel Overlay */}
      {isChatOpen && (
        <div className="absolute top-0 right-0 h-full w-[450px] shadow-xl z-[1000] animate-in slide-in-from-right duration-300">
          <AeolusChatPanel onClose={() => setIsChatOpen(false)} />
        </div>
      )}

      {/* Pass time to AnalyticsFooter so charts can mock data relative to selected time */}
      <AnalyticsFooter time={time} location={location} />
    </div>
  );
}

export default App;
