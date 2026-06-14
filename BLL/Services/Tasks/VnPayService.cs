using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using BLL.Configuration;

namespace BLL.Services.Tasks;

public class VnPayService
{
    private readonly VnPayOptions _options;

    public VnPayService(IOptions<VnPayOptions> options)
    {
        _options = options.Value;
    }

    public string CreatePaymentUrl(decimal amount, string orderInfo, string returnUrl, string ipnUrl, string txnRef)
    {
        var vnpParams = new SortedList<string, string>
        {
            ["vnp_Version"] = "2.1.0",
            ["vnp_Command"] = "pay",
            ["vnp_TmnCode"] = _options.TmnCode,
            ["vnp_Amount"] = ((long)(amount * 100)).ToString(), // VNPay expects amount in VND * 100
            ["vnp_CurrCode"] = "VND",
            ["vnp_TxnRef"] = txnRef,
            ["vnp_OrderInfo"] = orderInfo,
            ["vnp_OrderType"] = "billpayment",
            ["vnp_Locale"] = "vn",
            ["vnp_ReturnUrl"] = returnUrl,
            ["vnp_IpAddr"] = "127.0.0.1",
            ["vnp_CreateDate"] = DateTime.Now.ToString("yyyyMMddHHmmss"),
            ["vnp_IpnUrl"] = ipnUrl
        };

        var hashData = string.Join("&", vnpParams.Select(kvp => $"{kvp.Key}={kvp.Value}"));
        var secureHash = HmacSHA512(_options.HashSecret, hashData);

        var paymentUrl = $"{_options.BaseUrl}?{hashData}&vnp_SecureHash={secureHash}";
        return paymentUrl;
    }

    public bool VerifyCallback(IReadOnlyDictionary<string, string> queryParams)
    {
        var vnpParams = new SortedList<string, string>();
        string? receivedHash = null;

        foreach (var kvp in queryParams)
        {
            if (kvp.Key.Equals("vnp_SecureHash", StringComparison.OrdinalIgnoreCase))
            {
                receivedHash = kvp.Value;
            }
            else if (!kvp.Key.Equals("vnp_SecureHashType", StringComparison.OrdinalIgnoreCase))
            {
                vnpParams.Add(kvp.Key, kvp.Value);
            }
        }

        var hashData = string.Join("&", vnpParams.Select(kvp => $"{kvp.Key}={kvp.Value}"));
        var calculatedHash = HmacSHA512(_options.HashSecret, hashData);

        return receivedHash != null && calculatedHash.Equals(receivedHash, StringComparison.OrdinalIgnoreCase);
    }

    public string GetResponseCode(IReadOnlyDictionary<string, string> queryParams)
    {
        return queryParams.TryGetValue("vnp_ResponseCode", out var code) ? code : "99";
    }

    public string GetTransactionNo(IReadOnlyDictionary<string, string> queryParams)
    {
        return queryParams.TryGetValue("vnp_TransactionNo", out var txn) ? txn : string.Empty;
    }

    public string GetTxnRef(IReadOnlyDictionary<string, string> queryParams)
    {
        return queryParams.TryGetValue("vnp_TxnRef", out var txnRef) ? txnRef : string.Empty;
    }

    public string GetBankCode(IReadOnlyDictionary<string, string> queryParams)
    {
        return queryParams.TryGetValue("vnp_BankCode", out var bankCode) ? bankCode : string.Empty;
    }

    private static string HmacSHA512(string key, string inputData)
    {
        var keyBytes = Encoding.UTF8.GetBytes(key);
        var dataBytes = Encoding.UTF8.GetBytes(inputData);

        using var hmac = new HMACSHA512(keyBytes);
        var hashBytes = hmac.ComputeHash(dataBytes);
        var sb = new StringBuilder();
        foreach (var b in hashBytes)
        {
            sb.Append(b.ToString("x2"));
        }
        return sb.ToString();
    }
}