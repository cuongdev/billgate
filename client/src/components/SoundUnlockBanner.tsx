import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { soundService } from '../services/sound';

export const SoundUnlockBanner: React.FC = () => {
	const [visible, setVisible] = useState(false);
	const [unlocking, setUnlocking] = useState(false);
	const [error, setError] = useState(false);

	useEffect(() => {
		// Check session storage on mount
		const unlocked = soundService.isUnlocked();
		if (!unlocked) {
			setVisible(true);
		}
	}, []);

	const handleEnable = async () => {
		setUnlocking(true);
		setError(false);
		const success = await soundService.initSound();
		if (success) {
			setVisible(false);
		} else {
			setError(true);
		}
		setUnlocking(false);
	};

	const handleDismiss = () => {
		// "Later" action - hide for this render only, 
		// does not set session storage, so it returns on reload.
		setVisible(false);
	};

	if (!visible) return null;

	return (
		<div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-10 duration-500 fade-in">
			<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-4 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 max-w-[320px] flex flex-col gap-3">
				<div className="flex items-start gap-3">
					<div className={`p-2.5 rounded-full flex-shrink-0 ${error ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
						{error ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 animate-pulse" />}
					</div>

					<div className="flex flex-col pt-0.5">
						<span className="font-semibold text-sm leading-tight">
							Bật âm thanh thông báo
						</span>
						<span className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-snug">
							{error
								? "Không thể bật âm thanh. Vui lòng thử lại sau."
								: "Cho phép phát âm thanh khi có biến động số dư mới."}
						</span>
					</div>

					<button
						onClick={handleDismiss}
						className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 -mt-1 -mr-1 p-1"
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
					</button>
				</div>

				<div className="flex gap-2 w-full">
					<button
						onClick={handleDismiss}
						className="flex-1 px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
					>
						Để sau
					</button>
					<button
						onClick={handleEnable}
						disabled={unlocking}
						className="flex-1 px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed"
					>
						{unlocking ? 'Đang bật...' : 'Bật ngay'}
					</button>
				</div>
			</div>
		</div>
	);
};
