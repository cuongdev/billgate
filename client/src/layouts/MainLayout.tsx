import React from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, GitBranch, PlusCircle, Activity, Globe, Link as LinkIcon } from 'lucide-react';

const QUICK_LINK_URL = 'https://vietqr.xyz/create-link.html';

export const MainLayout: React.FC = () => {
	const navItems = [
		{ path: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
		{ path: '/workflows', label: 'Kết nối ngân hàng', icon: GitBranch },
		{ path: '/transactions', label: 'Lịch sử giao dịch', icon: Activity },
		{ path: '/webhooks', label: 'Lịch sử Webhook', icon: Globe },
		{ path: '/create', label: 'Thêm kết nối', icon: PlusCircle },
	];

	return (
		<div className="flex h-screen bg-gray-50">
			{/* Sidebar Dark Premium */}
			<aside className="w-72 bg-[#1e1e2d] text-white hidden md:flex flex-col shadow-2xl relative z-20">
				{/* Logo Section - click to home */}
				<Link to="/" className="h-20 flex items-center gap-4 px-6 border-b border-gray-800 bg-[#1a1a27] hover:bg-[#16161f] transition-colors">
					<div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-green-500 to-teal-500 flex items-center justify-center shadow-lg shadow-green-900/20">
						<span className="font-bold text-lg text-white">BG</span>
					</div>
					<div>
						<h1 className="font-bold text-lg tracking-wide">BillGate</h1>
						<p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Manager Pro</p>
					</div>
				</Link>

				{/* Navigation */}
				<nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto custom-scrollbar">
					<div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-3">Menu chính</div>
					{navItems.map((item) => (
						<NavLink
							key={item.path}
							to={item.path}
							className={({ isActive }) =>
								`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden ${isActive
									? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30 translate-x-1'
									: 'text-gray-400 hover:bg-gray-800 hover:text-white hover:translate-x-1'
								}`
							}
						>
							<item.icon className="w-5 h-5 opacity-90 transition-transform group-hover:scale-110" />
							<span className="relative z-10">{item.label}</span>
						</NavLink>
					))}
					<a
						href={QUICK_LINK_URL}
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 text-gray-400 hover:bg-gray-800 hover:text-white hover:translate-x-1 group"
					>
						<LinkIcon className="w-5 h-5 opacity-90 transition-transform group-hover:scale-110" />
						<span>Tạo Quick Link</span>
					</a>
				</nav>

				{/* User Profile Section */}
				<div className="p-4 bg-[#151521] border-t border-gray-800">
					<NavLink to="/profile" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-800 transition-colors group">
						<div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-sm font-bold shadow-lg overflow-hidden">
							{/* Placeholder for User Avatar if available, else Initials */}
							<span className="group-hover:hidden">ME</span>
							<span className="hidden group-hover:block">⚙️</span>
						</div>
						<div className="flex-1 overflow-hidden">
							<div className="text-sm font-medium text-gray-200 truncate">Tài khoản</div>
							<div className="text-[10px] text-gray-500 truncate">Cài đặt cá nhân</div>
						</div>
					</NavLink>
				</div>
			</aside>

			{/* Mobile Header (Placeholder) */}
			<div className="md:hidden fixed top-0 w-full bg-[#1e1e2d] text-white z-50 p-4 flex items-center justify-between shadow-md">
				<div className="font-bold">VPBank Manager</div>
				{/* Add mobile toggle here later */}
			</div>

			{/* Main Content */}
			<main className="flex-1 overflow-auto relative z-10 pt-16 md:pt-0">
				<div className="p-6 md:p-8 max-w-[1600px] mx-auto">
					<Outlet />
				</div>
			</main>
		</div>
	);
};
