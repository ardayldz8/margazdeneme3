import { LayoutDashboard, Map, Settings, Truck, FileText, RefreshCw, Shield, X, LogOut } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

// Navigation items - admin items will be filtered based on role
const allNavigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, adminOnly: false },
    { name: 'Harita', href: '/map', icon: Map, adminOnly: false },
    { name: 'Bayiler', href: '/dealers', icon: Truck, adminOnly: false },
    { name: 'Raporlar', href: '/reports', icon: FileText, adminOnly: false },
    { name: 'Entegrasyon', href: '/sync', icon: RefreshCw, adminOnly: true },
    { name: 'Ayarlar', href: '/settings', icon: Settings, adminOnly: false },
    { name: 'Admin', href: '/admin', icon: Shield, adminOnly: true },
];

interface SidebarProps {
    onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, isAdmin, logout } = useAuth();

    // Filter navigation based on user role
    const navigation = allNavigation.filter(item => !item.adminOnly || isAdmin);

    const handleLogout = () => {
        logout();
        navigate('/login');
        onClose?.();
    };

    // Get user initials
    const initials = user?.name
        ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : user?.email?.slice(0, 2).toUpperCase() || 'MK';

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
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs">
                            {initials}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-700 truncate">
                                {user?.name || user?.email?.split('@')[0] || 'Kullanıcı'}
                            </p>
                            <p className="text-xs text-gray-500">
                                {isAdmin ? 'Admin' : 'Görüntüleyici'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Çıkış Yap"
                    >
                        <LogOut className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
