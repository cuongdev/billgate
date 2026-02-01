import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

export const ForgotPasswordPage: React.FC = () => {
	const navigate = useNavigate();
	const { resetPassword } = useAuth();
	const { error } = useNotification();

	const [email, setEmail] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSent, setIsSent] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		try {
			await resetPassword(email);
			setIsSent(true);
		} catch (err: any) {
			console.error(err);
			error('Gửi yêu cầu thất bại: ' + err.message);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
			<div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
				<div className="p-8">
					<button onClick={() => navigate('/login')} className="text-gray-400 hover:text-gray-600 mb-6 flex items-center gap-1 text-sm">
						<ArrowLeft className="w-4 h-4" /> Quay lại đăng nhập
					</button>

					<div className="text-center mb-8">
						<h2 className="text-2xl font-bold text-gray-900">Quên mật khẩu?</h2>
						<p className="text-gray-500 mt-2">Nhập email của bạn để nhận liên kết đặt lại mật khẩu</p>
					</div>

					{isSent ? (
						<div className="text-center py-8">
							<div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
								<CheckCircle className="w-8 h-8" />
							</div>
							<h3 className="text-lg font-medium text-gray-900 mb-2">Đã gửi email!</h3>
							<p className="text-gray-500 mb-6">Hãy kiểm tra hộp thư của bạn (cả mục spam) và làm theo hướng dẫn.</p>
							<button
								onClick={() => navigate('/login')}
								className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-all"
							>
								Quay về đăng nhập
							</button>
						</div>
					) : (
						<form onSubmit={handleSubmit} className="space-y-5">
							<div className="space-y-1">
								<label className="text-sm font-medium text-gray-700">Email</label>
								<div className="relative">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<Mail className="h-5 w-5 text-gray-400" />
									</div>
									<input
										type="email"
										required
										className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
										placeholder="name@company.com"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
									/>
								</div>
							</div>

							<button
								type="submit"
								disabled={isSubmitting}
								className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
							>
								{isSubmitting ? 'Đang gửi...' : 'Gửi liên kết'}
							</button>
						</form>
					)}
				</div>
			</div>
		</div>
	);
};
