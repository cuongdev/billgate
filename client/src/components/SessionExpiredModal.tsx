import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { eventBus, EVENTS } from '../utils/EventBus';

export const SessionExpiredModal: React.FC = () => {
	const [isOpen, setIsOpen] = useState(false);
	const { loginWithGoogle, loading } = useAuth();
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const handleSessionExpired = () => {
			console.log('[SessionExpiredModal] Detected session expiration. Opening modal.');
			setIsOpen(true);
		};

		eventBus.on(EVENTS.SESSION_EXPIRED, handleSessionExpired);

		return () => {
			eventBus.off(EVENTS.SESSION_EXPIRED, handleSessionExpired);
		};
	}, []);

	const handleLogin = async () => {
		setError(null);
		try {
			await loginWithGoogle();
			console.log('[SessionExpiredModal] Re-login successful. Closing modal.');
			setIsOpen(false);
			// Optionally reload page to ensure state consistency, or trust the app to recover
			// window.location.reload(); 
		} catch (err: any) {
			console.error('[SessionExpiredModal] Re-login failed:', err);
			setError(err.message || 'Login failed. Please try again.');
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
			<div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100 dark:bg-gray-800">
				<div className="p-6 text-center">
					<div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4 dark:bg-red-900">
						<svg className="h-6 w-6 text-red-600 dark:text-red-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
						</svg>
					</div>
					<h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-2">
						Session Expired
					</h3>
					<p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
						Your session has expired. Please log in again to continue where you left off.
					</p>

					{error && (
						<div className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded dark:bg-red-900/20">
							{error}
						</div>
					)}

					<button
						onClick={handleLogin}
						disabled={loading}
						className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
					>
						{loading ? 'Logging in...' : 'Login with Google'}
					</button>

					{/* Optional Logout Button if they want to give up */}
					{/* 
                    <button
                        onClick={async () => { await logout(); setIsOpen(false); window.location.href = '/login'; }}
                        className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:text-sm dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:border-gray-600"
                    >
                        Logout
                    </button>
                    */}
				</div>
			</div>
		</div>
	);
};
