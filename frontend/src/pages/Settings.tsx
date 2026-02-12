import { useMemo, useState } from 'react';
import { KeyRound, LogOut, RotateCcw, Save, Settings as SettingsIcon, UserCircle2 } from 'lucide-react';

import { useAuth, useAuthFetch } from '../contexts/AuthContext';
import { API_URL } from '../config';
import { DEFAULT_UI_SETTINGS, loadUiSettings, saveUiSettings } from '../lib/uiSettings';

export function Settings() {
    const { user, logout } = useAuth();
    const authFetch = useAuthFetch();

    const [settings, setSettings] = useState(() => loadUiSettings());
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
    const [passwordError, setPasswordError] = useState<string | null>(null);

    const isDirty = useMemo(() => {
        return JSON.stringify(settings) !== JSON.stringify(loadUiSettings());
    }, [settings]);

    const handleSave = () => {
        setSaving(true);
        saveUiSettings(settings);
        setSaveMessage('Ayarlar kaydedildi. Yeni tercihler bir sonraki sayfa açılışında uygulanır.');
        setTimeout(() => {
            setSaveMessage(null);
            setSaving(false);
        }, 1200);
    };

    const handleReset = () => {
        setSettings(DEFAULT_UI_SETTINGS);
        setSaveMessage('Varsayılan ayarlar yüklendi. Kaydet ile onaylayın.');
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordMessage(null);
        setPasswordError(null);

        if (!currentPassword || !newPassword) {
            setPasswordError('Mevcut ve yeni şifre gerekli.');
            return;
        }
        if (newPassword.length < 6) {
            setPasswordError('Yeni şifre en az 6 karakter olmalı.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError('Yeni şifre ve tekrar şifresi eşleşmiyor.');
            return;
        }

        setPasswordSaving(true);
        try {
            const response = await authFetch(`${API_URL}/api/auth/change-password`, {
                method: 'POST',
                body: JSON.stringify({ currentPassword, newPassword })
            });

            const data = await response.json();
            if (!response.ok) {
                setPasswordError(data.error || 'Şifre değiştirilemedi.');
                return;
            }

            setPasswordMessage(data.message || 'Şifre başarıyla değiştirildi.');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch {
            setPasswordError('Bağlantı hatası oluştu.');
        } finally {
            setPasswordSaving(false);
        }
    };

    return (
        <div className="space-y-6 pb-10">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Ayarlar</h2>
                <p className="text-sm text-gray-500">Hesap ve arayüz tercihlerinizi buradan yönetin.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-1 space-y-6">
                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <UserCircle2 className="h-5 w-5 text-primary-600" />
                            <h3 className="font-semibold text-gray-900">Hesap</h3>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div>
                                <p className="text-gray-500">Ad Soyad</p>
                                <p className="font-medium text-gray-900">{user?.name || '-'}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">E-posta</p>
                                <p className="font-medium text-gray-900">{user?.email || '-'}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Rol</p>
                                <p className="font-medium text-gray-900">{user?.role || '-'}</p>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            <LogOut className="h-4 w-4" />
                            Çıkış Yap
                        </button>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <KeyRound className="h-5 w-5 text-primary-600" />
                            <h3 className="font-semibold text-gray-900">Şifre Değiştir</h3>
                        </div>
                        <form className="space-y-3" onSubmit={handleChangePassword}>
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Mevcut şifre"
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                            />
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Yeni şifre"
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                            />
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Yeni şifre (tekrar)"
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                            />

                            {passwordError && <p className="text-xs text-red-600">{passwordError}</p>}
                            {passwordMessage && <p className="text-xs text-green-600">{passwordMessage}</p>}

                            <button
                                type="submit"
                                disabled={passwordSaving}
                                className="w-full rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-60"
                            >
                                {passwordSaving ? 'Kaydediliyor...' : 'Şifreyi Güncelle'}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="xl:col-span-2 space-y-6">
                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <SettingsIcon className="h-5 w-5 text-primary-600" />
                            <h3 className="font-semibold text-gray-900">Arayüz Tercihleri</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <label className="space-y-1 text-sm">
                                <span className="text-gray-600">Dashboard varsayılan görünüm</span>
                                <select
                                    value={settings.dashboard.defaultView}
                                    onChange={(e) => setSettings((prev) => ({
                                        ...prev,
                                        dashboard: {
                                            ...prev.dashboard,
                                            defaultView: e.target.value === 'compact' ? 'compact' : 'normal'
                                        }
                                    }))}
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary-500 focus:outline-none"
                                >
                                    <option value="normal">Normal</option>
                                    <option value="compact">Kompakt</option>
                                </select>
                            </label>

                            <label className="space-y-1 text-sm">
                                <span className="text-gray-600">Dashboard yenileme aralığı (sn)</span>
                                <select
                                    value={settings.dashboard.refreshSeconds}
                                    onChange={(e) => setSettings((prev) => ({
                                        ...prev,
                                        dashboard: {
                                            ...prev.dashboard,
                                            refreshSeconds: Number(e.target.value)
                                        }
                                    }))}
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary-500 focus:outline-none"
                                >
                                    <option value={30}>30</option>
                                    <option value={60}>60</option>
                                    <option value={120}>120</option>
                                    <option value={300}>300</option>
                                </select>
                            </label>
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <h3 className="font-semibold text-gray-900 mb-4">Operasyon Eşikleri</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <label className="space-y-1 text-sm">
                                <span className="text-gray-600">Kritik seviye (%)</span>
                                <input
                                    type="number"
                                    min={5}
                                    max={80}
                                    value={settings.thresholds.criticalLevel}
                                    onChange={(e) => {
                                        const next = Number(e.target.value) || 0;
                                        setSettings((prev) => ({
                                            ...prev,
                                            thresholds: {
                                                ...prev.thresholds,
                                                criticalLevel: Math.min(80, Math.max(5, next)),
                                                warningLevel: Math.max(prev.thresholds.warningLevel, Math.min(80, Math.max(5, next)) + 1)
                                            }
                                        }));
                                    }}
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary-500 focus:outline-none"
                                />
                            </label>

                            <label className="space-y-1 text-sm">
                                <span className="text-gray-600">Uyarı seviyesi (%)</span>
                                <input
                                    type="number"
                                    min={10}
                                    max={95}
                                    value={settings.thresholds.warningLevel}
                                    onChange={(e) => {
                                        const next = Number(e.target.value) || 0;
                                        setSettings((prev) => ({
                                            ...prev,
                                            thresholds: {
                                                ...prev.thresholds,
                                                warningLevel: Math.min(95, Math.max(prev.thresholds.criticalLevel + 1, next))
                                            }
                                        }));
                                    }}
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary-500 focus:outline-none"
                                />
                            </label>

                            <label className="space-y-1 text-sm">
                                <span className="text-gray-600">Veri güncel değil eşiği (saat)</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={168}
                                    value={settings.thresholds.staleHours}
                                    onChange={(e) => {
                                        const next = Number(e.target.value) || 0;
                                        setSettings((prev) => ({
                                            ...prev,
                                            thresholds: {
                                                ...prev.thresholds,
                                                staleHours: Math.min(168, Math.max(1, next))
                                            }
                                        }));
                                    }}
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary-500 focus:outline-none"
                                />
                            </label>
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <p className="text-sm font-medium text-gray-900">Ayarları uygula</p>
                            <p className="text-xs text-gray-500">Bu tercihler cihazda tutulur (frontend-only).</p>
                            {saveMessage && <p className="text-xs text-green-600 mt-1">{saveMessage}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleReset}
                                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                <RotateCcw className="h-4 w-4" />
                                Varsayılan
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !isDirty}
                                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-60"
                            >
                                <Save className="h-4 w-4" />
                                {saving ? 'Kaydediliyor...' : 'Kaydet'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
