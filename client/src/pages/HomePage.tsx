import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
	Shield,
	Zap,
	ArrowRight,
	PieChart,
	Globe,
	Building2,
	Lock,
	Server,
	CheckCircle2,
	Heart,
} from 'lucide-react';

const QUICK_LINK_URL = 'https://vietqr.xyz/create-link.html';
const DONATE_URL = 'https://vietqr.xyz/?bank=Techcombank&acc=449988&name=NGUYEN+TUAN+CUONG&amount=1000';
const VPBANK_OPEN_ACCOUNT_URL = 'https://vpo.page.link/zQ435AQGeUSwLviq6';
const VPBANK_QR_IMAGE = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(VPBANK_OPEN_ACCOUNT_URL)}`;
import { useAuth } from '../contexts/AuthContext';

export const HomePage: React.FC = () => {
	const navigate = useNavigate();
	const { currentUser } = useAuth();
	const [starCount, setStarCount] = useState<number | null>(null);

	useEffect(() => {
		fetch('https://api.github.com/repos/cuongdev/billgate')
			.then(res => res.json())
			.then(data => {
				if (data.stargazers_count) {
					setStarCount(data.stargazers_count);
				}
			})
			.catch(err => console.error('Failed to fetch github stars', err));
	}, []);

	return (
		<div className="min-h-screen bg-gray-50 flex flex-col font-sans">
			{/* Sticky Header */}
			<header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
				<nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
					<Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
						<div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-600/20">
							<span className="font-bold text-xl">BG</span>
						</div>
						<span className="font-extrabold text-gray-900 text-xl tracking-wide">
							Bill<span className="text-green-700">Gate</span>
						</span>
					</Link>

					<div className="hidden md:flex items-center gap-8">
						<a href="#features" className="text-sm font-medium text-gray-600 hover:text-green-700 transition-colors">Tính năng</a>
						<a href="#security" className="text-sm font-medium text-gray-600 hover:text-green-700 transition-colors">Bảo mật</a>
						<a href="/guides/notification-flow.html" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-gray-600 hover:text-green-700 transition-colors">Hướng dẫn</a>
						<a
							href={QUICK_LINK_URL}
							target="_blank"
							rel="noopener noreferrer"
							className="text-sm font-medium text-gray-600 hover:text-green-700 transition-colors flex items-center gap-1.5"
						>
							Quick Link
						</a>
						<a
							href="#referral"
							className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-bold rounded-full shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 hover:-translate-y-0.5 transition-all flex items-center gap-1 animate-pulse hover:animate-none"
						>
							<span className="relative flex h-2 w-2 mr-1">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
								<span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
							</span>
							Mở tài khoản VPBank
						</a>
						<a
							href="https://github.com/cuongdev/billgate"
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:border-gray-300 transition-colors"
						>
							<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
								<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"></path>
							</svg>
							{starCount !== null && (
								<span className="inline-flex items-center gap-1 text-gray-500">
									<svg className="w-3.5 h-3.5 text-yellow-500" viewBox="0 0 24 24" fill="currentColor">
										<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
									</svg>
									{starCount}
								</span>
							)}
						</a>
					</div>

					<div className="flex items-center gap-4">
						<a
							href={DONATE_URL}
							target="_blank"
							rel="noopener noreferrer"
							className="hidden lg:flex items-center gap-2 text-pink-600 font-bold text-sm hover:text-pink-700 transition-colors px-4 py-1.5 bg-pink-50 rounded-full hover:bg-pink-100 border border-pink-100"
						>
							<Heart className="w-4 h-4 fill-current animate-pulse" /> Donate
						</a>
						{currentUser ? (
							<button
								onClick={() => navigate('/workflows')}
								className="bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-gray-800 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
							>
								Vào Dashboard
							</button>
						) : (
							<>
								<button
									onClick={() => navigate('/login')}
									className="hidden sm:block text-gray-600 font-semibold text-sm hover:text-green-700 transition-colors"
								>
									Đăng nhập
								</button>
								<button
									onClick={() => navigate('/register')}
									className="bg-green-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-green-700 transition-all shadow-md shadow-green-500/20 hover:shadow-green-500/40 transform hover:-translate-y-0.5"
								>
									Đăng ký ngay
								</button>
							</>
						)}
					</div>
				</nav >
			</header >

			{/* Hero Section */}
			< section className="relative pt-20 pb-32 overflow-hidden bg-white" >
				<div className="absolute top-0 right-0 -mr-64 -mt-64 w-[800px] h-[800px] bg-emerald-50 rounded-full blur-3xl opacity-50 z-0"></div>
				<div className="absolute bottom-0 left-0 -ml-64 -mb-64 w-[600px] h-[600px] bg-green-50 rounded-full blur-3xl opacity-50 z-0"></div>

				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
						<div className="space-y-8">
							<div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-100 rounded-full hover:bg-green-100 transition-colors cursor-default">
								<span className="relative flex h-3 w-3">
									<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
									<span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
								</span>
								<span className="text-xs font-bold text-green-700 tracking-wide uppercase">Official Banking API</span>
							</div>

							<h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 leading-[1.15] tracking-tight">
								Cổng thanh toán <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-500">Chính thống</span> dành cho Chủ cửa hàng.
							</h1>

							<p className="text-lg text-gray-600 leading-relaxed max-w-xl">
								Nhận biến động số dư tức thì, bảo mật tuyệt đối và không qua trung gian.
							</p>

							<div className="flex flex-col sm:flex-row gap-4">
								<button
									onClick={() => navigate(currentUser ? '/workflows' : '/register')}
									className="px-8 py-4 bg-green-600 text-white rounded-xl font-bold text-lg shadow-xl shadow-green-500/20 hover:bg-green-700 hover:shadow-green-500/30 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2"
								>
									Kết nối ngay <ArrowRight className="w-5 h-5" />
								</button>
								<button
									onClick={() => window.open('https://github.com/cuongdev/billgate', '_blank')}
									className="group px-8 py-4 bg-white text-gray-700 border border-gray-200 rounded-xl font-bold text-lg hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-3"
								>
									<svg className="w-5 h-5 text-gray-500 group-hover:text-black transition-colors" viewBox="0 0 24 24" fill="currentColor">
										<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"></path>
									</svg>
									<span>Star Project</span>
									{starCount !== null && (
										<span className="bg-gray-100 text-gray-800 px-2.5 py-0.5 rounded-full text-sm font-extrabold group-hover:bg-gray-200 transition-colors flex items-center gap-1">
											{starCount} <span className="text-amber-500 text-xs">★</span>
										</span>
									)}
								</button>
							</div>

							<div className="pt-6 flex items-center gap-8 text-gray-400">
								<div className="flex items-center gap-2">
									<CheckCircle2 className="w-5 h-5 text-green-600" />
									<span className="text-sm font-medium">Đối tác chính thức</span>
								</div>
								<div className="flex items-center gap-2">
									<CheckCircle2 className="w-5 h-5 text-green-600" />
									<span className="text-sm font-medium">SLA 99.99%</span>
								</div>
							</div>
						</div>

						{/* Hero Image / Mockup */}
						<div className="relative">
							<div className="absolute inset-0 bg-gradient-to-tr from-green-600 to-emerald-600 rounded-[2rem] transform rotate-3 scale-95 opacity-20 blur-2xl"></div>
							<div className="relative bg-white border border-gray-100 rounded-[2rem] shadow-2xl p-6 overflow-hidden">
								{/* Fake UI Mockup */}
								<div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
									<div className="flex items-center gap-4">
										<div className="w-16 h-16 bg-green-50 rounded-xl flex items-center justify-center">
											<span className="text-2xl font-bold text-green-700">VP</span>
										</div>
										<div>
											<h3 className="font-bold text-gray-900">Tài khoản cửa hàng</h3>
											<p className="text-sm text-gray-500">Official API</p>
										</div>
									</div>
									<div className="text-right">
										<p className="text-sm text-gray-500 mb-1">Dòng tiền thực</p>
										<p className="text-2xl font-bold text-gray-900">2,500,000,000 đ</p>
									</div>
								</div>

								<div className="space-y-4">
									<div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-100">
										<div className="flex items-center gap-3">
											<div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
												<ArrowRight className="w-5 h-5 text-green-700 transform -rotate-45" />
											</div>
											<div>
												<p className="font-bold text-gray-900">Nhận tiền từ VietQR</p>
												<p className="text-xs text-green-700">Giao dịch đã xác thực</p>
											</div>
										</div>
										<span className="font-bold text-green-700">+ 500,000 đ</span>
									</div>
									<div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
										<div className="flex items-center gap-3">
											<div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
												<Server className="w-5 h-5 text-gray-600" />
											</div>
											<div>
												<p className="font-bold text-gray-900">Webhook: Order #992</p>
												<p className="text-xs text-gray-500">Đã gửi tới Merchant</p>
											</div>
										</div>
										<span className="font-mono text-xs text-gray-500 bg-white px-2 py-1 rounded border">HTTP 200</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section >

			{/* Stats Section */}
			< section className="py-10 bg-white border-y border-gray-100" >
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-gray-100">
						<div>
							<p className="text-4xl font-extrabold text-gray-900 mb-2">100%</p>
							<p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Official API</p>
						</div>
						<div>
							<p className="text-4xl font-extrabold text-gray-900 mb-2">0s</p>
							<p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Độ trễ (Real-time)</p>
						</div>
						<div>
							<p className="text-4xl font-extrabold text-gray-900 mb-2">PCI DSS</p>
							<p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Chuẩn bảo mật</p>
						</div>
						<div>
							<p className="text-4xl font-extrabold text-gray-900 mb-2">24/7</p>
							<p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Hỗ trợ kỹ thuật</p>
						</div>
					</div>
				</div>
			</section >

			{/* Features Grid */}
			< section id="features" className="py-24 bg-gray-50" >
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center max-w-3xl mx-auto mb-16">
						<span className="text-green-600 font-bold tracking-wide uppercase text-sm">Tính năng nổi bật</span>
						<h2 className="mt-3 text-4xl font-extrabold text-gray-900 sm:text-5xl">Nền tảng ngân hàng mở</h2>
						<p className="mt-4 text-xl text-gray-500">Kết nối trực tiếp vào hệ sinh thái Open Banking</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						{/* Card 1 */}
						<div className="bg-white p-8 rounded-3xl shadow-lg shadow-gray-200/50 border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
							<div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center text-green-600 mb-6">
								<Building2 className="w-7 h-7" />
							</div>
							<h3 className="text-2xl font-bold text-gray-900 mb-4">Official Features</h3>
							<p className="text-gray-500 leading-relaxed mb-6">
								Sử dụng API chính thức từ ngân hàng. Không cần giả lập, không lo bị chặn, không rủi ro bảo mật tài khoản.
							</p>
							<span className="text-green-600 font-semibold flex items-center gap-1">
								<CheckCircle2 className="w-4 h-4" /> Đã xác thực
							</span>
						</div>

						{/* Card 2 */}
						<div className="bg-white p-8 rounded-3xl shadow-lg shadow-gray-200/50 border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
							<div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-6">
								<Zap className="w-7 h-7" />
							</div>
							<h3 className="text-2xl font-bold text-gray-900 mb-4">Instant Webhooks</h3>
							<p className="text-gray-500 leading-relaxed mb-6">
								Nhận thông báo biến động số dư ngay lập tức từ Core Banking. Độ trễ gần như bằng 0.
							</p>
							<a href="#" className="text-blue-600 font-semibold flex items-center gap-1 hover:gap-2 transition-all">
								Xem tài liệu API <ArrowRight className="w-4 h-4" />
							</a>
						</div>

						{/* Card 3 */}
						<div className="bg-white p-8 rounded-3xl shadow-lg shadow-gray-200/50 border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
							<div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 mb-6">
								<PieChart className="w-7 h-7" />
							</div>
							<h3 className="text-2xl font-bold text-gray-900 mb-4">Quản lý dòng tiền</h3>
							<p className="text-gray-500 leading-relaxed mb-6">
								Tự động hạch toán và đối soát giao dịch. Giảm thiểu sai sót con người và tiết kiệm chi phí vận hành.
							</p>
							<a href="#" className="text-purple-600 font-semibold flex items-center gap-1 hover:gap-2 transition-all">
								Xem Demo <ArrowRight className="w-4 h-4" />
							</a>
						</div>
					</div>
				</div>
			</section >

			{/* VPBank Referral Section */}
			< section id="referral" className="py-20 relative overflow-hidden bg-gray-900 text-white" >
				{/* Modern Gradient Background */}
				< div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 z-0" ></div >
				<div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 bg-green-500 rounded-full blur-[120px] opacity-20 animate-pulse"></div>
				<div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 bg-blue-500 rounded-full blur-[120px] opacity-20"></div>

				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
					<div className="flex flex-col md:flex-row items-center justify-between gap-12">
						<div className="md:w-3/5">
							<div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-amber-400/20 to-orange-500/20 border border-amber-500/40 rounded-full mb-6 pointer-events-none">
								<span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping"></span>
								<span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Ưu đãi độc quyền</span>
							</div>
							<h2 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">
								Mở tài khoản VPBank ngay
								<span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-400 to-teal-300">
									Nhận ngay ưu đãi
								</span>
							</h2>
							<p className="text-lg text-gray-300 mb-8 max-w-xl leading-relaxed">
								Sử dụng tính năng Automation Bank Connector ngay khi mở tài khoản VPBank. Miễn phí duy trì, chuyển khoản 24/7.
							</p>
							<div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
								<a
									href={VPBANK_OPEN_ACCOUNT_URL}
									target="_blank"
									rel="noreferrer"
									className="group relative px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:shadow-[0_0_30px_rgba(34,197,94,0.6)] hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3 overflow-hidden"
								>
									<span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></span>
									<span>Mở tài khoản ngay</span>
									<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
								</a>
								<a
									href={VPBANK_OPEN_ACCOUNT_URL}
									target="_blank"
									rel="noopener noreferrer"
									className="flex flex-col items-center gap-2 p-3 bg-white/10 rounded-xl border border-white/20 hover:bg-white/15 transition-colors"
									title="Quét mã để mở tài khoản VPBank"
								>
									<img src={VPBANK_QR_IMAGE} alt="QR mở tài khoản VPBank" className="w-[120px] h-[120px] rounded-lg bg-white" />
									<span className="text-xs text-gray-400">Quét mã mở tài khoản</span>
								</a>
								<div className="flex items-center gap-4 text-gray-400 px-4">
									<div className="flex -space-x-3">
										<div className="w-10 h-10 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center font-bold text-xs text-gray-300 shadow-sm">A</div>
										<div className="w-10 h-10 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center font-bold text-xs text-gray-300 shadow-sm">B</div>
										<div className="w-10 h-10 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center font-bold text-xs text-gray-300 shadow-sm">C</div>
									</div>
									<span className="text-sm font-medium">Hơn 500+ doanh nghiệp</span>
								</div>
							</div>
						</div>
						<div className="md:w-2/5 relative">
							<div className="relative bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl transform rotate-3 hover:rotate-1 transition-all duration-500 group cursor-default">
								<div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
								<div className="flex justify-between items-start mb-8 relative z-10">
									<div className="w-16 h-10 bg-green-600 rounded-lg flex items-center justify-center shadow-lg shadow-green-900/50">
										<span className="font-bold text-white tracking-tighter">VPBank</span>
									</div>
									<div className="text-right">
										<p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Tài khoản</p>
										<p className="font-bold text-white text-lg">BIZ PRO</p>
									</div>
								</div>
								<div className="space-y-8 relative z-10">
									<div>
										<p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Số tài khoản</p>
										<p className="text-3xl font-mono text-white tracking-widest text-shadow-sm">8888 9999 8888</p>
									</div>
									<div className="flex justify-between items-end pt-6 border-t border-white/10">
										<div>
											<p className="text-[10px] text-gray-400 uppercase tracking-widest">Chủ tài khoản</p>
											<p className="font-bold text-white mt-1 text-lg">NGUYEN VAN A</p>
										</div>
										<Globe className="w-10 h-10 text-white/20" />
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section >

			{/* Security Section */}
			< section id="security" className="py-24 bg-white" >
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex flex-col lg:flex-row items-center gap-16">
						<div className="lg:w-1/2">
							<span className="text-green-600 font-bold tracking-wide uppercase text-sm">Bảo mật cấp ngân hàng</span>
							<h2 className="mt-3 text-4xl font-extrabold text-gray-900 sm:text-5xl mb-6">An toàn tuyệt đối</h2>
							<p className="text-lg text-gray-600 mb-8 leading-relaxed">
								Kết nối trực tiếp với cổng API, tuân thủ các tiêu chuẩn bảo mật khắt khe nhất.
							</p>

							<div className="space-y-6">
								<div className="flex gap-4">
									<div className="mt-1">
										<div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
											<Lock className="w-6 h-6" />
										</div>
									</div>
									<div>
										<h4 className="text-xl font-bold text-gray-900">API Security</h4>
										<p className="text-gray-500 mt-1">Cơ chế xác thực tiêu chuẩn quốc tế. Không bao giờ chia sẻ mật khẩu ngân hàng.</p>
									</div>
								</div>
								<div className="flex gap-4">
									<div className="mt-1">
										<div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
											<Shield className="w-6 h-6" />
										</div>
									</div>
									<div>
										<h4 className="text-xl font-bold text-gray-900">VPBank Features</h4>
										<p className="text-gray-500 mt-1">Tính năng chia sẽ biến động số dư đến từ VPBank Neo</p>
									</div>
								</div>
							</div>
						</div>
						<div className="lg:w-1/2">
							<div className="relative">
								<div className="absolute -inset-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-[2.5rem] opacity-30 blur-2xl animate-pulse"></div>
								<img
									src="https://images.unsplash.com/photo-1563986768609-322da13575f3?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80"
									alt="Security Shield"
									className="relative rounded-[2rem] shadow-2xl border border-gray-100 w-full"
								/>
								<div className="absolute -bottom-10 -right-10 bg-white p-6 rounded-2xl shadow-xl border border-gray-50 animate-bounce">
									<div className="flex items-center gap-3">
										<CheckCircle2 className="w-8 h-8 text-green-500" />
										<div>
											<p className="font-bold text-gray-900">API Security</p>
											<p className="text-xs text-gray-500">Official Features</p>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section >

			{/* Footer */}
			< footer className="bg-gray-900 text-white py-16" >
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
						<div className="col-span-1 md:col-span-2">
							<div className="flex items-center gap-2 mb-6">
								<div className="w-8 h-8 bg-gradient-to-br from-green-600 to-emerald-700 rounded-lg flex items-center justify-center text-white">
									<span className="font-bold">VP</span>
								</div>
								<span className="font-bold text-xl tracking-wide">Bank Connector</span>
							</div>
							<p className="text-gray-400 leading-relaxed max-w-sm">
								Cung cấp giải pháp API ngân hàng chính thống. Kết nối trực tiếp, an toàn và ổn định cho doanh nghiệp số.
							</p>
						</div>
						<div>
							<h4 className="text-lg font-bold mb-6">Sản phẩm</h4>
							<ul className="space-y-4 text-gray-400">
								<li><a href="#" className="hover:text-white transition-colors">Open API Docs</a></li>
								<li><a href="#" className="hover:text-white transition-colors">Trạng thái hệ thống</a></li>
								<li><a href="#" className="hover:text-white transition-colors">Bảng giá</a></li>
							</ul>
						</div>
						<div>
							<h4 className="text-lg font-bold mb-6">Hỗ trợ</h4>
							<ul className="space-y-4 text-gray-400">
								<li><a href="#" className="hover:text-white transition-colors">VPBank Support</a></li>
								<li><a href="#" className="hover:text-white transition-colors">Liên hệ Sales</a></li>
							</ul>
						</div>
					</div>
					<div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
						<p>© 2026 BillGate. All rights reserved.</p>
						<div className="flex gap-6">
							<a href="#" className="hover:text-white transition-colors">Privacy</a>
							<a href="#" className="hover:text-white transition-colors">Terms</a>
						</div>
					</div>
				</div>
			</footer >
		</div >
	);
};
