export type AuthErrorContext = 'login' | 'register' | 'google' | 'generic';

function defaultAuthErrorMessage(context: AuthErrorContext): string {
  switch (context) {
    case 'login':
      return 'Đăng nhập thất bại. Vui lòng kiểm tra email và mật khẩu.';
    case 'register':
      return 'Đăng ký thất bại. Vui lòng thử lại.';
    case 'google':
      return 'Đăng nhập Google thất bại. Vui lòng thử lại.';
    default:
      return 'Đã xảy ra lỗi. Vui lòng thử lại.';
  }
}

const EXACT_MESSAGES: Record<string, string> = {
  'invalid login credentials': 'Email hoặc mật khẩu không đúng.',
  'authentication failed.': 'Email hoặc mật khẩu không đúng.',
  'email not confirmed': 'Email chưa được xác nhận. Vui lòng kiểm tra hộp thư và bấm link xác nhận.',
  'user already registered': 'Email này đã được đăng ký.',
  'password should be at least 6 characters': 'Mật khẩu phải có tối thiểu 6 ký tự.',
  'signup requires a valid password': 'Mật khẩu không hợp lệ.',
  'unable to validate email address: invalid format': 'Email không hợp lệ.',
  'google authorization code is invalid or expired.': 'Phiên đăng nhập Google đã hết hạn. Vui lòng thử lại.',
  'access_denied': 'Bạn đã hủy đăng nhập Google.',
};

function isVietnameseText(value: string): boolean {
  return /[ăâđêôơưáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(value);
}

export function translateLoginError(message: string): string {
  return formatAuthError(new Error(message), 'login');
}

export function translateRegisterError(message: string): string {
  return formatAuthError(new Error(message), 'register');
}

export function formatApiErrorMessage(raw: string, status?: number, path?: string): string {
  const context: AuthErrorContext = (() => {
    const normalizedPath = (path ?? '').toLowerCase();
    if (normalizedPath.includes('/auth/register')) return 'register';
    if (normalizedPath.includes('/auth/google')) return 'google';
    if (normalizedPath.includes('/auth/login') || normalizedPath.includes('/auth/refresh')) return 'login';
    return 'generic';
  })();

  if (!raw.trim() && status === 401) {
    return context === 'login' ? 'Email hoặc mật khẩu không đúng.' : 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.';
  }

  return formatAuthError(new Error(raw), context);
}

export function formatAuthError(error: unknown, context: AuthErrorContext = 'generic'): string {
  const raw = error instanceof Error ? error.message.trim() : String(error ?? '').trim();
  if (!raw) {
    return defaultAuthErrorMessage(context);
  }

  const normalized = raw.toLowerCase();

  if (
    normalized.includes('failed to fetch') ||
    normalized.includes('networkerror') ||
    normalized.includes('load failed') ||
    normalized.includes('err_ssl') ||
    normalized.includes('network request failed')
  ) {
    return 'Không kết nối được máy chủ. Kiểm tra kết nối mạng hoặc thử lại sau.';
  }

  if (EXACT_MESSAGES[normalized]) {
    return EXACT_MESSAGES[normalized];
  }

  if (normalized.includes('invalid login credentials')) {
    return 'Email hoặc mật khẩu không đúng.';
  }
  if (normalized.includes('email not confirmed')) {
    return 'Email chưa được xác nhận. Vui lòng kiểm tra hộp thư và bấm link xác nhận.';
  }
  if (normalized.includes('user already registered') || normalized.includes('already been registered')) {
    return 'Email này đã được đăng ký.';
  }
  if (normalized.includes('password should be at least') || normalized.includes('password is too short')) {
    return 'Mật khẩu phải có tối thiểu 6 ký tự.';
  }
  if (normalized.includes('unable to validate email') || normalized.includes('invalid email')) {
    return 'Email không hợp lệ.';
  }
  if (normalized.includes('account created') || normalized.includes('confirm your email')) {
    return 'Đã tạo tài khoản. Vui lòng xác nhận email trước khi đăng nhập.';
  }
  if (normalized.includes('google authorization code') || normalized.includes('google did not return')) {
    return 'Đăng nhập Google thất bại. Vui lòng thử lại.';
  }
  if (normalized.includes('database connection failed')) {
    return 'Hệ thống tạm thời gián đoạn. Vui lòng thử lại sau.';
  }

  if (/request failed with status 401/.test(normalized) || normalized.includes('unauthorized')) {
    return context === 'login' ? 'Email hoặc mật khẩu không đúng.' : 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.';
  }
  if (/request failed with status 403/.test(normalized) || normalized.includes('forbidden')) {
    return 'Bạn không có quyền thực hiện thao tác này.';
  }
  if (/request failed with status 5\d\d/.test(normalized)) {
    return 'Hệ thống tạm thời gián đoạn. Vui lòng thử lại sau.';
  }

  if (
    normalized.includes('supabase') ||
    normalized.includes('post /api/') ||
    normalized.includes('invalid authentication response') ||
    normalized.includes('invalid signup response') ||
    normalized.includes('token_hash is required')
  ) {
    return defaultAuthErrorMessage(context);
  }

  if (isVietnameseText(raw)) {
    return raw;
  }

  return defaultAuthErrorMessage(context);
}
