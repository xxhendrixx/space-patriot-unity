param(
    [string]$BuildId = ('build-' + (Get-Date -Format 'yyyyMMdd-HHmmss')),
    [string]$ToolRoot = '',
    [ValidateSet(8,9,10)][int]$Depth = 9,
    [int]$Steps = 50,
    [switch]$Resume
)
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
if (!$ToolRoot) { $ToolRoot = [System.IO.Path]::GetFullPath((Join-Path $projectRoot '../../work')) }
$python = Join-Path $ToolRoot 'tools/hy3d-env/Scripts/python.exe'
if (!(Test-Path -LiteralPath $python)) { throw "Local TripoSG Python was not found at $python." }
$arguments = @((Join-Path $PSScriptRoot 'build_ship.py'), '--build-id', $BuildId, '--tool-root', $ToolRoot, '--steps', "$Steps", '--depth', "$Depth")
if ($Resume) { $arguments += '--resume' }
$env:PYTHONUTF8 = '1'
& $python @arguments
if ($LASTEXITCODE -ne 0) { throw 'Kestrel build stopped. Resume it with the same -BuildId -Resume after resolving the reported issue.' }
