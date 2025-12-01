import { useState } from 'react';
import { RefreshCw, CheckCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';
import { API_URL } from '../config';

export function DataSync() {
    const [isSyncing, setIsSyncing] = useState(false);
    const [step, setStep] = useState<'idle' | 'browser-open' | 'captcha-waiting' | 'extracting' | 'complete'>('idle');

    const handleStartSync = async () => {
        setIsSyncing(true);
        setStep('browser-open');

        try {
            // Step 1: Browser opens (Backend handles this)
            setStep('captcha-waiting');

            const response = await fetch(`${API_URL}/api/sync/epdk`, {
                method: 'POST',
            });

            if (!response.ok) throw new Error('Sync failed');

            const data = await response.json();
            console.log('Sync result:', data);

            setStep('extracting');

            // Short delay to show the extracting state
            await new Promise(r => setTimeout(r, 1000));
            setStep('complete');

        } catch (error) {
            console.error('Sync error:', error);
            alert('Senkronizasyon hatası! Lütfen tekrar deneyin.');
            setStep('idle');
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">EPDK Veri Entegrasyonu</h2>
                <p className="text-sm text-gray-500">Bayi lisans verilerini EPDK sisteminden güncelleyin.</p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Status Card */}
                <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Senkronizasyon Durumu</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                    <CheckCircle className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Sistem Güncel</p>
                                    <p className="text-xs text-gray-500">Son güncelleme: {new Date().toLocaleDateString()}</p>
                                </div>
                            </div>
                            <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                Aktif
                            </span>
                        </div>

                        <div className="border-t border-gray-100 pt-4">
                            <button
                                onClick={handleStartSync}
                                disabled={isSyncing}
                                className={cn(
                                    "w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all",
                                    isSyncing
                                        ? "bg-gray-400 cursor-not-allowed"
                                        : "bg-primary-600 hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                                )}
                            >
                                <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                                {isSyncing ? 'İşlem Sürüyor...' : 'Verileri Şimdi Güncelle'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Process Guide */}
                <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Nasıl Çalışır?</h3>
                    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">

                        {/* Step 1 */}
                        <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                            <div className={cn("flex items-center justify-center w-10 h-10 rounded-full border-2 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 bg-white", step === 'browser-open' || step === 'complete' ? 'border-primary-600 text-primary-600' : 'border-gray-300 text-gray-400')}>
                                <ExternalLink className="h-5 w-5" />
                            </div>
                            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-lg border border-gray-200 bg-white shadow-sm">
                                <div className="flex items-center justify-between space-x-2 mb-1">
                                    <div className="font-bold text-gray-900">Tarayıcı Açılır</div>
                                </div>
                                <div className="text-gray-500 text-sm">Sistem otomatik olarak EPDK sorgu ekranını güvenli bir pencerede açar.</div>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                            <div className={cn("flex items-center justify-center w-10 h-10 rounded-full border-2 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 bg-white", step === 'captcha-waiting' || step === 'complete' ? 'border-orange-500 text-orange-500' : 'border-gray-300 text-gray-400')}>
                                <ShieldCheck className="h-5 w-5" />
                            </div>
                            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-lg border border-gray-200 bg-white shadow-sm">
                                <div className="flex items-center justify-between space-x-2 mb-1">
                                    <div className="font-bold text-gray-900">Doğrulama (Siz)</div>
                                </div>
                                <div className="text-gray-500 text-sm">Açılan pencerede "Ben robot değilim" kutucuğunu işaretlersiniz.</div>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                            <div className={cn("flex items-center justify-center w-10 h-10 rounded-full border-2 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 bg-white", step === 'extracting' || step === 'complete' ? 'border-green-600 text-green-600' : 'border-gray-300 text-gray-400')}>
                                <RefreshCw className="h-5 w-5" />
                            </div>
                            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-lg border border-gray-200 bg-white shadow-sm">
                                <div className="flex items-center justify-between space-x-2 mb-1">
                                    <div className="font-bold text-gray-900">Veri Çekme (Sistem)</div>
                                </div>
                                <div className="text-gray-500 text-sm">Doğrulama sonrası sistem tüm bayi verilerini otomatik olarak veritabanına kaydeder.</div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
