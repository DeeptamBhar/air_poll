import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

const WAQI_TOKEN = import.meta.env.VITE_WAQI_TOKEN;

/**
 * HeatmapOverlay fetches real AQI station data for the current map bounds
 * from the WAQI API and renders them as a smooth L.heatLayer gradient.
 *
 * Uses a dynamic import to work around Vite's ESM environment where
 * leaflet.heat normally expects to patch a global `L`.
 */
const HeatmapOverlay = () => {
    const map = useMap();
    const heatLayerRef = useRef(null);
    const pluginLoadedRef = useRef(false);

    const fetchAndRender = async () => {
        const bounds = map.getBounds();
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();

        const url = `https://api.waqi.info/map/bounds/?latlng=${sw.lat},${sw.lng},${ne.lat},${ne.lng}&token=${WAQI_TOKEN}`;

        try {
            const res = await fetch(url);
            const json = await res.json();

            if (json.status !== 'ok' || !Array.isArray(json.data)) {
                console.warn('WAQI API error:', json.data || json.status);
                return;
            }

            // Build heatmap points: [lat, lng, intensity 0–1]
            const points = json.data
                .filter(s => s.aqi !== '-' && !isNaN(Number(s.aqi)))
                .map(s => {
                    const aqi = Math.min(Number(s.aqi), 500);
                    const intensity = aqi / 500;
                    return [s.lat, s.lon, intensity];
                });

            if (heatLayerRef.current) {
                map.removeLayer(heatLayerRef.current);
            }

            heatLayerRef.current = L.heatLayer(points, {
                radius: 40,
                blur: 35,
                maxZoom: 14,
                max: 1.0,
                gradient: {
                    0.00: '#00e400', // Good
                    0.10: '#9cbe00',
                    0.20: '#ffff00', // Moderate
                    0.30: '#ff9100', // Sensitive
                    0.40: '#ff4500', // Unhealthy
                    0.60: '#8f3f97', // Very Unhealthy
                    1.00: '#7e0023', // Hazardous
                },
            }).addTo(map);

        } catch (err) {
            console.warn('WAQI heatmap fetch failed:', err);
        }
    };

    useEffect(() => {
        // Ensure leaflet.heat patches L in this Vite ESM context
        // by setting window.L before the dynamic import
        window.L = L;

        import('leaflet.heat').then(() => {
            pluginLoadedRef.current = true;
            fetchAndRender();

            map.on('moveend', fetchAndRender);
        }).catch(err => {
            console.error('Failed to load leaflet.heat:', err);
        });

        return () => {
            map.off('moveend', fetchAndRender);
            if (heatLayerRef.current) {
                map.removeLayer(heatLayerRef.current);
            }
        };
    }, [map]); // eslint-disable-line react-hooks/exhaustive-deps

    return null;
};

export default HeatmapOverlay;
