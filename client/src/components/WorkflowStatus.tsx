import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, ExternalLink, Loader2 } from 'lucide-react';

interface WorkflowStatusProps {
	sessionKey: string;
}

interface WorkflowInfo {
	workflowId: string;
	status: string;
	startTime: string;
	historyLength: number;
}

export const WorkflowStatus: React.FC<WorkflowStatusProps> = ({ sessionKey }) => {
	const [workflow, setWorkflow] = useState<WorkflowInfo | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const workflowId = `vpbank-account-${sessionKey.replace(/[^a-z0-9]/gi, '-')}`;

	useEffect(() => {
		const fetchStatus = async () => {
			try {
				const res = await fetch(`/api/workflows/${workflowId}`);
				if (res.ok) {
					const data = await res.json();
					setWorkflow(data);
					setError(null);
				} else {
					setWorkflow(null);
				}
			} catch (err) {
				setError('Failed to fetch workflow');
			}
		};

		fetchStatus();
		const interval = setInterval(fetchStatus, 10000); // Poll every 10s
		return () => clearInterval(interval);
	}, [workflowId]);

	const handleControl = async (action: 'pause' | 'resume' | 'stop') => {
		setLoading(true);
		try {
			const res = await fetch(`/api/workflows/${workflowId}/${action}`, {
				method: 'POST',
			});
			if (res.ok) {
				// Refresh status immediately
				const statusRes = await fetch(`/api/workflows/${workflowId}`);
				if (statusRes.ok) {
					setWorkflow(await statusRes.json());
				}
			}
		} catch (err) {
			console.error(`Failed to ${action} workflow:`, err);
		}
		setLoading(false);
	};

	if (!workflow) {
		return (
			<div className="text-[10px] text-gray-400">
				{error ? '⚠️ No workflow' : '⏳ Loading...'}
			</div>
		);
	}

	const statusConfig = {
		RUNNING: { bg: 'bg-green-50', text: 'text-green-700', icon: '🟢', label: 'Running' },
		PAUSED: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: '🟡', label: 'Paused' },
		STOPPED: { bg: 'bg-red-50', text: 'text-red-700', icon: '🔴', label: 'Stopped' },
		WAITING_AUTH: { bg: 'bg-orange-50', text: 'text-orange-700', icon: '⚠️', label: 'Auth Required' },
	};

	const config = statusConfig[workflow.status as keyof typeof statusConfig] || statusConfig.RUNNING;

	return (
		<div className="flex items-center gap-2 mt-1">
			<div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${config.bg} ${config.text}`}>
				<span>{config.icon}</span>
				<span>{config.label}</span>
			</div>

			{workflow.status === 'RUNNING' && (
				<button
					onClick={() => handleControl('pause')}
					disabled={loading}
					className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
					title="Pause workflow"
				>
					{loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Pause className="w-3 h-3" />}
				</button>
			)}

			{workflow.status === 'PAUSED' && (
				<button
					onClick={() => handleControl('resume')}
					disabled={loading}
					className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
					title="Resume workflow"
				>
					{loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
				</button>
			)}

			{(workflow.status === 'RUNNING' || workflow.status === 'PAUSED') && (
				<button
					onClick={() => handleControl('stop')}
					disabled={loading}
					className="p-1 hover:bg-red-100 rounded disabled:opacity-50"
					title="Stop workflow"
				>
					<Square className="w-3 h-3 text-red-600" />
				</button>
			)}

			<a
				href={`http://localhost:8080/namespaces/default/workflows/${workflowId}`}
				target="_blank"
				rel="noopener noreferrer"
				className="p-1 hover:bg-blue-50 rounded"
				title="View in Temporal UI"
			>
				<ExternalLink className="w-3 h-3 text-blue-600" />
			</a>

			<span className="text-[10px] text-gray-400">
				{workflow.historyLength} events
			</span>
		</div>
	);
};
