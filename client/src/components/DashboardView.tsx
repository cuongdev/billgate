import React, { useEffect, useState, useMemo } from 'react';
import { Activity, CreditCard, TrendingUp, RefreshCw, DollarSign, BarChart2, Clock, Tag, AlertTriangle, Calendar as CalendarIcon } from 'lucide-react';
import {
	AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
	BarChart, Bar, Cell, PieChart as RePie, Pie
} from 'recharts';
import { apiFetch } from '../services/apiClient';

interface DailyStat {
	date: string;
	amount: number;
	count: number;
}

interface HourlyStat {
	hour: number;
	amount: number;
	count: number;
}

interface WebhookStats {
	total: number;
	success: number;
	failed: number;
	errorBreakdown: { type: string; count: number }[];
}

interface Stats {
	activeWorkflows: number;
	totalTransactions: number;
	totalVolume: number;
	todayVolume: number;
	avgTransactionValue: number;
	dailyData: DailyStat[];
	hourlyStats: HourlyStat[];
	topKeywords: { keyword: string; count: number }[];
	webhookStats?: WebhookStats;
}

interface Transaction {
	id: string;
	date: string;
	amount: string;
	note: string;
	accountNumber: string;
}

type TimeRange = 'today' | 'week' | 'month' | 'custom';

interface DashboardViewProps {
	initialAccount?: string;
	hideHeader?: boolean;
	layoutMode?: 'default' | 'detail';
}

export const DashboardView: React.FC<DashboardViewProps> = ({ initialAccount, hideHeader = false, layoutMode = 'default' }) => {
	const [stats, setStats] = useState<Stats>({
		activeWorkflows: 0,
		totalTransactions: 0,
		totalVolume: 0,
		todayVolume: 0,
		avgTransactionValue: 0,
		dailyData: [],
		hourlyStats: [],
		topKeywords: []
	});

	const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
	const [loading, setLoading] = useState(true);

	const [timeRange, setTimeRange] = useState<TimeRange>('month');
	const [customStart, setCustomStart] = useState<string>('');
	const [customEnd, setCustomEnd] = useState<string>('');

	const [accounts, setAccounts] = useState<any[]>([]);
	const [selectedAccount, setSelectedAccount] = useState<string>(initialAccount || 'all');

	useEffect(() => {
		if (!initialAccount) {
			apiFetch('/api/vpbank/sessions')
				.then(res => res.json())
				.then(data => {
					if (data.sessions) setAccounts(data.sessions);
				})
				.catch(err => console.error('Failed to fetch sessions:', err));
		} else {
			setSelectedAccount(initialAccount);
		}
	}, [initialAccount]);

	const dateParams = useMemo(() => {
		const now = new Date();
		now.setHours(23, 59, 59, 999);

		let start = new Date();
		let end = now;

		if (timeRange === 'today') {
			start.setHours(0, 0, 0, 0);
		} else if (timeRange === 'week') {
			start.setDate(now.getDate() - 7);
			start.setHours(0, 0, 0, 0);
		} else if (timeRange === 'month') {
			start.setDate(now.getDate() - 30);
			start.setHours(0, 0, 0, 0);
		} else if (timeRange === 'custom') {
			if (customStart) {
				start = new Date(customStart);
				start.setHours(0, 0, 0, 0);
			}
			if (customEnd) {
				end = new Date(customEnd);
				end.setHours(23, 59, 59, 999);
			}
		}

		return {
			startDate: start.getTime(),
			endDate: end.getTime()
		};
	}, [timeRange, customStart, customEnd]);

	const fetchStats = async () => {
		setLoading(true);
		try {
			const wfRes = await apiFetch('/api/workflows');
			const wfData = await wfRes.json();
			const activeWf = wfData.workflows ? wfData.workflows.filter((w: any) => w.status === 'RUNNING').length : 0;
			const query = new URLSearchParams({
				startDate: dateParams.startDate.toString(),
				endDate: dateParams.endDate.toString(),
				keyShare: selectedAccount
			});
			const statsRes = await apiFetch(`/api/vpbank/stats?${query.toString()}`);
			if (statsRes.ok) {
				const statsData = await statsRes.json();

				setStats({
					activeWorkflows: activeWf,
					totalTransactions: statsData.totalTransactions || 0,
					totalVolume: statsData.totalVolume || 0,
					todayVolume: statsData.todayVolume || 0,
					avgTransactionValue: statsData.avgTransactionValue || 0,
					dailyData: statsData.dailyData || [],
					hourlyStats: statsData.hourlyStats || [],
					topKeywords: statsData.topKeywords || [],
					webhookStats: statsData.webhookStats
				});
			}

			const txQuery = new URLSearchParams({ limit: '5', account: selectedAccount });
			const txRes = await apiFetch(`/api/vpbank/transactions?${txQuery.toString()}`);
			if (txRes.ok) {
				const txData = await txRes.json();
				setRecentTransactions(txData.transactions || []);
			}

		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchStats();
	}, [dateParams, selectedAccount]);

	const formatCurrency = (val: number) => {
		return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
	};

	const webhookSuccessRate = useMemo(() => {
		if (!stats.webhookStats || stats.webhookStats.total === 0) return 100;
		return Math.round((stats.webhookStats.success / stats.webhookStats.total) * 100);
	}, [stats.webhookStats]);

	const StatCard = ({ title, value, icon: Icon, color, subtext, extra, onClick, valueColor }: any) => (
		<div
			onClick={onClick}
			className={`bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_2px_12px_-4px_rgba(6,81,237,0.1)] hover:shadow-[0_10px_30px_-10px_rgba(6,81,237,0.2)] transition-all duration-300 relative overflow-hidden group ${onClick ? 'cursor-pointer' : ''}`}
		>
			<div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full ${color} opacity-[0.03] group-hover:scale-125 transition-transform duration-500`}></div>
			<div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${color} opacity-[0.05] group-hover:scale-110 transition-transform duration-300 delay-75`}></div>

			<div className="flex items-start justify-between relative z-10 mb-4">
				<div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color} bg-opacity-10 text-${color.replace('bg-', '')} shadow-sm group-hover:scale-110 transition-transform`}>
					<Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
				</div>
			</div>

			<div>
				<h3 className="text-gray-500 text-sm font-semibold mb-1 tracking-wide">{title}</h3>
				<div className={`text-3xl font-extrabold tracking-tight ${valueColor || 'text-gray-900'} drop-shadow-sm`}>{value}</div>
			</div>

			{subtext && (
				<div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-50">
					<div className="text-xs font-semibold px-2 py-1 rounded-md flex items-center gap-1.5 bg-gray-50 text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
						<TrendingUp className="w-3.5 h-3.5" /> {subtext}
					</div>
				</div>
			)}
			{extra}
		</div>
	);

	const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

	// Render Logic Based on Layout Mode

	// Components to reuse
	const TotalVolumeCard = () => (
		<StatCard
			title="Tổng Dòng Tiền"
			value={formatCurrency(stats.totalVolume)}
			icon={DollarSign}
			color="bg-emerald-600"
			trendColor={stats.totalVolume >= 0 ? 'text-emerald-600' : 'text-rose-600'}
			valueColor={stats.totalVolume >= 0 ? 'text-gray-900' : 'text-rose-600'}
			subtext={timeRange === 'today' ? 'Doanh thu hôm nay' : 'Trong kỳ đã chọn'}
		/>
	);

	const ATVCard = () => (
		<StatCard
			title="Giá trị TB/Giao dịch"
			value={formatCurrency(stats.avgTransactionValue)}
			icon={BarChart2}
			color="bg-indigo-600"
			valueColor={stats.avgTransactionValue >= 0 ? 'text-gray-900' : 'text-rose-600'}
			subtext="Trung bình mỗi GD"
		/>
	);

	const WebhookCard = () => (
		<StatCard
			title="Webhook Health"
			value={`${webhookSuccessRate}%`}
			icon={Activity}
			color={webhookSuccessRate > 98 ? "bg-blue-600" : "bg-orange-500"}
			valueColor={webhookSuccessRate > 98 ? "text-blue-600" : "text-orange-600"}
			extra={(
				<div className="mt-3 flex gap-1">
					<div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
						<div
							className={`h-full rounded-full ${webhookSuccessRate > 98 ? 'bg-blue-500' : 'bg-orange-500'}`}
							style={{ width: `${webhookSuccessRate}%` }}
						></div>
					</div>
				</div>
			)}
		/>
	);

	const CountCard = () => (
		<StatCard
			title="Số lượng giao dịch"
			value={stats.totalTransactions.toLocaleString()}
			icon={CreditCard}
			color="bg-purple-600"
			subtext={`${Math.round(stats.totalTransactions / (Math.max(1, (dateParams.endDate - dateParams.startDate) / (1000 * 60 * 60 * 24))))} / ngày`}
		/>
	);

	const HourlyChart = () => (
		<div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_2px_12px_-4px_rgba(6,81,237,0.1)]">
			<div className="flex justify-between items-center mb-6">
				<h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
					<Clock className="w-5 h-5 text-indigo-600" />
					Phân bổ giao dịch theo giờ (Peak Hours)
				</h3>
			</div>
			<div className="h-[300px] w-full">
				<ResponsiveContainer width="100%" height="100%">
					<BarChart data={stats.hourlyStats}>
						<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
						<XAxis dataKey="hour" tickFormatter={(v) => `${v}h`} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
						<YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
						<Tooltip
							cursor={{ fill: '#F3F4F6' }}
							contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
							formatter={(value: any, name: any) => [
								name === 'amount' ? formatCurrency(Number(value)) : value,
								name === 'amount' ? 'Doanh số' : 'Số lượng'
							]}
							labelFormatter={(l) => `Khung giờ: ${l}:00 - ${l}:59`}
						/>
						<Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="count">
							{stats.hourlyStats.map((entry, index) => (
								<Cell key={`cell-${index}`} fillOpacity={0.6 + (entry.count / Math.max(1, ...stats.hourlyStats.map(s => s.count)) * 0.4)} />
							))}
						</Bar>
					</BarChart>
				</ResponsiveContainer>
			</div>
		</div>
	);

	const KeywordChart = () => (
		<div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_2px_12px_-4px_rgba(6,81,237,0.1)]">
			<div className="flex justify-between items-center mb-6">
				<h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
					<Tag className="w-5 h-5 text-pink-600" />
					Top Từ khóa
				</h3>
			</div>
			<div className="flex flex-wrap gap-2">
				{stats.topKeywords.length === 0 && <div className="text-gray-400 text-sm">Chưa có dữ liệu</div>}
				{stats.topKeywords.map((kw, idx) => (
					<div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-pink-50 text-pink-700 rounded-lg text-sm font-medium border border-pink-100">
						<span>{kw.keyword}</span>
						<span className="bg-white px-1.5 py-0.5 rounded-md text-xs text-pink-500 font-bold shadow-sm">{kw.count}</span>
					</div>
				))}
			</div>
			{/* Error Breakdown if any */}
			{stats.webhookStats && stats.webhookStats.failed > 0 && (
				<div className="mt-8 pt-6 border-t border-gray-100">
					<h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm">
						<AlertTriangle className="w-4 h-4 text-orange-500" />
						Phân tích lỗi Webhook
					</h4>
					<div className="h-[150px] w-full flex text-xs">
						<ResponsiveContainer width="100%" height="100%">
							<RePie>
								<Pie
									data={stats.webhookStats.errorBreakdown}
									dataKey="count"
									nameKey="type"
									cx="50%"
									cy="50%"
									innerRadius={40}
									outerRadius={60}
								>
									{stats.webhookStats.errorBreakdown.map((_entry, index) => (
										<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
									))}
								</Pie>
							</RePie>
						</ResponsiveContainer>
						<div className="flex flex-col justify-center gap-1 w-1/2">
							{stats.webhookStats.errorBreakdown.slice(0, 3).map((err, idx) => (
								<div key={idx} className="flex items-center gap-1.5 text-xs text-gray-600">
									<div className="w-2 h-2 rounded-full" style={{ background: COLORS[idx % COLORS.length] }}></div>
									<div className="truncate">{err.type}</div>
									<div className="font-bold text-gray-900 ml-auto">{err.count}</div>
								</div>
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	);

	const TrendChart = () => (
		<div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_2px_12px_-4px_rgba(6,81,237,0.1)]">
			<div className="flex justify-between items-center mb-6">
				<h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
					<TrendingUp className="w-5 h-5 text-green-600" />
					Biểu đồ dòng tiền (Daily Trend)
				</h3>
			</div>
			<div className="h-[350px] w-full">
				<ResponsiveContainer width="100%" height="100%">
					<AreaChart data={stats.dailyData}>
						<defs>
							<linearGradient id="colorAmountGreen" x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
								<stop offset="95%" stopColor="#10B981" stopOpacity={0} />
							</linearGradient>
						</defs>
						<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
						<XAxis
							dataKey="date"
							tickFormatter={(val) => {
								const d = new Date(val);
								return `${d.getDate()}/${d.getMonth() + 1}`;
							}}
							axisLine={false}
							tickLine={false}
							tick={{ fill: '#9CA3AF', fontSize: 12 }}
							dy={10}
							minTickGap={30}
						/>
						<YAxis
							tickFormatter={(val) => {
								if (val >= 1000000000) return `${(val / 1000000000).toFixed(1)}B`;
								if (val >= 1000000) return `${(val / 1000000).toFixed(0)}M`;
								if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
								return val;
							}}
							axisLine={false}
							tickLine={false}
							tick={{ fill: '#9CA3AF', fontSize: 12 }}
							dx={-10}
						/>
						<Tooltip
							contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
							formatter={(value: any) => [formatCurrency(value), 'Doanh thu']}
							labelFormatter={(label) => new Date(label).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
						/>
						<Area
							type="monotone"
							dataKey="amount"
							stroke="#10B981"
							strokeWidth={3}
							fillOpacity={1}
							fill="url(#colorAmountGreen)"
							animationDuration={1000}
						/>
					</AreaChart>
				</ResponsiveContainer>
			</div>
		</div>
	);

	const RecentTx = () => (
		<div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_2px_12px_-4px_rgba(6,81,237,0.1)]">
			<h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
				<Clock className="w-5 h-5 text-gray-500" />
				Giao dịch mới nhất
			</h3>
			<div className="space-y-4">
				{recentTransactions.length === 0 ? (
					<div className="text-gray-400 text-sm text-center py-4">Chưa có giao dịch nào</div>
				) : (
					recentTransactions.map((tx) => (
						<div key={tx.id} className="flex items-center justify-between group p-2 hover:bg-gray-50 rounded-lg transition-colors -mx-2">
							<div className="flex items-center gap-3 overflow-hidden">
								<div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0 text-green-600 font-bold text-xs">
									IN
								</div>
								<div className="min-w-0">
									<div className="text-sm font-medium text-gray-900 truncate pr-2">{tx.note || 'Chuyển tiền'}</div>
									<div className="text-xs text-gray-400">{tx.date}</div>
								</div>
							</div>
							<div className="font-bold text-sm text-gray-900 whitespace-nowrap">
								+{parseFloat(tx.amount.replace(/[^0-9.-]+/g, '')).toLocaleString('vi-VN')}
							</div>
						</div>
					))
				)}
			</div>
			{/* View All Link */}
			<button className="w-full mt-4 py-2 text-xs text-gray-500 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors font-medium border-t border-gray-50">
				Xem tất cả lịch sử
			</button>
		</div>
	);

	return (
		<div className={`max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500 ${hideHeader ? '' : 'p-8'}`}>
			{/* Header with Filters */}
			<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
				{!hideHeader && (
					<div>
						<h1 className="text-3xl font-bold text-gray-900 tracking-tight">Tổng quan</h1>
						<p className="text-gray-500 mt-1 flex items-center gap-2 text-sm">
							<Clock className="w-4 h-4" />
							Dữ liệu được làm mới lúc: {new Date().toLocaleTimeString('vi-VN')}
						</p>
					</div>
				)}
				{hideHeader && <div></div>} {/* Spacer if header hidden */}

				<div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm ml-auto">
					{/* Account Selector (Hidden if initialAccount is set) */}
					{!initialAccount && (
						<>
							<div className="relative group">
								<select
									value={selectedAccount}
									onChange={(e) => setSelectedAccount(e.target.value)}
									className="appearance-none bg-gray-50 border border-transparent hover:bg-gray-100 hover:border-gray-200 text-gray-700 text-sm font-semibold py-2 pl-3 pr-8 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer min-w-[150px]"
								>
									<option value="all">Tất cả tài khoản</option>
									{accounts.map((acc: any) => (
										<option key={acc.keyShare} value={acc.keyShare}>
											{acc.keyShare} {acc.accountNumber ? `- ${acc.name}` : ''}
										</option>
									))}
								</select>
								<div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
									<CreditCard className="w-3.5 h-3.5" />
								</div>
							</div>
							<div className="w-px h-6 bg-gray-200 mx-1"></div>
						</>
					)}

					{(['today', 'week', 'month'] as const).map((range) => (
						<button
							key={range}
							onClick={() => setTimeRange(range)}
							className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${timeRange === range
								? 'bg-gray-900 text-white shadow-md'
								: 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
								}`}
						>
							{range === 'today' ? 'Hôm nay' : range === 'week' ? 'Tuần này' : 'Tháng này'}
						</button>
					))}

					{/* Custom Range Button */}
					<button
						onClick={() => setTimeRange('custom')}
						className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${timeRange === 'custom'
							? 'bg-gray-900 text-white shadow-md'
							: 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
							}`}
					>
						<CalendarIcon className="w-4 h-4" /> Tùy chọn
					</button>

					<div className="w-px h-6 bg-gray-200 mx-1"></div>
					<button
						onClick={fetchStats}
						className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
						title="Làm mới"
					>
						<RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
					</button>
				</div>
			</div>

			{/* Custom Date Inputs (Visible only when 'custom' is selected) */}
			{timeRange === 'custom' && (
				<div className="w-full flex justify-end animate-in fade-in slide-in-from-top-1 duration-200 z-0 relative">
					<div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-2 rounded-xl border border-gray-100 shadow-lg shadow-blue-500/5">
						<div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg border border-gray-100 group focus-within:bg-white focus-within:border-blue-200 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
							<span className="text-xs font-semibold text-gray-400 uppercase tracking-wider group-focus-within:text-blue-500">Từ</span>
							<input
								type="date"
								value={customStart}
								onChange={(e) => setCustomStart(e.target.value)}
								className="bg-transparent border-none p-0 text-sm font-semibold text-gray-700 focus:ring-0 cursor-pointer outline-none"
							/>
						</div>

						<div className="hidden sm:block text-gray-300">
							<Clock className="w-4 h-4 rotate-90 sm:rotate-0" />
						</div>

						<div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg border border-gray-100 group focus-within:bg-white focus-within:border-blue-200 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
							<span className="text-xs font-semibold text-gray-400 uppercase tracking-wider group-focus-within:text-blue-500">Đến</span>
							<input
								type="date"
								value={customEnd}
								onChange={(e) => setCustomEnd(e.target.value)}
								className="bg-transparent border-none p-0 text-sm font-semibold text-gray-700 focus:ring-0 cursor-pointer outline-none"
							/>
						</div>
					</div>
				</div>
			)}

			{/* --- LAYOUT RENDERING --- */}
			{layoutMode === 'detail' ? (
				<div className="flex flex-col gap-6">
					{/* Row 1: Volume & ATV */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
						<TotalVolumeCard />
						<ATVCard />
					</div>
					{/* Row 2: Health & Count */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
						<WebhookCard />
						<CountCard />
					</div>
					{/* Row 3: Hourly */}
					<div>
						<HourlyChart />
					</div>
					{/* Row 4: Keywords */}
					<div>
						<KeywordChart />
					</div>
					{/* Row 5: Trend */}
					<div>
						<TrendChart />
					</div>
					{/* Row 6: Recent */}
					<div>
						<RecentTx />
					</div>
				</div>
			) : (
				/* DEFAULT LAYOUT */
				<>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
						<TotalVolumeCard />
						<ATVCard />
						<WebhookCard />
						<CountCard />
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
						<div className="lg:col-span-2">
							<HourlyChart />
						</div>
						<div>
							<KeywordChart />
						</div>
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
						<div className="lg:col-span-2">
							<TrendChart />
						</div>
						<div>
							<RecentTx />
						</div>
					</div>
				</>
			)}
		</div>
	);
};

