param(
    [string]$BuildId = '',
    [string]$ToolRoot = '',
    [switch]$SkipRender
)
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
if (!$ToolRoot) { $ToolRoot = [System.IO.Path]::GetFullPath((Join-Path $projectRoot '../../work')) }
$python = Join-Path $ToolRoot 'tools/hy3d-env/Scripts/python.exe'
if (!(Test-Path -LiteralPath $python)) { throw "Local mesh Python was not found at $python." }
$arguments = @((Join-Path $PSScriptRoot 'compare_ship.py'), '--tool-root', $ToolRoot)
if ($BuildId) { $arguments += @('--build-id', $BuildId) }
if ($SkipRender) { $arguments += '--skip-render' }
$env:PYTHONUTF8 = '1'
& $python @arguments
if ($LASTEXITCODE -ne 0) { throw 'Kestrel comparison pass failed.' }
