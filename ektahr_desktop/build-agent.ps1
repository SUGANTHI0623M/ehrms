# EktaHR Desktop Agent - Build and store output in output folder
# Run from repo: .\ektahr_desktop\build-agent.ps1
# Output: ektahr_desktop\output\

$ErrorActionPreference = "Stop"
$scriptRoot = $PSScriptRoot
Set-Location $scriptRoot

$projectDir = ".\EktaHR.DesktopAgent"
$outputDir = ".\output"

Write-Host "Building EktaHR Desktop Agent..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

# PublishSingleFile=false: required for SQLite native e_sqlite3.dll to load from runtimes\win-x64\native\
dotnet publish $projectDir -c Release -r win-x64 --self-contained true -p:PublishSingleFile=false -o $outputDir

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed." -ForegroundColor Red
    exit 1
}

# Optional: remove debug symbols to reduce size
Remove-Item "$outputDir\*.pdb" -ErrorAction SilentlyContinue

$resolved = Resolve-Path $outputDir
Write-Host "Done! Output: $resolved" -ForegroundColor Green
