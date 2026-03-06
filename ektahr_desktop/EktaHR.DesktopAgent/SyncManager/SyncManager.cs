using System.Net.Http.Headers;
using System.Text;
using EktaHR.DesktopAgent.LocalQueue;
using Newtonsoft.Json;

namespace EktaHR.DesktopAgent.SyncManager;

public class SyncManager
{
    private readonly LocalQueueService _queue;
    private readonly string _baseUrl;
    private string? _accessToken;
    private readonly HttpClient _http;
    private System.Threading.Timer? _syncTimer;
    private System.Threading.Timer? _heartbeatTimer;

    public SyncManager(LocalQueueService queue, string baseUrl)
    {
        _queue = queue;
        _baseUrl = baseUrl.TrimEnd('/');
        _http = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
    }

    public void SetAccessToken(string? token)
    {
        _accessToken = token;
        _http.DefaultRequestHeaders.Authorization = token != null
            ? new AuthenticationHeaderValue("Bearer", token)
            : null;
    }

    public void Start()
    {
        _syncTimer = new System.Threading.Timer(_ => SyncLoop(), null, TimeSpan.FromSeconds(10), TimeSpan.FromSeconds(10));
        _heartbeatTimer = new System.Threading.Timer(_ => Heartbeat(), null, TimeSpan.FromMinutes(2), TimeSpan.FromMinutes(2));
    }

    public void Stop()
    {
        _syncTimer?.Change(Timeout.Infinite, Timeout.Infinite);
        _syncTimer?.Dispose();
        _heartbeatTimer?.Change(Timeout.Infinite, Timeout.Infinite);
        _heartbeatTimer?.Dispose();
    }

    private async void SyncLoop()
    {
        if (string.IsNullOrEmpty(_accessToken)) return;

        var item = _queue.Dequeue();
        if (item == null) return;

        try
        {
            var meta = JsonConvert.DeserializeObject<MetadataDto>(item.Metadata) ?? new MetadataDto();
            var body = new
            {
                encryptedKey = item.EncryptedKey,
                encryptedPayload = item.EncryptedPayload,
                metadata = new
                {
                    deviceId = meta.DeviceId,
                    tenantId = meta.TenantId,
                    type = meta.Type,
                    timestamp = meta.Timestamp
                }
            };

            var json = JsonConvert.SerializeObject(body);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var resp = await _http.PostAsync($"{_baseUrl}/activity/upload", content);

            if (resp.IsSuccessStatusCode)
            {
                _queue.MarkSuccess(item.Id);
            }
            else if (resp.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            {
                _queue.IncrementRetry(item.Id);
            }
            else
            {
                _queue.IncrementRetry(item.Id);
            }
        }
        catch
        {
            _queue.IncrementRetry(item.Id);
        }
    }

    private async void Heartbeat()
    {
        if (string.IsNullOrEmpty(_accessToken)) return;

        try
        {
            await _http.PostAsync($"{_baseUrl}/device/heartbeat", null);
        }
        catch { }
    }

    /// <summary>Mark device as inactive on the server (for backward compatibility).</summary>
    public async Task<bool> SetInactiveAsync()
    {
        if (string.IsNullOrEmpty(_accessToken)) return false;
        try
        {
            var resp = await _http.PostAsync($"{_baseUrl}/device/set-inactive", null);
            return resp.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>Logout: device isActive=false, status=logout; staff monitoringStatus=false.</summary>
    public async Task<bool> SetLogoutAsync()
    {
        if (string.IsNullOrEmpty(_accessToken)) return false;
        try
        {
            var resp = await _http.PostAsync($"{_baseUrl}/device/set-logout", null);
            return resp.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>Exit: device isActive=false, status=exited.</summary>
    public async Task<bool> SetExitAsync()
    {
        if (string.IsNullOrEmpty(_accessToken)) return false;
        try
        {
            var resp = await _http.PostAsync($"{_baseUrl}/device/set-exit", null);
            return resp.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>When agent starts with existing session (e.g. after exit), set device and staff active so tracking resumes.</summary>
    public async Task<bool> StartDeviceAsync()
    {
        if (string.IsNullOrEmpty(_accessToken)) return false;
        try
        {
            var resp = await _http.PostAsync($"{_baseUrl}/device/start", null);
            return resp.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>Start break: insert document in break collection (source: software). Returns breakId or null.</summary>
    public async Task<string?> StartBreakAsync(DateTime startTimeUtc)
    {
        if (string.IsNullOrEmpty(_accessToken)) return null;
        try
        {
            var body = new { startTime = startTimeUtc.ToString("O"), source = "software" };
            var json = JsonConvert.SerializeObject(body);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var resp = await _http.PostAsync($"{_baseUrl}/break/start", content);
            if (!resp.IsSuccessStatusCode) return null;
            var respJson = await resp.Content.ReadAsStringAsync();
            var data = JsonConvert.DeserializeObject<BreakStartResponse>(respJson);
            return data?.BreakId;
        }
        catch
        {
            return null;
        }
    }

    /// <summary>End break: update document in break collection with endTime and totalSeconds.</summary>
    public async Task<bool> EndBreakAsync(string breakId, DateTime endTimeUtc, int totalSeconds)
    {
        if (string.IsNullOrEmpty(_accessToken) || string.IsNullOrEmpty(breakId)) return false;
        try
        {
            var body = new { endTime = endTimeUtc.ToString("O"), totalSeconds };
            var json = JsonConvert.SerializeObject(body);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var resp = await _http.PatchAsync($"{_baseUrl}/break/{breakId}", content);
            return resp.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    private class BreakStartResponse
    {
        [JsonProperty("breakId")]
        public string? BreakId { get; set; }
    }

    public async Task<(RegisterResult? result, string? errorMessage)> RegisterAsync(string deviceId, string employeeId, string tenantId, string machineName, string osVersion, string agentVersion, string? systemIp = null, string? systemModel = null)
    {
        var body = new { deviceId, employeeId, tenantId, machineName, osVersion, agentVersion, systemIp, systemModel };
        var json = JsonConvert.SerializeObject(body);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        var resp = await _http.PostAsync($"{_baseUrl}/device/register", content);
        var respJson = await resp.Content.ReadAsStringAsync();

        if (!resp.IsSuccessStatusCode)
        {
            try
            {
                var err = JsonConvert.DeserializeObject<ErrorResponse>(respJson);
                return (null, err?.Message ?? resp.ReasonPhrase ?? "Registration failed.");
            }
            catch { return (null, respJson.Length > 0 ? respJson : resp.ReasonPhrase); }
        }

        var data = JsonConvert.DeserializeObject<RegisterResponse>(respJson);
        if (data == null) return (null, "Invalid server response.");

        SetAccessToken(data.AccessToken);
        return (new RegisterResult
        {
            StaffId = data.StaffId ?? "",
            AccessToken = data.AccessToken ?? "",
            RefreshToken = data.RefreshToken ?? "",
            ServerPublicKey = data.ServerPublicKey,
            ScreenshotFrequency = data.ScreenshotFrequency ?? 5,
            BlurRules = data.BlurRules ?? new List<BlurRuleItem>(),
            MonitoringEnabled = data.MonitoringEnabled
        }, null);
    }

    private class ErrorResponse
    {
        public string? Message { get; set; }
    }

    public class RegisterResult
    {
        public string StaffId { get; set; } = "";
        public string AccessToken { get; set; } = "";
        public string RefreshToken { get; set; } = "";
        public string? ServerPublicKey { get; set; }
        public int ScreenshotFrequency { get; set; }
        public List<BlurRuleItem> BlurRules { get; set; } = new();
        public bool MonitoringEnabled { get; set; }
    }

    public class BlurRuleItem
    {
        public string? ProcessName { get; set; }
    }

    private class MetadataDto
    {
        public string DeviceId { get; set; } = "";
        public string TenantId { get; set; } = "";
        public string Type { get; set; } = "";
        public string Timestamp { get; set; } = "";
    }

    private class RegisterResponse
    {
        public string? StaffId { get; set; }
        public string? AccessToken { get; set; }
        public string? RefreshToken { get; set; }
        public string? ServerPublicKey { get; set; }
        public int? ScreenshotFrequency { get; set; }
        public List<BlurRuleItem>? BlurRules { get; set; }
        public bool MonitoringEnabled { get; set; }
    }
}
