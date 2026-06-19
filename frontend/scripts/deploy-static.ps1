$ErrorActionPreference = "Stop"

$frontendRoot = Split-Path -Parent $PSScriptRoot
$projectRoot = Split-Path -Parent $frontendRoot
$source = [System.IO.Path]::GetFullPath((Join-Path $frontendRoot "out"))
$target = [System.IO.Path]::GetFullPath((Join-Path $projectRoot "app\static"))
$expectedTarget = [System.IO.Path]::GetFullPath("E:\acode\learnlang\app\static")

if ($target -ne $expectedTarget) {
    throw "Refusing to deploy: unexpected target path '$target'."
}

$indexPath = Join-Path $source "index.html"
if (-not (Test-Path -LiteralPath $indexPath -PathType Leaf)) {
    throw "Static export is missing: '$indexPath'. Run npm.cmd run build first."
}

if (-not (Test-Path -LiteralPath $target -PathType Container)) {
    New-Item -ItemType Directory -Path $target | Out-Null
}

$resolvedTarget = (Resolve-Path -LiteralPath $target).Path
if ($resolvedTarget -ne $expectedTarget) {
    throw "Refusing to clean unresolved target '$resolvedTarget'."
}

Get-ChildItem -LiteralPath $resolvedTarget -Force | Remove-Item -Recurse -Force
Get-ChildItem -LiteralPath $source -Force | Copy-Item -Destination $resolvedTarget -Recurse -Force

$copiedFiles = (Get-ChildItem -LiteralPath $resolvedTarget -Recurse -File).Count
Write-Output "Deployed $copiedFiles files to $resolvedTarget"
