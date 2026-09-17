<#
.SYNOPSIS
    Antigravity UI 简体中文汉化补丁安装入口 (透传脚本)
#>
[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    $RemainingArgs
)

& "$PSScriptRoot\scripts\install_patch.ps1" @RemainingArgs
