import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Fuel, AlertTriangle, FileText, Award } from 'lucide-react';

interface Dealer {
    id: string;
    title: string;
    tankLevel: number;
    lastData: string | null;
    endDate: string | null; // License end date
    contractEndDate: string | null; // Contract end date
    deviceId: string | null; // Arduino device ID
}

import { API_URL } from '../config';
import { loadUiSettings } from '../lib/uiSettings';

export function Dashboard() {
    const uiSettings = loadUiSettings();
    const { criticalLevel, warningLevel } = uiSettings.thresholds;

    const [dealers, setDealers] = useState<Dealer[]>([]);
    const [loading, setLoading] = useState(true);

    const [viewMode, setViewMode] = useState<'normal' | 'compact'>(uiSettings.dashboard.defaultView);

    useEffect(() => {
        fetchDealers();
        const interval = setInterval(fetchDealers, uiSettings.dashboard.refreshSeconds * 1000);
        return () => clearInterval(interval);
    }, [uiSettings.dashboard.refreshSeconds]);



    const fetchDealers = async () => {
        try {
            const response = await fetch(`${API_URL}/api/dealers`);

            if (!response.ok) {
                if (response.status === 429) {
                    console.warn('Rate limit exceeded - skipping update');
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            setDealers(data);
        } catch (error) {
            console.error('Error fetching dealers:', error);
        } finally {
            setLoading(false);
        }
    };

    const getProgressColor = (level: number) => {
        if (level < criticalLevel) return 'bg-red-500';
        if (level < warningLevel) return 'bg-orange-400';
        return 'bg-green-500';
    };

    const getTextColor = (level: number) => {
        if (level < criticalLevel) return 'text-red-600';
        if (level < warningLevel) return 'text-orange-600';
        return 'text-green-600';
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Veri yok';
        const date = new Date(dateString);
        return date.toLocaleString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getExpirationStatus = (dealer: Dealer) => {
        const checkDate = (dateString: string | null, type: 'Lisans' | 'Sözleşme') => {
            if (!dateString) return null;
            const date = new Date(dateString);
            const now = new Date();
            const diffTime = date.getTime() - now.getTime();
            const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30);
            const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffMonths < 3) return { type, color: 'red', message: `${type} bitimine ${remainingDays} gün kaldı!`, remainingDays };
            if (diffMonths < 6) return { type, color: 'yellow', message: `${type} bitimine ${Math.ceil(diffMonths)} ay kaldı.`, remainingDays };
            return null;
        };

        const licenseStatus = checkDate(dealer.endDate, 'Lisans');
        const contractStatus = checkDate(dealer.contractEndDate, 'Sözleşme');

        // Prioritize Red (Critical) over Yellow
        if (licenseStatus?.color === 'red') return licenseStatus;
        if (contractStatus?.color === 'red') return contractStatus;
        if (licenseStatus?.color === 'yellow') return licenseStatus;
        if (contractStatus?.color === 'yellow') return contractStatus;

        return null;
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-10">
            <div className="flex items-center justify-between px-2">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Tank Doluluk Oranları</h2>
                    <p className="text-sm text-gray-500">Anlık saha verileri</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-white border border-gray-200 rounded-lg p-1 flex items-center">
                        <button
                            onClick={() => setViewMode('normal')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'normal'
                                ? 'bg-primary-50 text-primary-700'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Normal
                        </button>
                        <button
                            onClick={() => setViewMode('compact')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'compact'
                                ? 'bg-primary-50 text-primary-700'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Kompakt (Tümü)
                        </button>
                    </div>
                    <span className="bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-sm font-medium">
                        {dealers.length} İstasyon
                    </span>
                </div>
            </div>

            {viewMode === 'normal' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {dealers.map((dealer) => {
                        const expiration = getExpirationStatus(dealer);
                        return (
                            <Link
                                to={`/dealers/${dealer.id}`}
                                key={dealer.id}
                                className={`bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow flex flex-col justify-between h-40 cursor-pointer relative overflow-hidden ${expiration?.color === 'red' ? 'border-red-200 bg-red-50/30' :
                                    expiration?.color === 'yellow' ? 'border-yellow-200 bg-yellow-50/30' : 'border-gray-200'
                                    }`}
                            >
                                {expiration && (
                                    <div className={`absolute top-0 right-0 px-2 py-1 rounded-bl-lg flex items-center gap-1 ${expiration.color === 'red' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                        }`} title={expiration.message}>
                                        {expiration.type === 'Lisans' ? <Award className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                                        <span className="text-[10px] font-bold uppercase tracking-wider">{expiration.type}</span>
                                    </div>
                                )}

                                <div className="flex justify-between items-start mb-2 pr-6">
                                    <h3 className="font-bold text-gray-800 line-clamp-2 text-sm leading-tight" title={dealer.title}>
                                        {dealer.title}
                                    </h3>
                                    <Fuel className={`h-5 w-5 ${getTextColor(dealer.tankLevel)} shrink-0 ml-2`} />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs text-gray-500">Doluluk</span>
                                        {dealer.deviceId ? (
                                            <span className={`text-xl font-bold ${getTextColor(dealer.tankLevel)}`}>
                                                %{dealer.tankLevel}
                                            </span>
                                        ) : (
                                            <span className="text-xl font-bold text-gray-400">Veri Yok</span>
                                        )}
                                    </div>

                                    <div className="relative h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                                        {dealer.deviceId ? (
                                            <div
                                                className={`absolute top-0 left-0 h-full ${getProgressColor(dealer.tankLevel)} transition-all duration-500`}
                                                style={{ width: `${dealer.tankLevel}%` }}
                                            />
                                        ) : (
                                            <div className="absolute top-0 left-0 h-full w-full bg-gray-200" />
                                        )}
                                    </div>

                                    <div className="flex justify-between items-center pt-1">
                                        <p className="text-[10px] text-gray-400">
                                            {formatDate(dealer.lastData)}
                                        </p>
                                        {expiration && (
                                            <span className={`text-[10px] font-bold flex items-center gap-1 ${expiration.color === 'red' ? 'text-red-700' : 'text-yellow-700'
                                                }`}>
                                                <AlertTriangle className="h-3 w-3" />
                                                {expiration.remainingDays < 90 ? `${expiration.remainingDays} Gün Kaldı` : `${Math.ceil(expiration.remainingDays / 30)} Ay Kaldı`}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-9 gap-2.5">
                    {dealers.map((dealer) => {
                        const expiration = getExpirationStatus(dealer);
                        return (
                            <Link
                                to={`/dealers/${dealer.id}`}
                                key={dealer.id}
                                className={`bg-white rounded-lg border p-2.5 hover:border-primary-500 transition-colors cursor-pointer group relative min-h-[66px] ${expiration?.color === 'red' ? 'border-red-300 bg-red-50' :
                                    expiration?.color === 'yellow' ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
                                    }`}
                                title={`${dealer.title} - ${dealer.deviceId ? `%${dealer.tankLevel}` : 'Veri Yok'}${expiration ? `\n⚠️ ${expiration.message}` : ''}`}
                            >
                                {expiration && (
                                    <div className={`absolute top-1 right-1 w-3.5 h-3.5 rounded-full border border-white flex items-center justify-center text-[8px] font-bold text-white ${expiration.color === 'red' ? 'bg-red-500' : 'bg-yellow-500'
                                        }`}>
                                        {expiration.type === 'Lisans' ? 'L' : 'S'}
                                    </div>
                                )}
                                <div className="mb-1.5">
                                    <span className="block text-[10px] font-medium text-gray-700 leading-tight max-h-[2.3em] overflow-hidden pr-4" title={dealer.title}>
                                        {dealer.title}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[9px] text-gray-400">Doluluk</span>
                                    {dealer.deviceId ? (
                                        <span className={`text-xs font-bold ${getTextColor(dealer.tankLevel)}`}>
                                            %{dealer.tankLevel}
                                        </span>
                                    ) : (
                                        <span className="text-xs font-bold text-gray-400">-</span>
                                    )}
                                </div>
                                <div className="relative h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                    {dealer.deviceId ? (
                                        <div
                                            className={`absolute top-0 left-0 h-full ${getProgressColor(dealer.tankLevel)} transition-all duration-500`}
                                            style={{ width: `${dealer.tankLevel}%` }}
                                        />
                                    ) : (
                                        <div className="absolute top-0 left-0 h-full w-full bg-gray-200" />
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
