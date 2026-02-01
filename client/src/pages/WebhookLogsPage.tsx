import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { WebhookLogsTable } from '../components/WebhookLogsTable';
import { apiFetch } from '../services/apiClient';

interface WebhookLog {
	id: number;
	configName: string;
	transactionId: string;
	status: string;
	statusCode: number;
	createdAt: number;
	webhookUrl?: string;
	requestBody?: string;
	responseBody?: string;
	errorMessage?: string;
}

export const WebhookLogsPage: React.FC = () => {
	const [logs, setLogs] = useState<WebhookLog[]>([]);
	const [loading, setLoading] = useState(true);
	const [page, _setPage] = useState(1);

	const fetchLogs = async () => {
		setLoading(true);
		try {
			const params = new URLSearchParams({
				limit: '50',
				offset: String((page - 1) * 50)
			});
			const res = await apiFetch(`/api/vpbank/webhook-logs?${params}`);
			const data = await res.json();
			setLogs(data.logs || []);
		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchLogs();
	}, [page]);

	return (
		<div className="p-8 max-w-7xl mx-auto">
			<div className="flex justify-between items-center mb-8">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Lịch sử Webhook</h1>
					<p className="text-gray-500 mt-1">Nhật ký các lần bắn thông báo ra bên ngoài</p>
				</div>
				<div className="flex gap-4">
					<button onClick={fetchLogs} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
						<RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
					</button>
				</div>
			</div>

			<WebhookLogsTable logs={logs} loading={loading} />
		</div>
	);
};
