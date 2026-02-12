import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Download, FileText, Fuel, Search, ShieldAlert } from 'lucide-react';

import { API_URL } from '../config';
import { loadUiSettings } from '../lib/uiSettings';

interface Dealer {
    id: string;
    licenseNo: string;
    title: string;
    city: string | null;
    distributor: string | null;
    tankLevel: number;
    lastData: string | null;
    endDate: string | null;
    contractEndDate: string | null;
    deviceId: string | null;
}

function daysUntil(dateString: string | null): number | null {
    if (!dateString) return null;
    const target = new Date(dateString);
    if (Number.isNaN(target.getTime())) return null;
    const now = new Date();
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function isStale(lastData: string | null, thresholdHours: number): boolean {
    if (!lastData) return true;
    const ts = new Date(lastData).getTime();
    if (Number.isNaN(ts)) return true;
    return Date.now() - ts > thresholdHours * 60 * 60 * 1000;
}

function formatDate(value: string | null): string {
    if (!value) return '-';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return '-';
    return dt.toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getLevelBucket(dealer: Dealer, criticalLevel: number, warningLevel: number): 'critical' | 'warning' | 'normal' | 'nodata' {
    if (!dealer.deviceId) return 'nodata';
    if (dealer.tankLevel < criticalLevel) return 'critical';
    if (dealer.tankLevel < warningLevel) return 'warning';
    return 'normal';
}

function bucketLabel(bucket: 'critical' | 'warning' | 'normal' | 'nodata'): string {
    if (bucket === 'critical') return 'Kritik (<20%)';
    if (bucket === 'warning') return 'Uyarı (20-50%)';
    if (bucket === 'normal') return 'Normal (>=50%)';
    return 'Veri Yok';
}

export function Reports() {
    const uiSettings = loadUiSettings();
    const { criticalLevel, warningLevel, staleHours } = uiSettings.thresholds;

    const [dealers, setDealers] = useState<Dealer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [cityFilter, setCityFilter] = useState('all');
    const [distributorFilter, setDistributorFilter] = useState('all');

    useEffect(() => {
        const fetchDealers = async () => {
            try {
                const response = await fetch(`${API_URL}/api/dealers`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
                setDealers(data);
            } catch (error) {
                console.error('Error fetching report data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDealers();
    }, []);

    const cities = useMemo(() => {
        return Array.from(new Set(dealers.map((d) => d.city).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'tr'));
    }, [dealers]);

    const distributors = useMemo(() => {
        return Array.from(new Set(dealers.map((d) => d.distributor).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'tr'));
    }, [dealers]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return dealers.filter((d) => {
            const matchesSearch =
                !q ||
                d.title.toLowerCase().includes(q) ||
                d.licenseNo.toLowerCase().includes(q) ||
                (d.city || '').toLowerCase().includes(q);
            const matchesCity = cityFilter === 'all' || d.city === cityFilter;
            const matchesDistributor = distributorFilter === 'all' || d.distributor === distributorFilter;
            return matchesSearch && matchesCity && matchesDistributor;
        });
    }, [dealers, search, cityFilter, distributorFilter]);

    const stats = useMemo(() => {
        const critical = filtered.filter((d) => getLevelBucket(d, criticalLevel, warningLevel) === 'critical').length;
        const warning = filtered.filter((d) => getLevelBucket(d, criticalLevel, warningLevel) === 'warning').length;
        const normal = filtered.filter((d) => getLevelBucket(d, criticalLevel, warningLevel) === 'normal').length;
        const noData = filtered.filter((d) => getLevelBucket(d, criticalLevel, warningLevel) === 'nodata').length;
        const stale = filtered.filter((d) => d.deviceId && isStale(d.lastData, staleHours)).length;
        const expiring = filtered.filter((d) => {
            const l = daysUntil(d.endDate);
            const c = daysUntil(d.contractEndDate);
            const isLExpiring = l !== null && l <= 90;
            const isCExpiring = c !== null && c <= 90;
            return isLExpiring || isCExpiring;
        }).length;

        return {
            total: filtered.length,
            critical,
            warning,
            normal,
            noData,
            stale,
            expiring
        };
    }, [filtered, criticalLevel, warningLevel, staleHours]);

    const distribution = useMemo(() => {
        const total = stats.total || 1;
        const entries: Array<{ key: 'critical' | 'warning' | 'normal' | 'nodata'; value: number; color: string }> = [
            { key: 'critical', value: stats.critical, color: 'bg-red-500' },
            { key: 'warning', value: stats.warning, color: 'bg-orange-400' },
            { key: 'normal', value: stats.normal, color: 'bg-green-500' },
            { key: 'nodata', value: stats.noData, color: 'bg-gray-400' }
        ];
        return entries.map((e) => ({ ...e, ratio: Math.round((e.value / total) * 100) }));
    }, [stats]);

    const priorityList = useMemo(() => {
        return filtered
            .filter((d) => d.deviceId)
            .sort((a, b) => a.tankLevel - b.tankLevel)
            .slice(0, 8);
    }, [filtered]);

    const handleExportCsv = () => {
        const rows = filtered.map((d) => {
            const bucket = getLevelBucket(d, criticalLevel, warningLevel);
            return [
                d.title,
                d.licenseNo,
                d.city || '-',
                d.distributor || '-',
                d.deviceId || '-',
                d.deviceId ? `%${d.tankLevel}` : 'Veri Yok',
                bucketLabel(bucket),
                isStale(d.lastData, staleHours) ? 'Evet' : 'Hayir',
                formatDate(d.lastData),
                d.endDate || '-',
                d.contractEndDate || '-'
            ];
        });

        const header = ['Bayi', 'Lisans No', 'Il', 'Distributor', 'Device ID', 'Tank Doluluk', 'Seviye', 'Veri Guncel Degil', 'Son Veri', 'Lisans Bitis', 'Sozlesme Bitis'];
        const csvBody = [header, ...rows]
            .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csvBody], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rapor-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Raporlar</h2>
                    <p className="text-sm text-gray-500">Anlik operasyon ozeti ve risk odakli listeleme</p>
                </div>
                <button
                    onClick={handleExportCsv}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                    <Download className="h-4 w-4" />
                    CSV Indir
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Bayi, lisans no, sehir"
                        className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 focus:border-primary-500 focus:outline-none"
                    />
                </div>
                <select
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2 px-3 text-sm text-gray-700 focus:border-primary-500 focus:outline-none"
                >
                    <option value="all">Tum Iller</option>
                    {cities.map((city) => (
                        <option key={city} value={city}>{city}</option>
                    ))}
                </select>
                <select
                    value={distributorFilter}
                    onChange={(e) => setDistributorFilter(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2 px-3 text-sm text-gray-700 focus:border-primary-500 focus:outline-none"
                >
                    <option value="all">Tum Distributorler</option>
                    {distributors.map((dist) => (
                        <option key={dist} value={dist}>{dist}</option>
                    ))}
                </select>
                <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 flex items-center justify-between">
                    <span>Filtrelenen Kayit</span>
                    <span className="font-semibold text-gray-900">{stats.total}</span>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-xs text-gray-500">Toplam</p>
                    <p className="text-xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="text-xs text-red-600">Kritik</p>
                    <p className="text-xl font-bold text-red-700">{stats.critical}</p>
                </div>
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                    <p className="text-xs text-orange-600">Uyari</p>
                    <p className="text-xl font-bold text-orange-700">{stats.warning}</p>
                </div>
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                    <p className="text-xs text-green-600">Normal</p>
                    <p className="text-xl font-bold text-green-700">{stats.normal}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs text-gray-600">Veri Yok</p>
                    <p className="text-xl font-bold text-gray-700">{stats.noData}</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs text-amber-700">Guncel Degil (24s+)</p>
                    <p className="text-xl font-bold text-amber-800">{stats.stale}</p>
                </div>
                <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                    <p className="text-xs text-purple-700">90 Gun Icindekiler</p>
                    <p className="text-xl font-bold text-purple-800">{stats.expiring}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <div className="mb-4 flex items-center gap-2">
                        <Fuel className="h-4 w-4 text-primary-600" />
                        <h3 className="font-semibold text-gray-900">Seviye Dagilimi</h3>
                    </div>
                    <div className="space-y-3">
                        {distribution.map((item) => (
                            <div key={item.key}>
                                <div className="mb-1 flex items-center justify-between text-xs">
                                    <span className="text-gray-600">{bucketLabel(item.key)}</span>
                                    <span className="font-semibold text-gray-900">{item.value} ({item.ratio}%)</span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                                    <div className={`h-full ${item.color}`} style={{ width: `${item.ratio}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <div className="mb-4 flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-red-600" />
                        <h3 className="font-semibold text-gray-900">Oncelik Listesi (En Dusuk Doluluk)</h3>
                    </div>
                    <div className="space-y-2">
                        {priorityList.length === 0 ? (
                            <p className="text-sm text-gray-500">Listelenecek aktif cihaz verisi yok.</p>
                        ) : (
                            priorityList.map((dealer) => (
                                <div key={dealer.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-800 truncate">{dealer.title}</p>
                                        <p className="text-[11px] text-gray-500">{dealer.city || '-'} • {formatDate(dealer.lastData)}</p>
                                    </div>
                                    <span className={`text-sm font-bold ${dealer.tankLevel < 20 ? 'text-red-600' : dealer.tankLevel < 50 ? 'text-orange-600' : 'text-green-600'}`}>
                                        %{dealer.tankLevel}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary-600" />
                    <h3 className="font-semibold text-gray-900">Detay Tablosu</h3>
                </div>
                {filtered.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">Filtreye uygun kayit yok.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Bayi</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Sehir</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Doluluk</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Son Veri</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Lisans / Sozlesme</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
            {filtered.map((d) => {
                                    const l = daysUntil(d.endDate);
                                    const c = daysUntil(d.contractEndDate);
                                    const expiryText =
                                        l !== null && l <= 90
                                            ? `Lisans: ${l} gun`
                                            : c !== null && c <= 90
                                                ? `Sozlesme: ${c} gun`
                                                : 'Normal';
                                    return (
                                        <tr key={d.id}>
                                            <td className="px-4 py-3">
                                                <p className="text-sm font-medium text-gray-800">{d.title}</p>
                                                <p className="text-xs text-gray-500">{d.licenseNo}</p>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{d.city || '-'}</td>
                                            <td className="px-4 py-3">
                                                {!d.deviceId ? (
                                                    <span className="text-sm font-medium text-gray-400">Veri Yok</span>
                                                ) : (
                                                    <span className={`text-sm font-bold ${d.tankLevel < 20 ? 'text-red-600' : d.tankLevel < 50 ? 'text-orange-600' : 'text-green-600'}`}>
                                                        %{d.tankLevel}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <div className="flex items-center gap-2">
                                                    {isStale(d.lastData, staleHours) ? <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> : null}
                                                    <span className={`${isStale(d.lastData, staleHours) ? 'text-amber-700' : 'text-gray-700'}`}>{formatDate(d.lastData)}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{expiryText}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
