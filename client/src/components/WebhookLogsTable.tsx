import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Copy, X, Terminal } from 'lucide-react';

interface WebhookLog {
	id: number;
	configName: string;
	transactionId: string;
	status: string;
	statusCode: number;
	createdAt: number | string;
	webhookUrl?: string; // New field from backend
	requestBody?: string;
	responseBody?: string;
	errorMessage?: string;
}

interface WebhookLogsTableProps {
	logs: WebhookLog[];
	loading: boolean;
}

export const WebhookLogsTable: React.FC<WebhookLogsTableProps> = ({ logs, loading }) => {
	const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);

	const copyCurl = (log: WebhookLog) => {
		const curl = `curl -X POST '${log.webhookUrl || 'YOUR_WEBHOOK_URL'}' \\
  -H 'Content-Type: application/json' \\
  -d '${log.requestBody?.replace(/'/g, "'\\''") || '{}'}'`;
		navigator.clipboard.writeText(curl);
		alert('Đã copy cURL command!');
	};

	const formatJson = (str?: string) => {
		if (!str) return '---';
		try {
			return JSON.stringify(JSON.parse(str), null, 2);
		} catch {
			return str;
		}
	};

	return (
		<>
			<div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
				<table className="w-full">
					<thead className="bg-gray-50 border-b border-gray-200">
						<tr>
							<th className="text-left py-4 px-6 font-medium text-xs text-gray-500 uppercase tracking-wider">Thời gian</th>
							<th className="text-left py-4 px-6 font-medium text-xs text-gray-500 uppercase tracking-wider">Cấu hình</th>
							<th className="text-left py-4 px-6 font-medium text-xs text-gray-500 uppercase tracking-wider">Trạng thái</th>
							<th className="text-left py-4 px-6 font-medium text-xs text-gray-500 uppercase tracking-wider">Mã lỗi</th>
							<th className="text-left py-4 px-6 font-medium text-xs text-gray-500 uppercase tracking-wider">Transaction ID</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-100">
						{loading ? (
							<tr><td colSpan={5} className="py-20 text-center text-gray-400">Đang tải dữ liệu...</td></tr>
						) : logs.length === 0 ? (
							<tr><td colSpan={5} className="py-20 text-center text-gray-400">Chưa có lịch sử webhook nào</td></tr>
						) : (
							logs.map((log) => {
								const createdTime = Number(log.createdAt);
								return (
									<tr
										key={log.id}
										className="hover:bg-gray-50 transition-colors cursor-pointer"
										onClick={() => setSelectedLog(log)}
									>
										<td className="py-4 px-6 text-sm text-gray-500">
											{!isNaN(createdTime) ? new Date(createdTime).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false }) : '---'}
										</td>
										<td className="py-4 px-6 text-sm font-medium text-gray-900">{log.configName || 'Untyped'}</td>
										<td className="py-4 px-6">
											<span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${log.status === 'success' ? 'bg-green-100 text-green-700' :
												log.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
												}`}>
												{log.status === 'success' ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
												{log.status.toUpperCase()}
											</span>
										</td>
										<td className="py-4 px-6 font-mono text-xs text-gray-500">{log.statusCode}</td>
										<td className="py-4 px-6 font-mono text-xs text-gray-400">{log.transactionId?.slice(0, 8)}...</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>

			{/* Detail Modal */}
			{selectedLog && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedLog(null)}>
					<div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
						<div className="flex justify-between items-center p-6 border-b border-gray-100">
							<h3 className="text-lg font-semibold text-gray-900">Chi tiết Webhook Log</h3>
							<button onClick={() => setSelectedLog(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
								<X className="w-5 h-5" />
							</button>
						</div>

						<div className="p-6 overflow-y-auto space-y-6">
							{/* Status Section */}
							<div className="flex gap-6">
								<div className="flex-1">
									<label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Trạng thái</label>
									<div className="flex items-center gap-2">
										<span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedLog.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
											}`}>
											{selectedLog.status.toUpperCase()}
										</span>
										<span className="text-sm text-gray-500 font-mono">Code: {selectedLog.statusCode}</span>
									</div>
								</div>
								<div className="flex-1">
									<label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Webhook ID</label>
									<code className="text-sm text-gray-700 font-mono bg-gray-50 px-2 py-1 rounded">{selectedLog.id}</code>
								</div>
							</div>

							{/* URL & Action */}
							<div>
								<div className="flex justify-between items-center mb-1">
									<label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Target URL</label>
									<button
										onClick={() => copyCurl(selectedLog)}
										className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
									>
										<Terminal className="w-3 h-3" />
										Copy cURL
									</button>
								</div>
								<div className="bg-gray-50 p-3 rounded-lg border border-gray-200 font-mono text-sm text-gray-600 break-all">
									POST {selectedLog.webhookUrl || 'N/A'}
								</div>
							</div>

							{/* Error Message */}
							{selectedLog.errorMessage && (
								<div className="bg-red-50 border border-red-100 rounded-lg p-4">
									<label className="text-xs font-medium text-red-800 uppercase tracking-wider mb-1 block">Error Message</label>
									<p className="text-sm text-red-600 font-mono">{selectedLog.errorMessage}</p>
								</div>
							)}

							{/* Request/Response */}
							<div className="grid grid-cols-2 gap-4">
								<div>
									<div className="flex justify-between items-center mb-2">
										<label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Request Body</label>
										<button
											onClick={() => navigator.clipboard.writeText(selectedLog.requestBody || '')}
											className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
											title="Copy JSON"
										>
											<Copy className="w-3 h-3" />
										</button>
									</div>
									<pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs font-mono overflow-auto max-h-[300px] whitespace-pre-wrap break-words">
										{selectedLog.requestBody ? formatJson(selectedLog.requestBody) : <span className="text-gray-500">Empty</span>}
									</pre>
								</div>
								<div>
									<div className="flex justify-between items-center mb-2">
										<label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Response Body</label>
										<button
											onClick={() => navigator.clipboard.writeText(selectedLog.responseBody || '')}
											className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
											title="Copy JSON"
										>
											<Copy className="w-3 h-3" />
										</button>
									</div>
									<pre className="bg-gray-50 text-gray-800 p-4 rounded-lg border border-gray-200 text-xs font-mono overflow-auto max-h-[300px] whitespace-pre-wrap break-words">
										{selectedLog.responseBody ? formatJson(selectedLog.responseBody) : <span className="text-gray-400">Empty</span>}
									</pre>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</>
	);
};
