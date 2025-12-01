import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Building2, MapPin } from 'lucide-react';

interface Dealer {
    id: string;
    licenseNo: string;
    title: string;
    city: string;
    district: string;
    address: string;
    status: string;
    distributor: string;
    updatedAt: string;
    taxNo?: string;
    decisionNo?: string;
    documentNo?: string;
    startDate?: string;
    endDate?: string;
    contractStartDate?: string;
    contractEndDate?: string;
}

export function Dealers() {
    const navigate = useNavigate();
    const [dealers, setDealers] = useState<Dealer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchDealers();
    }, []);

    const fetchDealers = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/dealers');
            const data = await response.json();
            setDealers(data);
        } catch (error) {
            console.error('Error fetching dealers:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredDealers = dealers.filter(dealer =>
        dealer.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dealer.licenseNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dealer.city?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Pagination Logic
    const totalPages = Math.ceil(filteredDealers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentDealers = filteredDealers.slice(startIndex, startIndex + itemsPerPage);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="space-y-6">
            {/* Dashboard Summary */}
            <div className="flex justify-center">
                <div className="min-w-[300px] rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-center gap-4">
                        <div className="rounded-lg bg-blue-100 p-3 text-blue-600">
                            <Building2 className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Toplam Bayi</p>
                            <h3 className="text-2xl font-bold text-gray-900">{dealers.length}</h3>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">Bayiler</h2>
                    <p className="text-sm text-gray-500">Sistemdeki kayıtlı bayilerin listesi.</p>
                </div>
                <div className="flex gap-2">
                    <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                        <Filter className="h-4 w-4" />
                        Filtrele
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="Bayi adı, lisans no veya şehir ara..."
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1); // Reset to first page on search
                    }}
                />
            </div>

            {/* Dealers List */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Yükleniyor...</div>
                ) : filteredDealers.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">Kayıt bulunamadı.</div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bayi Bilgisi</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lisans / Vergi No</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Konum</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarihler</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {currentDealers.map((dealer) => (
                                        <tr
                                            key={dealer.id}
                                            onClick={() => navigate(`/dealers/${dealer.id}`)}
                                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 flex-shrink-0 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                                                        <Building2 className="h-5 w-5" />
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">{dealer.title}</div>
                                                        <div className="text-xs text-gray-500">{dealer.distributor}</div>
                                                        <div className="text-xs text-gray-400">Belge No: {dealer.documentNo}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <div>Lisans: {dealer.licenseNo}</div>
                                                <div>Vergi: {dealer.taxNo || '-'}</div>
                                                <div>Karar: {dealer.decisionNo || '-'}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                <div className="flex items-center">
                                                    <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                                                    {dealer.city} / {dealer.district}
                                                </div>
                                                <div className="mt-1 text-xs text-gray-400 truncate max-w-[200px]" title={dealer.address}>
                                                    {dealer.address}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <div className="text-xs">
                                                    <span className="font-medium">Başlangıç:</span> {dealer.startDate ? new Date(dealer.startDate).toLocaleDateString() : '-'}
                                                </div>
                                                <div className="text-xs">
                                                    <span className="font-medium">Bitiş:</span> {dealer.endDate ? new Date(dealer.endDate).toLocaleDateString() : '-'}
                                                </div>
                                                <div className="mt-1 text-xs text-blue-600">
                                                    <span className="font-medium">Sözleşme:</span> {dealer.contractEndDate ? new Date(dealer.contractEndDate).toLocaleDateString() : '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${dealer.status?.includes('Yürürlükte')
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {dealer.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                            <div className="flex flex-1 justify-between sm:hidden">
                                <button
                                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Önceki
                                </button>
                                <button
                                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                    className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Sonraki
                                </button>
                            </div>
                            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-gray-700">
                                        Toplam <span className="font-medium">{filteredDealers.length}</span> kayıttan <span className="font-medium">{startIndex + 1}</span> - <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredDealers.length)}</span> arası gösteriliyor
                                    </p>
                                </div>
                                <div>
                                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                        <button
                                            onClick={() => handlePageChange(currentPage - 1)}
                                            disabled={currentPage === 1}
                                            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                        >
                                            <span className="sr-only">Önceki</span>
                                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                                            </svg>
                                        </button>

                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                            <button
                                                key={page}
                                                onClick={() => handlePageChange(page)}
                                                className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${currentPage === page
                                                    ? 'z-10 bg-primary-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600'
                                                    : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        ))}

                                        <button
                                            onClick={() => handlePageChange(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                        >
                                            <span className="sr-only">Sonraki</span>
                                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
