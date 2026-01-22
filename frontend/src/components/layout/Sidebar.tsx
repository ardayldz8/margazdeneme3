import { LayoutDashboard, Map, Settings, Truck, FileText, RefreshCw, Shield, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';

const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Harita', href: '/map', icon: Map },
    { name: 'Bayiler', href: '/dealers', icon: Truck },
    { name: 'Raporlar', href: '/reports', icon: FileText },
    { name: 'Entegrasyon', href: '/sync', icon: RefreshCw },
    { name: 'Ayarlar', href: '/settings', icon: Settings },
    { name: 'Admin', href: '/admin', icon: Shield },
];

interface SidebarProps {
    onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
    const location = useLocation();

    return (
        <div className="flex h-full w-64 flex-col bg-white border-r border-gray-200 shadow-sm">
            <div className="flex h-14 lg:h-16 items-center justify-between px-4 lg:px-6 border-b border-gray-100">
                <h1 className="text-xl font-bold text-primary-600">Margaz BTS</h1>
                {/* Mobile close button */}
                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 lg:hidden"
                    >
                        <X className="h-5 w-5" />
                    </button>
                )}
            </div>
            <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
                {navigation.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            to={item.href}
                            onClick={onClose}
                            className={cn(
                                'group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
                                isActive
                                    ? 'bg-primary-50 text-primary-700'
                                    : 'text-gray-700 hover:bg-gray-50 hover:text-primary-600'
                            )}
                        >
                            <item.icon
                                className={cn(
                                    'mr-3 h-5 w-5 flex-shrink-0 transition-colors',
                                    isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-primary-500'
                                )}
                            />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>
            <div className="p-4 border-t border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs">
                        MK
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-700">Margaz Kontrol</p>
                        <p className="text-xs text-gray-500">Admin</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
