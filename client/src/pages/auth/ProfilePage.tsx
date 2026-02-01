import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Save, ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

export const ProfilePage: React.FC = () => {
	const navigate = useNavigate();
	const { currentUser, updateUserProfile, updateUserPassword, logout } = useAuth();
	const { success, error } = useNotification();

	// Info State
	const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
	const [photoURL, setPhotoURL] = useState(currentUser?.photoURL || '');
	const [isUpdatingInfo, setIsUpdatingInfo] = useState(false);

	// Password State
	const [newPassword, setNewPassword] = useState('');
	const [confirmNewPassword, setConfirmNewPassword] = useState('');
	const [isUpdatingPass, setIsUpdatingPass] = useState(false);

	const handleUpdateInfo = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsUpdatingInfo(true);
		try {
			await updateUserProfile(displayName, photoURL);
			success('Cập nhật thông tin thành công');
		} catch (err: any) {
			error('Cập nhật thất bại: ' + err.message);
		} finally {
			setIsUpdatingInfo(false);
		}
	};

	const handleUpdatePassword = async (e: React.FormEvent) => {
		e.preventDefault();
		if (newPassword !== confirmNewPassword) {
			return error('Mật khẩu mới không khớp');
		}
		if (newPassword.length < 6) {
			return error('Mật khẩu phải có ít nhất 6 ký tự');
		}

		setIsUpdatingPass(true);
		try {
			await updateUserPassword(newPassword);
			success('Đổi mật khẩu thành công');
			setNewPassword('');
			setConfirmNewPassword('');
		} catch (err: any) {
			console.error(err);
			if (err.code === 'auth/requires-recent-login') {
				error('Bạn cần đăng nhập lại trước khi đổi mật khẩu');
			} else {
				error('Đổi mật khẩu thất bại: ' + err.message);
			}
		} finally {
			setIsUpdatingPass(false);
		}
	};

	const handleLogout = async () => {
		try {
			await logout();
			navigate('/login');
		} catch (err: any) {
			error('Đăng xuất thất bại');
		}
	};

	return (
		<div className="min-h-screen bg-gray-50 p-6">
			<div className="max-w-4xl mx-auto space-y-6">
				<button onClick={() => navigate('/workflows')} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
					<ArrowLeft className="w-4 h-4" /> Quay lại Dashboard
				</button>

				<div className="flex justify-between items-center">
					<h1 className="text-2xl font-bold text-gray-900">Hồ sơ cá nhân</h1>
					<button onClick={handleLogout} className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors">
						<LogOut className="w-4 h-4" /> Đăng xuất
					</button>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* Public Info */}
					<div className="lg:col-span-2 space-y-6">
						<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
							<h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
								<User className="w-5 h-5 text-blue-600" /> Thông tin cơ bản
							</h2>
							<form onSubmit={handleUpdateInfo} className="space-y-4">
								<div className="space-y-1">
									<label className="text-sm font-medium text-gray-700">Email</label>
									<input
										type="email"
										disabled
										className="block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed"
										value={currentUser?.email || ''}
									/>
								</div>
								<div className="space-y-1">
									<label className="text-sm font-medium text-gray-700">Tên hiển thị</label>
									<input
										type="text"
										className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
										value={displayName}
										onChange={(e) => setDisplayName(e.target.value)}
										placeholder="Nhập tên hiển thị"
									/>
								</div>
								<div className="space-y-1">
									<label className="text-sm font-medium text-gray-700">Avatar URL</label>
									<div className="flex gap-2">
										<input
											type="text"
											className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
											value={photoURL}
											onChange={(e) => setPhotoURL(e.target.value)}
											placeholder="https://example.com/avatar.jpg"
										/>
										{photoURL && <img src={photoURL} alt="Preview" className="w-10 h-10 rounded-full border border-gray-200 object-cover" />}
									</div>
								</div>
								<div className="pt-2">
									<button
										type="submit"
										disabled={isUpdatingInfo}
										className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
									>
										<Save className="w-4 h-4" /> Lưu thay đổi
									</button>
								</div>
							</form>
						</div>
					</div>

					{/* Security */}
					<div className="space-y-6">
						<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
							<h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
								<Lock className="w-5 h-5 text-orange-600" /> Đổi mật khẩu
							</h2>
							<form onSubmit={handleUpdatePassword} className="space-y-4">
								<div className="space-y-1">
									<label className="text-sm font-medium text-gray-700">Mật khẩu mới</label>
									<input
										type="password"
										required
										className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
										value={newPassword}
										onChange={(e) => setNewPassword(e.target.value)}
										placeholder="••••••••"
									/>
								</div>
								<div className="space-y-1">
									<label className="text-sm font-medium text-gray-700">Xác nhận mật khẩu</label>
									<input
										type="password"
										required
										className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
										value={confirmNewPassword}
										onChange={(e) => setConfirmNewPassword(e.target.value)}
										placeholder="••••••••"
									/>
								</div>
								<div className="pt-2">
									<button
										type="submit"
										disabled={isUpdatingPass}
										className="w-full flex justify-center items-center gap-2 bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
									>
										Cập nhật mật khẩu
									</button>
								</div>
							</form>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
