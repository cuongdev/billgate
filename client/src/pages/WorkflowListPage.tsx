import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Smartphone, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { apiFetch } from '../services/apiClient';

interface Workflow {
	workflowId: string;
	runId: string;
	status: string;
	startTime: string;
}

export const WorkflowListPage: React.FC = () => {
	const [workflows, setWorkflows] = useState<Workflow[]>([]);
	const [loading, setLoading] = useState(true);
	const navigate = useNavigate();


	// ...

	const fetchWorkflows = async () => {
		setLoading(true);
		try {
			const res = await apiFetch('/api/workflows');
			const data = await res.json();
			setWorkflows(data.workflows || []);
		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchWorkflows();
	}, []);

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'active': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
			case 'paused': return 'text-amber-600 bg-amber-50 border-amber-100'; // Paused matches UI better than Completed
			case 'DISCONNECTED': return 'text-red-600 bg-red-50 border-red-100';
			default: return 'text-gray-600 bg-gray-50 border-gray-100';
		}
	};

	const getStatusIcon = (status: string) => {
		switch (status) {
			case 'active': return <CheckCircle2 className="w-4 h-4" />;
			case 'paused': return <AlertCircle className="w-4 h-4" />; // Or PauseIcon if available
			case 'DISCONNECTED': return <XCircle className="w-4 h-4" />;
			default: return <AlertCircle className="w-4 h-4" />;
		}
	};

	return (
		<div className="p-8 max-w-7xl mx-auto">
			<div className="flex justify-between items-center mb-8">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Kết nối ngân hàng</h1>
					<p className="text-gray-500 mt-1">Quản lý các tài khoản VPBank đang được liên kết</p>
				</div>
				<div className="flex gap-4">
					<button
						onClick={fetchWorkflows}
						className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
					>
						<RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
					</button>
					<button
						onClick={() => navigate('/create')}
						className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all"
					>
						<Plus className="w-5 h-5" />
						Thêm mới
					</button>
				</div>
			</div>

			{loading ? (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{[1, 2, 3].map(i => (
						<div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse"></div>
					))}
				</div>
			) : workflows.length === 0 ? (
				<div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
					<div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
						<Smartphone className="w-8 h-8 text-gray-400" />
					</div>
					<h3 className="text-lg font-medium text-gray-900">Chưa có kết nối nào</h3>
					<p className="text-gray-500 mt-1 mb-6">Hãy thêm tài khoản ngân hàng để bắt đầu đồng bộ.</p>
					<button
						onClick={() => navigate('/create')}
						className="text-blue-600 font-medium hover:underline"
					>
						Thêm kết nối ngay →
					</button>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{workflows.map((wf) => (
						<div
							key={wf.workflowId}
							onClick={() => navigate(`/workflows/${wf.workflowId}`)}
							className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group relative overflow-hidden"
						>
							{/* Bank Logo / Header */}
							<div className="flex justify-between items-start mb-6">
								<div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center shadow-inner">
									<span className="text-white font-bold text-xs">VPBank</span>
								</div>
								<div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(wf.status)}`}>
									{getStatusIcon(wf.status)}
									{wf.status === 'active' ? 'Đang hoạt động' : (wf.status === 'paused' ? 'Tạm dừng' : wf.status)}
								</div>
							</div>

							{/* Account Info */}
							<div className="mb-4">
								<div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Số tài khoản</div>
								<div className="text-lg font-mono font-bold text-gray-800 tracking-tight group-hover:text-blue-600 transition-colors">
									{wf.workflowId.replace('vpbank-account-', '')}
								</div>
							</div>

							{/* Footer Info */}
							<div className="flex items-center text-xs text-gray-400 gap-1.5 mt-4 pt-4 border-t border-gray-50">
								<span className="w-2 h-2 rounded-full bg-green-500"></span>
								Cập nhật: {new Date(wf.startTime).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
