import React, { useState } from 'react';
import { Clock, ArrowUp, ArrowDown, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

interface Transaction {
	id: string;
	bankTransactionId?: string; // Added bankTransactionId
	accountNumber: string | null;
	keyShare: string | null;
	date: string | Date;
	amount: string;
	currency: string;
	note: string;
	senderAccount: string;
	createdAt: number | string;
}

interface TransactionsTableProps {
	transactions: Transaction[];
	loading: boolean;
	sortField?: string;
	sortOrder?: 'asc' | 'desc';
	onSort?: (field: string) => void;
	showAccountColumn?: boolean;
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({
	transactions,
	loading,
	sortField,
	sortOrder,
	onSort,
	showAccountColumn = true
}) => {
	const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
	const [copiedId, setCopiedId] = useState<string | null>(null);

	const toggleRow = (id: string, e: React.MouseEvent) => {
		// Prevent toggle when clicking copy button
		if ((e.target as HTMLElement).closest('.copy-btn')) return;

		const newExpanded = new Set(expandedRows);
		if (newExpanded.has(id)) {
			newExpanded.delete(id);
		} else {
			newExpanded.add(id);
		}
		setExpandedRows(newExpanded);
	};

	const copyToClipboard = (text: string, id: string) => {
		navigator.clipboard.writeText(text);
		setCopiedId(id);
		setTimeout(() => setCopiedId(null), 2000);
	};

	const formatCurrency = (amountStr: string, currency: string) => {
		const clean = amountStr.replace(/,/g, '');
		const num = parseInt(clean);
		if (isNaN(num)) return { text: amountStr, isPositive: false };
		const isPositive = !amountStr.startsWith('-');
		return {
			text: `${isPositive ? '+' : ''}${num.toLocaleString()} ${currency}`,
			isPositive
		};
	};

	const renderSortIcon = (field: string) => {
		if (!onSort || sortField !== field) return <div className="w-4 h-4" />;
		return sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />;
	};

	const HeaderCell = ({ field, label, align = 'left' }: { field?: string, label: string, align?: 'left' | 'right' }) => (
		<th
			className={`py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-${align} cursor-pointer group hover:bg-gray-50 select-none`}
			onClick={() => field && onSort && onSort(field)}
		>
			<div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
				{label}
				{field && renderSortIcon(field)}
			</div>
		</th>
	);

	return (
		<div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
			<table className="w-full">
				<thead className="bg-gray-50 border-b border-gray-200">
					<tr>
						<th className="w-8 py-3 px-4"></th> {/* Helper col for expand icon */}
						<HeaderCell field="date" label="Thời gian" />
						<HeaderCell label="Bank Trans ID" /> {/* New Column */}
						{showAccountColumn && <HeaderCell field="account_number" label="Tài khoản" />}
						{showAccountColumn && <HeaderCell field="key_share" label="Key Share" />}
						<HeaderCell field="amount" label="Số tiền" align="right" />
						<HeaderCell label="Nội dung" />
					</tr>
				</thead>
				<tbody className="divide-y divide-gray-100">
					{loading ? (
						<tr><td colSpan={showAccountColumn ? 7 : 5} className="py-20 text-center text-gray-400">Đang tải dữ liệu...</td></tr>
					) : transactions.length === 0 ? (
						<tr><td colSpan={showAccountColumn ? 7 : 5} className="py-20 text-center text-gray-400">Không tìm thấy giao dịch nào</td></tr>
					) : (
						transactions.map((tx) => {
							const { text, isPositive } = formatCurrency(tx.amount, tx.currency);
							let dateValue: Date | null = null;
							if (tx.date) {
								if (tx.date instanceof Date) {
									dateValue = tx.date;
								} else if (typeof tx.date === 'string') {
									dateValue = new Date(tx.date);
								}
							}
							const formattedDate = dateValue && !isNaN(dateValue.getTime())
								? dateValue.toLocaleString('vi-VN', {
									timeZone: 'Asia/Ho_Chi_Minh',
									day: '2-digit',
									month: '2-digit',
									year: 'numeric',
									hour: '2-digit',
									minute: '2-digit',
									hour12: false
								}).replace(',', '')
								: '---';

							const isExpanded = expandedRows.has(tx.id);

							return (
								<React.Fragment key={tx.id}>
									<tr
										className={`transition-colors group cursor-pointer ${isExpanded ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
										onClick={(e) => toggleRow(tx.id, e)}
									>
										<td className="py-4 px-4 text-center">
											{isExpanded ?
												<ChevronUp className="w-4 h-4 text-blue-500" /> :
												<ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
											}
										</td>
										<td className="py-4 px-4 text-sm text-gray-500 whitespace-nowrap">
											<div className="flex items-center gap-3">
												<div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isExpanded ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-500'}`}>
													<Clock className="w-4 h-4" />
												</div>
												<div className="font-medium text-gray-900">
													{formattedDate}
												</div>
											</div>
										</td>

										{/* Bank Transaction ID Column */}
										<td className="py-4 px-4">
											<div className="flex items-center gap-2 group/id">
												<span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded max-w-[100px] truncate" title={tx.bankTransactionId}>
													{tx.bankTransactionId || '---'}
												</span>
												{tx.bankTransactionId && (
													<button
														className="copy-btn opacity-0 group-hover/id:opacity-100 p-1 hover:bg-gray-200 rounded transition-all"
														onClick={(e) => {
															e.stopPropagation();
															copyToClipboard(tx.bankTransactionId!, tx.id);
														}}
														title="Copy ID"
													>
														{copiedId === tx.id ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-gray-500" />}
													</button>
												)}
											</div>
										</td>

										{showAccountColumn && (
											<td className="py-4 px-4">
												<span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-600">
													{tx.accountNumber || '-'}
												</span>
											</td>
										)}
										{showAccountColumn && (
											<td className="py-4 px-4">
												<span className="font-mono text-xs bg-blue-50 px-2 py-1 rounded text-blue-700">
													{tx.keyShare || '-'}
												</span>
											</td>
										)}
										<td className="py-4 px-4 text-right">
											<div className={`font-bold font-mono ${isPositive ? 'text-green-600' : 'text-gray-900'}`}>
												{text}
											</div>
										</td>
										<td className="py-4 px-4 text-sm text-gray-600 max-w-xs truncate" title={tx.note}>
											{tx.note}
										</td>
									</tr>

									{/* Expandable Details Row */}
									{isExpanded && (
										<tr className="bg-blue-50/30">
											<td colSpan={showAccountColumn ? 7 : 5} className="px-4 py-4 border-t border-blue-100">
												<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm animate-in fade-in slide-in-from-top-1 duration-200">
													<div className="space-y-2">
														<div>
															<span className="text-xs font-semibold text-gray-500 uppercase">Nội dung đầy đủ</span>
															<div className="mt-1 p-3 bg-white rounded border border-blue-100 text-gray-800 font-mono text-sm whitespace-pre-wrap leading-relaxed">
																{tx.note}
															</div>
														</div>
														<div className="flex gap-4">
															<div>
																<span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Bank Trans ID</span>
																<div className="font-mono text-xs bg-white px-2 py-1 rounded border border-gray-200 select-all">
																	{tx.bankTransactionId || 'N/A'}
																</div>
															</div>
															<div>
																<span className="text-xs font-semibold text-gray-500 uppercase block mb-1">System ID</span>
																<div className="font-mono text-xs text-gray-400 select-all">
																	{tx.id}
																</div>
															</div>
														</div>
													</div>

													<div className="space-y-2">
														<span className="text-xs font-semibold text-gray-500 uppercase">Thông tin thêm</span>
														<div className="grid grid-cols-2 gap-2">
															<div className="p-2 bg-white rounded border border-gray-100">
																<span className="text-xs text-gray-400 block">Sender Account</span>
																<span className="font-mono text-sm">{tx.senderAccount || '---'}</span>
															</div>
															<div className="p-2 bg-white rounded border border-gray-100">
																<span className="text-xs text-gray-400 block">Created At</span>
																<span className="font-mono text-sm">{new Date(tx.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false })}</span>
															</div>
														</div>
													</div>
												</div>
											</td>
										</tr>
									)}
								</React.Fragment>
							);
						})
					)}
				</tbody>
			</table>
		</div>
	);
};
