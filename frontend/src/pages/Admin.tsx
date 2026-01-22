import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Cpu, Server } from 'lucide-react';
import { API_URL } from '../config';

interface Dealer {
    id: string;
    licenseNo: string;
    title: string;
    city: string;
    district: string;
    address: string;
    status: string;
    distributor: string;
    deviceId: string | null;
    tankLevel: number;
    updatedAt: string;
}

interface Device {
    id: string;
    deviceId: string;
    name: string;
    description: string | null;
    status: string;
    lastSeen: string | null;
}

const ADMIN_PASSWORD = 'margaz2026';

export function Admin() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [dealers, setDealers] = useState<Dealer[]>([]);
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showAddDevice, setShowAddDevice] = useState(false);
    const [activeTab, setActiveTab] = useState<'dealers' | 'devices'>('dealers');

    const [formData, setFormData] = useState({
        title: '', city: '', district: '', address: '', distributor: '', deviceId: '', status: 'Yürürlükte'
    });

    const [deviceForm, setDeviceForm] = useState({ deviceId: '', name: '', description: '' });

    useEffect(() => {
        if (isAuthenticated) {
            fetchDealers();
            fetchDevices();
        }
    }, [isAuthenticated]);

    const fetchDealers = async () => {
        try {
            const response = await fetch(`${API_URL}/api/dealers`);
            const data = await response.json();
            setDealers(data);
        } catch (error) {
            console.error('Error fetching dealers:', error);
        }
    };

    const fetchDevices = async () => {
        try {
            const response = await fetch(`${API_URL}/api/devices`);
            const data = await response.json();
            setDevices(data);
        } catch (error) {
            console.error('Error fetching devices:', error);
        }
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === ADMIN_PASSWORD) setIsAuthenticated(true);
        else alert('Yanlış şifre!');
    };

    const handleCreateDealer = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_URL}/api/dealers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (response.ok) {
                setShowAddForm(false);
                setFormData({ title: '', city: '', district: '', address: '', distributor: '', deviceId: '', status: 'Yürürlükte' });
                fetchDealers();
            }
        } catch (error) {
            console.error('Error creating dealer:', error);
        }
    };

    const handleCreateDevice = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_URL}/api/devices`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(deviceForm)
            });
            if (response.ok) {
                setShowAddDevice(false);
                setDeviceForm({ deviceId: '', name: '', description: '' });
                fetchDevices();
            } else {
                const err = await response.json();
                alert(err.error || 'Hata oluştu');
            }
        } catch (error) {
            console.error('Error creating device:', error);
        }
    };

    const handleUpdateDealer = async (id: string) => {
        try {
            const response = await fetch(`${API_URL}/api/dealers/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (response.ok) {
                setEditingId(null);
                fetchDealers();
            }
        } catch (error) {
            console.error('Error updating dealer:', error);
        }
    };

    const handleDeleteDealer = async (id: string) => {
        if (!confirm('Bu bayiyi silmek istediğinize emin misiniz?')) return;
        try {
            await fetch(`${API_URL}/api/dealers/${id}`, { method: 'DELETE' });
            fetchDealers();
        } catch (error) {
            console.error('Error deleting dealer:', error);
        }
    };

    const handleDeleteDevice = async (id: string) => {
        if (!confirm('Bu cihazı silmek istediğinize emin misiniz?')) return;
        try {
            await fetch(`${API_URL}/api/devices/${id}`, { method: 'DELETE' });
            fetchDevices();
        } catch (error) {
            console.error('Error deleting device:', error);
        }
    };

    const startEdit = (dealer: Dealer) => {
        setEditingId(dealer.id);
        setFormData({
            title: dealer.title || '', city: dealer.city || '', district: dealer.district || '',
            address: dealer.address || '', distributor: dealer.distributor || '',
            deviceId: dealer.deviceId || '', status: dealer.status || 'Yürürlükte'
        });
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
                    <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Admin Girişi</h1>
                    <form onSubmit={handleLogin}>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                            placeholder="Şifre" className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4" />
                        <button type="submit" className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700">
                            Giriş Yap
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex gap-4 border-b">
                <button onClick={() => setActiveTab('dealers')}
                    className={`px-4 py-2 font-medium ${activeTab === 'dealers' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500'}`}>
                    Bayiler
                </button>
                <button onClick={() => setActiveTab('devices')}
                    className={`px-4 py-2 font-medium ${activeTab === 'devices' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500'}`}>
                    <Server className="h-4 w-4 inline mr-1" /> Cihazlar
                </button>
            </div>

            {/* DEVICES TAB */}
            {activeTab === 'devices' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold">Arduino Cihazları</h2>
                        <button onClick={() => setShowAddDevice(true)} className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                            <Plus className="h-5 w-5" /> Yeni Cihaz Ekle
                        </button>
                    </div>

                    {showAddDevice && (
                        <div className="bg-white rounded-xl border p-6">
                            <h3 className="text-lg font-semibold mb-4">Yeni Cihaz Ekle</h3>
                            <form onSubmit={handleCreateDevice} className="grid grid-cols-2 gap-4">
                                <input placeholder="Device ID (örn: 1-aktup)" value={deviceForm.deviceId}
                                    onChange={(e) => setDeviceForm({ ...deviceForm, deviceId: e.target.value })}
                                    className="px-3 py-2 border rounded-lg" required />
                                <input placeholder="Cihaz Adı" value={deviceForm.name}
                                    onChange={(e) => setDeviceForm({ ...deviceForm, name: e.target.value })}
                                    className="px-3 py-2 border rounded-lg" required />
                                <input placeholder="Açıklama (opsiyonel)" value={deviceForm.description}
                                    onChange={(e) => setDeviceForm({ ...deviceForm, description: e.target.value })}
                                    className="px-3 py-2 border rounded-lg col-span-2" />
                                <div className="col-span-2 flex gap-2">
                                    <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg">
                                        <Save className="h-4 w-4 inline mr-2" /> Kaydet
                                    </button>
                                    <button type="button" onClick={() => setShowAddDevice(false)} className="bg-gray-300 px-4 py-2 rounded-lg">
                                        İptal
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="bg-white rounded-xl border overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device ID</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ad</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Son Görülme</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {devices.map(device => (
                                    <tr key={device.id}>
                                        <td className="px-4 py-3 font-mono text-sm">{device.deviceId}</td>
                                        <td className="px-4 py-3">{device.name}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs ${device.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {device.status === 'active' ? 'Aktif' : device.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {device.lastSeen ? new Date(device.lastSeen).toLocaleString('tr-TR') : '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <button onClick={() => handleDeleteDevice(device.id)} className="text-red-600 hover:text-red-800">
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {devices.length === 0 && (
                                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Henüz cihaz eklenmemiş</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* DEALERS TAB */}
            {activeTab === 'dealers' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold">Bayi Yönetimi</h2>
                        <button onClick={() => setShowAddForm(true)} className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                            <Plus className="h-5 w-5" /> Yeni Bayi Ekle
                        </button>
                    </div>

                    {showAddForm && (
                        <div className="bg-white rounded-xl border p-6">
                            <h3 className="text-lg font-semibold mb-4">Yeni Bayi Ekle</h3>
                            <form onSubmit={handleCreateDealer} className="grid grid-cols-2 gap-4">
                                <input placeholder="Bayi Adı *" value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="px-3 py-2 border rounded-lg" required />
                                <input placeholder="Şehir" value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    className="px-3 py-2 border rounded-lg" />
                                <input placeholder="İlçe" value={formData.district}
                                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                                    className="px-3 py-2 border rounded-lg" />
                                <input placeholder="Dağıtıcı" value={formData.distributor}
                                    onChange={(e) => setFormData({ ...formData, distributor: e.target.value })}
                                    className="px-3 py-2 border rounded-lg" />
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Arduino Cihazı</label>
                                    <select value={formData.deviceId} onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg bg-white">
                                        <option value="">Cihaz Seçin...</option>
                                        {devices.map(d => (
                                            <option key={d.id} value={d.deviceId}>{d.deviceId} - {d.name}</option>
                                        ))}
                                    </select>
                                    {devices.length === 0 && (
                                        <p className="text-xs text-orange-600 mt-1">⚠️ Önce Cihazlar sekmesinden cihaz ekleyin</p>
                                    )}
                                </div>
                                <div className="col-span-2 flex gap-2">
                                    <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg">
                                        <Save className="h-4 w-4 inline mr-2" /> Kaydet
                                    </button>
                                    <button type="button" onClick={() => setShowAddForm(false)} className="bg-gray-300 px-4 py-2 rounded-lg">
                                        İptal
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="bg-white rounded-xl border overflow-hidden">
                        {loading ? (
                            <div className="p-8 text-center text-gray-500">Yükleniyor...</div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bayi</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Konum</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cihaz</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tank</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {dealers.map(dealer => (
                                        <tr key={dealer.id}>
                                            {editingId === dealer.id ? (
                                                <>
                                                    <td className="px-4 py-3">
                                                        <input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                            className="px-2 py-1 border rounded w-full" />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                                            placeholder="Şehir" className="px-2 py-1 border rounded w-20" />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <select value={formData.deviceId} onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
                                                            className="px-2 py-1 border rounded bg-white">
                                                            <option value="">Seçin</option>
                                                            {devices.map(d => (
                                                                <option key={d.id} value={d.deviceId}>{d.deviceId}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-3">%{dealer.tankLevel}</td>
                                                    <td className="px-4 py-3 flex gap-2">
                                                        <button onClick={() => handleUpdateDealer(dealer.id)} className="text-green-600"><Save className="h-5 w-5" /></button>
                                                        <button onClick={() => setEditingId(null)} className="text-gray-600"><X className="h-5 w-5" /></button>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium">{dealer.title}</div>
                                                        <div className="text-xs text-gray-500">{dealer.licenseNo}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-500">{dealer.city} / {dealer.district}</td>
                                                    <td className="px-4 py-3">
                                                        {dealer.deviceId ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                                                                <Cpu className="h-3 w-3" /> {dealer.deviceId}
                                                            </span>
                                                        ) : (<span className="text-gray-400 text-xs">Bağlı değil</span>)}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`text-sm font-medium ${dealer.tankLevel > 20 ? 'text-green-600' : 'text-red-600'}`}>
                                                            %{dealer.tankLevel}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 flex gap-2">
                                                        <button onClick={() => startEdit(dealer)} className="text-blue-600"><Edit2 className="h-5 w-5" /></button>
                                                        <button onClick={() => handleDeleteDealer(dealer.id)} className="text-red-600"><Trash2 className="h-5 w-5" /></button>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
