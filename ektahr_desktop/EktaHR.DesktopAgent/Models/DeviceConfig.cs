namespace EktaHR.DesktopAgent.Models;

public class DeviceConfig
{
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public string? ServerPublicKey { get; set; }
    public int ScreenshotFrequencyMinutes { get; set; } = 5;
    public List<BlurRule> BlurRules { get; set; } = new();
    public bool MonitoringEnabled { get; set; } = true;
}

public class BlurRule
{
    public string? ProcessName { get; set; }
}
