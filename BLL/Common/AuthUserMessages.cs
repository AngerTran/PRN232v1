namespace BLL.Common;

public static class AuthUserMessages
{
    public static string Localize(string? message)
    {
        if (string.IsNullOrWhiteSpace(message))
        {
            return "Đã xảy ra lỗi xác thực. Vui lòng thử lại.";
        }

        var raw = message.Trim();
        if (ContainsVietnamese(raw))
        {
            return raw;
        }

        var normalized = raw.ToLowerInvariant();

        return normalized switch
        {
            "invalid login credentials" => "Email hoặc mật khẩu không đúng.",
            "authentication failed." => "Email hoặc mật khẩu không đúng.",
            "email not confirmed" => "Email chưa được xác nhận. Vui lòng kiểm tra hộp thư và bấm link xác nhận.",
            "user already registered" => "Email này đã được đăng ký.",
            "password should be at least 6 characters" => "Mật khẩu phải có tối thiểu 6 ký tự.",
            "signup requires a valid password" => "Mật khẩu không hợp lệ.",
            "unable to validate email address: invalid format" => "Email không hợp lệ.",
            "google authorization code is invalid or expired." => "Phiên đăng nhập Google đã hết hạn. Vui lòng thử lại.",
            "google did not return an id_token." => "Đăng nhập Google thất bại. Vui lòng thử lại.",
            "could not resend confirmation email." => "Không thể gửi lại email xác nhận. Vui lòng thử lại sau.",
            "invalid authentication response from supabase." => "Hệ thống xác thực tạm thời gián đoạn. Vui lòng thử lại sau.",
            "invalid signup response from supabase." => "Đăng ký thất bại. Vui lòng thử lại sau.",
            "token or token_hash is required." => "Liên kết xác thực không hợp lệ.",
            _ when normalized.Contains("email not confirmed", StringComparison.Ordinal) =>
                "Email chưa được xác nhận. Vui lòng kiểm tra hộp thư và bấm link xác nhận.",
            _ when normalized.Contains("user already registered", StringComparison.Ordinal) =>
                "Email này đã được đăng ký.",
            _ when normalized.Contains("invalid login credentials", StringComparison.Ordinal) =>
                "Email hoặc mật khẩu không đúng.",
            _ when normalized.Contains("password should be at least", StringComparison.Ordinal) =>
                "Mật khẩu phải có tối thiểu 6 ký tự.",
            _ when normalized.Contains("unable to validate email", StringComparison.Ordinal) =>
                "Email không hợp lệ.",
            _ when normalized.Contains("account created", StringComparison.Ordinal)
                  || normalized.Contains("confirm your email", StringComparison.Ordinal) =>
                "Đã tạo tài khoản. Vui lòng xác nhận email trước khi đăng nhập.",
            _ => "Đã xảy ra lỗi xác thực. Vui lòng thử lại.",
        };
    }

    private static bool ContainsVietnamese(string value) =>
        value.Any(ch => ch is >= '\u00C0' and <= '\u1EF9');
}
