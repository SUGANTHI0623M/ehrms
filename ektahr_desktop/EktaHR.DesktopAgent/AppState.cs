namespace EktaHR.DesktopAgent;

/// <summary>Shared app state used to distinguish Exit (quit) vs Logout (show login again).</summary>
internal static class AppState
{
    /// <summary>Set by AgentContext.OnExit when user chooses Exit. When true, Program.Main exits the loop.</summary>
    public static bool ExitRequested { get; set; }
}
