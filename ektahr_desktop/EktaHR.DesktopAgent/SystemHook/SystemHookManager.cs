using System.Collections.Concurrent;
using System.Runtime.InteropServices;
using EktaHR.DesktopAgent.Models;

namespace EktaHR.DesktopAgent.SystemHook;

public class SystemHookManager : IDisposable
{
    private readonly ConcurrentQueue<RawEvent> _eventBuffer = new();
    private IntPtr _keyboardHookId = IntPtr.Zero;
    private IntPtr _mouseHookId = IntPtr.Zero;
    private NativeMethods.LowLevelKeyboardProc? _keyboardProc;
    private NativeMethods.LowLevelMouseProc? _mouseProc;
    private string _lastProcessName = "";
    private string _lastWindowTitle = "";
    private DateTime _lastActiveWindowTime = DateTime.UtcNow;

    public event Action<RawEvent>? OnRawEvent;

    public void Start()
    {
        _keyboardProc = KeyboardHookCallback;
        _mouseProc = MouseHookCallback;
        using var curProcess = System.Diagnostics.Process.GetCurrentProcess();
        using var curModule = curProcess.MainModule;
        var hModule = curModule != null ? NativeMethods.GetModuleHandle(curModule.ModuleName) : IntPtr.Zero;

        _keyboardHookId = NativeMethods.SetWindowsHookEx(
            NativeMethods.WH_KEYBOARD_LL, _keyboardProc, hModule, 0);
        _mouseHookId = NativeMethods.SetWindowsHookEx(
            NativeMethods.WH_MOUSE_LL, _mouseProc, hModule, 0);
    }

    public void Stop()
    {
        if (_keyboardHookId != IntPtr.Zero)
        {
            NativeMethods.UnhookWindowsHookEx(_keyboardHookId);
            _keyboardHookId = IntPtr.Zero;
        }
        if (_mouseHookId != IntPtr.Zero)
        {
            NativeMethods.UnhookWindowsHookEx(_mouseHookId);
            _mouseHookId = IntPtr.Zero;
        }
    }

    public IReadOnlyList<RawEvent> DrainBuffer()
    {
        var list = new List<RawEvent>();
        while (_eventBuffer.TryDequeue(out var evt))
            list.Add(evt);
        return list;
    }

    public int GetIdleSeconds()
    {
        var lii = new NativeMethods.LastInputInfo { cbSize = (uint)Marshal.SizeOf<NativeMethods.LastInputInfo>() };
        if (!NativeMethods.GetLastInputInfo(ref lii)) return 0;
        var idleMs = (uint)Environment.TickCount - lii.dwTime;
        return (int)(idleMs / 1000);
    }

    /// <summary>
    /// Returns the current foreground window info (process name, window title, duration in seconds).
    /// Call PollActiveWindow() first so the current window is up to date.
    /// </summary>
    public Models.ActiveWindowInfo? GetCurrentActiveWindow()
    {
        if (string.IsNullOrEmpty(_lastProcessName)) return null;
        var duration = (int)(DateTime.UtcNow - _lastActiveWindowTime).TotalSeconds;
        return new Models.ActiveWindowInfo
        {
            ProcessName = _lastProcessName,
            AppName = GetAppNameFromProcessName(_lastProcessName),
            WindowTitle = _lastWindowTitle ?? "",
            DurationSeconds = duration >= 0 ? duration : 0
        };
    }

    public void PollActiveWindow()
    {
        var hwnd = NativeMethods.GetForegroundWindow();
        if (hwnd == IntPtr.Zero) return;

        NativeMethods.GetWindowThreadProcessId(hwnd, out var pid);
        var processName = GetProcessName(pid);
        var windowTitle = GetWindowTitle(hwnd);

        if (string.IsNullOrEmpty(processName)) processName = "unknown";

        var now = DateTime.UtcNow;
        var duration = (int)(now - _lastActiveWindowTime).TotalSeconds;

        if (_lastProcessName != processName || _lastWindowTitle != windowTitle)
        {
            if (!string.IsNullOrEmpty(_lastProcessName) && duration > 0)
            {
                var evt = new RawEvent
                {
                    Type = RawEventType.ActiveWindow,
                    Timestamp = _lastActiveWindowTime,
                    ProcessName = _lastProcessName,
                    WindowTitle = _lastWindowTitle,
                    DurationSeconds = duration
                };
                Enqueue(evt);
            }
            _lastProcessName = processName;
            _lastWindowTitle = windowTitle ?? "";
            _lastActiveWindowTime = now;
        }
    }

    private void Enqueue(RawEvent evt)
    {
        _eventBuffer.Enqueue(evt);
        OnRawEvent?.Invoke(evt);
    }

    private IntPtr KeyboardHookCallback(int nCode, IntPtr wParam, IntPtr lParam)
    {
        if (nCode >= 0 && wParam == (IntPtr)NativeMethods.WM_KEYDOWN)
        {
            Enqueue(new RawEvent { Type = RawEventType.Keystroke, Timestamp = DateTime.UtcNow, Value = 1 });
        }
        return NativeMethods.CallNextHookEx(_keyboardHookId, nCode, wParam, lParam);
    }

    private IntPtr MouseHookCallback(int nCode, IntPtr wParam, IntPtr lParam)
    {
        if (nCode >= 0)
        {
            if (wParam == (IntPtr)NativeMethods.WM_LBUTTONDOWN || wParam == (IntPtr)NativeMethods.WM_RBUTTONDOWN)
                Enqueue(new RawEvent { Type = RawEventType.MouseClick, Timestamp = DateTime.UtcNow, Value = 1 });
            else if (wParam == (IntPtr)NativeMethods.WM_MOUSEWHEEL || wParam == (IntPtr)NativeMethods.WM_MOUSEHWHEEL)
                Enqueue(new RawEvent { Type = RawEventType.Scroll, Timestamp = DateTime.UtcNow, Value = 1 });
        }
        return NativeMethods.CallNextHookEx(_mouseHookId, nCode, wParam, lParam);
    }

    private static string GetProcessName(uint pid)
    {
        try
        {
            // Try limited access first (works for Chrome, PowerShell, elevated and 64-bit processes)
            var hProcess = NativeMethods.OpenProcess(NativeMethods.PROCESS_QUERY_LIMITED_INFORMATION, false, pid);
            if (hProcess != IntPtr.Zero)
            {
                try
                {
                    var buffer = new char[520];
                    uint size = (uint)buffer.Length;
                    if (NativeMethods.QueryFullProcessImageName(hProcess, 0, buffer, ref size) && size > 0 && size <= buffer.Length)
                    {
                        var path = new string(buffer, 0, (int)size);
                        return Path.GetFileName(path);
                    }
                }
                finally { NativeMethods.CloseHandle(hProcess); }
            }

            // Fallback: full access + GetModuleFileNameEx (psapi.dll)
            hProcess = NativeMethods.OpenProcess(
                NativeMethods.PROCESS_QUERY_INFORMATION | NativeMethods.PROCESS_VM_READ,
                false, pid);
            if (hProcess != IntPtr.Zero)
            {
                try
                {
                    var buffer = new char[520];
                    var len = NativeMethods.GetModuleFileNameEx(hProcess, IntPtr.Zero, buffer, (uint)buffer.Length);
                    if (len > 0)
                    {
                        var path = new string(buffer, 0, (int)len);
                        return Path.GetFileName(path);
                    }
                }
                finally { NativeMethods.CloseHandle(hProcess); }
            }
        }
        catch { }
        return "";
    }

    /// <summary>Returns process name without file extension (e.g. "chrome" from "chrome.exe").</summary>
    private static string GetAppNameFromProcessName(string processName)
    {
        if (string.IsNullOrWhiteSpace(processName)) return processName ?? "";
        var name = processName.Trim();
        var ext = Path.GetExtension(name);
        if (!string.IsNullOrEmpty(ext))
            return name.Substring(0, name.Length - ext.Length);
        return name;
    }

    private static string? GetWindowTitle(IntPtr hwnd)
    {
        var buffer = new char[256];
        var len = NativeMethods.GetWindowText(hwnd, buffer, buffer.Length);
        return len > 0 ? new string(buffer, 0, len) : null;
    }

    public void Dispose() => Stop();
}
