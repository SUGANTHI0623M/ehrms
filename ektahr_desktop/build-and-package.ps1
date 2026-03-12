# EktaHR Agent - Build and create Inno Setup installer
# 1. Edit BuildConfig.cs (ApiBaseUrl, Version) before running
# 2. Install Inno Setup 6 from https://jrsoftware.org/isinfo.php
# 3. Run from PowerShell: .\build-and-package.ps1   OR from cmd: .\build-and-package.cmd
# 4. Share: ektahr_desktop\output\EktaHR-Agent-Setup.exe

$ErrorActionPreference = "Stop"
$root = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
Set-Location -LiteralPath $root

$projectDir = Join-Path $root "EktaHR.DesktopAgent"
$csproj = Join-Path $projectDir "EktaHR.DesktopAgent.csproj"
$publishDir = Join-Path $root "publish"
$outputDir = Join-Path $root "output"
$issPath = Join-Path $root "EktaHR-Agent.iss"

# Inno Setup compiler (default install path)
$iscc = Join-Path ${env:ProgramFiles(x86)} "Inno Setup 6\ISCC.exe"
if (-not (Test-Path -LiteralPath $iscc)) {
    $iscc = Join-Path $env:ProgramFiles "Inno Setup 6\ISCC.exe"
}
if (-not (Test-Path -LiteralPath $iscc)) {
    Write-Host "Inno Setup 6 not found. Install from https://jrsoftware.org/isinfo.php" -ForegroundColor Red
    exit 1
}

Write-Host "Building EktaHR Desktop Agent..." -ForegroundColor Cyan
# PublishSingleFile=false: required for SQLite native e_sqlite3.dll to load from runtimes\win-x64\native\
dotnet publish $csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=false -o $publishDir

Remove-Item "$publishDir\*.pdb" -ErrorAction SilentlyContinue

Write-Host "Creating installer with Inno Setup..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
& $iscc $issPath

if ($LASTEXITCODE -eq 0) {
    $setupPath = Join-Path $outputDir "EktaHR-Agent-Setup.exe"
    if (Test-Path $setupPath) {
        Write-Host "Done! Share: $setupPath" -ForegroundColor Green
    } else {
        Write-Host "Installer created in: $outputDir" -ForegroundColor Green
    }
} else {
    Write-Host "Inno Setup failed." -ForegroundColor Red
    exit 1
}
