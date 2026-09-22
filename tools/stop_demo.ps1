[CmdletBinding()]
param(
    [switch]$Quiet
)

$ErrorActionPreference = "Stop"
$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$runtimeDir = Join-Path $repoRoot ".runtime"

function Stop-RecordedProcess {
    param(
        [Parameter(Mandatory = $true)][string]$PidFile,
        [Parameter(Mandatory = $true)][string]$Label
    )

    if (-not (Test-Path -LiteralPath $PidFile)) { return }
    $rawPid = (Get-Content -LiteralPath $PidFile -Raw -ErrorAction SilentlyContinue).Trim()
    $parsedPid = 0
    if (-not [int]::TryParse($rawPid, [ref]$parsedPid)) {
        Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
        return
    }

    $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $parsedPid" -ErrorAction SilentlyContinue
    if ($null -eq $processInfo) {
        Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
        return
    }

    $commandLine = [string]$processInfo.CommandLine
    $owned = $commandLine.IndexOf($repoRoot, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
    if (-not $owned) {
        if (-not $Quiet) { Write-Warning "Skipped $Label PID $parsedPid because it is not owned by this checkout." }
        Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
        return
    }

    Stop-Process -Id $parsedPid -Force -ErrorAction SilentlyContinue
    try { Wait-Process -Id $parsedPid -Timeout 5 -ErrorAction SilentlyContinue } catch {}
    Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
    if (-not $Quiet) { Write-Host "Stopped $Label (PID $parsedPid)." -ForegroundColor DarkGray }
}

if (Test-Path -LiteralPath $runtimeDir) {
    Stop-RecordedProcess -PidFile (Join-Path $runtimeDir "tunnel.pid") -Label "Cloudflare tunnel"
    Stop-RecordedProcess -PidFile (Join-Path $runtimeDir "server.pid") -Label "Demo server"
    Remove-Item -LiteralPath (Join-Path $runtimeDir "access_token.txt") -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath (Join-Path $runtimeDir "phone_url.txt") -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath (Join-Path $runtimeDir "local_url.txt") -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath (Join-Path $runtimeDir "server_port.txt") -Force -ErrorAction SilentlyContinue
}

if (-not $Quiet) { Write-Host "Project-owned Demo V0.1 processes are stopped." -ForegroundColor Green }
