#!/usr/bin/env pwsh
[CmdletBinding()]
param(
    [switch]$SkipBuild,
    [switch]$DebugBuild,
    [switch]$CI,
    [switch]$Help,
    [string]$Target,
    [string]$LogPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$requiredNodeMajor = 18
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

function Write-Section {
    param([string]$Message)
    Write-Host "`n▶ $Message" -ForegroundColor Cyan
}

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Gray
}

function Write-Warn {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$Message)
    Write-Host "✔ $Message" -ForegroundColor Green
}

function Write-Failure {
    param([string]$Message)
    Write-Host "✖ $Message" -ForegroundColor Red
}

function Show-Usage {
    Write-Host @'
ZickZackClient - Windows install helper

Usage: pwsh ./scripts/install-windows.ps1 [-SkipBuild] [-DebugBuild] [-CI] [-Target <triple>] [-LogPath <file>]

Switches:
  -SkipBuild     Install dependencies only; skip the Tauri build step.
  -DebugBuild    Produce a debuggable build instead of an optimised release build.
  -CI            Non-interactive output (minimal colours, suppresses transcripts when not requested).
  -Target        Rust target triple to build for (defaults to host toolchain).
  -LogPath       Mirror console output to a log file using Start-Transcript.
  -Help          Display this help text.
'@
}

if ($Help) {
    Show-Usage
    return
}

$transcript = $null
try {
    if ($LogPath) {
        Write-Info "Mirroring output to $LogPath"
        try {
            $transcript = Start-Transcript -Path $LogPath -Append -ErrorAction Stop
        } catch {
            Write-Warn "Failed to start transcript: $_"
        }
    }

    if ($CI) {
        $Host.PrivateData.ErrorForegroundColor = 'White'
        $Host.PrivateData.WarningForegroundColor = 'White'
        $Host.PrivateData.ErrorBackgroundColor = 'Black'
        $Host.PrivateData.WarningBackgroundColor = 'Black'
    }

    function Test-CommandExists {
        param([string]$Command)
        return [bool](Get-Command $Command -ErrorAction SilentlyContinue)
    }

    $missing = [System.Collections.Generic.List[string]]::new()

    function Require-Command {
        param([string]$Command, [string]$FriendlyName)
        if (-not (Test-CommandExists -Command $Command)) {
            $missing.Add($FriendlyName) | Out-Null
        }
    }

    Write-Section "Preparing environment"
    Write-Info "Project directory: $projectRoot"

    Require-Command -Command 'node' -FriendlyName "Node.js >= $requiredNodeMajor.x"
    Require-Command -Command 'yarn' -FriendlyName 'Yarn package manager'
    Require-Command -Command 'cargo' -FriendlyName 'Rust toolchain (cargo)'
    Require-Command -Command 'rustup' -FriendlyName 'Rust toolchain manager (rustup)'
    Require-Command -Command 'rustc' -FriendlyName 'Rust compiler (rustc)'
    if (-not (Test-CommandExists -Command 'python') -and -not (Test-CommandExists -Command 'python3')) {
        $missing.Add('Python 3 (required for native Node modules)') | Out-Null
    }

    if ($missing.Count -gt 0) {
        Write-Warn 'Some required tools are missing:'
        $missing | ForEach-Object { Write-Warn "  - $_" }
        if (Test-CommandExists -Command 'winget') {
            Write-Info 'Hint: winget install --id OpenJS.NodeJS.LTS; winget install --id Yarn.Yarn; winget install --id Rustlang.Rustup; winget install --id Python.Python.3'
        } elseif (Test-CommandExists -Command 'choco') {
            Write-Info 'Hint: choco install nodejs-lts yarn rustup.install python'
        }
        throw 'Install the missing dependencies and re-run the installer.'
    }

    $nodeVersionRaw = (node -v).TrimStart('v')
    $nodeMajor = [int]($nodeVersionRaw.Split('.')[0])
    if ($nodeMajor -lt $requiredNodeMajor) {
        throw "Node.js $nodeVersionRaw detected, but version $requiredNodeMajor or newer is required."
    }

    if (Test-Path (Join-Path $projectRoot '.nvmrc')) {
        $requested = Get-Content (Join-Path $projectRoot '.nvmrc') -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($requested) {
            Write-Info "Found .nvmrc requesting Node.js $requested"
            if ($requested -ne $nodeVersionRaw) {
                Write-Warn "Active Node.js version ($nodeVersionRaw) differs from .nvmrc ($requested)."
            }
        }
    }

    Write-Section 'Ensuring Yarn via Corepack'
    if (Test-CommandExists -Command 'corepack') {
        try {
            corepack enable | Out-Null
        } catch {
            Write-Warn "Unable to enable Corepack automatically: $_"
        }
        $yarnConfig = Join-Path $projectRoot '.yarnrc.yml'
        if (Test-Path $yarnConfig) {
            $yarnPathLine = Select-String -Path $yarnConfig -Pattern '^yarnPath:' -ErrorAction SilentlyContinue
            if ($yarnPathLine) {
                Write-Info "Project pins Yarn binary at $($yarnPathLine.Line.Split(':')[1].Trim())"
            }
        }
    } else {
        Write-Warn "Corepack not found; falling back to system Yarn $(yarn --version)"
    }

    $yarnVersion = yarn --version
    Write-Success "Yarn $yarnVersion ready"

    Write-Section 'Syncing project dependencies'
    Set-Location $projectRoot
    try {
        yarn install --immutable | Out-Null
    } catch {
        Write-Warn 'Immutable install failed, retrying with frozen lockfile'
        yarn install --frozen-lockfile | Out-Null
    }
    Write-Success 'JavaScript dependencies installed'

    Write-Section 'Verifying Rust targets'
    $hostTriple = (rustc -vV | Select-String '^host:').Line.Split()[1]
    if (-not $Target) {
        $Target = $hostTriple
    }
    $activeToolchain = (rustup show active-toolchain 2>$null | Select-Object -First 1)
    if ($activeToolchain) { Write-Info "Active Rust toolchain: $activeToolchain" }

    $installedTargets = rustup target list --installed
    if ($installedTargets -notcontains $Target) {
        Write-Info "Installing Rust target $Target"
        rustup target add $Target | Out-Null
    } else {
        Write-Success "Rust target $Target already installed"
    }

    if ($SkipBuild) {
        Write-Warn 'Skipping Tauri build step as requested'
        Write-Success 'Environment ready for development'
        return
    }

    Write-Section 'Building Tauri bundle'
    $tauriArgs = @('build')
    if ($DebugBuild) { $tauriArgs += '--debug' }
    if ($Target) { $tauriArgs += @('--target', $Target) }
    Write-Info "Running: yarn tauri $($tauriArgs -join ' ')"
    yarn tauri $tauriArgs

    $profileName = if ($DebugBuild) { 'debug' } else { 'release' }
    Write-Success "Build complete! Artifacts are available under src-tauri/target/$Target/$profileName."
    Write-Info ("Completed in {0:n1} seconds" -f $stopwatch.Elapsed.TotalSeconds)
    Write-Info 'Happy hacking with ZickZackClient!'
}
catch {
    Write-Failure $_
    throw
}
finally {
    if ($transcript) {
        Stop-Transcript | Out-Null
    }
}
