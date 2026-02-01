import React, { useState, useEffect } from 'react';
import { Check, Lock, Key, Globe, Shield, Loader2, CreditCard, ArrowRight, Zap, Eye, EyeOff } from 'lucide-react';
import { bankNotificationRegistry } from '../services/bankNotification';
import { useNotification } from '../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';

import { WebhookForm, WebhookConfig } from '../components/WebhookForm';
import { setAudioEnabledForAccount } from '../contexts/SocketContext';
import { apiFetch } from '../services/apiClient';

const STEPS = [
	{ id: 1, title: 'Xác thực', icon: Shield, desc: 'Kết nối tài khoản' },
	{ id: 2, title: 'Webhooks', icon: Globe, desc: 'Cấu hình thông báo' },
	{ id: 3, title: 'Hoàn tất', icon: Check, desc: 'Sẵn sàng' }
];

export const CreateWorkflowPage: React.FC = () => {
	const [currentStep, setCurrentStep] = useState(1);
	const [loading, setLoading] = useState(false);
	const { error, success } = useNotification();
	const navigate = useNavigate();

	const [bankId] = useState('VPBANK');
	const [keyShare, setKeyShare] = useState('');
	const [pinShare, setPinShare] = useState('');
	const [inputAccountNumber, setInputAccountNumber] = useState('');
	// Default Name: Tài Khoản #{DDMMYY}
	const [inputAccountName, setInputAccountName] = useState(() => {
		const d = new Date();
		const day = String(d.getDate()).padStart(2, '0');
		const month = String(d.getMonth() + 1).padStart(2, '0');
		const year = String(d.getFullYear()).slice(2);
		return `Tài Khoản #${day}${month}${year}`;
	});
	const [isActivated, setIsActivated] = useState(false);
	const [cachedJwt, setCachedJwt] = useState<string | null>(null);
	const [showPin, setShowPin] = useState(false);
	const [soundEnabled, setSoundEnabled] = useState(true);

	const [webhooks, setWebhooks] = useState<Partial<WebhookConfig>[]>([]);
	const [showWebhookForm, setShowWebhookForm] = useState(false);
	const handleAuth = async () => {
		setLoading(true);
		try {
			const res = await apiFetch('/api/bank/vpbank/validate-share', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ keyShare, pinShare })
			});

			const result = await res.json();

			if (!result.success && !result.jwt) {
				throw new Error(result.error?.message || result.message || 'Thông tin đăng nhập không chính xác');
			}

			if (result.jwt) {
				setCachedJwt(result.jwt);
			}
			success('Thông tin hợp lệ');
			setCurrentStep(2);

		} catch (err: any) {
			error(err.message || 'Lỗi xác thực');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		const token = localStorage.getItem('accessToken');
		if (!token) {
			error('Bạn chưa đăng nhập. Vui lòng đăng nhập trước khi kết nối.');
			navigate('/login');
		}
	}, []);

	const handleAddWebhook = async (config: Partial<WebhookConfig>) => {
		let parsedHeaders = {};
		try { parsedHeaders = JSON.parse(config.headers || '{}'); } catch (e) { }

		const newWebhook: any = {
			...config,
			id: Date.now(), // Temp ID
			filterAccount: [keyShare],
			headers: parsedHeaders,
		};

		setWebhooks([...webhooks, newWebhook]);
		setShowWebhookForm(false);
		success('Đã thêm cấu hình (Lưu trữ tạm thời)');
	};

	const removeWebhook = (index: number) => {
		const newWebhooks = [...webhooks];
		newWebhooks.splice(index, 1);
		setWebhooks(newWebhooks);
	};

	const handleActivate = async () => {
		setLoading(true);
		try {
			const provider = bankNotificationRegistry.getProvider(bankId as any);
			if (!provider) throw new Error('Bank not supported');
			const payload = {
				keyShare,
				pinShare,
				jwt: cachedJwt,
				webhookConfigs: webhooks.map(({ id, ...rest }) => rest),
				accountNumber: inputAccountNumber || undefined,
				name: inputAccountName || undefined
			};

			const res = await apiFetch('/api/bank/vpbank/start-listener', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			const result = await res.json();

			if (result.error || result.success === false) {
				error(result.message || result.error?.message || 'Có lỗi xảy ra');
			} else if (result.status === 'ready' || result.success === true) {
				if (keyShare) {
					setAudioEnabledForAccount(keyShare, soundEnabled);
				}
				setIsActivated(true);
				success('Kích hoạt thành công!');
			} else {
				error('Không thể kích hoạt. Vui lòng thử lại.');
			}
		} catch (err: any) {
			error(err.message);
		} finally {
			setLoading(false);
		}
	};

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

	return (
		<div className="max-w-3xl mx-auto py-12">
			<div className="text-center mb-12">
				<h1 className="text-3xl font-bold text-gray-900 mb-2">Thiết lập kết nối mới</h1>
				<p className="text-gray-500">Đồng bộ giao dịch tự động chỉ trong 3 bước đơn giản</p>
			</div>

			<div className="mb-12 relative px-4">
				<div className="absolute top-1/2 left-[16.66%] right-[16.66%] h-1 bg-gray-100 rounded-full -z-10 transform -translate-y-1/2"></div>
				<div
					className="absolute top-1/2 left-[16.66%] h-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full -z-10 transform -translate-y-1/2 transition-all duration-500 ease-out"
					style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 66.66}%` }}
				></div>

				<div className="grid grid-cols-3">
					{STEPS.map((step) => {
						const isActive = step.id === currentStep;
						const isCompleted = step.id < currentStep;
						return (
							<div key={step.id} className="flex flex-col items-center">
								<div className={`
                                     w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-all duration-300 shadow-sm
                                     ${isActive ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-blue-200 shadow-lg scale-110' :
										isCompleted ? 'bg-green-500 text-white' : 'bg-white border-2 border-gray-100 text-gray-400'}
                                 `}>
									{isCompleted ? <Check className="w-6 h-6" /> : <step.icon className="w-6 h-6" />}
								</div>
								<div className="text-center">
									<div className={`font-bold text-sm ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>{step.title}</div>
									<div className="text-xs text-gray-400 font-medium hidden md:block">{step.desc}</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>

			<div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden relative min-h-[500px]">
				<div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50 transform translate-x-32 -translate-y-32 pointer-events-none"></div>

				{currentStep === 1 && (
					<div className="p-8 md:p-12 animate-in fade-in duration-500">
						<div className="flex items-center gap-3 mb-8">
							<div className="p-3 bg-blue-50 rounded-xl">
								<CreditCard className="w-6 h-6 text-blue-600" />
							</div>
							<div>
								<h2 className="text-xl font-bold text-gray-900">Thông tin tài khoản</h2>
								<p className="text-sm text-gray-500">Nhập thông tin xác thực từ VPBank NEO</p>
							</div>
						</div>

						<div className="space-y-6 max-w-lg mx-auto">
							<div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex gap-4 items-start">
								<Zap className="w-5 h-5 text-amber-500 mt-1 flex-shrink-0" />
								<div className="text-sm text-gray-600">
									Tính năng này sử dụng cơ chế chia sẻ phiên an toàn. Chúng tôi <b>không</b> lưu trữ tên đăng nhập hay mật khẩu gốc của bạn.
								</div>
							</div>

							<div className="space-y-4">
								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-2">Tên gợi nhớ</label>
									<input
										className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
										placeholder="Ví dụ: Tài khoản chính..."
										value={inputAccountName}
										onChange={e => setInputAccountName(e.target.value)}
									/>
								</div>

								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-2">KEY Chia sẻ</label>
									<div className="relative">
										<Key className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
										<input
											className="w-full bg-white border border-gray-200 rounded-xl pl-12 pr-4 py-3 font-mono text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
											placeholder="CCB7-xxxx-xxxx-xxxx"
											value={keyShare}
											maxLength={19} // 16 chars + 3 hyphens
											onChange={e => {
												let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
												if (val.length > 4) val = val.slice(0, 4) + '-' + val.slice(4);
												if (val.length > 9) val = val.slice(0, 9) + '-' + val.slice(9);
												if (val.length > 14) val = val.slice(0, 14) + '-' + val.slice(14);
												setKeyShare(val);
											}}
										/>
									</div>
								</div>

								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-2">Mã PIN</label>
									<div className="relative">
										<Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
										<input
											type={showPin ? "text" : "password"}
											className="w-full bg-white border border-gray-200 rounded-xl pl-12 pr-12 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
											placeholder="••••••"
											value={pinShare}
											onChange={e => setPinShare(e.target.value)}
										/>
										<button
											type="button"
											onClick={() => setShowPin(!showPin)}
											className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 focus:outline-none"
										>
											{showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
										</button>
									</div>
								</div>

								{/* Guide Link */}
								<div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg p-3">
									<a
										href="/guides/notification-flow.html"
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-2 text-sm text-blue-700 hover:text-blue-800 font-medium transition-colors group"
									>
										<svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										<span className="group-hover:underline">Không biết lấy KEY và PIN ở đâu? Xem hướng dẫn chi tiết →</span>
									</a>
								</div>

								{/* Optional Fields */}
								<div className="pt-4 border-t border-gray-100 space-y-4">
									<p className="text-xs font-semibold text-gray-500 uppercase">Thông tin bổ sung (Tùy chọn)</p>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<label className="block text-sm text-gray-600 mb-1">Số tài khoản</label>
											<input
												className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
												placeholder="Nhập số tài khoản..."
												value={inputAccountNumber}
												onChange={e => setInputAccountNumber(e.target.value)}
											/>
										</div>
									</div>
								</div>
							</div>

							<div className="pt-4">
								<button
									onClick={handleAuth}
									disabled={loading || !keyShare || !pinShare}
									className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 flex items-center justify-center gap-2 hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100"
								>
									{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Tiếp tục'}
									{!loading && <ArrowRight className="w-5 h-5" />}
								</button>
							</div>
						</div>
					</div>
				)}



				{/* Step 2: Webhook (Was Step 3) */}
				{currentStep === 2 && (
					<div className="p-8 md:p-12 animate-in fade-in duration-500">
						<div className="flex items-center gap-3 mb-8">
							<div className="p-3 bg-indigo-50 rounded-xl">
								<Globe className="w-6 h-6 text-indigo-600" />
							</div>
							<div>
								<h2 className="text-xl font-bold text-gray-900">Cấu hình Webhook</h2>
								<p className="text-sm text-gray-500">Thiết lập các điểm nhận thông báo biến động số dư</p>
							</div>
						</div>

						<div className="max-w-3xl mx-auto space-y-6">

							{/* List of configured webhooks */}
							{webhooks.length > 0 && (
								<div className="space-y-3 mb-6">
									{webhooks.map((wh, idx) => (
										<div key={idx} className="flex items-center justify-between p-3 bg-indigo-50/30 border border-indigo-100 rounded-lg">
											<div className="flex items-center gap-3">
												<div className="p-2 bg-white rounded-md shadow-sm">
													{wh.type === 'telegram' ? <Zap className="w-4 h-4 text-blue-500" /> : <Globe className="w-4 h-4 text-indigo-500" />}
												</div>
												<div>
													<div className="font-bold text-sm text-gray-800">{wh.name}</div>
													<div className="text-xs text-gray-500 font-mono">{wh.type === 'telegram' ? 'Telegram' : wh.url}</div>
												</div>
											</div>
											<button onClick={() => removeWebhook(idx)} className="text-red-400 hover:text-red-600 p-2">
												&times;
											</button>
										</div>
									))}
								</div>
							)}

							{showWebhookForm ? (
								<div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
									<div className="flex justify-between items-center mb-4">
										<h4 className="font-bold text-gray-700">Thêm cấu hình mới</h4>
										<button onClick={() => setShowWebhookForm(false)} className="text-gray-400 hover:text-gray-600"><Check className="w-4 h-4 rotate-45" /></button>
									</div>
									<WebhookForm
										filterAccountId={keyShare}
										onSave={handleAddWebhook}
										onCancel={() => setShowWebhookForm(false)}
									/>
								</div>
							) : (
								<button
									onClick={() => setShowWebhookForm(true)}
									className="w-full py-4 border-2 border-dashed border-indigo-200 rounded-xl flex items-center justify-center gap-2 text-indigo-600 font-medium hover:bg-indigo-50 hover:border-indigo-300 transition-all"
								>
									<Zap className="w-5 h-5" /> Thêm Webhook
								</button>
							)}

							<div className="flex justify-between pt-8 border-t border-gray-100">
								<button onClick={() => setCurrentStep(1)} className="text-gray-500 hover:text-gray-800">Quay lại</button>
								<button onClick={() => setCurrentStep(3)} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2">
									Tiếp tục {webhooks.length > 0 && `(${webhooks.length})`} <ArrowRight className="w-5 h-5" />
								</button>
							</div>
						</div>
					</div>
				)}


				{/* Step 3: Activation */}
				{currentStep === 3 && (
					<div className="p-8 md:p-12 text-center animate-in fade-in zoom-in duration-500">
						{!isActivated ? (
							<>
								<div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-blue-100 shadow-xl">
									<Zap className="w-12 h-12" />
								</div>
								<h2 className="text-3xl font-bold text-gray-900 mb-3">Sẵn sàng kích hoạt!</h2>
								<p className="text-gray-500 mb-8 max-w-md mx-auto">
									Thông tin đã được lưu. Nhấn <b className="text-gray-900">Kích hoạt ngay</b> để bắt đầu đồng bộ giao dịch từ VPBank.
								</p>

								<div className="max-w-md mx-auto mb-6">
									<div className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
										<div className="flex flex-col items-start text-left">
											<div className="text-sm font-semibold text-gray-800">Âm thanh thông báo</div>
											<div className="text-xs text-gray-500">Phát tiếng bíp khi có giao dịch mới cho tài khoản này.</div>
										</div>
										<div className="flex items-center gap-3">
											<button
												type="button"
												onClick={() => setSoundEnabled((v) => !v)}
												className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${soundEnabled ? 'bg-blue-600' : 'bg-gray-300'
													}`}
											>
												<span
													className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${soundEnabled ? 'translate-x-5' : 'translate-x-1'
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

								<div className="flex justify-center gap-4">
									<button
										onClick={() => setCurrentStep(2)}
										className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
										disabled={loading}
									>
										Quay lại
									</button>
									<button
										onClick={handleActivate}
										disabled={loading}
										className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2 hover:scale-105"
									>
										{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Kích hoạt ngay'}
										{!loading && <ArrowRight className="w-5 h-5" />}
									</button>
								</div>
							</>
						) : (
							<>
								<div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-green-100 shadow-xl">
									<Check className="w-12 h-12" />
								</div>
								<h2 className="text-3xl font-bold text-gray-900 mb-3">Kết nối thành công!</h2>
								<p className="text-gray-500 mb-10 max-w-md mx-auto">
									Hệ thống đang tự động đồng bộ giao dịch. Bạn có thể theo dõi trong Dashboard.
								</p>

								<div className="flex justify-center gap-4">
									<button
										onClick={() => navigate('/workflows')}
										className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
									>
										Quản lý Kết nối
									</button>
									<button
										onClick={() => navigate('/')}
										className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-semibold shadow-lg shadow-green-200 hover:scale-105 transition-all"
									>
										Về Dashboard
									</button>
								</div>
							</>
						)}
					</div>
				)}
			</div>
		</div >
	);
};
