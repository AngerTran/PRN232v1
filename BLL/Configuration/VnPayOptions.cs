namespace BLL.Configuration;

public class VnPayOptions
{
    public const string SectionName = "VnPay";

    public string TmnCode { get; set; } = string.Empty;

    public string HashSecret { get; set; } = string.Empty;

    public string BaseUrl { get; set; } = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";

    public string ReturnUrl { get; set; } = string.Empty;

    public string IpnUrl { get; set; } = string.Empty;

    public string FrontendPaymentReturnBaseUrl { get; set; } = string.Empty;
}
