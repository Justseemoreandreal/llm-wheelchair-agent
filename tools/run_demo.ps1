[CmdletBinding()]
param(
    [switch]$PhoneMode,
    [switch]$NoBrowser,
    [switch]$NonInteractive
)

$ErrorActionPreference = "Stop"
$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$backendDir = Join-Path $repoRoot "backend"
$frontendDir = Join-Path $repoRoot "frontend"
$runtimeDir = Join-Path $repoRoot ".runtime"
$logsDir = Join-Path $runtimeDir "logs"
$toolsCache = Join-Path $runtimeDir "tools"
$launcherLog = Join-Path $logsDir "launcher.log"
$serverOutLog = Join-Path $logsDir "server.out.log"
$serverErrLog = Join-Path $logsDir "server.err.log"
$tunnelOutLog = Join-Path $logsDir "tunnel.out.log"
$tunnelErrLog = Join-Path $logsDir "tunnel.err.log"

New-Item -ItemType Directory -Force -Path $logsDir, $toolsCache | Out-Null
Set-Content -LiteralPath $launcherLog -Value "$(Get-Date -Format o) Demo V0.2 launcher started. PhoneMode=$PhoneMode"

function Write-Status {
    param([string]$Message, [ConsoleColor]$Color = [ConsoleColor]::Gray)
    Write-Host $Message -ForegroundColor $Color
    Add-Content -LiteralPath $launcherLog -Value "$(Get-Date -Format o) $Message"
}

function Require-Command {
    param([string]$Name, [string]$InstallHint)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Missing '$Name'. $InstallHint"
    }
}

function Test-LocalPortBindable {
    param([Parameter(Mandatory = $true)][int]$Port)
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
    try {
        $listener.Start()
        return $true
    } catch {
        return $false
    } finally {
        try { $listener.Stop() } catch {}
    }
}

function Get-DemoPort {
    # Prefer the documented port, but Windows may reserve/exclude it (WinError 10013).
    if (Test-LocalPortBindable -Port 8765) { return 8765 }

    Write-Status "Port 8765 is unavailable or reserved. Selecting a safe free port automatically..." Yellow
    for ($attempt = 0; $attempt -lt 10; $attempt++) {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
        try {
            $listener.Start()
            $candidate = ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
        } finally {
            try { $listener.Stop() } catch {}
        }
        if ($candidate -gt 0 -and (Test-LocalPortBindable -Port $candidate)) {
            return $candidate
        }
    }
    throw "Could not find a bindable local TCP port for the demo."
}

function Get-Sha256 {
    param([Parameter(Mandatory = $true)][string]$Path)
    $stream = [System.IO.File]::OpenRead($Path)
    try {
        $sha256 = [System.Security.Cryptography.SHA256]::Create()
        try {
            return ([System.BitConverter]::ToString($sha256.ComputeHash($stream))).Replace("-", "")
        } finally {
            $sha256.Dispose()
        }
    } finally {
        $stream.Dispose()
    }
}

function Wait-ForHealth {
    param(
        [Parameter(Mandatory = $true)][string]$BaseUrl,
        [int]$TimeoutSeconds = 45
    )
    $healthUrl = "$($BaseUrl.TrimEnd('/'))/health"
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        try {
            $response = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2
            if ($response.status -eq "ok") { return }
        } catch {}
        Start-Sleep -Milliseconds 500
    } while ((Get-Date) -lt $deadline)
    throw "FastAPI did not become healthy at $healthUrl. See $serverErrLog"
}

function Wait-ForTunnelUrl {
    param([string]$PythonExe, [int]$TimeoutSeconds = 60)
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        foreach ($logPath in @($tunnelOutLog, $tunnelErrLog)) {
            if (Test-Path -LiteralPath $logPath) {
                $url = & $PythonExe -m app.launcher_helpers extract-url $logPath 2>$null
                if ($LASTEXITCODE -eq 0 -and $url) { return $url.Trim() }
            }
        }
        Start-Sleep -Milliseconds 500
    } while ((Get-Date) -lt $deadline)
    return $null
}

& (Join-Path $PSScriptRoot "stop_demo.ps1") -Quiet

try {
    Clear-Host
    Write-Status "Demo V0.2 - local Chinese ASR; simulation only" Cyan
    Write-Status "This does NOT control a physical wheelchair." Yellow
    Require-Command "python" "Install Python 3.11 or newer and enable 'Add Python to PATH'."
    Require-Command "node" "Install the current Node.js LTS release."
    Require-Command "npm" "Install the current Node.js LTS release."

    $venvPython = Join-Path $backendDir ".venv\Scripts\python.exe"
    if (-not (Test-Path -LiteralPath $venvPython)) {
        Write-Status "Preparing Python environment (first launch may take a few minutes)..." Cyan
        & python -m venv (Join-Path $backendDir ".venv")
        if ($LASTEXITCODE -ne 0) { throw "Could not create backend virtual environment." }
    }

    $requirementsHash = Get-Sha256 (Join-Path $backendDir "requirements.txt")
    $requirementsStamp = Join-Path $runtimeDir "requirements.sha256"
    $installedHash = if (Test-Path $requirementsStamp) { (Get-Content $requirementsStamp -Raw).Trim() } else { "" }
    if ($installedHash -ne $requirementsHash) {
        Write-Status "Installing backend dependencies..." Cyan
        & $venvPython -m pip install -r (Join-Path $backendDir "requirements.txt")
        if ($LASTEXITCODE -ne 0) { throw "Backend dependency installation failed." }
        Set-Content -LiteralPath $requirementsStamp -Value $requirementsHash
    }

    Write-Status "Preparing pinned local Chinese ASR model (first run downloads approximately 87 MB)..." Cyan
    Push-Location $backendDir
    try { & $venvPython -m app.asr prepare-model } finally { Pop-Location }
    if ($LASTEXITCODE -ne 0) {
        throw "ASR model download/setup failed. Check internet access to GitHub releases, then rerun this launcher."
    }

    if (-not (Test-Path -LiteralPath (Join-Path $frontendDir "node_modules"))) {
        Write-Status "Installing frontend dependencies..." Cyan
        Push-Location $frontendDir
        try { & npm install } finally { Pop-Location }
        if ($LASTEXITCODE -ne 0) { throw "Frontend dependency installation failed." }
    }

    $distIndex = Join-Path $frontendDir "dist\index.html"
    $buildRequired = -not (Test-Path -LiteralPath $distIndex)
    if (-not $buildRequired) {
        $distTime = (Get-Item -LiteralPath $distIndex).LastWriteTimeUtc
        $newerSource = Get-ChildItem -Path (Join-Path $frontendDir "src") -Recurse -File |
            Where-Object { $_.LastWriteTimeUtc -gt $distTime } | Select-Object -First 1
        $buildRequired = $null -ne $newerSource
    }
    if ($buildRequired) {
        Write-Status "Building the phone-first React app..." Cyan
        Push-Location $frontendDir
        try { & npm run build } finally { Pop-Location }
        if ($LASTEXITCODE -ne 0) { throw "Frontend production build failed." }
    }

    Remove-Item -LiteralPath $serverOutLog, $serverErrLog -Force -ErrorAction SilentlyContinue
    if ($PhoneMode) {
        Push-Location $backendDir
        try { $accessToken = (& $venvPython -m app.launcher_helpers token).Trim() } finally { Pop-Location }
        if (-not $accessToken) { throw "Could not generate the per-run access token." }
        $env:DEMO_ACCESS_TOKEN = $accessToken
        Set-Content -LiteralPath (Join-Path $runtimeDir "access_token.txt") -Value $accessToken
    } else {
        Remove-Item Env:DEMO_ACCESS_TOKEN -ErrorAction SilentlyContinue
    }

    $serverPort = Get-DemoPort
    $localOrigin = "http://127.0.0.1:$serverPort"
    $localUrl = "$localOrigin/"
    Set-Content -LiteralPath (Join-Path $runtimeDir "server_port.txt") -Value $serverPort
    Set-Content -LiteralPath (Join-Path $runtimeDir "local_url.txt") -Value $localUrl

    Write-Status "Starting unified FastAPI + React server on port $serverPort..." Cyan
    $server = Start-Process -FilePath $venvPython `
        -ArgumentList @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "$serverPort") `
        -WorkingDirectory $backendDir -RedirectStandardOutput $serverOutLog `
        -RedirectStandardError $serverErrLog -WindowStyle Hidden -PassThru
    Set-Content -LiteralPath (Join-Path $runtimeDir "server.pid") -Value $server.Id
    Wait-ForHealth -BaseUrl $localOrigin
    Write-Status "Local demo is ready: $localUrl" Green

    $entryUrl = $localUrl
    if ($PhoneMode) {
        $cloudflared = Join-Path $toolsCache "cloudflared.exe"
        if (-not (Test-Path -LiteralPath $cloudflared)) {
            Write-Status "Downloading official Cloudflare Tunnel client..." Cyan
            $downloadPath = "$cloudflared.download"
            Remove-Item -LiteralPath $downloadPath -Force -ErrorAction SilentlyContinue
            $webClient = New-Object System.Net.WebClient
            try {
                $webClient.DownloadFile(
                    "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe",
                    $downloadPath
                )
                Move-Item -LiteralPath $downloadPath -Destination $cloudflared -Force
            } finally {
                $webClient.Dispose()
                Remove-Item -LiteralPath $downloadPath -Force -ErrorAction SilentlyContinue
            }
        }

        Remove-Item -LiteralPath $tunnelOutLog, $tunnelErrLog -Force -ErrorAction SilentlyContinue
        Write-Status "Creating temporary HTTPS tunnel (no account required)..." Cyan
        $tunnel = Start-Process -FilePath $cloudflared `
            -ArgumentList @("tunnel", "--url", $localOrigin, "--no-autoupdate") `
            -WorkingDirectory $repoRoot -RedirectStandardOutput $tunnelOutLog `
            -RedirectStandardError $tunnelErrLog -WindowStyle Hidden -PassThru
        Set-Content -LiteralPath (Join-Path $runtimeDir "tunnel.pid") -Value $tunnel.Id

        Push-Location $backendDir
        try { $publicBase = Wait-ForTunnelUrl -PythonExe $venvPython } finally { Pop-Location }
        if ($publicBase) {
            $entryUrl = "$publicBase/?access_token=$accessToken&phone_test=1"
            $phoneUrlFile = Join-Path $runtimeDir "phone_url.txt"
            Set-Content -LiteralPath $phoneUrlFile -Value $entryUrl
            $qrPath = Join-Path $runtimeDir "phone_qr.png"
            Push-Location $backendDir
            try { & $venvPython -m app.launcher_helpers qr $entryUrl $qrPath } finally { Pop-Location }
            if ($LASTEXITCODE -ne 0) { throw "Could not create the local QR code." }
            try { Set-Clipboard -Value $entryUrl } catch {}
            Write-Status "Temporary phone URL (copied to clipboard):" Green
            Write-Host $entryUrl -ForegroundColor White
            Write-Status "QR code: $qrPath" Green
            Write-Status "REAL PHONE: USER TEST REQUIRED - scan the QR and allow microphone access." Yellow
            if (-not $NoBrowser -and $env:DEMO_LAUNCHER_NO_BROWSER -ne "1") {
                Start-Process -FilePath $qrPath
            }
        } else {
            Write-Warning "Tunnel creation failed. The local demo remains available at $localUrl. See $tunnelErrLog"
            Add-Content -LiteralPath $launcherLog -Value "Tunnel URL was not obtained; local fallback remains available."
        }
    }

    if (-not $PhoneMode -and -not $NoBrowser -and $env:DEMO_LAUNCHER_NO_BROWSER -ne "1") {
        Start-Process $entryUrl
        Write-Status "Default browser open request sent." Green
    }

    Write-Host ""
    Write-Host "When finished, return to this window and press Enter." -ForegroundColor Cyan
    Write-Host "Closing this launcher will stop only this project's server/tunnel." -ForegroundColor DarkGray
    if (-not $NonInteractive -and $env:DEMO_LAUNCHER_NONINTERACTIVE -ne "1") {
        Read-Host | Out-Null
    }
}
catch {
    Write-Host "Launcher error: $($_.Exception.Message)" -ForegroundColor Red
    Add-Content -LiteralPath $launcherLog -Value "$(Get-Date -Format o) ERROR $($_.Exception.ToString())"
    exit 1
}
finally {
    & (Join-Path $PSScriptRoot "stop_demo.ps1") -Quiet
    Remove-Item Env:DEMO_ACCESS_TOKEN -ErrorAction SilentlyContinue
    Write-Host "Demo V0.2 stopped cleanly." -ForegroundColor Green
}
