import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
	CreditCard,
	ArrowLeft,
	Globe,
	Pause,
	Play,
	RefreshCw,
	Copy,
	Activity,
	Settings,
	Plus,
	X,
	Link as LinkIcon,
	Trash2,
	Edit2,
	Search,
	Filter,
	BarChart2
} from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';
import { WebhookForm, WebhookConfig } from '../components/WebhookForm';
import { TransactionsTable } from '../components/TransactionsTable';
import { WebhookLogsTable } from '../components/WebhookLogsTable';
import { DashboardView } from '../components/DashboardView'; // Import DashboardView
import { useTransactionEvents, isAudioEnabledForAccount, setAudioEnabledForAccount } from '../contexts/SocketContext';
import { apiFetch } from '../services/apiClient';

interface WorkflowDetail {
	workflowId: string;
	type: string;
	status: string; // logical status from workflow: RUNNING | PAUSED | WAITING_AUTH | STOPPED
	executionStatus?: string; // raw Temporal execution status
	startTime: string;
	historyLength: number;
	lastHeartbeat?: number;
	lastListenerActivity?: number;
	/** Số tài khoản VPBank (dùng cho VietQR, hiển thị) */
	accountNumber?: string | null;
	name?: string | null;
	keyShare?: string;
}

interface WebhookLog {
	id: number;
	configName: string;
	transactionId: string;
	status: 'success' | 'failed' | 'pending';
	statusCode: number;
	createdAt: number;
}

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
	createdAt: number | string;
}



export const WorkflowDetailPage: React.FC = () => {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { error, success } = useNotification();

	const [workflow, setWorkflow] = useState<WorkflowDetail | null>(null);
	const [activeTab, setActiveTab] = useState<
		'dashboard' | 'details' | 'webhooks' | 'transactions' | 'settings'
	>('dashboard');


	const [search, setSearch] = useState('');
	const [sortField, setSortField] = useState('date');
	const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
	const [startDate, setStartDate] = useState('');
	const [endDate, setEndDate] = useState('');
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);

	const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
	const [loading, setLoading] = useState(true);

	const [showAddWebhook, setShowAddWebhook] = useState(false);
	const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | undefined>(
		undefined
	);

	const accountId = workflow?.workflowId?.replace('vpbank-account-', '') ?? '';
	const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [isPaused, setIsPaused] = useState(false);

	const handleTestSound = () => {
		if (typeof window === 'undefined') return;
		try {
			const audio = new Audio('/assets/2000.mp3');
			audio.play().catch((e) => {
				console.warn('[WorkflowDetail] Test sound failed', e);
			});
		} catch (e) {
			console.warn('[WorkflowDetail] Test sound failed', e);
		}
	};

	const fetchTransactions = useCallback(async () => {
		if (!accountId) return;
		setLoading(true);
		try {
			const params = new URLSearchParams({
				page: String(page),
				limit: '20',
				accountNumber: accountId,
				search,
				sort: sortOrder,
				sortBy: sortField
			});
			if (startDate) params.set('startDate', startDate);
			if (endDate) params.set('endDate', endDate);
			const txRes = await apiFetch(`/api/vpbank/transactions?${params}`);
			if (txRes.ok) {
				const txData = await txRes.json();
				setTransactions(txData.transactions ?? []);
				setTotal(txData.total || 0);
			}
		} catch (e) {
			console.error('Failed to fetch transactions', e);
		} finally {
			setLoading(false);
		}
	}, [accountId, page, search, sortOrder, sortField, startDate, endDate]);

	const handleSort = (field: string) => {
		if (sortField === field) {
			setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
		} else {
			setSortField(field);
			setSortOrder('desc');
		}
	};

	const handleExport = async () => {
		try {
			const params = new URLSearchParams({
				accountNumber: accountId,
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
			a.download = `transactions-${accountId}-${Date.now()}.csv`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
		} catch (e: any) {
			error(e.message || 'Failed to export transactions');
		}
	};

	const fetchData = useCallback(async () => {
		if (!id) return;

		setLoading(true);
		try {
			const wfRes = await apiFetch(`/api/workflows/${id}`);
			if (!wfRes.ok) throw new Error('Failed to load workflow');
			const wfData: WorkflowDetail = await wfRes.json();
			setWorkflow(wfData);
			setIsPaused(wfData.status === 'paused');

			const accId = wfData.workflowId.replace('vpbank-account-', '');
			const keyShare = accId;

			const logsRes = await apiFetch(`/api/vpbank/webhook-logs?limit=20`);
			if (logsRes.ok) {
				const data = await logsRes.json();
				setWebhookLogs(data.logs ?? []);
			}

			const whRes = await apiFetch('/api/vpbank/webhooks');
			if (whRes.ok) {
				const whData = await whRes.json();
				const allHooks = (whData.webhooks ?? []) as WebhookConfig[];
				const accountHooks = allHooks.filter((w) => {
					const filter = (w.filterAccount ?? []) as string[];
					return filter.length === 0 || filter.includes(keyShare);
				});
				setWebhooks(accountHooks);
			}
		} catch (err: any) {
			error(err?.message || 'Error loading data');
		} finally {
			setLoading(false);
		}
	}, [error, id]);

	useEffect(() => {
		if (activeTab === 'transactions' && accountId) {
			void fetchTransactions();
		}
	}, [page, sortField, sortOrder, activeTab, accountId, fetchTransactions]);

	useTransactionEvents(accountId || undefined, (event) => {
		if (event.type === 'fcm_notification') return;
		void fetchTransactions();
		if (activeTab === 'webhooks') {
			void fetchData();
		}
	});

	useEffect(() => {
		if (id) void fetchData();
	}, [id, fetchData]);

	useEffect(() => {
		if (!accountId) return;
		setAudioEnabled(isAudioEnabledForAccount(accountId));
	}, [accountId]);

	const handleAction = async (action: 'pause' | 'resume') => {
		if (!id) return;

		try {
			const endpointAction = action === 'pause' ? 'pause' : action;
			const res = await apiFetch(`/api/workflows/${id}/${endpointAction}`, {
				method: 'POST',
			});
			if (!res.ok) throw new Error(`Action ${action} failed`);

			const newStatus = action === 'pause' ? 'paused' : 'active';
			setIsPaused(action === 'pause');
			setWorkflow(prev => prev ? { ...prev, status: newStatus } : null);

			success(`Thao tác ${action} thành công`);

			setTimeout(() => {
				fetchData();
			}, 500);
		} catch (err: any) {
			error(err?.message);
		}
	};

	const handleDeleteWorkflow = async () => {
		if (!id) return;

		try {
			const res = await apiFetch(`/api/workflows/${id}`, { method: 'DELETE' });
			if (!res.ok) throw new Error('Failed to delete workflow');
			success('Xóa kết nối thành công');
			navigate('/workflows');
		} catch (err: any) {
			error(err?.message);
		}
	};

	const handleSaveWebhook = async (config: Partial<WebhookConfig>) => {
		try {
			const method = config.id ? 'PUT' : 'POST';
			const url = config.id ? `/api/vpbank/webhooks/${config.id}` : '/api/vpbank/webhooks';

			let parsedHeaders: Record<string, any> = {};
			try {
				parsedHeaders = JSON.parse((config.headers as any) || '{}');
			} catch (e) {
			}

			let configObj: any = {
				headers: parsedHeaders,
				auth_type: (config as any).authType,
				auth_value: (config as any).authVal,
			};

			if (config.type === 'telegram') {
				configObj = {
					bot_token: (config as any).authVal,
					chat_id: config.url,
				};
			}

			const payload = {
				...config,
				url: config.type === 'telegram' ? (config.url ?? '') : config.url,
				config: configObj,
				filterAccount: accountId ? [accountId] : [],
			};

			const res = await apiFetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			if (!res.ok) throw new Error('Failed to save webhook');

			success(config.id ? 'Cập nhật webhook thành công!' : 'Thêm mới webhook thành công!');
			setShowAddWebhook(false);
			setEditingWebhook(undefined);
			fetchData();
		} catch (err: any) {
			error(err?.message);
		}
	};

	const handleDeleteWebhook = async (webhookId: number) => {
		if (!confirm('Xóa cấu hình webhook này?')) return;
		try {
			const res = await apiFetch(`/api/vpbank/webhooks/${webhookId}`, { method: 'DELETE' });
			if (!res.ok) throw new Error('Failed to delete webhook');
			success('Đã xóa webhook');
			fetchData();
		} catch (err: any) {
			error(err?.message);
		}
	};







	if (loading && !workflow) {
		return (
			<div className="p-8 flex justify-center">
				<RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
			</div>
		);
	}

	if (!workflow) {
		return <div className="p-8 text-center text-red-500">Không tìm thấy kết nối</div>;
	}

	return (
		<div className="p-6 max-w-6xl mx-auto">
			{/* Navigation */}
			<button
				onClick={() => navigate('/workflows')}
				className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors"
			>
				<ArrowLeft className="w-4 h-4" /> Quay lại danh sách
			</button>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				{/* Left Column */}
				<div className="lg:col-span-1 space-y-6">
					<div className="bg-gradient-to-br from-green-600 to-emerald-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
						<div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
						<div className="flex justify-between items-start mb-8">
							<div className="font-bold text-lg tracking-wider">VPBank</div>
							<Activity className="w-6 h-6 opacity-80" />
						</div>

						<div className="mb-6">
							<div className="text-green-100 text-xs uppercase tracking-widest mb-1">
								Key Share
							</div>
							<div className="text-2xl font-mono font-bold tracking-wider flex items-center gap-2">
								{accountId}
								<Copy
									className="w-4 h-4 opacity-50 cursor-pointer hover:opacity-100"
									onClick={() => {
										navigator.clipboard.writeText(accountId);
										success('Đã copy key share');
									}}
								/>
							</div>
						</div>

						<div className="flex justify-between items-end">
							<div className="flex items-center gap-2">
								<div
									className={`w-2 h-2 rounded-full ${workflow.status === 'active'
										? 'bg-green-400 animate-pulse'
										: workflow.status === 'paused'
											? 'bg-yellow-400'
											: 'bg-red-400'
										}`}
								></div>
								<span className="text-sm font-medium text-green-50">
									{workflow.status === 'active'
										? 'Đang hoạt động'
										: workflow.status === 'paused'
											? 'Đã tạm dừng'
											: workflow.status}
								</span>
							</div>

						</div>
					</div>

					{/* QR Code – chỉ hiển thị khi có số tài khoản VPBank (accountNumber từ API) */}
					{workflow.accountNumber && workflow.accountNumber.trim() && workflow.accountNumber !== 'Unknown' && (
						<div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col items-center text-center">
							<div className="bg-white p-2 border border-gray-100 rounded-lg shadow-inner mb-3">
								<img
									src={`https://img.vietqr.io/image/VPB-${workflow.accountNumber.trim()}-compact.png`}
									alt="VietQR"
									className="w-48 h-auto"
								/>
							</div>
							<p className="text-xs text-gray-400">Quét mã để chuyển khoản</p>
						</div>
					)}

					{/* Compact Actions */}
					<div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
						<h3 className="font-medium text-sm text-gray-900 mb-3">Thao tác nhanh</h3>
						<div className="flex gap-2 justify-center">
							<button
								onClick={fetchData}
								className="p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-all flex-1 flex flex-col items-center gap-1 group"
								title="Tải lại trạng thái kết nối và log mới nhất"
							>
								<RefreshCw className="w-5 h-5 group-hover:text-blue-600" />
								<span className="text-[10px] font-medium">Reload</span>
							</button>

							{/* Nút Tạm dừng / Tiếp tục: hiển thị khi trạng thái là active hoặc paused */}
							{['active', 'paused'].includes(workflow.status) && (
								(isPaused || workflow.status === 'paused') ? (
									<button
										onClick={() => handleAction('resume')}
										className="p-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all flex-1 flex flex-col items-center gap-1"
										title="Tiếp tục lắng nghe giao dịch"
									>
										<Play className="w-5 h-5" />
										<span className="text-[10px] font-medium">Tiếp tục</span>
									</button>
								) : (
									<button
										onClick={() => handleAction('pause')}
										className="p-2.5 rounded-lg border border-gray-200 hover:bg-orange-50 hover:border-orange-200 text-gray-600 hover:text-orange-600 transition-all flex-1 flex flex-col items-center gap-1"
										title="Tạm dừng lắng nghe giao dịch (có thể tiếp tục lại sau)"
									>
										<Pause className="w-5 h-5" />
										<span className="text-[10px] font-medium">Tạm dừng</span>
									</button>
								)
							)}

							<button
								onClick={() => setShowDeleteModal(true)}
								className="p-2.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 transition-all flex-1 flex flex-col items-center gap-1"
								title="Xóa kết nối này và toàn bộ cấu hình liên quan"
							>
								<Trash2 className="w-5 h-5" />
								<span className="text-[10px] font-medium">Xóa kết nối</span>
							</button>
						</div>
					</div>
				</div>

				{/* Right Column */}
				<div className="lg:col-span-2">
					<div className="bg-white rounded-xl border border-gray-200 shadow-sm min-h-[500px]">
						<div className="border-b border-gray-200">
							<nav className="flex px-4 overflow-x-auto">
								{[
									{ id: 'dashboard', label: 'Báo cáo', icon: BarChart2 },
									{ id: 'details', label: 'Chi tiết', icon: CreditCard },
									{ id: 'transactions', label: 'Giao dịch', icon: Activity },
									{ id: 'webhooks', label: 'Webhook Logs', icon: Globe },
									{ id: 'settings', label: 'Cấu hình', icon: Settings },
								].map((tab) => (
									<button
										key={tab.id}
										onClick={() => setActiveTab(tab.id as any)}
										className={`py-4 px-6 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === tab.id
											? 'border-blue-600 text-blue-600'
											: 'border-transparent text-gray-500 hover:text-gray-700'
											}`}
									>
										<tab.icon className="w-4 h-4" />
										{tab.label}
									</button>
								))}
							</nav>
						</div>

						<div className="p-6">
							{activeTab === 'dashboard' && (
								<DashboardView initialAccount={accountId} hideHeader={true} layoutMode="detail" />
							)}

							{activeTab === 'details' && (
								<div className="space-y-6">
									<div className="grid grid-cols-2 gap-6">
										<div className="p-4 bg-gray-50 rounded-lg">
											<div className="text-xs text-gray-500 mb-1">Thời gian bắt đầu</div>
											<div className="font-medium text-gray-900">
												{new Date(workflow.startTime).toLocaleString('vi-VN', {
													timeZone: 'Asia/Ho_Chi_Minh',
													hour: '2-digit',
													minute: '2-digit',
													second: '2-digit',
													day: '2-digit',
													month: '2-digit',
													year: 'numeric',
												})}
											</div>
										</div>
										<div className="p-4 bg-gray-50 rounded-lg">
											<div className="text-xs text-gray-500 mb-1">Trạng thái</div>
											<div className="font-medium text-gray-900">
												{workflow.status === 'active'
													? 'Đang hoạt động'
													: workflow.status === 'paused'
														? 'Đã tạm dừng'
														: workflow.status}
											</div>
										</div>
									</div>
								</div>
							)}

							{activeTab === 'transactions' && (
								<div className="overflow-hidden">
									{/* Filters - Copied and adapted from TransactionsPage */}
									<div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 flex flex-wrap gap-4 items-end">
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
										<div className="flex gap-2">
											<button
												onClick={handleExport}
												className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-100 font-medium text-sm flex items-center gap-2"
											>
												<Filter className="w-4 h-4" /> Xuất
											</button>
											<button
												onClick={fetchTransactions}
												className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
												title="Tìm kiếm / Làm mới"
											>
												<RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
											</button>
										</div>
									</div>

									<TransactionsTable
										transactions={transactions}
										loading={loading}
										sortField={sortField}
										sortOrder={sortOrder}
										onSort={handleSort}
										showAccountColumn={false}
									/>

									{/* Pagination */}
									<div className="flex justify-between items-center px-2 py-4 mt-2">
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
												disabled={transactions.length < 20}
												onClick={() => setPage(p => p + 1)}
												className="px-3 py-1 border border-gray-300 rounded bg-white text-sm disabled:opacity-50 hover:bg-gray-50"
											>
												Sau
											</button>
										</div>
									</div>
								</div>
							)}

							{activeTab === 'webhooks' && (
								<div className="overflow-hidden">
									<WebhookLogsTable
										logs={webhookLogs}
										loading={loading}
									/>
								</div>
							)}

							{activeTab === 'settings' && (
								<div className="space-y-8">
									{/* Audio Settings */}
									<div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
										<h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
											<Settings className="w-4 h-4" /> Cấu hình âm thanh
										</h3>
										<p className="text-xs text-gray-500 mb-3">
											Bật/tắt âm thanh bíp trên trình duyệt khi có giao dịch mới cho tài khoản này.
										</p>
										<div className="flex items-center justify-between gap-3">
											<div className="flex flex-col text-left">
												<span className="text-sm font-medium text-gray-800">
													Âm thanh thông báo
												</span>
												<span className="text-xs text-gray-500">
													Áp dụng cho tài khoản {accountId}.
												</span>
											</div>
											<div className="flex items-center gap-3">
												<button
													type="button"
													onClick={() => {
														const next = !audioEnabled;
														setAudioEnabled(next);
														if (accountId) {
															setAudioEnabledForAccount(accountId, next);
														}
													}}
													className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${audioEnabled ? 'bg-blue-600' : 'bg-gray-300'
														}`}
												>
													<span
														className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${audioEnabled ? 'translate-x-5' : 'translate-x-1'
															}`}
													/>
												</button>
												<button
													type="button"
													onClick={handleTestSound}
													className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
												>
													Thử âm
												</button>
											</div>
										</div>
									</div>

									{/* Webhook List */}
									<div>
										<div className="flex justify-between items-center mb-4">
											<h3 className="font-bold text-gray-900">Webhook &amp; Tích hợp</h3>
											<button
												onClick={() => {
													setEditingWebhook(undefined);
													setShowAddWebhook(true);
												}}
												className="text-sm bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 font-medium flex items-center gap-1.5"
											>
												<Plus className="w-4 h-4" /> Thêm Webhook
											</button>
										</div>

										{/* Add/Edit Modal */}
										{showAddWebhook && (
											<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
												<div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 animate-in fade-in zoom-in-95 duration-200">
													<div className="flex justify-between items-center mb-6">
														<h3 className="text-lg font-bold">
															{editingWebhook ? 'Cập nhật Webhook' : 'Thêm mới Webhook'}
														</h3>
														<button
															onClick={() => {
																setShowAddWebhook(false);
																setEditingWebhook(undefined);
															}}
															className="p-1 hover:bg-gray-100 rounded"
														>
															<X className="w-5 h-5 text-gray-500" />
														</button>
													</div>

													<WebhookForm
														filterAccountId={accountId}
														initialData={editingWebhook}
														onSave={handleSaveWebhook}
														onCancel={() => {
															setShowAddWebhook(false);
															setEditingWebhook(undefined);
														}}
													/>
												</div>
											</div>
										)}

										<div className="space-y-3">
											{/* List Webhooks */}
											{webhooks.length === 0 ? (
												<p className="text-gray-500 text-sm italic">
													Chưa có webhook nào được cấu hình cho tài khoản này.
												</p>
											) : (
												webhooks.map((wh) => (
													<div
														key={wh.id}
														className="p-4 bg-gray-50 rounded-lg flex justify-between items-center group hover:bg-blue-50/50 transition-colors border border-transparent hover:border-blue-100"
													>
														<div className="flex items-center gap-4">
															<div
																className={`w-10 h-10 rounded-lg flex items-center justify-center ${wh.type === 'telegram'
																	? 'bg-blue-100 text-blue-600'
																	: 'bg-purple-100 text-purple-600'
																	}`}
															>
																{wh.type === 'telegram' ? (
																	<Globe className="w-5 h-5" />
																) : (
																	<LinkIcon className="w-5 h-5" />
																)}
															</div>

															<div>
																<div className="font-medium text-gray-900 flex items-center gap-2">
																	{wh.name}
																	{!wh.enabled && (
																		<span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">
																			Disabled
																		</span>
																	)}
																</div>

																<div className="text-xs text-gray-500 font-mono mt-0.5 max-w-md truncate">
																	{wh.type === 'telegram'
																		? `https://api.telegram.org/bot****/sendMessage (Chat: ${wh.url})`
																		: wh.url
																	}
																</div>

																{(wh as any).created_at && (
																	<div className="text-[10px] text-gray-400 mt-1">
																		Tạo lúc:{' '}
																		{new Date((wh as any).created_at).toLocaleString('vi-VN', {
																			timeZone: 'Asia/Ho_Chi_Minh',
																			hour: '2-digit',
																			minute: '2-digit',
																			second: '2-digit',
																			day: '2-digit',
																			month: '2-digit',
																			year: 'numeric',
																		})}
																	</div>
																)}
															</div>
														</div>

														<div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
															<button
																onClick={() => {
																	const editData = { ...wh };
																	if (wh.type === 'telegram' && wh) {
																		editData.authVal = wh.bot_token || '';
																	}
																	setEditingWebhook(editData);
																	setShowAddWebhook(true);
																}}
																className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
																title="Chỉnh sửa"
															>
																<Edit2 className="w-4 h-4" />
															</button>

															<button
																onClick={() => wh.id && handleDeleteWebhook(wh.id)}
																className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
																title="Xóa"
															>
																<Trash2 className="w-4 h-4" />
															</button>
														</div>
													</div>
												))
											)}
										</div>

									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
			{/* Delete Connection Modal */}
			{showDeleteModal && (
				<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
						<h3 className="text-lg font-bold text-red-600 mb-2">Xóa kết nối</h3>
						<p className="text-sm text-gray-600 mb-6">
							Hủy toàn bộ Webhook và xóa thông tin phiên đăng nhập khỏi hệ thống. Thao tác này không thể hoàn tác.
						</p>
						<div className="flex justify-end gap-3">
							<button
								onClick={() => setShowDeleteModal(false)}
								className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
							>
								Hủy
							</button>
							<button
								onClick={() => {
									setShowDeleteModal(false);
									void handleDeleteWorkflow();
								}}
								className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 shadow-sm"
							>
								Xóa kết nối
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};