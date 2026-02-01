import React, { useEffect, useState } from 'react';
import { Trash2, Save, Activity, RefreshCw } from 'lucide-react';
import { bankNotificationRegistry } from '../services/bankNotification';

export interface WebhookConfig {
	id?: number;
	name: string;
	url: string;
	authType: 'none' | 'header' | 'bearer';
	authHeader?: string;
	authToken?: string;
	filterAccount?: string[];
	triggerType: 'in' | 'out' | 'both';
	ignoreNoPaymentCode: boolean;
	paymentCodeRegex?: string;
	enabled: boolean;
	createdAt?: number;
}

export interface WebhookLog {
	id: number;
	configId?: number;
	configName?: string;
	transactionId?: string;
	status: 'pending' | 'success' | 'failed';
	statusCode?: number;
	requestPayload?: string;
	responseBody?: string;
	createdAt: number;
}

export interface WebhookManagerProps {
	connectedSessions: any[];
}

export const WebhookManager: React.FC<WebhookManagerProps> = ({ connectedSessions }) => {
	const [activeTab, setActiveTab] = useState<'config' | 'logs'>('config');
	const [configs, setConfigs] = useState<WebhookConfig[]>([]);
	const [logs, setLogs] = useState<WebhookLog[]>([]);
	const [loading, setLoading] = useState(false);
	const [filterConfigId, setFilterConfigId] = useState<number | null>(null);
	const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);

	// Sort State
	const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

	// Form State
	const [editingId, setEditingId] = useState<number | null>(null);
	const [formData, setFormData] = useState<Partial<WebhookConfig>>({
		name: '',
		url: '',
		enabled: true,
		triggerType: 'in', // default to 'in'
		authType: 'none',
		ignoreNoPaymentCode: false,
		paymentCodeRegex: '',
		filterAccount: [], // empty means all
	});

	const loadConfigs = async () => {
		setLoading(true);
		const provider = bankNotificationRegistry.getProvider('VPBANK');
		if (provider) {
			const res = await provider.getWebhookConfigs();
			if (res && res.configs) {
				setConfigs(res.configs);
			}
		}
		setLoading(false);
	};

	const loadLogs = async () => {
		setLoading(true);
		try {
			const res = await fetch('/api/vpbank/webhook-logs?limit=100');
			const json = await res.json();
			if (json.logs) {
				const data = json.logs.map((l: any) => {
					const rawReq = l.requestPayload || l.request_payload;
					const rawRes = l.responseBody || l.response_body;

					let req = rawReq;
					let resBody = rawRes;

					try {
						if (typeof req === 'string' && (req.startsWith('{') || req.startsWith('['))) {
							req = JSON.parse(req);
						}
					} catch { }

					try {
						if (typeof resBody === 'string' && (resBody.startsWith('{') || resBody.startsWith('['))) {
							resBody = JSON.parse(resBody);
						}
					} catch { }

					return {
						...l,
						configId: l.configId || l.config_id,
						configName: l.configName || l.config_name,
						transactionId: l.transactionId || l.transaction_id,
						statusCode: l.statusCode || l.status_code,
						requestPayload: req,
						responseBody: resBody,
						createdAt: Number(l.createdAt || l.created_at)
					};
				});

				if (filterConfigId) {
					setLogs(data.filter((l: WebhookLog) => l.configId === filterConfigId));
				} else {
					setLogs(data);
				}
			}
		} catch (err) {
			console.error('Failed to load logs', err);
		}
		setLoading(false);
	};

	useEffect(() => {
		if (activeTab === 'config') {
			void loadConfigs();
		} else {
			void loadLogs();
		}
	}, [activeTab, filterConfigId]);

	// Derived sorted logs
	const sortedLogs = React.useMemo(() => {
		const result = [...logs].sort((a, b) => {
			return sortOrder === 'desc'
				? b.createdAt - a.createdAt
				: a.createdAt - b.createdAt;
		});
		return result;
	}, [logs, sortOrder]);

	const handleSortToggle = () => {
		setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
	};

	const handleSave = async () => {
		if (!formData.name || !formData.url) {
			alert('Vui lòng nhập tên và URL webhook');
			return;
		}

		const config: WebhookConfig = {
			...formData as WebhookConfig,
			// Ensure defaults
			triggerType: formData.triggerType || 'in',
			authType: formData.authType || 'none',
			enabled: formData.enabled ?? true,
			ignoreNoPaymentCode: formData.ignoreNoPaymentCode ?? false,
			// Preserve existing createdAt if editing, else default to now
			createdAt: editingId ? (configs.find(c => c.id === editingId)?.createdAt || Date.now()) : Date.now(),
		};

		if (editingId) {
			config.id = editingId;
		}

		// Optimistic update? No, just wait.
		const provider = bankNotificationRegistry.getProvider('VPBANK');
		if (!provider) return;

		let newConfigs = [...configs];
		if (editingId) {
			const idx = newConfigs.findIndex(c => c.id === editingId);
			if (idx >= 0) newConfigs[idx] = config;
		} else {
			newConfigs.push(config);
		}

		await provider.saveWebhookConfigs(newConfigs);

		setEditingId(null);
		setFormData({
			name: '',
			url: '',
			enabled: true,
			triggerType: 'in',
			authType: 'none',
			ignoreNoPaymentCode: false,
			paymentCodeRegex: '',
			filterAccount: [],
		});
		await loadConfigs();
	};

	const handleEdit = (item: WebhookConfig) => {
		setEditingId(item.id!);
		setFormData({ ...item });
	};

	const handleDelete = async (id: number) => {
		if (!window.confirm('Bạn có chắc muốn xóa webhook này?')) return;

		const provider = bankNotificationRegistry.getProvider('VPBANK');
		if (provider && provider.deleteWebhookConfig) {
			const success = await provider.deleteWebhookConfig(id);
			if (success) {
				await loadConfigs();
			} else {
				alert('Lỗi khi xóa webhook');
			}
		} else {
			// Fallback if provider doesn't support delete (shouldn't happen now)
			alert("Provider không hỗ trợ xóa webhook.");
		}
	};

	const handleViewLogs = (id: number) => {
		setFilterConfigId(id);
		setActiveTab('logs');
	};

	const statusColor = (status: string) => {
		switch (status) {
			case 'success': return 'text-green-600 bg-green-50 border-green-200';
			case 'failed': return 'text-red-600 bg-red-50 border-red-200';
			default: return 'text-gray-600 bg-gray-50 border-gray-200';
		}
	};

	const timeAgo = (timestamp?: number) => {
		if (!timestamp) return '';
		const diff = Date.now() - timestamp;
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		if (days > 0) return `Đã tạo cách đây ${days} ngày`;
		const hours = Math.floor(diff / (1000 * 60 * 60));
		if (hours > 0) return `Đã tạo cách đây ${hours} giờ`;
		const minutes = Math.floor(diff / (1000 * 60));
		if (minutes > 0) return `Đã tạo cách đây ${minutes} phút`;
		return 'Vừa tạo xong';
	};

	return (
		<div className="bg-white rounded-xl shadow p-4 md:p-6 min-h-[500px] relative">
			{/* Log Detail Modal */}
			{selectedLog && (
				<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedLog(null)}>
					<div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto flex flex-col" onClick={e => e.stopPropagation()}>
						<div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
							<h3 className="font-semibold text-lg">Chi tiết Webhook Log</h3>
							<button onClick={() => setSelectedLog(null)} className="text-gray-500 hover:text-gray-700 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">✕</button>
						</div>
						<div className="p-6 space-y-6 overflow-y-auto">
							<div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
								<div>
									<div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Thời gian</div>
									<div className="font-medium">{new Date(selectedLog.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false })}</div>
								</div>
								<div>
									<div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Trạng thái</div>
									<div className="flex items-center gap-2">
										<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor(selectedLog.status)}`}>
											{selectedLog.status === 'success' ? 'Thành công' : selectedLog.status === 'pending' ? 'Đang chờ' : 'Thất bại'}
										</span>
										{selectedLog.statusCode && <span className="font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded text-xs">{selectedLog.statusCode}</span>}
									</div>
								</div>
								<div>
									<div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Webhook Name</div>
									<div className="font-medium">{selectedLog.configName}</div>
								</div>
								<div>
									<div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Mã tham chiếu</div>
									<div className="font-mono text-xs truncate bg-gray-50 p-1 rounded" title={selectedLog.transactionId}>{selectedLog.transactionId}</div>
								</div>
							</div>

							<div>
								<div className="text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2">
									Request Payload
									<span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded">JSON</span>
								</div>
								<pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs font-mono overflow-auto max-h-60 leading-relaxed custom-scrollbar">
									{JSON.stringify(selectedLog.requestPayload, null, 2)}
								</pre>
							</div>

							<div>
								<div className="text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2">
									Response Body
									<span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded">JSON</span>
								</div>
								<pre className="bg-gray-50 border border-gray-200 text-gray-700 rounded-lg p-4 text-xs font-mono overflow-auto max-h-60 leading-relaxed custom-scrollbar">
									{selectedLog.responseBody ? (typeof selectedLog.responseBody === 'string' ? selectedLog.responseBody : JSON.stringify(selectedLog.responseBody, null, 2)) : '(Empty or No Response)'}
								</pre>
							</div>
						</div>
						<div className="p-4 border-t bg-gray-50 flex justify-end sticky bottom-0 z-10">
							<button
								onClick={() => setSelectedLog(null)}
								className="px-4 py-2 bg-white border border-gray-300 shadow-sm rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
							>
								Đóng
							</button>
						</div>
					</div>
				</div>
			)}

			<div className="flex items-center justify-between mb-6">
				<h2 className="text-xl font-bold flex items-center gap-2">
					<Activity className="w-6 h-6 text-blue-600" />
					Quản lý Webhook
				</h2>
				<div className="flex bg-gray-100 p-1 rounded-lg">
					<button
						onClick={() => setActiveTab('config')}
						className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'config' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
							}`}
					>
						Cấu hình
					</button>
					<button
						onClick={() => setActiveTab('logs')}
						className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'logs' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
							}`}
					>
						Nhật ký
					</button>
				</div>
			</div>

			{activeTab === 'config' && (
				<div className="space-y-6">
					<div className="border rounded-xl p-4 bg-gray-50">
						<h3 className="font-semibold mb-3 text-sm">{editingId ? 'Cập nhật Webhook' : 'Thêm Webhook mới'}</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-xs font-medium mb-1">Tên gợi nhớ</label>
								<input
									className="w-full border rounded-lg px-3 py-2 text-sm"
									placeholder="VD: CRM Prod"
									value={formData.name}
									onChange={e => setFormData({ ...formData, name: e.target.value })}
								/>
							</div>
							<div>
								<label className="block text-xs font-medium mb-1">Webhook URL</label>
								<input
									className="w-full border rounded-lg px-3 py-2 text-sm"
									placeholder="https://api.example.com/webhook"
									value={formData.url}
									onChange={e => setFormData({ ...formData, url: e.target.value })}
								/>
							</div>
							<div>
								<label className="block text-xs font-medium mb-1">Loại sự kiện</label>
								<select
									className="w-full border rounded-lg px-3 py-2 text-sm"
									value={formData.triggerType}
									onChange={e => setFormData({ ...formData, triggerType: e.target.value as any })}
								>
									<option value="in">Tiền vào (Deposit)</option>
									<option value="out">Tiền ra (Withdraw)</option>
									<option value="both">Cả hai</option>
								</select>
							</div>
							<div className="flex flex-col gap-4 mt-6">
								<label className="flex items-center gap-2 text-sm cursor-pointer">
									<input
										type="checkbox"
										className="rounded text-blue-600"
										checked={formData.ignoreNoPaymentCode}
										onChange={e => setFormData({ ...formData, ignoreNoPaymentCode: e.target.checked })}
									/>
									<span>Chỉ bắn khi có Mã thanh toán (Payment Code)</span>
								</label>

								{formData.ignoreNoPaymentCode && (
									<div className="ml-6">
										<label className="block text-xs font-medium mb-1">Regex Mã thanh toán (Tùy chọn)</label>
										<input
											className="w-full border rounded-lg px-3 py-2 text-sm font-mono text-gray-600"
											placeholder="VD: MM[A-Z0-9]{6,12} hoặc (DH[0-9]+)"
											value={formData.paymentCodeRegex || ''}
											onChange={e => setFormData({ ...formData, paymentCodeRegex: e.target.value })}
										/>
										<p className="text-[10px] text-gray-500 mt-1">
											Nếu để trống sẽ dùng mặc định: <code>MM[A-Z0-9]&#123;6,12&#125;</code>.
											Nếu nhập, hệ thống sẽ chỉ bắn webhook khi nội dung khớp với regex này.
											Kết quả (Group 1 hoặc toàn bộ match) sẽ được gửi trong trường <code>code</code>.
										</p>
									</div>
								)}

								<label className="flex items-center gap-2 text-sm cursor-pointer">
									<input
										type="checkbox"
										className="rounded text-blue-600"
										checked={formData.enabled}
										onChange={e => setFormData({ ...formData, enabled: e.target.checked })}
									/>
									<span>Kích hoạt Webhook này</span>
								</label>
							</div>

							{/* Account Filtering */}
							<div className="md:col-span-2 border-t pt-4 mt-2">
								<label className="block text-xs font-medium mb-2">Áp dụng cho tài khoản:</label>
								<div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3 bg-white">
									<label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
										<input
											type="checkbox"
											className="rounded text-blue-600"
											checked={!formData.filterAccount || formData.filterAccount.length === 0}
											onChange={(e) => {
												if (e.target.checked) {
													setFormData({ ...formData, filterAccount: [] });
												}
											}}
										/>
										<span className="font-medium">Tất cả tài khoản</span>
									</label>

									{connectedSessions.map(sess => {
										const isSelected = formData.filterAccount?.includes(sess.keyShare);
										const label = sess.name || sess.accountNumber || sess.keyShare?.slice(0, 8);
										const last4 = sess.keyShare?.slice(-4);

										return (
											<label key={sess.keyShare} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded ml-4 border-l-2 border-transparent hover:border-blue-200">
												<input
													type="checkbox"
													className="rounded text-blue-600"
													checked={!!isSelected}
													onChange={(e) => {
														const current = formData.filterAccount || [];
														let next: string[];
														if (e.target.checked) {
															next = [...current, sess.keyShare];
														} else {
															next = current.filter(k => k !== sess.keyShare);
														}
														setFormData({ ...formData, filterAccount: next });
													}}
												/>
												<span className="flex-1">{label} <span className="text-gray-400 text-xs">(...{last4})</span></span>
											</label>
										);
									})}
								</div>
								<p className="text-[10px] text-gray-500 mt-1">
									Nếu chọn "Tất cả", webhook sẽ nhận thông báo từ mọi tài khoản đã kết nối.
								</p>
							</div>
						</div>

						<div className="mt-4 pt-4 border-t">
							<div className="text-xs font-semibold mb-2 text-gray-500">BẢO MẬT (Tùy chọn)</div>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div>
									<label className="block text-xs font-medium mb-1">Kiểu chứng thực</label>
									<select
										className="w-full border rounded-lg px-3 py-2 text-sm"
										value={formData.authType}
										onChange={e => setFormData({ ...formData, authType: e.target.value as any })}
									>
										<option value="none">Không có</option>
										<option value="apikey">API Key</option>
									</select>
								</div>
								{formData.authType !== 'none' && (
									<div className="md:col-span-2">
										<label className="block text-xs font-medium mb-1">
											API Key / Secret
										</label>
										<input
											className="w-full border rounded-lg px-3 py-2 text-sm"
											type="password"
											placeholder="sk_live_..."
											value={formData.authToken || ''}
											onChange={e => setFormData({ ...formData, authToken: e.target.value })}
										/>
									</div>
								)}
							</div>
						</div>

						<div className="mt-4 flex justify-end gap-2">
							{editingId && (
								<button
									onClick={() => {
										setEditingId(null);
										setFormData({
											name: '',
											url: '',
											enabled: true,
											triggerType: 'in',
											authType: 'none',
											ignoreNoPaymentCode: false,
											paymentCodeRegex: '',
										});
									}}
									className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
								>
									Hủy
								</button>
							)}
							<button
								onClick={handleSave}
								className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
							>
								<Save className="w-4 h-4" />
								{editingId ? 'Cập nhật' : 'Lưu cấu hình'}
							</button>
						</div>
					</div>

					<div className="space-y-3">
						{loading ? (
							<div className="text-center py-8 text-gray-500">Đang tải...</div>
						) : configs.length === 0 ? (
							<div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-xl">Chưa có webhook nào được cấu hình.</div>
						) : (
							configs.map(item => (
								<div key={item.id} className="flex items-center justify-between border p-4 rounded-xl hover:shadow-sm transition-shadow">
									<div>
										<div className="flex items-center gap-2">
											<h4 className="font-semibold hover:text-blue-600 cursor-pointer" onClick={() => handleViewLogs(item.id!)}>
												{item.name}
											</h4>
											<span className={`text-[10px] px-2 py-0.5 rounded-full border ${item.enabled ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600'}`}>
												{item.enabled ? 'Active' : 'Disabled'}
											</span>
											<span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
												{item.triggerType === 'in' ? 'Tiền vào' : item.triggerType === 'out' ? 'Tiền ra' : 'Tất cả'}
											</span>
										</div>
										<div className="text-xs text-gray-500 mt-1 font-mono">{item.url}</div>
										{item.createdAt && (
											<div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
												<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
												{timeAgo(item.createdAt)}
											</div>
										)}
									</div>
									<div className="flex items-center gap-2">
										<button
											onClick={() => handleViewLogs(item.id!)}
											className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
											title="Xem nhật ký"
										>
											<Activity className="w-4 h-4" />
										</button>
										<button
											onClick={() => handleEdit(item)}
											className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
											title="Chỉnh sửa"
										>
											<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
										</button>
										<button
											onClick={() => handleDelete(item.id!)}
											className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
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
			)}

			{activeTab === 'logs' && (
				<div>
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-2">
							{filterConfigId && (
								<div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
									<span>Lọc: {configs.find(c => c.id === filterConfigId)?.name || 'Unknown Webhook'}</span>
									<button
										onClick={() => { setFilterConfigId(null); activeTab === 'logs' && loadLogs(); }}
										className="hover:text-blue-900"
									>
										×
									</button>
								</div>
							)}
						</div>
						<button
							onClick={loadLogs}
							className="flex items-center gap-2 text-xs text-blue-600 hover:underline"
						>
							<RefreshCw className="w-3 h-3" />
							Làm mới
						</button>
					</div>
					{loading ? (
						<div className="text-center py-8 text-gray-500">Đang tải nhật ký...</div>
					) : logs.length === 0 ? (
						<div className="text-center py-8 text-gray-500">Chưa có nhật ký nào.</div>
					) : (
						<div className="border rounded-xl overflow-hidden">
							<table className="w-full text-sm text-left">
								<thead className="bg-gray-50 text-gray-600 font-medium border-b">
									<tr>
										<th
											className="px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors select-none group"
											onClick={handleSortToggle}
										>
											<div className="flex items-center gap-1">
												Thời gian
												<span className="text-gray-400 group-hover:text-gray-600">
													{sortOrder === 'desc' ? '▼' : '▲'}
												</span>
											</div>
										</th>
										<th className="px-4 py-3">Webhook</th>
										<th className="px-4 py-3">Trạng thái</th>
										<th className="px-4 py-3 text-right">Mã lỗi</th>
									</tr>
								</thead>
								<tbody className="divide-y">
									{sortedLogs.map(log => (
										<tr
											key={log.id}
											className="hover:bg-blue-50 cursor-pointer transition-colors"
											onClick={() => setSelectedLog(log)}
										>
											<td className="px-4 py-3 text-gray-500 whitespace-nowrap">
												{new Date(log.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false })}
											</td>
											<td className="px-4 py-3">
												<div className="font-medium text-gray-900">{log.configName}</div>
												<div className="text-xs text-gray-500">Tx: {log.transactionId}</div>
											</td>
											<td className="px-4 py-3">
												<span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${statusColor(log.status)}`}>
													{log.status === 'success' ? 'Thành công' : log.status === 'pending' ? 'Đang chờ' : 'Thất bại'}
												</span>
											</td>
											<td className="px-4 py-3 text-right font-mono text-xs">
												{log.statusCode || '-'}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			)}
		</div>
	);
};
