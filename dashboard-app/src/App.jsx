import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import MapView from './components/MapView';
import AnalyticsFooter from './components/AnalyticsFooter';
import ControlPanel from './components/ControlPanel';

function App() {
  // Default to Bangalore coordinates
  const [location, setLocation] = useState({ lat: 12.9716, lng: 77.5946 });

  // Default to current time, formatted for datetime-local
  const getInitialTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };
  const [time, setTime] = useState(getInitialTime());

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-950 font-sans">
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

      {/* Pass time to AnalyticsFooter so charts can mock data relative to selected time */}
      <AnalyticsFooter time={time} location={location} />
    </div>
  );
}

export default App;
