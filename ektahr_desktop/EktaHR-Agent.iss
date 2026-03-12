; EktaHR Desktop Agent - Inno Setup script
; Run: .\build-and-package.ps1 (builds then runs iscc)
; Sync AppVersion with BuildConfig.Version

#define MyAppName "EktaHR Attendance Monitoring"
#define MyAppExeName "EktaHR.DesktopAgent.exe"

[Setup]
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName={#MyAppName}
AppVersion=1.0.1
DefaultDirName={autopf}\EktaHR\Monitoring
DefaultGroupName=EktaHR
DisableProgramGroupPage=yes
OutputDir=output
OutputBaseFilename=EktaHR-Agent-Setup
SetupIconFile=EktaHR.DesktopAgent/assets/ekta_circlelogo.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
; Force-close apps using install dir files to avoid "Access is denied" (e.g. clrjit.dll)
CloseApplications=force

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"
Name: "startupicon"; Description: "Run at Windows startup"; GroupDescription: "Startup:"

[Files]
; Publish output - build script puts files in publish\ before running iscc
Source: "publish\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon
Name: "{userstartup}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: startupicon

[Run]
; Interactive: show "Launch" checkbox (skipped during silent update)
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
; Silent update: launch agent using full exe path (runs only when /VERYSILENT)
Filename: "{app}\{#MyAppExeName}"; Flags: nowait postinstall shellexec; Check: IsSilentInstall

[Code]
function IsSilentInstall: Boolean;
begin
  Result := WizardSilent;
end;
procedure UninstallOldAgentAndCleanShortcuts;
var
  Uninstaller, DesktopPath: String;
  ResultCode: Integer;
begin
  { Remove old "Ekta HR Agent" installation }
  Uninstaller := ExpandConstant('{autopf}') + '\Ekta HR Agent\unins000.exe';
  if FileExists(Uninstaller) then
    Exec(Uninstaller, '/VERYSILENT /SUPPRESSMSGBOXES', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);

  { Remove leftover desktop shortcuts from old installs }
  DesktopPath := ExpandConstant('{userdesktop}');
  DeleteFile(DesktopPath + '\Ekta HR Agent.lnk');
  DeleteFile(DesktopPath + '\EktaHR Agent.lnk');
  DeleteFile(DesktopPath + '\Ekta HR Attendance.lnk');
end;

function InitializeSetup: Boolean;
begin
  Result := True;
  UninstallOldAgentAndCleanShortcuts;
end;
