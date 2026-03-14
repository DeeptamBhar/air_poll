import React from 'react';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import { BrainCircuit, Focus } from 'lucide-react';

// Custom Map Marker using HTML to match our dark theme aesthetic
const createCustomIcon = () => {
    return L.divIcon({
        className: 'custom-map-marker',
        html: `
      <div class="relative w-8 h-8 flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
        <div class="absolute w-full h-full bg-indigo-500 rounded-full animate-ping opacity-30"></div>
        <div class="w-3 h-3 bg-indigo-400 rounded-full shadow-[0_0_15px_rgba(129,140,248,1)]"></div>
      </div>
    `,
        iconSize: [32, 32],
        iconAnchor: [16, 16], // Point to exact center
    });
};

// Component to handle clicks on the map to update coordinates
const MapClickEventHandler = ({ setLocation }) => {
    useMapEvents({
        click(e) {
            setLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
        },
    });
    return null;
};

// Component to programmatically center map when coordinates change externally
const MapUpdater = ({ center }) => {
    const map = useMap();
    React.useEffect(() => {
        map.flyTo(center, map.getZoom(), { duration: 1.5 });
    }, [center, map]);
    return null;
};

const MapView = ({ location, setLocation, time }) => {
    const customIcon = React.useMemo(() => createCustomIcon(), []);

    // Format coordinates for display
    const latStr = location.lat.toFixed(4) + (location.lat >= 0 ? '° N' : '° S');
    const lngStr = location.lng.toFixed(4) + (location.lng >= 0 ? '° E' : '° W');

    return (
        <div className="flex-1 relative overflow-hidden bg-slate-950 z-0 map-wrapper">

            {/* React Leaflet Map */}
            <MapContainer
                center={[location.lat, location.lng]}
                zoom={11}
                style={{ height: '100%', width: '100%', background: '#020617' }}
                zoomControl={false} // We will add custom controls or omit them for clean look
            >
                <MapClickEventHandler setLocation={setLocation} />
                <MapUpdater center={[location.lat, location.lng]} />

                {/* Map tile layer switcher: Dark, Bright, Satellite */}
                <LayersControl position="topleft">
                    <LayersControl.BaseLayer checked name="Dark Grid (AEOLUS)">
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            opacity={0.85}
                        />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Bright Streets">
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Satellite Imagery">
                        <TileLayer
                            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        />
                    </LayersControl.BaseLayer>

                    {/* Overlay: Place names & roads labels for satellite view */}
                    <LayersControl.Overlay checked name="Place Names & Labels">
                        <TileLayer
                            attribution='Labels &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong)'
                            url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                            opacity={0.9}
                        />
                    </LayersControl.Overlay>

                    {/* Overlay: WAQI Live AQI Heatmap */}
                    <LayersControl.Overlay checked name="🌍 Live AQI Heatmap (WAQI)">
                        <TileLayer
                            attribution='Air Quality Tiles &copy; <a href="https://waqi.info">WAQI</a>'
                            url={`https://tiles.waqi.info/tiles/usepa-aqi/{z}/{x}/{y}.png?token=${import.meta.env.VITE_WAQI_TOKEN}`}
                            opacity={0.65}
                        />
                    </LayersControl.Overlay>

                    {/* Overlay: WAQI Station Dots */}
                    <LayersControl.Overlay checked name="📍 AQI Monitoring Stations">
                        <TileLayer
                            attribution='Air Quality Tiles &copy; <a href="https://waqi.info">WAQI</a>'
                            url={`https://tiles.waqi.info/tiles/station/{z}/{x}/{y}.png?token=${import.meta.env.VITE_WAQI_TOKEN}`}
                            opacity={0.9}
                        />
                    </LayersControl.Overlay>
                </LayersControl>

                {/* Selected Location Marker */}
                <Marker position={[location.lat, location.lng]} icon={customIcon}>
                    <Popup className="tech-popup">
                        <div className="bg-slate-900 border border-slate-700 p-2 rounded text-center">
                            <div className="text-[12px] font-mono font-bold text-slate-200">Target Coordinates</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-1">{latStr}, {lngStr}</div>
                        </div>
                    </Popup>
                </Marker>
            </MapContainer>

            {/* Floating Gemini Analysis Card */}
            <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 100 }}
                className="absolute top-6 right-6 w-80 glass-panel rounded-2xl p-5 z-[500] pointer-events-auto"
            >
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-gradient-to-tr from-purple-500 to-blue-500 rounded flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <BrainCircuit className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-200 tracking-tight">GEMINI AI INSIGHT</h4>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed font-light">
                    "Deep Downscaler active for <span className="text-indigo-400 font-medium">{latStr}, {lngStr}</span> at {new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}."
                </p>
                <div className="mt-4 pt-3 border-t border-slate-700/50 flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-mono">Micro-Residual: +14.2 AQI</span>
                    <button className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors">VIEW DETAILS &rarr;</button>
                </div>
            </motion.div>

            {/* Health Risk Zones Legend */}
            <div className="absolute bottom-6 right-6 glass-panel rounded-xl p-4 z-[500] flex flex-col gap-3 pointer-events-none">
                <h5 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Health Risk Zones</h5>
                <div className="flex items-center gap-5">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                        <span className="text-[10px] font-medium text-slate-400">Safe</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]"></span>
                        <span className="text-[10px] font-medium text-slate-400">Sensitive</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]"></span>
                        <span className="text-[10px] font-medium text-slate-400">Unhealthy</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.8)]"></span>
                        <span className="text-[10px] font-medium text-slate-400">Hazardous</span>
                    </div>
                </div>
            </div>

            {/* Crosshair Overlay Helper */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[400] opacity-30">
                <Focus className="w-8 h-8 text-slate-500" />
            </div>

        </div>
    );
};

export default MapView;
