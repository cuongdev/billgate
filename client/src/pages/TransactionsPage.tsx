import React, { useCallback, useEffect, useState } from 'react';
import { Search, Filter, RefreshCw } from 'lucide-react';
import { TransactionsTable } from '../components/TransactionsTable';
import { useTransactionEvents } from '../contexts/SocketContext';
import { apiFetch } from '../services/apiClient';

interface Transaction {
	id: string;
	bankTransactionId?: string;
	accountNumber: string | null;
	keyShare: string | null;
	date: string | Date;
	amount: string;
	currency: string;
	note: string;
	senderAccount: string;
	createdAt: number;
}

export const TransactionsPage: React.FC = () => {
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [loading, setLoading] = useState(true);
	const [filterAccount, setFilterAccount] = useState('');
	const [search, setSearch] = useState('');
	// Default sort by date desc
	const [sortField, setSortField] = useState('date');
	const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

	const [startDate, setStartDate] = useState('');
	const [endDate, setEndDate] = useState('');
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);

	const fetchTransactions = useCallback(async () => {
		setLoading(true);
		try {
			const params = new URLSearchParams({
				page: String(page),
				limit: '50',
				sort: sortOrder,
				sortBy: sortField,
				search,
				accountNumber: filterAccount
			});
			if (startDate) params.set('startDate', startDate);
			if (endDate) params.set('endDate', endDate);
			const res = await apiFetch(`/api/vpbank/transactions?${params}`);
			const data = await res.json();
			setTransactions(data.transactions || []);
			setTotal(data.total || 0);
		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
		}
	}, [page, sortOrder, sortField, search, filterAccount, startDate, endDate]);

	useEffect(() => {
		void fetchTransactions();
	}, [fetchTransactions]);

	// Lắng nghe transaction events toàn cục, chỉ reload khi có batch mới từ DB (không reload với FCM-only event)
	useTransactionEvents(undefined, (event) => {
		if (event.type === 'fcm_notification') return;
		void fetchTransactions();
	});

	const handleExport = async () => {
		try {
			const params = new URLSearchParams({
				accountNumber: filterAccount,
				search,
				startDate,
				endDate
			});

			const res = await apiFetch(`/api/vpbank/export-transactions?${params}`);
			if (!res.ok) throw new Error('Export failed');

			const blob = await res.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `transactions-all-${Date.now()}.csv`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
		} catch (err) {
			console.error('Export error:', err);
		}
	};

	const handleSort = (field: string) => {
		if (sortField === field) {
			setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
		} else {
			setSortField(field);
			setSortOrder('desc');
		}
	};

	return (
		<div className="p-8 max-w-7xl mx-auto">
			<div className="flex justify-between items-center mb-8">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Lịch sử giao dịch</h1>
					<p className="text-gray-500 mt-1">Toàn bộ biến động số dư trên hệ thống</p>
				</div>
				<div className="flex gap-4">
					<button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">
						<Filter className="w-4 h-4" /> Xuất Excel
					</button>
					<button onClick={fetchTransactions} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
						<RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
					</button>
				</div>
			</div>

			{/* Filters */}
			<div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-wrap gap-4 items-end">
				<div className="flex-1 min-w-[200px]">
					<label className="block text-xs font-medium text-gray-500 mb-1">Tìm kiếm</label>
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
						<input
							type="text"
							placeholder="Nội dung, số tiền, số tài khoản..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
						/>
					</div>
				</div>
				<div className="w-[180px]">
					<label className="block text-xs font-medium text-gray-500 mb-1">Số tài khoản</label>
					<input
						type="text"
						placeholder="Tất cả"
						value={filterAccount}
						onChange={(e) => setFilterAccount(e.target.value)}
						className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
					/>
				</div>
				<div className="w-[150px]">
					<label className="block text-xs font-medium text-gray-500 mb-1">Tình trạng</label>
					<select
						disabled
						className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-400 text-sm"
					>
						<option>Tất cả</option>
					</select>
				</div>
				<div className="w-[150px]">
					<label className="block text-xs font-medium text-gray-500 mb-1">Từ ngày</label>
					<input
						type="date"
						value={startDate}
						onChange={(e) => setStartDate(e.target.value)}
						className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
					/>
				</div>
				<div className="w-[150px]">
					<label className="block text-xs font-medium text-gray-500 mb-1">Đến ngày</label>
					<input
						type="date"
						value={endDate}
						onChange={(e) => setEndDate(e.target.value)}
						className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
					/>
				</div>
			</div>

			{/* Table Component */}
			<TransactionsTable
				transactions={transactions}
				loading={loading}
				sortField={sortField}
				sortOrder={sortOrder}
				onSort={handleSort}
				showAccountColumn={true}
			/>

			{/* Pagination - Simple */}
			<div className="flex justify-between items-center px-6 py-4 mt-4">
				<span className="text-sm text-gray-500">Hiển thị {transactions.length} / {total} giao dịch</span>
				<div className="flex gap-2">
					<button
						disabled={page === 1}
						onClick={() => setPage(p => p - 1)}
						className="px-3 py-1 border border-gray-300 rounded bg-white text-sm disabled:opacity-50 hover:bg-gray-50"
					>
						Trước
					</button>
					<button
						disabled={transactions.length < 50}
						onClick={() => setPage(p => p + 1)}
						className="px-3 py-1 border border-gray-300 rounded bg-white text-sm disabled:opacity-50 hover:bg-gray-50"
					>
						Sau
					</button>
				</div>
			</div>
		</div>
	);
};
