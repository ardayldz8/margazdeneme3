import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Building2, RefreshCw } from 'lucide-react';
import L from 'leaflet';

import { API_URL } from '../config';

// Fix for default marker icon missing in React Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface Dealer {
    id: string;
    title: string;
    city: string;
    district: string;
    latitude: number | null;
    longitude: number | null;
    address: string;
    // Display coordinates (with jitter)
    displayLat?: number;
    displayLon?: number;
}

export function Map() {
    const [dealers, setDealers] = useState<Dealer[]>([]);
    const [loading, setLoading] = useState(true);
    const [geocoding, setGeocoding] = useState(false);

    useEffect(() => {
        fetchDealers();
    }, []);

    const fetchDealers = async () => {
        try {
            const response = await fetch(`${API_URL}/api/dealers`);
            const data: Dealer[] = await response.json();

            // Apply deterministic jitter to separate overlapping markers
            // We use the index or ID to create a consistent offset
            const processedData = data.map((dealer) => {
                if (!dealer.latitude || !dealer.longitude) return dealer;

                // Simple deterministic random-like offset based on ID char codes
                const hash = dealer.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                const angle = (hash % 360) * (Math.PI / 180);
                // Offset radius: approx 100-500 meters (0.001 to 0.005 degrees)
                // We use a larger radius if many dealers are likely at the same spot (district center)
                const radius = 0.002 + ((hash % 10) * 0.0002);

                return {
                    ...dealer,
                    displayLat: dealer.latitude + (Math.sin(angle) * radius),
                    displayLon: dealer.longitude + (Math.cos(angle) * radius)
                };
            });

            setDealers(processedData);
        } catch (error) {
            console.error('Error fetching dealers:', error);
        } finally {
            setLoading(false);
        }
    };

    const triggerGeocoding = async () => {
        setGeocoding(true);
        try {
            await fetch(`${API_URL}/api/dealers/geocode`, { method: 'POST' });
            alert('Konum güncelleme işlemi arka planda başlatıldı. Sayfayı birkaç dakika sonra yenileyin.');
        } catch (error) {
            console.error('Error triggering geocode:', error);
            alert('İşlem başlatılamadı.');
        } finally {
            setGeocoding(false);
        }
    };

    const dealersWithLocation = dealers.filter(d => d.displayLat && d.displayLon);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">Bayi Haritası</h2>
                    <p className="text-sm text-gray-500">
                        Toplam {dealers.length} bayiden {dealersWithLocation.length} tanesi haritada gösteriliyor.
                    </p>
                </div>
                <button
                    onClick={triggerGeocoding}
                    disabled={geocoding}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                >
                    <RefreshCw className={`h-4 w-4 ${geocoding ? 'animate-spin' : ''}`} />
                    Konumları Güncelle
                </button>
            </div>

            <div className="flex-1 rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <MapContainer center={[39.9334, 32.8597]} zoom={6} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {dealersWithLocation.map(dealer => (
                        <Marker
                            key={dealer.id}
                            position={[dealer.displayLat!, dealer.displayLon!]}
                        >
                            <Popup>
                                <div className="p-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Building2 className="h-4 w-4 text-primary-600" />
                                        <h3 className="font-bold text-gray-900">{dealer.title}</h3>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-1">{dealer.city} / {dealer.district}</p>
                                    <p className="text-xs text-gray-500">{dealer.address}</p>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>
        </div>
    );
}
