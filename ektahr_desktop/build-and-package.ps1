# EktaHR Agent - Build and create Inno Setup installer
# 1. Edit BuildConfig.cs (ApiBaseUrl, Version) before running
# 2. Install Inno Setup 6 from https://jrsoftware.org/isinfo.php
# 3. Run: .\build-and-package.ps1
# 4. Share: ektahr_desktop\output\EktaHR-Agent-Setup.exe

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$projectDir = ".\EktaHR.DesktopAgent"
$publishDir = ".\publish"
$outputDir = ".\output"
$issPath = ".\EktaHR-Agent.iss"

# Inno Setup compiler (default install path)
$iscc = "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe"
if (-not (Test-Path $iscc)) {
    $iscc = "${env:ProgramFiles}\Inno Setup 6\ISCC.exe"
}
if (-not (Test-Path $iscc)) {
    Write-Host "Inno Setup 6 not found. Install from https://jrsoftware.org/isinfo.php" -ForegroundColor Red
    exit 1
}

Write-Host "Building EktaHR Desktop Agent..." -ForegroundColor Cyan
# PublishSingleFile=false: required for SQLite native e_sqlite3.dll to load from runtimes\win-x64\native\
dotnet publish $projectDir -c Release -r win-x64 --self-contained true -p:PublishSingleFile=false -o $publishDir

Remove-Item "$publishDir\*.pdb" -ErrorAction SilentlyContinue

Write-Host "Creating installer with Inno Setup..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
& $iscc $issPath

if ($LASTEXITCODE -eq 0) {
    $setupPath = Resolve-Path "$outputDir\EktaHR-Agent-Setup.exe"
    Write-Host "Done! Share: $setupPath" -ForegroundColor Green
} else {
    Write-Host "Inno Setup failed." -ForegroundColor Red
    exit 1
}
