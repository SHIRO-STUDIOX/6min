#requires -Version 5.1
[CmdletBinding()]
param(
    [ValidateRange(1024, 65535)]
    [int]$Port = 3000,
    [switch]$SetupOnly,
    [switch]$RefreshDependencies
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ExitStatus = 0
$AppProcess = $null
Push-Location $PSScriptRoot
try {
    Write-Host '[1/5] Checking Node.js and local environment...'
    $Node = (Get-Command node -ErrorAction Stop).Source
    $NodeVersion = & $Node -p 'process.versions.node'
    if ($LASTEXITCODE -ne 0 -or ([version]$NodeVersion).Major -lt 24) {
        throw 'Install Node.js 24 or newer, reopen PowerShell and run start.ps1 again.'
    }
    & $Node 'scripts/local-sqlite-setup.mjs' '--check'
    if ($LASTEXITCODE -ne 0) { throw 'Local environment preflight failed; see the message above.' }

    if (!$SetupOnly) {
        $Listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
        try { $Listener.Start() } catch { throw "Port $Port is already in use. Stop your previous dev server or use .\start.ps1 -Port 3001" } finally { $Listener.Stop() }
    }

    Write-Host '[2/5] Checking installed dependencies...'
    $LockHash = (Get-FileHash 'package-lock.json' -Algorithm SHA256).Hash
    $Marker = Join-Path $PSScriptRoot '.local-data/start-lock.sha256'
    $NeedsInstall = $RefreshDependencies -or !(Test-Path 'node_modules/next/dist/bin/next') -or !(Test-Path $Marker)
    if (!$NeedsInstall) { $NeedsInstall = ((Get-Content $Marker -Raw).Trim() -ne $LockHash) }
    if ($NeedsInstall) {
        $NpmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
        if (!$NpmCommand) { $NpmCommand = Get-Command npm -ErrorAction Stop }
        & $NpmCommand.Source ci
        if ($LASTEXITCODE -ne 0) { throw 'npm ci failed; fix the installation error and retry. No database was reset.' }
        New-Item -ItemType Directory -Force '.local-data' | Out-Null
        [System.IO.File]::WriteAllText($Marker, $LockHash)
    }

    Write-Host '[3/5] Initializing the local SQLite database...'
    & $Node 'scripts/local-sqlite-setup.mjs'
    if ($LASTEXITCODE -ne 0) { throw 'SQLite setup failed; see the message above. Existing data was retained.' }

    Write-Host '[4/5] Migrations and sample lessons are ready.'
    if ($SetupOnly) {
        Write-Host 'Setup complete. Run .\start.ps1 to start the application.'
    } else {
        Write-Host "[5/5] Starting SHISH at http://localhost:$Port (Ctrl+C to stop)..."
        $AppProcess = Start-Process -FilePath $Node -ArgumentList @('scripts/run-local-next.mjs', [string]$Port) -WorkingDirectory $PSScriptRoot -NoNewWindow -PassThru
        while (!$AppProcess.HasExited) { Start-Sleep -Milliseconds 200; $AppProcess.Refresh() }
        $AppProcess.WaitForExit()
        $ExitStatus = $AppProcess.ExitCode
    }
} catch {
    Write-Host ("Startup failed: " + $_.Exception.Message) -ForegroundColor Red
    $ExitStatus = 1
} finally {
    if ($AppProcess -and !$AppProcess.HasExited) {
        # Stop only the app process tree created by this invocation.
        if ([Environment]::OSVersion.Platform -eq [PlatformID]::Win32NT) {
            & taskkill.exe /PID $AppProcess.Id /T /F 2>$null | Out-Null
        } else {
            & /bin/kill -TERM $AppProcess.Id 2>$null
            if (!$AppProcess.WaitForExit(10000)) { $AppProcess.Kill() }
        }
    }
    Pop-Location
}
exit $ExitStatus
