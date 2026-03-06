using EktaHR.DesktopAgent.Aggregator;
using EktaHR.DesktopAgent.LocalQueue;
using EktaHR.DesktopAgent.Storage;
using EktaHR.DesktopAgent.SystemHook;
using ScreenshotEngineService = EktaHR.DesktopAgent.ScreenshotEngine.ScreenshotEngine;
using SyncManagerService = EktaHR.DesktopAgent.SyncManager.SyncManager;

namespace EktaHR.DesktopAgent;

public class AgentContext : ApplicationContext
{
    private readonly SecureStorage _storage;
    private readonly SystemHookManager _hookManager;
    private readonly ActivityAggregator _aggregator;
    private readonly ScreenshotEngineService _screenshotEngine;
    private readonly SyncManagerService _syncManager;
    private readonly LocalQueueService _queue;
    private NotifyIcon? _trayIcon;
    private MonitoringWelcomeForm? _welcomeForm;

    public AgentContext(
        SecureStorage storage,
        SystemHookManager hookManager,
        ActivityAggregator aggregator,
        ScreenshotEngineService screenshotEngine,
        SyncManagerService syncManager,
        LocalQueueService queue)
    {
        _storage = storage;
        _hookManager = hookManager;
        _aggregator = aggregator;
        _screenshotEngine = screenshotEngine;
        _syncManager = syncManager;
        _queue = queue;

        var contextMenu = new ContextMenuStrip();
        contextMenu.Items.Add("ektaHr Monitoring Active", null, (_, _) => { });
        contextMenu.Items.Add("Show window", null, (_, _) =>
        {
            if (_welcomeForm != null && !_welcomeForm.IsDisposed)
            {
                _welcomeForm.Show();
                _welcomeForm.BringToFront();
            }
        });
        contextMenu.Items.Add("-");
        contextMenu.Items.Add("Logout (switch employee)", null, OnLogout);
        contextMenu.Items.Add("Exit", null, OnExit);

        _trayIcon = new NotifyIcon
        {
            Icon = AppIcon.Get() ?? SystemIcons.Application,
            Text = "ektaHr Monitoring",
            Visible = true,
            ContextMenuStrip = contextMenu
        };
        _trayIcon.DoubleClick += (_, _) =>
        {
            if (_welcomeForm != null && !_welcomeForm.IsDisposed)
            {
                _welcomeForm.Show();
                _welcomeForm.BringToFront();
            }
        };

        var monitoringStart = DateTime.UtcNow;
        _welcomeForm = new MonitoringWelcomeForm(monitoringStart, () =>
        {
            _welcomeForm?.Hide();
            OnLogout(null!, EventArgs.Empty);
        }, async (startUtc) =>
        {
            try
            {
                return await _syncManager.StartBreakAsync(startUtc);
            }
            catch (Exception ex)
            {
                Log($"StartBreak: {ex.Message}");
                return null;
            }
        }, (breakId, endUtc, totalSeconds) =>
        {
            try
            {
                _ = _syncManager.EndBreakAsync(breakId, endUtc, totalSeconds);
            }
            catch (Exception ex)
            {
                Log($"EndBreak: {ex.Message}");
            }
        });
        _welcomeForm.Show();
    }

    private static void Log(string message)
    {
        var line = $"[EktaHR.Agent] {DateTime.Now:yyyy-MM-dd HH:mm:ss} {message}";
        System.Diagnostics.Debug.WriteLine(line);
        System.Diagnostics.Trace.WriteLine(line);
    }

    private async void OnLogout(object? sender, EventArgs e)
    {
        Log("Logout: setting device logout on server...");
        try
        {
            var ok = await _syncManager.SetLogoutAsync();
            Log(ok ? "Logout: device set logout OK." : "Logout: set-logout request failed (server may be unreachable).");
        }
        catch (Exception ex)
        {
            Log($"Logout: set-inactive error: {ex.Message}");
        }

        Log("Logout: stopping capture (screenshots, aggregator, hooks)...");
        _syncManager.Stop();
        _screenshotEngine.Stop();
        _aggregator.Stop();
        _hookManager.Dispose();
        _queue.Dispose();

        _storage.ClearSession();
        Log("Logout: session cleared. Showing login screen.");
        _welcomeForm?.Close();
        _welcomeForm = null;
        _trayIcon?.Dispose();
        _trayIcon = null;
        Application.Exit();
    }

    private async void OnExit(object? sender, EventArgs e)
    {
        Log("Exit: setting device exited on server...");
        try
        {
            var ok = await _syncManager.SetExitAsync();
            Log(ok ? "Exit: device set exited OK." : "Exit: set-exit request failed.");
        }
        catch (Exception ex)
        {
            Log($"Exit: set-inactive error: {ex.Message}");
        }

        Log("Exit: stopping capture and shutting down.");
        AppState.ExitRequested = true;
        _syncManager.Stop();
        _screenshotEngine.Stop();
        _aggregator.Stop();
        _hookManager.Dispose();
        _queue.Dispose();
        _trayIcon?.Dispose();
        _trayIcon = null;
        _welcomeForm?.Close();
        _welcomeForm = null;
        Log("Exit complete.");
        Application.Exit();
    }
}
