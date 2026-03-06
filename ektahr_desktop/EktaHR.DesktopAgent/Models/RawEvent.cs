namespace EktaHR.DesktopAgent.Models;

public enum RawEventType
{
    Keystroke,
    MouseClick,
    Scroll,
    ActiveWindow,
    Idle,
    OsEvent
}

public class RawEvent
{
    public RawEventType Type { get; set; }
    public DateTime Timestamp { get; set; }
    public string? ProcessName { get; set; }
    public string? WindowTitle { get; set; }
    public int Value { get; set; }
    public int DurationSeconds { get; set; }
}
