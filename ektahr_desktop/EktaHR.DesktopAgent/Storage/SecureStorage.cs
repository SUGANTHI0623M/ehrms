using Newtonsoft.Json;

namespace EktaHR.DesktopAgent.Storage;

public class SecureStorage
{
    private readonly string _path;
    private static readonly object _lock = new();

    public SecureStorage()
    {
        var appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        var dir = Path.Combine(appData, "EktaHR", "Monitoring");
        Directory.CreateDirectory(dir);
        _path = Path.Combine(dir, "config.dat");
    }

    public StoredConfig? Load()
    {
        lock (_lock)
        {
            if (!File.Exists(_path)) return null;
            try
            {
                var bytes = File.ReadAllBytes(_path);
                var json = System.Text.Encoding.UTF8.GetString(bytes);
                return JsonConvert.DeserializeObject<StoredConfig>(json);
            }
            catch { return null; }
        }
    }

    public void Save(StoredConfig config)
    {
        lock (_lock)
        {
            var json = JsonConvert.SerializeObject(config);
            var bytes = System.Text.Encoding.UTF8.GetBytes(json);
            File.WriteAllBytes(_path, bytes);
        }
    }

    public void SaveDeviceId(string deviceId)
    {
        var cfg = Load() ?? new StoredConfig();
        cfg.DeviceId = deviceId;
        Save(cfg);
    }

    public void SaveConsent(DateTime consentAt)
    {
        var cfg = Load() ?? new StoredConfig();
        cfg.ConsentAt = consentAt;
        Save(cfg);
    }

    public void SaveTokens(string accessToken, string refreshToken, string? serverPublicKey, int screenshotFrequency, List<BlurRuleStored>? blurRules)
    {
        var cfg = Load() ?? new StoredConfig();
        cfg.AccessToken = accessToken;
        cfg.RefreshToken = refreshToken;
        cfg.ServerPublicKey = serverPublicKey;
        cfg.ScreenshotFrequencyMinutes = screenshotFrequency;
        cfg.BlurRules = blurRules ?? new List<BlurRuleStored>();
        Save(cfg);
    }

    /// <summary>Clear session (tokens, consent, employee/tenant) so next launch shows login. Keeps DeviceId.</summary>
    public void ClearSession()
    {
        var cfg = Load() ?? new StoredConfig();
        cfg.AccessToken = null;
        cfg.RefreshToken = null;
        cfg.ConsentAt = null;
        cfg.EmployeeId = null;
        cfg.StaffId = null;
        cfg.TenantId = null;
        cfg.ServerPublicKey = null;
        cfg.ScreenshotFrequencyMinutes = 5;
        cfg.BlurRules = new List<BlurRuleStored>();
        Save(cfg);
    }
}

public class StoredConfig
{
    public string? DeviceId { get; set; }
    /// <summary>Display/login: employee code e.g. EA30001.</summary>
    public string? EmployeeId { get; set; }
    /// <summary>Staff._id (24-char hex) from register response; used in monitoring payloads as employeeID.</summary>
    public string? StaffId { get; set; }
    public string? TenantId { get; set; }
    public DateTime? ConsentAt { get; set; }
    public string? AccessToken { get; set; }
    public string? RefreshToken { get; set; }
    public string? ServerPublicKey { get; set; }
    public int ScreenshotFrequencyMinutes { get; set; } = 5;
    public List<BlurRuleStored> BlurRules { get; set; } = new();
}

public class BlurRuleStored
{
    public string? ProcessName { get; set; }
}
