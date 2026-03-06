using System.Reflection;
using System.Runtime.InteropServices;

namespace EktaHR.DesktopAgent;

/// <summary>
/// Loads the application icon from embedded assets (ekta_logo.jpeg) for form and tray.
/// </summary>
internal static class AppIcon
{
    private static Icon? _cached;

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool DestroyIcon(IntPtr hIcon);

    public static Icon? Get()
    {
        if (_cached != null) return _cached;

        var asm = Assembly.GetExecutingAssembly();
        var name = asm.GetManifestResourceNames()
            .FirstOrDefault(n => n.EndsWith("ekta_logo.jpeg", StringComparison.OrdinalIgnoreCase));
        if (name == null) return null;

        try
        {
            using var stream = asm.GetManifestResourceStream(name);
            if (stream == null) return null;
            using var img = Image.FromStream(stream);
            using var bmp = new Bitmap(img, 32, 32);
            IntPtr hIcon = bmp.GetHicon();
            try
            {
                var icon = Icon.FromHandle(hIcon);
                _cached = (Icon)icon.Clone();
                return _cached;
            }
            finally
            {
                DestroyIcon(hIcon);
            }
        }
        catch
        {
            return null;
        }
    }
}
