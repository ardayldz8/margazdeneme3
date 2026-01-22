import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';

export function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar - hidden on mobile, shown on desktop */}
            <div className={`
                fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <Sidebar onClose={() => setSidebarOpen(false)} />
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile header */}
                <header className="flex items-center justify-between h-14 px-4 bg-white border-b border-gray-200 lg:hidden">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
                    >
                        <Menu className="h-6 w-6" />
                    </button>
                    <h1 className="text-lg font-bold text-primary-600">Margaz BTS</h1>
                    <div className="w-10" /> {/* Spacer for centering */}
                </header>

                <main className="flex-1 overflow-y-auto">
                    <div className="container mx-auto px-4 py-4 lg:px-6 lg:py-8">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
