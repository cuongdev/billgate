/** Múi giờ mặc định cho toàn bộ ứng dụng */
export const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';

const defaultDateOptions: Intl.DateTimeFormatOptions = {
  timeZone: DEFAULT_TIMEZONE,
  hour12: false,
};

/**
 * Định dạng ngày giờ theo vi-VN, múi giờ Asia/Ho_Chi_Minh.
 */
export function formatDateTime(
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const d = typeof date === 'object' && date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '---';
  return d.toLocaleString('vi-VN', { ...defaultDateOptions, ...options });
}

/**
 * Options ngày giờ đầy đủ (ngày/tháng/năm giờ:phút:giây).
 */
export const dateTimeFormatOptions: Intl.DateTimeFormatOptions = {
  timeZone: DEFAULT_TIMEZONE,
  hour12: false,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
};
