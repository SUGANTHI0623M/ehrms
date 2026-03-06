using System.Security.Cryptography;
using System.Text;
using Microsoft.Win32;

namespace EktaHR.DesktopAgent.DeviceId;

public static class DeviceIdGenerator
{
    public static string Generate()
    {
        var sb = new StringBuilder();

        try
        {
            var machineGuid = Registry.GetValue(@"HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Cryptography", "MachineGuid", "") as string;
            sb.Append(machineGuid ?? "unknown");
        }
        catch { sb.Append("ng1"); }

        try
        {
            var cpuId = GetCpuId();
            sb.Append(cpuId);
        }
        catch { sb.Append("ng2"); }

        try
        {
            var mbSerial = GetMotherboardSerial();
            sb.Append(mbSerial);
        }
        catch { sb.Append("ng3"); }

        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(sb.ToString()));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private static string GetCpuId()
    {
        try
        {
            using var key = Registry.LocalMachine.OpenSubKey(@"HARDWARE\DESCRIPTION\System\CentralProcessor\0");
            var val = key?.GetValue("ProcessorNameString") as string;
            return val ?? Environment.ProcessorCount.ToString();
        }
        catch { return ""; }
    }

    private static string GetMotherboardSerial()
    {
        try
        {
            using var key = Registry.LocalMachine.OpenSubKey(@"HARDWARE\DESCRIPTION\System\BIOS");
            var val = key?.GetValue("BaseBoardProduct") as string;
            return val ?? "";
        }
        catch { return ""; }
    }
}
