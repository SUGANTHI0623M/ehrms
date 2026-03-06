using EktaHR.DesktopAgent.Models;
using EktaHR.DesktopAgent.SystemHook;

namespace EktaHR.DesktopAgent.Aggregator;

public class ActivityAggregator
{
    private readonly SystemHookManager _hookManager;
    private readonly string _deviceId;
    private readonly string _employeeId;
    private readonly string _tenantId;
    private System.Threading.Timer? _timer;

    public event Action<ActivitySnapshot>? OnSnapshotReady;

    public ActivityAggregator(SystemHookManager hookManager, string deviceId, string employeeId, string tenantId)
    {
        _hookManager = hookManager;
        _deviceId = deviceId;
        _employeeId = employeeId;
        _tenantId = tenantId;
    }

    public void Start()
    {
        _timer = new System.Threading.Timer(
            _ => Tick(),
            null,
            TimeSpan.FromSeconds(60),
            TimeSpan.FromSeconds(60));
    }

    public void Stop()
    {
        _timer?.Change(Timeout.Infinite, Timeout.Infinite);
        _timer?.Dispose();
    }

    private void Tick()
    {
        _hookManager.PollActiveWindow();
        var events = _hookManager.DrainBuffer();

        var totalKey = events.Where(e => e.Type == RawEventType.Keystroke).Sum(e => Math.Max(1, e.Value));
        var mouseClicks = events.Where(e => e.Type == RawEventType.MouseClick).Sum(e => Math.Max(1, e.Value));
        var scrollCount = events.Where(e => e.Type == RawEventType.Scroll).Sum(e => Math.Max(1, e.Value));

        // Always include current foreground window so activeWindow is never null when user has a window focused
        var activeWindow = _hookManager.GetCurrentActiveWindow();
        if (activeWindow == null)
        {
            var lastAw = events.LastOrDefault(e => e.Type == RawEventType.ActiveWindow);
            if (lastAw != null)
            {
                var pn = lastAw.ProcessName ?? "";
                activeWindow = new ActiveWindowInfo
                {
                    ProcessName = pn,
                    AppName = string.IsNullOrEmpty(pn) ? "" : (System.IO.Path.GetExtension(pn).Length > 0 ? System.IO.Path.GetFileNameWithoutExtension(pn) : pn),
                    WindowTitle = lastAw.WindowTitle,
                    DurationSeconds = lastAw.DurationSeconds
                };
            }
        }
        else if (string.IsNullOrEmpty(activeWindow.AppName) && !string.IsNullOrEmpty(activeWindow.ProcessName))
        {
            var pn = activeWindow.ProcessName;
            activeWindow.AppName = System.IO.Path.GetExtension(pn).Length > 0 ? System.IO.Path.GetFileNameWithoutExtension(pn) : pn;
        }

        var idleSeconds = _hookManager.GetIdleSeconds();
        var snapshot = new ActivitySnapshot
        {
            DeviceId = _deviceId,
            EmployeeId = _employeeId,
            TenantId = _tenantId,
            Timestamp = DateTime.UtcNow,
            Keystrokes = totalKey > 0 ? totalKey : 0,
            MouseClicks = mouseClicks,
            ScrollCount = scrollCount,
            ActiveWindow = activeWindow,
            IdleSeconds = idleSeconds
        };

        OnSnapshotReady?.Invoke(snapshot);
    }
}
