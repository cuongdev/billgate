import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

export const RegisterPage: React.FC = () => {
	const navigate = useNavigate();
	const { register } = useAuth();
	const { success, error } = useNotification();

	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (password !== confirmPassword) {
			return error('Mật khẩu xác nhận không khớp');
		}

		if (password.length < 6) {
			return error('Mật khẩu phải có ít nhất 6 ký tự');
		}

		setIsSubmitting(true);
		try {
			await register(email, password);
			success('Đăng ký tài khoản thành công');
			navigate('/workflows');
		} catch (err: any) {
			console.error(err);
			if (err.code === 'auth/email-already-in-use') {
				error('Email này đã được sử dụng');
			} else {
				error('Đăng ký thất bại: ' + err.message);
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
			<div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
				<div className="p-8">
					<button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600 mb-6 flex items-center gap-1 text-sm">
						<ArrowLeft className="w-4 h-4" /> Trang chủ
					</button>

					<div className="text-center mb-8">
						<h2 className="text-2xl font-bold text-gray-900">Tạo tài khoản mới</h2>
						<p className="text-gray-500 mt-2">Bắt đầu quản lý tài chính thông minh</p>
					</div>

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
									className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
									placeholder="name@company.com"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
								/>
							</div>
						</div>

						<div className="space-y-1">
							<label className="text-sm font-medium text-gray-700">Mật khẩu</label>
							<div className="relative">
								<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
									<Lock className="h-5 w-5 text-gray-400" />
								</div>
								<input
									type="password"
									required
									className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
									placeholder="Ít nhất 6 ký tự"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
								/>
							</div>
						</div>

						<div className="space-y-1">
							<label className="text-sm font-medium text-gray-700">Xác nhận mật khẩu</label>
							<div className="relative">
								<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
									<Lock className="h-5 w-5 text-gray-400" />
								</div>
								<input
									type="password"
									required
									className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
									placeholder="Nhập lại mật khẩu"
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
								/>
							</div>
						</div>

						<button
							type="submit"
							disabled={isSubmitting}
							className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
						>
							{isSubmitting ? 'Đang tạo...' : 'Đăng ký'}
						</button>
					</form>

					<div className="mt-8 text-center text-sm">
						<span className="text-gray-500">Đã có tài khoản? </span>
						<Link to="/login" className="font-medium text-green-600 hover:text-green-500">
							Đăng nhập
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
};
