import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { RefreshCw } from 'lucide-react';

export const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const { currentUser, loading, authReady } = useAuth(); // Use authReady for initial check

	console.log('[PrivateRoute] Check:', { loading, authReady, user: currentUser ? currentUser.uid : 'null' });

	// Wait until auth is fully initialized (persistence + redirect checked)
	if (!authReady || loading) {
		console.log('[PrivateRoute] Not ready/Loading... showing spinner');
		return (
			<div className="min-h-screen flex items-center justify-center">
				<RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
			</div>
		);
	}

	if (!currentUser) {
		console.log('[PrivateRoute] No user, redirecting to /login');
		return <Navigate to="/login" replace />;
	}

	console.log('[PrivateRoute] Access granted');
	return <>{children}</>;
};
