using System.Drawing.Drawing2D;
using System.Reflection;
using System.Runtime.InteropServices;

namespace EktaHR.DesktopAgent;

public class MonitoringWelcomeForm : Form
{
    [DllImport("dwmapi.dll", CharSet = CharSet.Unicode, PreserveSig = true)]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int value, int size);

    private const int DWMWA_USE_IMMERSIVE_DARK_MODE = 20;

    private static readonly Color BgColor = Color.FromArgb(0x2F, 0x2F, 0x2F);
    private static readonly Color CardColor = Color.FromArgb(0x22, 0x22, 0x22);
    private static readonly Color AccentColor = Color.FromArgb(0xEF, 0xAA, 0x1F);
    private static readonly Color MutedColor = Color.FromArgb(0xA0, 0xA0, 0xA0);
    private static readonly Color BorderColor = Color.FromArgb(0x44, 0x44, 0x44);

    private readonly DateTime _monitoringStartUtc;
    private readonly Action _onLogout;
    private readonly Func<DateTime, Task<string?>>? _onBreakStarted;
    private readonly Action<string, DateTime, int>? _onBreakEnded;
    private System.Windows.Forms.Timer? _timer;
    private Label _lblTime = null!;
    private Panel _pnlCircle = null!;
    private Panel? _pnlHeader;
    private Label? _lblWelcome;
    private Label? _lblBold;
    private Label? _lblBreakTime;
    private Button? _btnBreak;
    private Button? _btnLogout;
    private Panel? _overlay;
    private Label? _overlayLabel;
    private Action? _pendingConfirmAction;
    private bool _isOnBreak;
    private DateTime _breakStartUtc;
    private string? _currentBreakId;
    private double _totalBreakSeconds;
    private const int Radius = 12;
    private const int ButtonRadius = 12;
    private const double FullCircleSeconds = 8 * 3600; // 8-hour "day" for ring progress

    public MonitoringWelcomeForm(DateTime monitoringStartUtc, Action onLogout, Func<DateTime, Task<string?>>? onBreakStarted = null, Action<string, DateTime, int>? onBreakEnded = null)
    {
        _monitoringStartUtc = monitoringStartUtc;
        _onLogout = onLogout ?? (() => { });
        _onBreakStarted = onBreakStarted;
        _onBreakEnded = onBreakEnded;
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

    private static Region CreateEllipseRegion(int x, int y, int w, int h)
    {
        var path = new GraphicsPath();
        path.AddEllipse(x, y, w, h);
        return new Region(path);
    }

    private static GraphicsPath CreatePillPath(Rectangle bounds, int radius)
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
        return path;
    }

    private sealed class PaintableButton : Button
    {
        public PaintableButton()
        {
            SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.DoubleBuffer | ControlStyles.ResizeRedraw, true);
        }
    }

    private static Button CreatePillButton(string text, Image? icon, Color backColor, Color foreColor, Color borderColor)
    {
        var btn = new PaintableButton
        {
            Text = text,
            FlatStyle = FlatStyle.Flat,
            BackColor = backColor,
            ForeColor = foreColor,
            Font = new Font("Segoe UI", 10f, FontStyle.Bold),
            FlatAppearance = { BorderColor = borderColor, BorderSize = icon == null ? 0 : 1 },
            TextImageRelation = TextImageRelation.ImageBeforeText,
            Image = icon,
            Cursor = Cursors.Hand
        };
        btn.Paint += (s, pe) =>
        {
            var b = (Button)s!;
            var r = new Rectangle(0, 0, b.Width - 1, b.Height - 1);
            using var path = CreatePillPath(r, ButtonRadius);
            var g = pe.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            using (var br = new SolidBrush(b.BackColor))
                g.FillPath(br, path);
            if (b.FlatAppearance.BorderSize > 0)
            {
                using var pen = new Pen(b.FlatAppearance.BorderColor, 1f);
                g.DrawPath(pen, path);
            }
            var sf = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center };
            using var txtBrush = new SolidBrush(b.ForeColor);
            g.DrawString(b.Text, b.Font, txtBrush, r, sf);
        };
        return btn;
    }

    private static readonly Color LightWhite = Color.FromArgb(0xE0, 0xE0, 0xE0);

    private static Button CreateTransparentPillButton(string text, Color borderColor, Color foreColor)
    {
        var btn = new PaintableButton
        {
            Text = text,
            FlatStyle = FlatStyle.Flat,
            BackColor = Color.Transparent,
            ForeColor = foreColor,
            Font = new Font("Segoe UI", 10f, FontStyle.Bold),
            FlatAppearance = { BorderSize = 0, MouseOverBackColor = Color.Transparent, MouseDownBackColor = Color.Transparent },
            Cursor = Cursors.Hand,
            TabStop = false
        };
        btn.Paint += (s, pe) =>
        {
            var b = (Button)s!;
            var r = new Rectangle(0, 0, b.Width - 1, b.Height - 1);
            using var path = CreatePillPath(r, ButtonRadius);
            var g = pe.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            using (var pen = new Pen(borderColor, 2f))
                g.DrawPath(pen, path);
            var sf = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center };
            using var txtBrush = new SolidBrush(b.ForeColor);
            g.DrawString(b.Text, b.Font, txtBrush, r, sf);
        };
        return btn;
    }

    private void InitializeComponent()
    {
        Text = "ektaHr Attendance Monitoring";
        Size = new Size(520, 740);
        StartPosition = FormStartPosition.CenterScreen;
        FormBorderStyle = FormBorderStyle.Sizable;
        MinimizeBox = true;
        MaximizeBox = false;
        ShowInTaskbar = true;
        BackColor = BgColor;
        ForeColor = Color.White;
        Font = new Font("Segoe UI", 9.25f);
        MinimumSize = new Size(480, 720);

        const int margin = 24;
        const int spacing = 16;
        int y = margin;

        // Header: enough height so "ektaHr" is fully visible (no top/bottom clip)
        _pnlHeader = new Panel
        {
            Location = new Point(0, 0),
            Size = new Size(520, 56),
            BackColor = BgColor,
            Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right
        };
        var titleLabel = new Label
        {
            Text = "ektaHr",
            Font = new Font("Segoe UI", 18f, FontStyle.Bold),
            ForeColor = AccentColor,
            BackColor = BgColor,
            Location = new Point(0, 10),
            Size = new Size(_pnlHeader.Width, 40),
            TextAlign = ContentAlignment.MiddleCenter,
            AutoEllipsis = false
        };
        _pnlHeader.Controls.Add(titleLabel);
        Controls.Add(_pnlHeader);
        y = _pnlHeader.Bottom + 8;

        // Welcome message: enough width and height so full text is visible (no cut-off)
        var cardWidth = Math.Max(ClientSize.Width - margin * 2, 420);
        _lblWelcome = new Label
        {
            Text = "Welcome! Have a productive day!",
            Location = new Point(margin, y),
            Size = new Size(cardWidth, 44),
            AutoSize = false,
            ForeColor = Color.White,
            BackColor = Color.Transparent,
            Font = new Font("Segoe UI", 11f, FontStyle.Bold),
            TextAlign = ContentAlignment.MiddleCenter,
            AutoEllipsis = false,
            UseMnemonic = false
        };
        Controls.Add(_lblWelcome);
        y = _lblWelcome.Bottom + 6;

        _lblBold = new Label
        {
            Text = "Attendance tracking is active while you work.",
            Location = new Point(margin, y),
            Size = new Size(cardWidth, 36),
            AutoSize = false,
            ForeColor = AccentColor,
            BackColor = Color.Transparent,
            Font = new Font("Segoe UI", 9f, FontStyle.Bold),
            TextAlign = ContentAlignment.MiddleCenter,
            AutoEllipsis = false,
            UseMnemonic = false
        };
        Controls.Add(_lblBold);
        y = _lblBold.Bottom + spacing + 8;

        // Circular timer panel (draws ring + center text)
        int circleSize = Math.Min(220, cardWidth - 40);
        _pnlCircle = new Panel
        {
            Location = new Point((ClientSize.Width - circleSize) / 2, y),
            Size = new Size(circleSize, circleSize),
            BackColor = Color.Transparent,
            Anchor = AnchorStyles.None
        };
        _lblTime = new Label
        {
            Text = "00:00:00",
            Font = new Font("Segoe UI", 20f, FontStyle.Bold),
            ForeColor = AccentColor,
            BackColor = Color.Transparent,
            AutoSize = false,
            TextAlign = ContentAlignment.MiddleCenter,
            Bounds = new Rectangle(0, 0, circleSize, circleSize)
        };
        _pnlCircle.Controls.Add(_lblTime);
        _pnlCircle.Paint += PnlCircle_Paint;
        Controls.Add(_pnlCircle);
        y = _pnlCircle.Bottom + spacing + 12;

        // Bottom: icon row (break left, logout right) | when on break: break timer + End Break button centered
        // Bottom: button row (break left, logout right) | when on break: break timer above
        _lblBreakTime = new Label
        {
            Text = "00:00:00",
            Font = new Font("Segoe UI", 14f, FontStyle.Bold),
            ForeColor = AccentColor,
            BackColor = Color.Transparent,
            AutoSize = false,
            Size = new Size(140, 30),
            TextAlign = ContentAlignment.MiddleCenter,
            Visible = false
        };
        _btnBreak = CreateTransparentPillButton("Break", AccentColor, AccentColor);
        _btnBreak.Size = new Size(130, 40);
        _btnBreak.Click += (_, _) => {
            if (!_isOnBreak) OnBreakClick();
            else ShowConfirmOverlay("Wanna end tea break?", () => { _overlay!.Visible = false; OnEndBreakClick(); });
        };
        _btnLogout = CreateTransparentPillButton("Logout", AccentColor, AccentColor);
        _btnLogout.Size = new Size(130, 40);
        _btnLogout.Click += (_, _) => ShowConfirmOverlay("Are you sure you want to logout?", () => { _overlay!.Visible = false; _onLogout(); });
        
        Controls.Add(_lblBreakTime);
        Controls.Add(_btnBreak);
        Controls.Add(_btnLogout);
        y += margin;

        // Reusable confirmation overlay (grey card, curved buttons, theme colors)
        const int cardW = 320;
        const int cardH = 170; // taller so two-line text is fully visible
        var overlayCardColor = Color.FromArgb(0x42, 0x42, 0x42); // somewhat grey card
        _overlay = new Panel
        {
            BackColor = Color.FromArgb(180, 0x1A, 0x1A, 0x1A),
            Visible = false,
            Dock = DockStyle.Fill
        };
        var overlayCard = new Panel { Size = new Size(cardW, cardH), BackColor = overlayCardColor };
        overlayCard.Region = CreateRoundedRegion(new Rectangle(0, 0, cardW, cardH), Radius);
        _overlayLabel = new Label { Font = new Font("Segoe UI", 11f, FontStyle.Bold), ForeColor = Color.White, BackColor = Color.Transparent, AutoSize = false, Size = new Size(cardW - 32, 56), Location = new Point(16, 24), TextAlign = ContentAlignment.TopCenter };
        var btnYes = CreatePillButton("Yes", null, AccentColor, Color.White, Color.White);
        btnYes.Size = new Size(90, 34);
        btnYes.Location = new Point(cardW / 2 - 95, cardH - 52);
        var btnCancel = CreatePillButton("Cancel", null, BorderColor, Color.White, Color.White);
        btnCancel.Size = new Size(90, 34);
        btnCancel.Location = new Point(cardW / 2 + 5, cardH - 52);
        overlayCard.Controls.Add(_overlayLabel);
        overlayCard.Controls.Add(btnYes);
        overlayCard.Controls.Add(btnCancel);
        _overlay.Controls.Add(overlayCard);
        _overlay.Resize += (s, _) => { if (s is Panel ov && ov.Controls.Count > 0) ov.Controls[0].Location = new Point((ov.Width - cardW) / 2, (ov.Height - cardH) / 2); };
        btnYes.Click += (_, _) => { _overlay!.Visible = false; _pendingConfirmAction?.Invoke(); };
        btnCancel.Click += (_, _) => _overlay!.Visible = false;
        Controls.Add(_overlay);

        FormClosing += (s, e) =>
        {
            if (e.CloseReason == CloseReason.UserClosing)
            {
                e.Cancel = true;
                ShowConfirmOverlay("Are you sure you want to" + Environment.NewLine + "exit?", () =>
                {
                    _overlay!.Visible = false;
                    AppState.ExitRequested = true;
                    Application.Exit();
                });
            }
        };

        // Use 500ms interval so break timer seconds don't skip (WM_TIMER can coalesce at 1s)
        _timer = new System.Windows.Forms.Timer { Interval = 500 };
        _timer.Tick += (_, _) => UpdateTimerDisplay();
        _timer.Start();
        UpdateTimerDisplay();
    }

    private void PnlCircle_Paint(object? sender, PaintEventArgs e)
    {
        var g = e.Graphics;
        g.SmoothingMode = SmoothingMode.AntiAlias;
        int w = _pnlCircle.Width;
        int h = _pnlCircle.Height;
        int size = Math.Min(w, h) - 12;
        int x = (w - size) / 2;
        int y = (h - size) / 2;
        var rect = new Rectangle(x, y, size, size);

        // Background ring (grey)
        using (var pen = new Pen(BorderColor, 4f))
            g.DrawEllipse(pen, rect);

        // Progress ring (accent) - by elapsed time over 8h (pause during break)
        var now = DateTime.UtcNow;
        double currentBreakDuration = _isOnBreak ? (now - _breakStartUtc).TotalSeconds : 0;
        double elapsedWorkSeconds = Math.Max(0, (now - _monitoringStartUtc).TotalSeconds - (_totalBreakSeconds + currentBreakDuration));
        double sweep = Math.Min(360.0, 360.0 * (elapsedWorkSeconds / FullCircleSeconds));
        if (sweep > 0.01)
        {
            using var pen = new Pen(AccentColor, 4f);
            pen.StartCap = LineCap.Round;
            pen.EndCap = LineCap.Round;
            g.DrawArc(pen, rect, -90f, (float)sweep); // start from top
        }
    }

    private void UpdateTimerDisplay()
    {
        var now = DateTime.UtcNow;
        var totalElapsed = now - _monitoringStartUtc;
        double currentBreakDuration = _isOnBreak ? (now - _breakStartUtc).TotalSeconds : 0;
        
        // Break Timer: ONLY show current break duration (non-cumulative)
        if (_isOnBreak && _lblBreakTime != null)
        {
            TimeSpan tsBreak = TimeSpan.FromSeconds(currentBreakDuration);
            _lblBreakTime.Text = $"{(int)tsBreak.TotalHours:D2}:{tsBreak.Minutes:D2}:{tsBreak.Seconds:D2}";
            _lblBreakTime.Invalidate();
        }

        // Main Timer: total work time (total elapsed - total cumulative break seconds today)
        double workSeconds = Math.Max(0, totalElapsed.TotalSeconds - (_totalBreakSeconds + currentBreakDuration));
        TimeSpan tsWork = TimeSpan.FromSeconds(workSeconds);
        _lblTime.Text = $"{(int)tsWork.TotalHours:D2}:{tsWork.Minutes:D2}:{tsWork.Seconds:D2}";
        _pnlCircle?.Invalidate();
    }

    protected override void OnLoad(EventArgs e)
    {
        base.OnLoad(e);
        if (AppIcon.Get() is { } icon)
            Icon = icon;
        try
        {
            int useDark = 1;
            DwmSetWindowAttribute(Handle, DWMWA_USE_IMMERSIVE_DARK_MODE, ref useDark, sizeof(int));
        }
        catch { }
        LayoutContent();
    }

    /// <summary>Min width of the content block so all text is fully visible (no cut-off).</summary>
    private const int ContentBlockWidth = 440;

    protected override void OnResize(EventArgs e)
    {
        base.OnResize(e);
        LayoutContent();
    }

    private void ShowConfirmOverlay(string message, Action onYes)
    {
        if (_overlay == null || _overlayLabel == null) return;
        _overlayLabel.Text = message;
        _pendingConfirmAction = onYes;
        _overlay.Bounds = new Rectangle(0, 0, ClientSize.Width, ClientSize.Height);
        if (_overlay.Controls.Count > 0)
        {
            var card = _overlay.Controls[0];
            card.Location = new Point((_overlay.Width - card.Width) / 2, (_overlay.Height - card.Height) / 2);
        }
        _overlay.Visible = true;
        _overlay.BringToFront();
    }

    private void OnBreakClick()
    {
        if (_isOnBreak) return; // End only via End Break button
        ShowConfirmOverlay("Wanna start tea break?", () =>
        {
            _overlay!.Visible = false;
            RunBreakStartAsync();
        });
    }

    private void OnEndBreakClick()
    {
        if (!_isOnBreak) return;
        var endUtc = DateTime.UtcNow;
        var duration = endUtc - _breakStartUtc;
        double durationSeconds = duration.TotalSeconds;
        _totalBreakSeconds += durationSeconds;
        if (!string.IsNullOrEmpty(_currentBreakId))
            _onBreakEnded?.Invoke(_currentBreakId, endUtc, (int)durationSeconds);
        _currentBreakId = null;
        _isOnBreak = false;
        _btnBreak!.Text = "Break";
        _lblBreakTime!.Visible = false;
        _lblBreakTime.Text = "00:00:00";
    }

    private async void RunBreakStartAsync()
    {
        _breakStartUtc = DateTime.UtcNow;
        _isOnBreak = true;
        _btnBreak!.Text = "End Break";
        _lblBreakTime!.Visible = true;
        _lblBreakTime.BringToFront();
        _lblBreakTime.Text = "00:00:00";
        
        _currentBreakId = _onBreakStarted != null ? await _onBreakStarted(_breakStartUtc) : null;
    }

    private void LayoutContent()
    {
        if (_pnlHeader == null || _lblWelcome == null || _lblBold == null ||
            _pnlCircle == null || _lblTime == null || _btnBreak == null || _btnLogout == null)
            return;

        const int margin = 24;
        const int spacing = 16;
        const int headerHeight = 56;
        int circleSize = Math.Min(220, ContentBlockWidth - 40);
        const int breakTimerW = 140;
        const int breakTimerH = 30;
        const int welcomeH = 44;
        const int boldH = 36;
        const int btnH = 40;

        // Heights: welcome + bold + circle progress + break timer row + buttons row + margin
        int contentHeight = welcomeH + 6 + boldH + spacing + 8 + circleSize + spacing + 12 + breakTimerH + 12 + btnH + margin + 8;
        int remainingHeight = Math.Max(0, ClientSize.Height - headerHeight);
        int startY = headerHeight + Math.Max(0, (remainingHeight - contentHeight) / 2);

        // Content block: use full width when possible so text is never cut off
        int blockWidth = Math.Max(ContentBlockWidth, Math.Min(ClientSize.Width - margin * 2, 520));
        int blockLeft = (ClientSize.Width - blockWidth) / 2;
        int textWidth = blockWidth - margin * 2;
        if (textWidth < 360) textWidth = Math.Max(360, ClientSize.Width - margin * 2);

        _pnlHeader.Size = new Size(ClientSize.Width, headerHeight);
        if (_pnlHeader.Controls.Count > 0 && _pnlHeader.Controls[0] is Label titleLabel)
        {
            titleLabel.Size = new Size(_pnlHeader.Width, 40);
            titleLabel.Location = new Point(0, 10);
        }

        _lblWelcome.Location = new Point(blockLeft + margin, startY);
        _lblWelcome.Size = new Size(textWidth, welcomeH);
        startY += welcomeH + 6;

        _lblBold.Location = new Point(blockLeft + margin, startY);
        _lblBold.Size = new Size(textWidth, boldH);
        startY += boldH + spacing + 8;

        _pnlCircle.Size = new Size(circleSize, circleSize);
        _pnlCircle.Location = new Point(blockLeft + (blockWidth - circleSize) / 2, startY);
        _lblTime.Bounds = new Rectangle(0, 0, circleSize, circleSize);
        startY += circleSize + spacing + 12;

        // Row 1: tea break timer (centered, above buttons)
        if (_lblBreakTime != null)
        {
            _lblBreakTime.Size = new Size(breakTimerW, breakTimerH);
            _lblBreakTime.Location = new Point(blockLeft + (blockWidth - breakTimerW) / 2, startY);
        }
        startY += breakTimerH + 12;

        // Row 2: Break / End Break and Logout buttons side-by-side
        int btnGap = 20;
        int totalBtnsW = 130 + btnGap + 130;
        int rowLeft = blockLeft + (blockWidth - totalBtnsW) / 2;
        _btnBreak!.Location = new Point(rowLeft, startY);
        _btnBreak!.Size = new Size(130, 40);
        _btnLogout!.Location = new Point(rowLeft + 130 + btnGap, startY);
        _btnLogout!.Size = new Size(130, 40);
    }

    protected override void Dispose(bool disposing)
    {
        _timer?.Stop();
        _timer?.Dispose();
        base.Dispose(disposing);
    }
}
