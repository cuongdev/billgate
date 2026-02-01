import React, { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

interface Toast {
	id: string;
	type: 'success' | 'error';
	message: string;
}

interface NotificationContextType {
	success: (message: string) => void;
	error: (message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const [toasts, setToasts] = useState<Toast[]>([]);

	const addToast = useCallback((type: 'success' | 'error', message: string) => {
		const id = Math.random().toString(36).substring(2, 9);
		setToasts((prev) => [...prev, { id, type, message }]);

		// Auto dismiss
		setTimeout(() => {
			removeToast(id);
		}, 4000);
	}, []);

	const removeToast = useCallback((id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);

	const success = useCallback((msg: string) => addToast('success', msg), [addToast]);
	const error = useCallback((msg: string) => addToast('error', msg), [addToast]);

	return (
		<NotificationContext.Provider value={{ success, error }}>
			{children}
			{/* Toast Container */}
			<div className="fixed top-4 right-4 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none">
				{toasts.map((toast) => (
					<div
						key={toast.id}
						className={`
              pointer-events-auto transform transition-all duration-300 ease-in-out translate-y-0 opacity-100
              flex items-start gap-3 p-4 rounded-lg shadow-lg border border-opacity-20
              ${toast.type === 'success' ? 'bg-white border-green-500 text-gray-800' : 'bg-white border-red-500 text-gray-800'}
            `}
						role="alert"
					>
						<div className={`mt-0.5 ${toast.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
							{toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
						</div>
						<div className="flex-1 text-sm font-medium leading-5 break-words">
							{toast.message}
						</div>
						<button
							onClick={() => removeToast(toast.id)}
							className="text-gray-400 hover:text-gray-600 transition-colors"
						>
							<X size={18} />
						</button>
					</div>
				))}
			</div>
		</NotificationContext.Provider>
	);
};

export const useNotification = () => {
	const context = useContext(NotificationContext);
	if (!context) {
		throw new Error('useNotification must be used within a NotificationProvider');
	}
	return context;
};
