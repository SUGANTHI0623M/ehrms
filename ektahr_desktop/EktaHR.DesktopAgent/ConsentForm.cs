using System.Configuration;
using System.Net.Http;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Drawing.Drawing2D;
using EktaHR.DesktopAgent.LocalQueue;
using EktaHR.DesktopAgent.Storage;

namespace EktaHR.DesktopAgent;

public class ConsentForm : Form
{
    private const int EM_SETCUEBANNER = 0x1501;

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int SendMessage(IntPtr hWnd, int msg, int wParam, string lParam);

    [DllImport("dwmapi.dll", CharSet = CharSet.Unicode, PreserveSig = true)]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int value, int size);

    private const int DWMWA_USE_IMMERSIVE_DARK_MODE = 20;
    private readonly string _deviceId;
    private readonly SecureStorage _storage;
    private TextBox _txtEmployeeId = null!;
    private TextBox _txtTenantId = null!;
    private Button _btnLogin = null!;
    private Label _lblStatus = null!;
    private Panel? _exitOverlay;
    private bool _isLoginSuccessful = false;
    private bool _exitConfirmed = false;

    public ConsentForm(string deviceId, SecureStorage storage)
    {
        _deviceId = deviceId;
        _storage = storage;
        InitializeComponent();
    }

    private static Region CreateRoundedRegion(Rectangle bounds, int radius)
    {
        var path = new GraphicsPath();
        int r = Math.Min(radius, Math.Min(bounds.Width, bounds.Height) / 2);
        int w = bounds.Width;
        int h = bounds.Height;
        path.AddArc(0, 0, r * 2, r * 2, 180, 90);
        path.AddArc(w - r * 2, 0, r * 2, r * 2, 270, 90);
        path.AddArc(w - r * 2, h - r * 2, r * 2, r * 2, 0, 90);
        path.AddArc(0, h - r * 2, r * 2, r * 2, 90, 90);
        path.CloseFigure();
        return new Region(path);
    }

    private void InitializeComponent()
    {
        Text = "ektahr attendance monitoring - Login";
        Size = new Size(520, 660);
        StartPosition = FormStartPosition.CenterScreen;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MinimizeBox = true;
        MaximizeBox = false;
        MinimumSize = new Size(400, 500);
        BackColor = Color.FromArgb(0x2F, 0x2F, 0x2F); // #2F2F2F dark grey
        ForeColor = Color.White;
        Font = new Font("Segoe UI", 9.25f);

        var accentColor = Color.FromArgb(0xEF, 0xAA, 0x1F); // #efaa1f
        const int margin = 24;
        const int spacing = 16;
        const int radius = 12;

        // Header: same dark theme as background and card
        var bgColor = Color.FromArgb(0x2F, 0x2F, 0x2F);   // match form background
        var cardColor = Color.FromArgb(0x22, 0x22, 0x22);

        var pnlHeader = new Panel
        {
            Location = new Point(0, 0),
            Size = new Size(520, 112),
            BackColor = bgColor,
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right
        };

        var titleLabel = new Label
        {
            Text = "ektaHr",
            Font = new Font("Segoe UI", 18f, FontStyle.Bold),
            ForeColor = accentColor,
            BackColor = bgColor,
            Location = new Point(0, 24),
            Size = new Size(pnlHeader.Width, 40),
            TextAlign = ContentAlignment.MiddleCenter
        };
        pnlHeader.Controls.Add(titleLabel);

        // Dark rounded card — reduced space between ektaHr and card
        const int headerToCardGap = 12;
        var cardTop = pnlHeader.Bottom + headerToCardGap;
        var cardWidth = ClientSize.Width - margin * 2;
        var pnlCard = new Panel
        {
            Location = new Point(margin, cardTop),
            Size = new Size(cardWidth, 0), // height set after adding controls
            BackColor = cardColor,
            ForeColor = Color.White
        };

        int y = margin;
        var lblNotice = new Label
        {
            Text = "Enter your Employee ID and Tenant ID to sign in. This device will be monitored for work activity.",
            Location = new Point(margin, y),
            Size = new Size(cardWidth - margin * 2, 40),
            AutoSize = false,
            ForeColor = Color.FromArgb(0xA0, 0xA0, 0xA0),
            BackColor = Color.Transparent,
            Font = new Font("Segoe UI", 8.5f)
        };
        pnlCard.Controls.Add(lblNotice);
        y = lblNotice.Bottom + spacing;

        var lblEmp = new Label
        {
            Text = "Employee ID",
            Location = new Point(margin, y),
            Font = new Font("Segoe UI", 9f, FontStyle.Bold),
            ForeColor = accentColor,
            BackColor = Color.Transparent
        };
        pnlCard.Controls.Add(lblEmp);
        y = lblEmp.Bottom + 6;

        _txtEmployeeId = new TextBox
        {
            Location = new Point(margin, y),
            Size = new Size(cardWidth - margin * 2, 36),
            Font = new Font("Segoe UI", 10f),
            BackColor = Color.FromArgb(0x33, 0x33, 0x33),
            ForeColor = Color.White,
            BorderStyle = BorderStyle.FixedSingle
        };
        pnlCard.Controls.Add(_txtEmployeeId);
        y = _txtEmployeeId.Bottom + spacing;

        var lblTenant = new Label
        {
            Text = "Tenant ID (Company ID)",
            Location = new Point(margin, y),
            Font = new Font("Segoe UI", 9f, FontStyle.Bold),
            ForeColor = accentColor,
            BackColor = Color.Transparent
        };
        pnlCard.Controls.Add(lblTenant);
        y = lblTenant.Bottom + 6;

        _txtTenantId = new TextBox
        {
            Location = new Point(margin, y),
            Size = new Size(cardWidth - margin * 2, 36),
            Font = new Font("Segoe UI", 10f),
            BackColor = Color.FromArgb(0x33, 0x33, 0x33),
            ForeColor = Color.White,
            BorderStyle = BorderStyle.FixedSingle
        };
        pnlCard.Controls.Add(_txtTenantId);
        y = _txtTenantId.Bottom + spacing;

        _lblStatus = new Label
        {
            Location = new Point(margin, y),
            Size = new Size(cardWidth - margin * 2, 22),
            AutoSize = false,
            ForeColor = Color.FromArgb(255, 120, 120),
            BackColor = Color.Transparent,
            Font = new Font("Segoe UI", 9f)
        };
        pnlCard.Controls.Add(_lblStatus);
        y = _lblStatus.Bottom + spacing;

        var btnHeight = 44;
        const int buttonRadius = 22;
        _btnLogin = new Button
        {
            Text = "Login",
            Location = new Point(margin, y),
            Size = new Size(cardWidth - margin * 2, btnHeight),
            BackColor = accentColor,
            ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat,
            Font = new Font("Segoe UI", 10f, FontStyle.Bold)
        };
        _btnLogin.FlatAppearance.BorderSize = 0;
        _btnLogin.Region = CreateRoundedRegion(new Rectangle(0, 0, _btnLogin.Width, _btnLogin.Height), buttonRadius);
        _btnLogin.Click += BtnLogin_Click;
        pnlCard.Controls.Add(_btnLogin);
        y = _btnLogin.Bottom + 10;

        var btnExit = new Button
        {
            Text = "Exit",
            Location = new Point(margin, y),
            Size = new Size(cardWidth - margin * 2, btnHeight),
            BackColor = Color.FromArgb(0x33, 0x33, 0x33),
            ForeColor = accentColor,
            FlatStyle = FlatStyle.Flat,
            Font = new Font("Segoe UI", 10f)
        };
        btnExit.FlatAppearance.BorderColor = Color.FromArgb(0x33, 0x33, 0x33);
        btnExit.FlatAppearance.BorderSize = 0;
        btnExit.Region = CreateRoundedRegion(new Rectangle(0, 0, btnExit.Width, btnExit.Height), buttonRadius);
        btnExit.Click += (_, _) => ShowExitConfirm();
        pnlCard.Controls.Add(btnExit);
        y = btnExit.Bottom + margin;

        pnlCard.Height = y;
        pnlCard.Region = CreateRoundedRegion(new Rectangle(0, 0, pnlCard.Width, pnlCard.Height), radius);
        var cardBorderColor = Color.FromArgb(0x44, 0x44, 0x44);
        pnlCard.Paint += (s, pe) =>
        {
            using var path = new GraphicsPath();
            int r = Math.Min(radius, Math.Min(pnlCard.Width, pnlCard.Height) / 2);
            int w = pnlCard.Width;
            int h = pnlCard.Height;
            path.AddArc(0, 0, r * 2, r * 2, 180, 90);
            path.AddArc(w - r * 2, 0, r * 2, r * 2, 270, 90);
            path.AddArc(w - r * 2, h - r * 2, r * 2, r * 2, 0, 90);
            path.AddArc(0, h - r * 2, r * 2, r * 2, 90, 90);
            path.CloseFigure();
            pe.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            using var pen = new Pen(cardBorderColor, 1f);
            pe.Graphics.DrawPath(pen, path);
        };

        Controls.Add(pnlHeader);
        Controls.Add(pnlCard);

        // Exit confirmation overlay (grey card, curved buttons)
        const int cardW = 320;
        const int cardH = 170; // taller so two-line text is fully visible
        var borderColor = Color.FromArgb(0x44, 0x44, 0x44);
        var overlayCardColor = Color.FromArgb(0x42, 0x42, 0x42); // somewhat grey card
        _exitOverlay = new Panel { BackColor = Color.FromArgb(180, 0x1A, 0x1A, 0x1A), Visible = false, Dock = DockStyle.Fill };
        var overlayCard = new Panel { Size = new Size(cardW, cardH), BackColor = overlayCardColor };
        overlayCard.Region = CreateRoundedRegion(new Rectangle(0, 0, cardW, cardH), radius);
        var lblConfirm = new Label { Font = new Font("Segoe UI", 11f, FontStyle.Bold), ForeColor = Color.White, BackColor = Color.Transparent, AutoSize = false, Size = new Size(cardW - 32, 56), Location = new Point(16, 24), TextAlign = ContentAlignment.TopCenter, Text = "Are you sure you want to" + Environment.NewLine + "exit?" };
        const int overlayBtnRadius = 20;
        var btnYes = new Button { Text = "Yes", FlatStyle = FlatStyle.Flat, BackColor = accentColor, ForeColor = Color.White, Font = new Font("Segoe UI", 10f, FontStyle.Bold), Size = new Size(90, 34), Location = new Point(cardW / 2 - 95, cardH - 52) };
        btnYes.FlatAppearance.BorderSize = 0;
        btnYes.Region = CreateRoundedRegion(new Rectangle(0, 0, 90, 34), overlayBtnRadius);
        var btnCancel = new Button { Text = "Cancel", FlatStyle = FlatStyle.Flat, BackColor = borderColor, ForeColor = Color.White, Font = new Font("Segoe UI", 10f), Size = new Size(90, 34), Location = new Point(cardW / 2 + 5, cardH - 52) };
        btnCancel.FlatAppearance.BorderSize = 0;
        btnCancel.Region = CreateRoundedRegion(new Rectangle(0, 0, 90, 34), overlayBtnRadius);
        overlayCard.Controls.Add(lblConfirm);
        overlayCard.Controls.Add(btnYes);
        overlayCard.Controls.Add(btnCancel);
        btnYes.Click += (_, _) => { _exitOverlay!.Visible = false; _exitConfirmed = true; AppState.ExitRequested = true; Application.Exit(); };
        btnCancel.Click += (_, _) => _exitOverlay!.Visible = false;
        _exitOverlay.Controls.Add(overlayCard);
        _exitOverlay.Resize += (s, _) => { if (s is Panel ov && ov.Controls.Count > 0) ov.Controls[0].Location = new Point((ov.Width - cardW) / 2, (ov.Height - cardH) / 2); };
        Controls.Add(_exitOverlay);

        FormClosing += (s, e) =>
        {
            if (!_isLoginSuccessful && !_exitConfirmed)
            {
                e.Cancel = true;
                ShowExitConfirm();
            }
        };
    }

    private void ShowExitConfirm()
    {
        if (_exitOverlay == null) return;
        _exitOverlay.Bounds = new Rectangle(0, 0, ClientSize.Width, ClientSize.Height);
        if (_exitOverlay.Controls.Count > 0)
        {
            var card = _exitOverlay.Controls[0];
            card.Location = new Point((_exitOverlay.Width - card.Width) / 2, (_exitOverlay.Height - card.Height) / 2);
        }
        _exitOverlay.Visible = true;
        _exitOverlay.BringToFront();
    }

    protected override void OnLoad(EventArgs e)
    {
        base.OnLoad(e);
        if (AppIcon.Get() is { } icon)
            Icon = icon;
        // Grey/dark title bar to match app background
        try
        {
            int useDark = 1;
            DwmSetWindowAttribute(Handle, DWMWA_USE_IMMERSIVE_DARK_MODE, ref useDark, sizeof(int));
        }
        catch { /* ignore on older Windows */ }
    }

    protected override void OnShown(EventArgs e)
    {
        base.OnShown(e);
        SendMessage(_txtEmployeeId.Handle, EM_SETCUEBANNER, 1, "Enter employee id");
        SendMessage(_txtTenantId.Handle, EM_SETCUEBANNER, 1, "Enter tenant id");
    }

    private async void BtnLogin_Click(object? sender, EventArgs e)
    {
        var employeeId = _txtEmployeeId.Text.Trim();
        var tenantId = _txtTenantId.Text.Trim();
        if (string.IsNullOrEmpty(employeeId) || string.IsNullOrEmpty(tenantId))
        {
            _lblStatus.Text = "Please enter Employee ID and Tenant ID.";
            return;
        }

        _btnLogin.Enabled = false;
        _lblStatus.Text = "Signing in...";
        _lblStatus.ForeColor = Color.FromArgb(0xEF, 0xAA, 0x1F);

        var baseUrl = ConfigurationManager.AppSettings["ApiBaseUrl"] ?? "https://track.ektahr.com/api";
        var syncManager = new EktaHR.DesktopAgent.SyncManager.SyncManager(new LocalQueueService(), baseUrl);
        var machineName = Environment.MachineName;
        var osVersion = Environment.OSVersion.ToString();
        var agentVersion = "1.0.0";
        var systemIp = DeviceSystemInfo.GetSystemIp();
        var systemModel = DeviceSystemInfo.GetSystemModel();

        EktaHR.DesktopAgent.SyncManager.SyncManager.RegisterResult? result = null;
        string? apiError = null;
        try
        {
            var (res, err) = await syncManager.RegisterAsync(_deviceId, employeeId, tenantId, machineName, osVersion, agentVersion, systemIp, systemModel);
            result = res;
            apiError = err;
        }
        catch (HttpRequestException)
        {
            _lblStatus.Text = "Cannot connect to server. Ensure URL (track.ektahr.com) is reachable.";
            _lblStatus.ForeColor = Color.FromArgb(255, 120, 120);
            _btnLogin.Enabled = true;
            return;
        }
        catch (SocketException)
        {
            _lblStatus.Text = "Cannot connect to server. Ensure URL (track.ektahr.com) is reachable.";
            _lblStatus.ForeColor = Color.FromArgb(255, 120, 120);
            _btnLogin.Enabled = true;
            return;
        }
        catch (Exception ex)
        {
            _lblStatus.Text = $"Error: {ex.Message}";
            _lblStatus.ForeColor = Color.FromArgb(255, 120, 120);
            _btnLogin.Enabled = true;
            return;
        }

        if (result == null)
        {
            _lblStatus.Text = apiError ?? "Login failed. Check Employee ID and Tenant ID.";
            _lblStatus.ForeColor = Color.FromArgb(255, 120, 120);
            _btnLogin.Enabled = true;
            return;
        }

        _storage.SaveConsent(DateTime.UtcNow);
        _storage.SaveTokens(
            result.AccessToken,
            result.RefreshToken,
            result.ServerPublicKey,
            result.ScreenshotFrequency,
            result.BlurRules.Select(b => new BlurRuleStored { ProcessName = b.ProcessName }).ToList());
        var cfg = _storage.Load();
        if (cfg != null)
        {
            cfg.EmployeeId = employeeId;
            cfg.StaffId = result.StaffId;
            cfg.TenantId = tenantId;
            _storage.Save(cfg);
        }

        _lblStatus.Text = "Signed in. Starting monitoring...";
        _lblStatus.ForeColor = Color.FromArgb(0xEF, 0xAA, 0x1F);
        _isLoginSuccessful = true;
        Close();
    }
}
