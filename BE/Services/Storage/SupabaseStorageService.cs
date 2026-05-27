using System.Net.Http.Headers;
using Microsoft.Extensions.Options;
using PRN232v1.Configuration;

namespace PRN232v1.Services.Storage;

public class SupabaseStorageService
{
    private readonly HttpClient _httpClient;
    private readonly SupabaseOptions _options;

    public SupabaseStorageService(HttpClient httpClient, IOptions<SupabaseOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;
    }

    public async Task<string> UploadAsync(
        string bucket,
        string objectPath,
        IFormFile file,
        CancellationToken cancellationToken = default)
    {
        var normalizedPath = objectPath.TrimStart('/');
        if (string.IsNullOrWhiteSpace(_options.Url) || string.IsNullOrWhiteSpace(_options.AnonKey))
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
        request.Headers.Add("apikey", _options.AnonKey);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.AnonKey);
        request.Content = content;

        var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException($"Storage upload failed ({(int)response.StatusCode}): {body}");
        }

        return $"{baseUrl}/storage/v1/object/public/{bucket}/{normalizedPath}";
    }
}
