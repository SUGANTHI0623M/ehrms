using System.Drawing;
using System.Drawing.Imaging;
using EktaHR.DesktopAgent.Models;

namespace EktaHR.DesktopAgent.ScreenshotEngine;

public class ScreenshotEngine
{
    private readonly List<BlurRule> _blurRules = new();
    private readonly int _maxWidth = 1280;
    private readonly int _jpegQuality = 65;
    private System.Threading.Timer? _timer;

    public event Action<byte[]>? OnScreenshotCaptured;

    public void Configure(int frequencyMinutes, List<BlurRule>? blurRules)
    {
        _blurRules.Clear();
        if (blurRules != null) _blurRules.AddRange(blurRules);

        _timer?.Change(Timeout.Infinite, Timeout.Infinite);
        _timer?.Dispose();

        var intervalMs = Math.Max(60000, frequencyMinutes * 60 * 1000);
        _timer = new System.Threading.Timer(
            _ => Capture(),
            null,
            TimeSpan.FromMilliseconds(intervalMs),
            TimeSpan.FromMilliseconds(intervalMs));
    }

    public void Stop()
    {
        _timer?.Change(Timeout.Infinite, Timeout.Infinite);
        _timer?.Dispose();
    }

    private void Capture()
    {
        try
        {
            var bounds = GetVirtualScreenBounds();
            using var bitmap = new Bitmap(bounds.Width, bounds.Height, PixelFormat.Format24bppRgb);
            using (var g = Graphics.FromImage(bitmap))
            {
                g.CopyFromScreen(bounds.Location, Point.Empty, bounds.Size);
            }

            string? processName = null;
            try
            {
                var hwnd = SystemHook.NativeMethods.GetForegroundWindow();
                SystemHook.NativeMethods.GetWindowThreadProcessId(hwnd, out var pid);
                processName = SystemHook.NativeMethods.GetProcessNameByPid(pid);
            }
            catch { }

            if (!string.IsNullOrEmpty(processName) && _blurRules.Any(r =>
                r.ProcessName != null && processName.Contains(r.ProcessName, StringComparison.OrdinalIgnoreCase)))
            {
                using var g = Graphics.FromImage(bitmap);
                g.FillRectangle(Brushes.Black, 0, 0, bitmap.Width, bitmap.Height);
            }

            using var resized = ResizeIfNeeded(bitmap);
            var bytes = CompressJpeg(resized);
            OnScreenshotCaptured?.Invoke(bytes);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[Screenshot] Error: {ex.Message}");
        }
    }

    private static Rectangle GetVirtualScreenBounds()
    {
        return new Rectangle(
            SystemInformation.VirtualScreen.Left,
            SystemInformation.VirtualScreen.Top,
            SystemInformation.VirtualScreen.Width,
            SystemInformation.VirtualScreen.Height);
    }

    private Bitmap ResizeIfNeeded(Bitmap src)
    {
        if (src.Width <= _maxWidth) return new Bitmap(src);
        var ratio = (double)_maxWidth / src.Width;
        var newH = (int)(src.Height * ratio);
        var dst = new Bitmap(_maxWidth, newH);
        using (var g = Graphics.FromImage(dst))
        {
            g.DrawImage(src, 0, 0, _maxWidth, newH);
        }
        return dst;
    }

    private byte[] CompressJpeg(Bitmap bitmap)
    {
        var encoder = ImageCodecInfo.GetImageEncoders().First(c => c.MimeType == "image/jpeg");
        var eps = new EncoderParameters(1);
        eps.Param[0] = new EncoderParameter(System.Drawing.Imaging.Encoder.Quality, _jpegQuality);

        using var ms = new MemoryStream();
        bitmap.Save(ms, encoder, eps);
        return ms.ToArray();
    }
}
