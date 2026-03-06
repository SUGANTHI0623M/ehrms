using System.Runtime.InteropServices;

namespace EktaHR.DesktopAgent.SystemHook;

internal static class NativeMethods
{
    public const int WH_KEYBOARD_LL = 13;
    public const int WH_MOUSE_LL = 14;
    public const int WM_KEYDOWN = 0x0100;
    public const int WM_LBUTTONDOWN = 0x0201;
    public const int WM_RBUTTONDOWN = 0x0204;
    public const int WM_MOUSEWHEEL = 0x020A;
    public const int WM_MOUSEHWHEEL = 0x020E;

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern IntPtr SetWindowsHookEx(int idHook, LowLevelKeyboardProc lpfn, IntPtr hMod, uint dwThreadId);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern IntPtr SetWindowsHookEx(int idHook, LowLevelMouseProc lpfn, IntPtr hMod, uint dwThreadId);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool UnhookWindowsHookEx(IntPtr hhk);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

    [DllImport("kernel32.dll", CharSet = CharSet.Auto)]
    public static extern IntPtr GetModuleHandle(string? lpModuleName);

    [DllImport("user32.dll")]
    public static extern bool GetLastInputInfo(ref LastInputInfo plii);

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int GetWindowText(IntPtr hWnd, [Out] char[] lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("kernel32.dll")]
    public static extern IntPtr OpenProcess(uint processAccess, bool bInheritHandle, uint processId);

    [DllImport("psapi.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern uint GetModuleFileNameEx(IntPtr hProcess, IntPtr hModule, [Out] char[] lpFilename, uint nSize);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool QueryFullProcessImageName(IntPtr hProcess, int dwFlags, [Out] char[] lpExeName, ref uint lpdwSize);

    [DllImport("kernel32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool CloseHandle(IntPtr hObject);

    public static string GetProcessNameByPid(uint pid)
    {
        try
        {
            var hProcess = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, false, pid);
            if (hProcess == IntPtr.Zero) return "";
            try
            {
                var buffer = new char[260];
                if (GetModuleFileNameEx(hProcess, IntPtr.Zero, buffer, (uint)buffer.Length) > 0)
                {
                    var path = new string(buffer).TrimEnd('\0');
                    return Path.GetFileName(path);
                }
            }
            finally { CloseHandle(hProcess); }
        }
        catch { }
        return "";
    }

    public delegate IntPtr LowLevelKeyboardProc(int nCode, IntPtr wParam, IntPtr lParam);
    public delegate IntPtr LowLevelMouseProc(int nCode, IntPtr wParam, IntPtr lParam);

    [StructLayout(LayoutKind.Sequential)]
    public struct LastInputInfo
    {
        public uint cbSize;
        public uint dwTime;
    }

    public const uint PROCESS_QUERY_INFORMATION = 0x0400;
    public const uint PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;
    public const uint PROCESS_VM_READ = 0x0010;
}
