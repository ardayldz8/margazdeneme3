import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { ArrowLeft, Fuel, MapPin, Calendar, FileText, Building2, TrendingUp, Clock, AlertCircle, Cpu } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { API_URL } from '../config';
import { useAuthFetch } from '../contexts/AuthContext';

// Fix for default marker icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface DeviceDiagnostics {
    deviceId: string;
    name: string;
    status: string;
    lastSeen: string | null;
    rssi: number | null;
    errStreak: number | null;
    uptimeMin: number | null;
    freeRam: number | null;
    lastErrReason: string | null;
}

interface Dealer {
    id: string;
    licenseNo: string;
    title: string;
    city: string | null;
    district: string | null;
    address: string | null;
    status: string | null;
    startDate: string | null;
    endDate: string | null;
    distributor: string | null;
    taxNo: string | null;
    decisionNo: string | null;
    documentNo: string | null;
    contractStartDate: string | null;
    contractEndDate: string | null;
    latitude: number | null;
    longitude: number | null;
    deviceId: string | null;
    tankLevel: number;
    lastData: string | null;
    deviceDiagnostics: DeviceDiagnostics | null;
}

export function DealerDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const authFetch = useAuthFetch();
    const [dealer, setDealer] = useState<Dealer | null>(null);
    const [loading, setLoading] = useState(true);
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [startInput, setStartInput] = useState('');
    const [endInput, setEndInput] = useState('');

    useEffect(() => {
        const fetchDealer = async () => {
            try {
                const response = await authFetch(`${API_URL}/api/dealers/${id}`);
                if (response.ok) {
                    const data = await response.json();
                    setDealer(data);
                } else {
                    console.error('Dealer not found');
                }
            } catch (error) {
                console.error('Error fetching dealer:', error);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            const now = new Date();
            const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const formatInput = (d: Date) => {
                const pad = (n: number) => String(n).padStart(2, '0');
                return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            };

            const startValue = formatInput(start);
            const endValue = formatInput(now);
            setStartInput(startValue);
            setEndInput(endValue);
            fetchDealer();
            fetchHistory(startValue, endValue);
        }
    }, [id]);

    const fetchHistory = async (start?: string, end?: string) => {
        setLoadingHistory(true);
        try {
            const params = new URLSearchParams();
            if (start && end) {
                params.set('start', new Date(start).toISOString());
                params.set('end', new Date(end).toISOString());
            } else {
                params.set('hours', '24');
            }
            const response = await authFetch(`${API_URL}/api/dealers/${id}/history?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                // Format data for chart
                const formatted = data.map((item: any) => ({
                    time: new Date(item.timestamp).toLocaleString('tr-TR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    level: item.tankLevel
                }));
                setHistoryData(formatted);
            }
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const applyRange = () => {
        if (!startInput || !endInput) return;
        fetchHistory(startInput, endInput);
    };

    const getProgressColor = (level: number) => {
        if (level < 20) return 'bg-red-500';
        if (level < 50) return 'bg-orange-400';
        return 'bg-green-500';
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('tr-TR');
    };

    const formatDateTime = (dateString: string | null) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return '-';
        return date.toLocaleString('tr-TR');
    };

    const formatUptime = (uptimeMin: number | null) => {
        if (uptimeMin === null || uptimeMin === undefined) return '-';
        if (uptimeMin < 60) return `${uptimeMin} dk`;
        const days = Math.floor(uptimeMin / 1440);
        const hours = Math.floor((uptimeMin % 1440) / 60);
        const mins = uptimeMin % 60;
        if (days > 0) return `${days}g ${hours}s ${mins}dk`;
        return `${hours}s ${mins}dk`;
    };

    const getSignalQuality = (rssi: number | null) => {
        if (rssi === null || rssi === undefined) {
            return {
                label: 'Veri yok',
                colorClass: 'bg-gray-100 text-gray-700',
                dotClass: 'bg-gray-400'
            };
        }
        if (rssi >= -85) {
            return {
                label: 'Iyi',
                colorClass: 'bg-green-100 text-green-700',
                dotClass: 'bg-green-500'
            };
        }
        if (rssi >= -100) {
            return {
                label: 'Orta',
                colorClass: 'bg-amber-100 text-amber-700',
                dotClass: 'bg-amber-500'
            };
        }
        return {
            label: 'Zayif',
            colorClass: 'bg-red-100 text-red-700',
            dotClass: 'bg-red-500'
        };
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
            </div>
        );
    }

    if (!dealer) {
        return <div className="text-center p-10">Bayi bulunamadı.</div>;
    }

    return (
        <div className="space-y-6 pb-10 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ArrowLeft className="h-6 w-6 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{dealer.title}</h1>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{dealer.licenseNo}</span>
                            <span>•</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${dealer.status?.includes('Yürürlükte') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                {dealer.status}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="sm:text-right">
                    <div className="text-base sm:text-sm text-gray-500">Son Veri Güncellemesi</div>
                    <div className="font-semibold text-xl sm:text-lg text-gray-900 flex items-start sm:items-center sm:justify-end gap-2 leading-tight break-words mt-1">
                        <Clock className="h-5 w-5 sm:h-4 sm:w-4 mt-0.5 sm:mt-0 shrink-0" />
                        {dealer.lastData ? new Date(dealer.lastData).toLocaleString('tr-TR') : 'Yok'}
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Stats & Chart */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Tank Level Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Fuel className="h-24 w-24 text-primary-600" />
                        </div>
                        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Fuel className="h-5 w-5 text-primary-600" />
                            Tank Doluluk
                        </h2>
                        <div className="flex items-baseline gap-2 mb-4">
                            <span className="text-5xl font-bold text-gray-900">%{dealer.tankLevel}</span>
                            <span className="text-sm text-gray-500">doluluk oranı</span>
                        </div>
                        <div className="relative h-4 w-full bg-gray-100 rounded-full overflow-hidden mb-2">
                            <div
                                className={`absolute top-0 left-0 h-full ${getProgressColor(dealer.tankLevel)} transition-all duration-1000 ease-out`}
                                style={{ width: `${dealer.tankLevel}%` }}
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            {dealer.tankLevel < 20 ? (
                                <span className="flex items-center gap-1 text-red-600 font-medium">
                                    <AlertCircle className="h-3 w-3" />
                                    Kritik seviye! Dolum yapılması önerilir.
                                </span>
                            ) : (
                                'Tank seviyesi normal aralıkta.'
                            )}
                        </p>
                    </div>

                    {/* Chart Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-w-0">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
                            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-primary-600" />
                                Tank Seviyesi Geçmişi
                            </h2>
                            <div className="flex items-center gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <label className="text-xs text-gray-500">Başlangıç</label>
                                    <input
                                        type="datetime-local"
                                        value={startInput}
                                        onChange={(event) => setStartInput(event.target.value)}
                                        className="text-sm border border-gray-200 rounded-md px-2 py-1"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-xs text-gray-500">Bitiş</label>
                                    <input
                                        type="datetime-local"
                                        value={endInput}
                                        onChange={(event) => setEndInput(event.target.value)}
                                        className="text-sm border border-gray-200 rounded-md px-2 py-1"
                                    />
                                </div>
                                <button
                                    onClick={applyRange}
                                    disabled={loadingHistory || !startInput || !endInput}
                                    className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    Uygula
                                </button>
                            </div>
                        </div>
                        {historyData.length === 0 ? (
                            <div className="h-[300px] flex items-center justify-center text-gray-400">
                                Son 24 saat içinde veri yok.
                            </div>
                        ) : (
                            <div className="w-full min-w-0">
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={historyData} margin={{ left: 12, right: 12 }}>
                                        <CartesianGrid
                                            strokeDasharray="0"
                                            vertical={true}
                                            horizontal={true}
                                            stroke="#9ca3af"
                                            strokeWidth={0.5}
                                        />
                                        <XAxis
                                            dataKey="time"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#9ca3af', fontSize: 11 }}
                                            dy={10}
                                            minTickGap={80}
                                            interval="preserveStartEnd"
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                                            domain={[0, 100]}
                                            unit="%"
                                        />
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Line
                                            type="monotone"
                                            dataKey="level"
                                            stroke="#0ea5e9"
                                            strokeWidth={2}
                                            dot={{ fill: '#0ea5e9', r: 2 }}
                                            activeDot={{ r: 5 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    {/* Map Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-[400px] flex flex-col">
                        <div className="flex items-center gap-2 mb-4">
                            <MapPin className="h-5 w-5 text-primary-600" />
                            <h2 className="font-semibold text-gray-900">Konum</h2>
                        </div>
                        <div className="flex-1 rounded-lg overflow-hidden border border-gray-100 relative">
                            {dealer.latitude && dealer.longitude ? (
                                <MapContainer
                                    center={[dealer.latitude, dealer.longitude]}
                                    zoom={15}
                                    style={{ height: '100%', width: '100%' }}
                                >
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    <Marker position={[dealer.latitude, dealer.longitude]}>
                                        <Popup>{dealer.title}</Popup>
                                    </Marker>
                                </MapContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400 gap-2">
                                    <MapPin className="h-8 w-8 opacity-20" />
                                    <span>Konum bilgisi mevcut değil.</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Details */}
                <div className="space-y-6">
                    {/* Device Diagnostics Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
                            <Cpu className="h-5 w-5 text-primary-600" />
                            <h2 className="font-semibold text-gray-900">Cihaz Sagligi</h2>
                        </div>
                        {!dealer.deviceId ? (
                            <p className="text-sm text-gray-500">Bu bayiye bagli cihaz yok.</p>
                        ) : !dealer.deviceDiagnostics ? (
                            <div className="space-y-2 text-sm">
                                <p className="text-gray-700 font-medium">Cihaz ID: <span className="font-mono">{dealer.deviceId}</span></p>
                                <p className="text-gray-500">Diagnostik veri henuz gelmedi.</p>
                            </div>
                        ) : (
                            <div className="space-y-4 text-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-gray-500 text-xs mb-1">Cihaz</p>
                                        <p className="font-medium text-gray-900">{dealer.deviceDiagnostics.name}</p>
                                        <p className="text-xs text-gray-500 font-mono">{dealer.deviceDiagnostics.deviceId}</p>
                                    </div>
                                    {(() => {
                                        const signal = getSignalQuality(dealer.deviceDiagnostics.rssi);
                                        return (
                                            <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium ${signal.colorClass}`}>
                                                <span className={`h-2 w-2 rounded-full ${signal.dotClass}`} />
                                                Sinyal {signal.label}
                                            </span>
                                        );
                                    })()}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                                        <p className="text-xs text-gray-500">RSSI</p>
                                        <p className="font-semibold text-gray-900">
                                            {dealer.deviceDiagnostics.rssi ?? '-'} {dealer.deviceDiagnostics.rssi !== null ? 'dBm' : ''}
                                        </p>
                                    </div>
                                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                                        <p className="text-xs text-gray-500">Cihaz Durumu</p>
                                        <p className="font-semibold text-gray-900">{dealer.deviceDiagnostics.status || '-'}</p>
                                    </div>
                                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                                        <p className="text-xs text-gray-500">Uptime</p>
                                        <p className="font-semibold text-gray-900">{formatUptime(dealer.deviceDiagnostics.uptimeMin)}</p>
                                    </div>
                                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                                        <p className="text-xs text-gray-500">Hata Sayaci</p>
                                        <p className="font-semibold text-gray-900">{dealer.deviceDiagnostics.errStreak ?? '-'}</p>
                                    </div>
                                    <div className="rounded-lg bg-gray-50 px-3 py-2 col-span-2">
                                        <p className="text-xs text-gray-500">Son Hata Nedeni</p>
                                        <p className="font-semibold text-gray-900">{dealer.deviceDiagnostics.lastErrReason || '-'}</p>
                                    </div>
                                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                                        <p className="text-xs text-gray-500">Free RAM</p>
                                        <p className="font-semibold text-gray-900">
                                            {dealer.deviceDiagnostics.freeRam ?? '-'} {dealer.deviceDiagnostics.freeRam !== null ? 'byte' : ''}
                                        </p>
                                    </div>
                                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                                        <p className="text-xs text-gray-500">Son Gorulme</p>
                                        <p className="font-semibold text-gray-900">{formatDateTime(dealer.deviceDiagnostics.lastSeen)}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Info Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
                            <Building2 className="h-5 w-5 text-primary-600" />
                            <h2 className="font-semibold text-gray-900">Bayi Bilgileri</h2>
                        </div>
                        <div className="space-y-5 text-sm">
                            <div>
                                <span className="block text-gray-500 text-xs mb-1">Adres</span>
                                <span className="font-medium text-gray-900 block leading-relaxed">{dealer.address || '-'}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="block text-gray-500 text-xs mb-1">İl</span>
                                    <span className="font-medium text-gray-900">{dealer.city || '-'}</span>
                                </div>
                                <div>
                                    <span className="block text-gray-500 text-xs mb-1">İlçe</span>
                                    <span className="font-medium text-gray-900">{dealer.district || '-'}</span>
                                </div>
                            </div>
                            <div>
                                <span className="block text-gray-500 text-xs mb-1">Vergi No</span>
                                <span className="font-medium text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded inline-block">{dealer.taxNo || '-'}</span>
                            </div>
                            <div>
                                <span className="block text-gray-500 text-xs mb-1">Dağıtıcı</span>
                                <span className="font-medium text-gray-900">{dealer.distributor || '-'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Dates Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
                            <Calendar className="h-5 w-5 text-primary-600" />
                            <h2 className="font-semibold text-gray-900">Tarih Bilgileri</h2>
                        </div>
                        <div className="space-y-4 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">Lisans Başlangıç</span>
                                <span className="font-medium bg-gray-50 px-2 py-1 rounded">{formatDate(dealer.startDate)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">Lisans Bitiş</span>
                                <span className="font-medium bg-gray-50 px-2 py-1 rounded">{formatDate(dealer.endDate)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">Sözleşme Başlangıç</span>
                                <span className="font-medium bg-gray-50 px-2 py-1 rounded">{formatDate(dealer.contractStartDate)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">Sözleşme Bitiş</span>
                                <span className="font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded">{formatDate(dealer.contractEndDate)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Documents Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
                            <FileText className="h-5 w-5 text-primary-600" />
                            <h2 className="font-semibold text-gray-900">Belgeler</h2>
                        </div>
                        <div className="space-y-4 text-sm">
                            <div>
                                <span className="block text-gray-500 text-xs mb-1">Karar No</span>
                                <span className="font-medium text-gray-900 font-mono">{dealer.decisionNo || '-'}</span>
                            </div>
                            <div>
                                <span className="block text-gray-500 text-xs mb-1">Evrak No</span>
                                <span className="font-medium text-gray-900 font-mono">{dealer.documentNo || '-'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
