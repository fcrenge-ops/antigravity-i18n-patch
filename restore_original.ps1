<#
.SYNOPSIS
    Antigravity UI 官方英文版一键还原入口 (透传脚本)
#>
[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    $RemainingArgs
)

& "$PSScriptRoot\scripts\restore_original.ps1" @RemainingArgs
