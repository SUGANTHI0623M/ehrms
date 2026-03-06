namespace EktaHR.DesktopAgent.Models;

public class ActivitySnapshot
{
    public string DeviceId { get; set; } = string.Empty;
    public string EmployeeId { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public int Keystrokes { get; set; }
    public int MouseClicks { get; set; }
    public int ScrollCount { get; set; }
    public ActiveWindowInfo? ActiveWindow { get; set; }
    public int IdleSeconds { get; set; }
}

public class ActiveWindowInfo
{
    public string? ProcessName { get; set; }
    /// <summary>App name without extension (e.g. chrome, powershell).</summary>
    public string? AppName { get; set; }
    public string? WindowTitle { get; set; }
    public int DurationSeconds { get; set; }
}
