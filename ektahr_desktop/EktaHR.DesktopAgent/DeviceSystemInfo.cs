using System.Net;
using System.Net.Sockets;
using Microsoft.Win32;

namespace EktaHR.DesktopAgent;

/// <summary>
/// Captures device system info (IP, system model) for registration with the monitoring backend.
/// </summary>
internal static class DeviceSystemInfo
{
    /// <summary>
    /// Gets the first non-loopback IPv4 address of the machine, or null if none found.
    /// </summary>
    public static string? GetSystemIp()
    {
        try
        {
            var host = Dns.GetHostEntry(Dns.GetHostName());
            var ip = host.AddressList
                .FirstOrDefault(a => a.AddressFamily == AddressFamily.InterNetwork && !IPAddress.IsLoopback(a));
            return ip?.ToString();
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Gets the system model (e.g. manufacturer + product name) from the BIOS registry, or empty string.
    /// </summary>
    public static string GetSystemModel()
    {
        try
        {
            using var key = Registry.LocalMachine.OpenSubKey(@"HARDWARE\DESCRIPTION\System\BIOS");
            var product = key?.GetValue("SystemProductName") as string;
            var manufacturer = key?.GetValue("SystemManufacturer") as string;
            if (!string.IsNullOrWhiteSpace(manufacturer) && !string.IsNullOrWhiteSpace(product))
                return $"{manufacturer} {product}".Trim();
            return product?.Trim() ?? manufacturer?.Trim() ?? "";
        }
        catch
        {
            return "";
        }
    }
}
