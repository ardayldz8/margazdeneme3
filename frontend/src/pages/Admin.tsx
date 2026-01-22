import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Cpu } from 'lucide-react';
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

const ADMIN_PASSWORD = 'margaz2026';

export function Admin() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [dealers, setDealers] = useState<Dealer[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        city: '',
        district: '',
        address: '',
        distributor: '',
        deviceId: '',
        status: 'Yürürlükte'
    });

    useEffect(() => {
        if (isAuthenticated) {
            fetchDealers();
        }
    }, [isAuthenticated]);

    const fetchDealers = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/dealers`);
            const data = await response.json();
            setDealers(data);
        } catch (error) {
            console.error('Error fetching dealers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === ADMIN_PASSWORD) {
            setIsAuthenticated(true);
        } else {
            alert('Yanlış şifre!');
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
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

    const handleUpdate = async (id: string) => {
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

    const handleDelete = async (id: string) => {
        if (!confirm('Bu bayiyi silmek istediğinize emin misiniz?')) return;
        try {
            await fetch(`${API_URL}/api/dealers/${id}`, { method: 'DELETE' });
            fetchDealers();
        } catch (error) {
            console.error('Error deleting dealer:', error);
        }
    };

    const startEdit = (dealer: Dealer) => {
        setEditingId(dealer.id);
        setFormData({
            title: dealer.title || '',
            city: dealer.city || '',
            district: dealer.district || '',
            address: dealer.address || '',
            distributor: dealer.distributor || '',
            deviceId: dealer.deviceId || '',
            status: dealer.status || 'Yürürlükte'
        });
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
                    <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Admin Girişi</h1>
                    <form onSubmit={handleLogin}>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Şifre"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <button
                            type="submit"
                            className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition"
                        >
                            Giriş Yap
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Admin Panel</h2>
                    <p className="text-sm text-gray-500">Bayi ve cihaz yönetimi</p>
                </div>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
                >
                    <Plus className="h-5 w-5" />
                    Yeni Bayi Ekle
                </button>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4">Yeni Bayi Ekle</h3>
                    <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
                        <input
                            placeholder="Bayi Adı *"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="px-3 py-2 border rounded-lg"
                            required
                        />
                        <input
                            placeholder="Şehir"
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            className="px-3 py-2 border rounded-lg"
                        />
                        <input
                            placeholder="İlçe"
                            value={formData.district}
                            onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                            className="px-3 py-2 border rounded-lg"
                        />
                        <input
                            placeholder="Dağıtıcı"
                            value={formData.distributor}
                            onChange={(e) => setFormData({ ...formData, distributor: e.target.value })}
                            className="px-3 py-2 border rounded-lg"
                        />
                        <input
                            placeholder="Device ID (Arduino)"
                            value={formData.deviceId}
                            onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
                            className="px-3 py-2 border rounded-lg col-span-2"
                        />
                        <div className="col-span-2 flex gap-2">
                            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                                <Save className="h-4 w-4 inline mr-2" />
                                Kaydet
                            </button>
                            <button type="button" onClick={() => setShowAddForm(false)} className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400">
                                <X className="h-4 w-4 inline mr-2" />
                                İptal
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Dealers Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Yükleniyor...</div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bayi</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Konum</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device ID</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tank</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {dealers.map((dealer) => (
                                <tr key={dealer.id} className="hover:bg-gray-50">
                                    {editingId === dealer.id ? (
                                        <>
                                            <td className="px-4 py-3">
                                                <input
                                                    value={formData.title}
                                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                    className="px-2 py-1 border rounded w-full"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-1">
                                                    <input
                                                        placeholder="Şehir"
                                                        value={formData.city}
                                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                                        className="px-2 py-1 border rounded w-24"
                                                    />
                                                    <input
                                                        placeholder="İlçe"
                                                        value={formData.district}
                                                        onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                                                        className="px-2 py-1 border rounded w-24"
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    placeholder="Device ID"
                                                    value={formData.deviceId}
                                                    onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
                                                    className="px-2 py-1 border rounded w-32"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-sm">%{dealer.tankLevel}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleUpdate(dealer.id)} className="text-green-600 hover:text-green-800">
                                                        <Save className="h-5 w-5" />
                                                    </button>
                                                    <button onClick={() => setEditingId(null)} className="text-gray-600 hover:text-gray-800">
                                                        <X className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900">{dealer.title}</div>
                                                <div className="text-xs text-gray-500">{dealer.licenseNo}</div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                                {dealer.city} / {dealer.district}
                                            </td>
                                            <td className="px-4 py-3">
                                                {dealer.deviceId ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                                                        <Cpu className="h-3 w-3" />
                                                        {dealer.deviceId}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-xs">Bağlı değil</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-sm font-medium ${dealer.tankLevel > 20 ? 'text-green-600' : 'text-red-600'}`}>
                                                    %{dealer.tankLevel}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-2">
                                                    <button onClick={() => startEdit(dealer)} className="text-blue-600 hover:text-blue-800">
                                                        <Edit2 className="h-5 w-5" />
                                                    </button>
                                                    <button onClick={() => handleDelete(dealer.id)} className="text-red-600 hover:text-red-800">
                                                        <Trash2 className="h-5 w-5" />
                                                    </button>
                                                </div>
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
    );
}
