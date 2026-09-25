param(
    [string]$Image = '',
    [string]$Name = 'Kestrel_Drive',
    [string]$Output = '',
    [string]$ToolRoot = '',
    [float]$Metres = 6,
    [int]$Seed = 726,
    [ValidateSet(8,9,10)][int]$Depth = 9
)
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
if (!$ToolRoot) { $ToolRoot = [System.IO.Path]::GetFullPath((Join-Path $projectRoot '../../work')) }
if (!$Image) { $Image = Join-Path $projectRoot 'ArtDirection/Modules/kestrel-drive-reference-v2.png' }
if (!$Output) { $Output = Join-Path $projectRoot 'ArtDirection/Generated/KestrelDrive' }
$python = Join-Path $ToolRoot 'tools/hy3d-env/Scripts/python.exe'
$source = Join-Path $ToolRoot 'tools/TripoSG-source'
$weights = Join-Path $ToolRoot 'models/TripoSG'
$blender = Join-Path $ToolRoot 'tools/blender-4.5.10-windows-x64/blender.exe'
foreach ($required in @($python,$source,$weights,$blender,$Image)) {
    if (!(Test-Path -LiteralPath $required)) { throw "Required local tool/input is missing: $required. See Tools/LocalMeshes/README.md." }
}
if (Test-Path -LiteralPath (Join-Path $Output 'raw.glb')) {
    throw 'Output already contains a generated mesh. Use a new -Output folder to preserve the reviewed version.'
}
$env:PYTHONUTF8 = '1'
& $python (Join-Path $PSScriptRoot 'prepare_triposg.py') $source
if ($LASTEXITCODE -ne 0) { throw 'Model source preparation failed.' }
& $python (Join-Path $PSScriptRoot 'generate_mesh.py') --source $source --weights $weights --image $Image --output (Join-Path $Output 'raw.glb') --seed $Seed --steps 50 --depth $Depth
if ($LASTEXITCODE -ne 0) { throw 'Local mesh generation failed; Blender was not started.' }
& $blender --background --python-exit-code 1 --python (Join-Path $PSScriptRoot 'clean_and_rig.py') -- --input (Join-Path $Output 'raw.glb') --output $Output --name $Name --metres $Metres
if ($LASTEXITCODE -ne 0) { throw 'Blender cleanup/export failed.' }
Write-Output "Generated review candidate: $Output. Inspect its views before importing into the fleet."
