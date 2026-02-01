import React from 'react'
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { NotificationProvider } from './contexts/NotificationContext.tsx';
import { SocketProvider } from './contexts/SocketContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<NotificationProvider>
			<SocketProvider>
				<App />
			</SocketProvider>
		</NotificationProvider>
	</React.StrictMode>,
)
