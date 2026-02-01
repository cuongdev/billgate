import React, { useState } from 'react';
import { Save } from 'lucide-react';
// FilterAccountId is reserved for future validation if needed


export interface WebhookConfig {
	id?: number;
	name: string;
	url: string;
	type: 'http' | 'telegram';
	authVal: string;
	authType: 'none' | 'basic' | 'bearer';
	bot_token?: string;
	chat_id?: string;
	triggerType: 'in' | 'out' | 'both';
	ignoreNoPaymentCode: boolean;
	paymentCodeRegex: string;
	headers: string; // JSON string
	config: any;
	enabled: boolean;
	filterAccount: string[];
	created_at?: number;
}

interface WebhookFormProps {
	initialData?: Partial<WebhookConfig>;
	filterAccountId: string; // KeyShare
	onSave: (config: Partial<WebhookConfig>) => Promise<void>;
	onCancel?: () => void;
}

export const WebhookForm: React.FC<WebhookFormProps> = ({ initialData, onSave, onCancel }) => {
	const { headers: initHeaders, ...restInitial } = initialData || {};
	const headersStr = typeof initHeaders === 'object'
		? JSON.stringify(initHeaders, null, 2)
		: (initHeaders || '{}');

	const [data, setData] = useState<Partial<WebhookConfig>>({
		type: 'http',
		enabled: true,
		name: '',
		authType: 'none',
		triggerType: 'in',
		ignoreNoPaymentCode: false,
		...restInitial,
		headers: headersStr
	});

	const handleSubmit = () => {
		onSave(data);
	};

	return (
		<div className="space-y-4">
			<input
				type="text"
				placeholder="Tên gợi nhớ (VD: My Channel)"
				className="w-full px-4 py-2 border rounded-lg text-sm"
				value={data.name || ''}
				onChange={e => setData({ ...data, name: e.target.value })}
			/>

			<div className="flex gap-4">
				<div className="w-1/3">
					<label className="block text-xs font-medium mb-1">Loại Webhook</label>
					<select
						className="w-full px-3 py-2 border rounded-lg text-sm"
						value={data.type}
						onChange={e => setData({ ...data, type: e.target.value as any })}
					>
						<option value="http">HTTP Endpoint</option>
						<option value="telegram">Telegram Bot</option>
					</select>
				</div>
				<div className="w-2/3">
					<label className="block text-xs font-medium mb-1">Trigger (Điều kiện gửi)</label>
					<select
						className="w-full px-3 py-2 border rounded-lg text-sm"
						value={data.triggerType}
						onChange={e => setData({ ...data, triggerType: e.target.value as any })}
					>
						<option value="in">Tiền vào (Credit)</option>
						<option value="out">Tiền ra (Debit)</option>
						<option value="both">Tất cả giao dịch</option>
					</select>
				</div>
			</div>

			{/* Telegram Fields */}
			{data.type === 'telegram' && (
				<div className="space-y-3 bg-blue-50 p-4 rounded-lg border border-blue-100">
					<input
						type="text"
						placeholder="Bot Token (123456:ABC-DEF...)"
						className="w-full px-4 py-2 border rounded-lg text-sm font-mono"
						value={data.authVal || ''}
						onChange={e => setData({ ...data, authVal: e.target.value })}
					/>
					<input
						type="text"
						placeholder="Chat ID (-100xxxx...)"
						className="w-full px-4 py-2 border rounded-lg text-sm font-mono"
						value={data.url || ''} // Using URL field for Chat ID storage UI convenience
						onChange={e => setData({ ...data, url: e.target.value })}
					/>
					<p className="text-[10px] text-blue-600">
						* Lưu ý: "Chat ID" sẽ được lưu vào trường URL.
					</p>
				</div>
			)}

			{/* HTTP Fields */}
			{data.type === 'http' && (
				<>
					<input
						type="text"
						placeholder="Webhook URL (https://...)"
						className="w-full px-4 py-2 border rounded-lg text-sm font-mono"
						value={data.url || ''}
						onChange={e => setData({ ...data, url: e.target.value })}
					/>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-xs font-medium mb-1">Loại Auth</label>
							<select
								className="w-full px-3 py-2 border rounded-lg text-sm"
								value={data.authType}
								onChange={e => setData({ ...data, authType: e.target.value as any })}
							>
								<option value="none">None</option>
								<option value="basic">Basic Auth</option>
								<option value="bearer">Bearer Token</option>
							</select>
						</div>
					</div>

					{(data.authType === 'basic' || data.authType === 'bearer') && (
						<input
							type="text"
							placeholder={data.authType === 'basic' ? "username:password" : "token"}
							className="w-full px-4 py-2 border rounded-lg text-sm font-mono"
							value={data.authVal || ''}
							onChange={e => setData({ ...data, authVal: e.target.value })}
						/>
					)}

					<div>
						<label className="block text-xs font-medium mb-1">Headers (JSON)</label>
						<textarea
							className="w-full px-4 py-2 border rounded-lg text-sm font-mono h-20"
							value={data.headers || '{}'}
							onChange={e => setData({ ...data, headers: e.target.value })}
						/>
					</div>
				</>
			)}

			<div className="space-y-2 pt-2 border-t border-gray-100">
				<label className="flex items-center gap-2">
					<input
						type="checkbox"
						checked={data.ignoreNoPaymentCode}
						onChange={e => setData({ ...data, ignoreNoPaymentCode: e.target.checked })}
					/>
					<span className="text-sm">Bỏ qua giao dịch không có nội dung (Payment Code)</span>
				</label>
				{data.ignoreNoPaymentCode && (
					<input
						type="text"
						placeholder="Regex Payment Code (VD: MD[0-9]+)"
						className="w-full px-4 py-2 border rounded-lg text-sm font-mono"
						value={data.paymentCodeRegex || ''}
						onChange={e => setData({ ...data, paymentCodeRegex: e.target.value })}
					/>
				)}
			</div>

			<div className="flex justify-end gap-3 mt-6">
				{onCancel && <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Hủy</button>}
				<button onClick={handleSubmit} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
					<Save className="w-4 h-4" /> Lưu cấu hình
				</button>
			</div>
		</div>
	);
};
