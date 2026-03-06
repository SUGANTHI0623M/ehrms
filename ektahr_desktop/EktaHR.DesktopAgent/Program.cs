using System.Configuration;
using EktaHR.DesktopAgent.Aggregator;
using EktaHR.DesktopAgent.DeviceId;
using EktaHR.DesktopAgent.Encryption;
using EktaHR.DesktopAgent.LocalQueue;
using EktaHR.DesktopAgent.Models;
using EktaHR.DesktopAgent.Storage;
using EktaHR.DesktopAgent.SystemHook;
using Newtonsoft.Json;

namespace EktaHR.DesktopAgent;

static class Program
{
    [STAThread]
    static void Main()
    {
        ApplicationConfiguration.Initialize();

        var storage = new SecureStorage();
        var deviceId = storage.Load()?.DeviceId ?? DeviceIdGenerator.Generate();
        if (storage.Load()?.DeviceId == null)
            storage.SaveDeviceId(deviceId);

        for (;;)
        {
            var cfg = storage.Load();
            if (cfg?.ConsentAt == null || cfg?.AccessToken == null)
            {
                using (var loginForm = new ConsentForm(deviceId, storage))
                {
                    Application.Run(loginForm);
                }
                if (storage.Load()?.AccessToken == null)
                    return;
                continue;
            }

            cfg = storage.Load();
            if (cfg?.AccessToken == null) return;

            var baseUrl = ConfigurationManager.AppSettings["ApiBaseUrl"] ?? "http://localhost:9002/api";

            var queue = new LocalQueueService();
            var encryption = new EncryptionLayer();
            encryption.SetServerPublicKey(cfg.ServerPublicKey);

            var syncManager = new EktaHR.DesktopAgent.SyncManager.SyncManager(queue, baseUrl);
            syncManager.SetAccessToken(cfg.AccessToken);
            try
            {
                syncManager.StartDeviceAsync().GetAwaiter().GetResult();
            }
            catch { /* ignore if backend unreachable; heartbeat will retry */ }
            syncManager.Start();

            var hookManager = new SystemHookManager();
            hookManager.Start();

            var staffId = cfg.StaffId ?? cfg.EmployeeId ?? "";
            var tenantId = cfg.TenantId ?? "";
            var aggregator = new ActivityAggregator(hookManager, deviceId, staffId, tenantId);
            var screenshotEngine = new EktaHR.DesktopAgent.ScreenshotEngine.ScreenshotEngine();

            aggregator.OnSnapshotReady += snapshot =>
            {
                var enc = encryption.EncryptActivity(snapshot);
                var meta = new { deviceId, tenantId = snapshot.TenantId, type = "activity", timestamp = snapshot.Timestamp.ToString("O") };
                queue.Enqueue(enc.EncryptedPayloadBase64, enc.EncryptedKey, JsonConvert.SerializeObject(meta));
            };

            screenshotEngine.OnScreenshotCaptured += bytes =>
            {
                var enc = encryption.EncryptScreenshot(tenantId, staffId, deviceId, DateTime.UtcNow, bytes);
                var meta = new { deviceId, tenantId, type = "screenshot", timestamp = DateTime.UtcNow.ToString("O") };
                queue.Enqueue(enc.EncryptedPayloadBase64, enc.EncryptedKey, JsonConvert.SerializeObject(meta));
            };

            var blurRules = cfg.BlurRules?.Select(b => new BlurRule { ProcessName = b.ProcessName }).ToList();
            screenshotEngine.Configure(cfg.ScreenshotFrequencyMinutes, blurRules);
            aggregator.Start();

            AppState.ExitRequested = false;
            Application.Run(new AgentContext(storage, hookManager, aggregator, screenshotEngine, syncManager, queue));

            if (AppState.ExitRequested)
                return;
        }
    }
}
