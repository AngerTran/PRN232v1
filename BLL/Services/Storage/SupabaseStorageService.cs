using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using BLL.Configuration;
using Microsoft.AspNetCore.Http;

namespace BLL.Services.Storage;

public class SupabaseStorageService
{
    private readonly HttpClient _httpClient;
    private readonly SupabaseOptions _options;
    private readonly CloudinaryOptions _cloudinary;

    public SupabaseStorageService(
        HttpClient httpClient,
        IOptions<SupabaseOptions> options,
        IOptions<CloudinaryOptions> cloudinary)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _cloudinary = cloudinary.Value;
    }

    public async Task<string> UploadAsync(
        string bucket,
        string objectPath,
        IFormFile file,
        CancellationToken cancellationToken = default)
    {
        var normalizedPath = objectPath.TrimStart('/');
        if (IsCloudinaryConfigured())
        {
            return await UploadToCloudinaryAsync(bucket, normalizedPath, file, cancellationToken);
        }

        var storageKey = string.IsNullOrWhiteSpace(_options.ServiceRoleKey)
            ? _options.AnonKey
            : _options.ServiceRoleKey;

        if (string.IsNullOrWhiteSpace(_options.Url) || string.IsNullOrWhiteSpace(storageKey))
        {
            return $"local://{bucket}/{normalizedPath}";
        }

        var baseUrl = _options.Url.TrimEnd('/');
        using var stream = file.OpenReadStream();
        using var content = new StreamContent(stream);
        content.Headers.ContentType = new MediaTypeHeaderValue(file.ContentType ?? "application/octet-stream");

        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            $"{baseUrl}/storage/v1/object/{bucket}/{normalizedPath}");
        request.Headers.Add("apikey", storageKey);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", storageKey);
        request.Content = content;

        var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException($"Storage upload failed ({(int)response.StatusCode}): {body}");
        }

        return $"{baseUrl}/storage/v1/object/public/{bucket}/{normalizedPath}";
    }

    private bool IsCloudinaryConfigured() =>
        !string.IsNullOrWhiteSpace(_cloudinary.CloudName)
        && ((!string.IsNullOrWhiteSpace(_cloudinary.ApiKey)
             && !string.IsNullOrWhiteSpace(_cloudinary.ApiSecret))
            || !string.IsNullOrWhiteSpace(_cloudinary.UploadPreset));

    private async Task<string> UploadToCloudinaryAsync(
        string bucket,
        string objectPath,
        IFormFile file,
        CancellationToken cancellationToken)
    {
        var folder = BuildCloudinaryFolder(bucket);
        var publicId = Path.ChangeExtension(objectPath.Replace('\\', '/'), null)
            ?? objectPath.Replace('\\', '/');

        using var form = new MultipartFormDataContent();
        await using var stream = file.OpenReadStream();
        using var fileContent = new StreamContent(stream);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue(file.ContentType ?? "application/octet-stream");

        form.Add(fileContent, "file", file.FileName);
        form.Add(new StringContent(folder), "folder");
        form.Add(new StringContent(publicId), "public_id");

        var uploadPreset = _cloudinary.UploadPreset.Trim();
        if (!string.IsNullOrWhiteSpace(uploadPreset))
        {
            form.Add(new StringContent(uploadPreset), "upload_preset");
        }
        else
        {
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
            var uploadParameters = new SortedDictionary<string, string>(StringComparer.Ordinal)
            {
                ["folder"] = folder,
                ["public_id"] = publicId,
                ["timestamp"] = timestamp
            };
            var signature = SignCloudinaryUpload(uploadParameters);

            form.Add(new StringContent(_cloudinary.ApiKey), "api_key");
            form.Add(new StringContent(timestamp), "timestamp");
            form.Add(new StringContent(signature), "signature");
        }

        var uploadUrl = $"https://api.cloudinary.com/v1_1/{_cloudinary.CloudName}/auto/upload";
        if (!string.IsNullOrWhiteSpace(uploadPreset))
        {
            uploadUrl += $"?upload_preset={Uri.EscapeDataString(uploadPreset)}";
        }

        using var response = await _httpClient.PostAsync(uploadUrl, form, cancellationToken);

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Storage upload failed ({(int)response.StatusCode}): {body}");
        }

        using var doc = JsonDocument.Parse(body);
        if (doc.RootElement.TryGetProperty("secure_url", out var secureUrl))
        {
            return secureUrl.GetString() ?? throw new InvalidOperationException("Cloudinary response did not include secure_url.");
        }

        if (doc.RootElement.TryGetProperty("url", out var url))
        {
            return url.GetString() ?? throw new InvalidOperationException("Cloudinary response did not include url.");
        }

        throw new InvalidOperationException("Cloudinary response did not include an upload URL.");
    }

    private string BuildCloudinaryFolder(string bucket)
    {
        var root = string.IsNullOrWhiteSpace(_cloudinary.Folder)
            ? "prn232"
            : _cloudinary.Folder.Trim().Trim('/');

        return $"{root}/{bucket.Trim().Trim('/')}";
    }

    private string SignCloudinaryUpload(SortedDictionary<string, string> parameters)
    {
        var payload = string.Join("&", parameters.Select(p => $"{p.Key}={p.Value}")) + _cloudinary.ApiSecret;
        var hash = SHA1.HashData(Encoding.UTF8.GetBytes(payload));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
