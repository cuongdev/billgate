import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import { MainLayout } from './layouts/MainLayout';
import { WorkflowListPage } from './pages/WorkflowListPage';
import { CreateWorkflowPage } from './pages/CreateWorkflowPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { WebhookLogsPage } from './pages/WebhookLogsPage';
import { WorkflowDetailPage } from './pages/WorkflowDetailPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ProfilePage } from './pages/auth/ProfilePage';
import { DashboardPage } from './pages/DashboardPage';
import { SessionExpiredModal } from './components/SessionExpiredModal';
import { SoundUnlockBanner } from './components/SoundUnlockBanner';


const App: React.FC = () => {
	const router = createBrowserRouter([
		{
			path: '/',
			element: <HomePage />
		},
		{
			path: '/login',
			element: <LoginPage />
		},
		{
			path: '/register',
			element: <RegisterPage />
		},
		{
			path: '/forgot-password',
			element: <ForgotPasswordPage />
		},
		{
			path: '/profile',
			element: (
				<PrivateRoute>
					<ProfilePage />
				</PrivateRoute>
			)
		},
		{
			path: '/',
			element: (
				<PrivateRoute>
					<MainLayout />
				</PrivateRoute>
			),
			children: [
				{ path: 'dashboard', element: <DashboardPage /> },
				{ path: 'workflows', element: <WorkflowListPage /> },
				{ path: 'transactions', element: <TransactionsPage /> },
				{ path: 'webhooks', element: <WebhookLogsPage /> },
				{ path: 'create', element: <CreateWorkflowPage /> },

				{ path: 'workflows/:id', element: <WorkflowDetailPage /> },
			],
		},
	]);

	return (
		<AuthProvider>
			<SoundUnlockBanner />
			<RouterProvider router={router} />
			<SessionExpiredModal />
		</AuthProvider>
	);
};

export default App;
