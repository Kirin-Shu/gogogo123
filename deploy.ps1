# GitHub Pages deploy script (requires GH_TOKEN, not login password)
# Usage:
#   $env:GH_TOKEN = "ghp_your_token_here"
#   .\deploy.ps1

$ErrorActionPreference = "Stop"
$git = "C:\Program Files\Git\cmd\git.exe"
$repoRoot = $PSScriptRoot
$repoName = "gogogo123"
$githubUser = if ($env:GITHUB_USER) { $env:GITHUB_USER } else { "Kirin-Shu" }

if (-not (Test-Path $git)) {
    Write-Host "[ERROR] Git not found. Install Git for Windows first." -ForegroundColor Red
    exit 1
}

if (-not $env:GH_TOKEN) {
    Write-Host "[ERROR] GH_TOKEN is not set." -ForegroundColor Yellow
    Write-Host 'Run:  $env:GH_TOKEN = "ghp_xxxxxxxx"' -ForegroundColor Cyan
    exit 1
}

Set-Location $repoRoot

if (-not (Test-Path ".git")) {
    & $git init -b main
}

& $git add -A
$status = & $git status --porcelain
if ($status) {
    & $git -c user.name="$githubUser" -c user.email="shuxianglin1126@gmail.com" commit -m "Deploy static sites to GitHub Pages"
}

$remoteUrl = "https://${githubUser}:$($env:GH_TOKEN)@github.com/${githubUser}/${repoName}.git"

try {
    $headers = @{
        Authorization          = "Bearer $($env:GH_TOKEN)"
        Accept                 = "application/vnd.github+json"
        "X-GitHub-Api-Version" = "2022-11-28"
    }
    $body = @{ name = $repoName; private = $false; auto_init = $false } | ConvertTo-Json
    Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method Post -Headers $headers -Body $body -ContentType "application/json" | Out-Null
    Write-Host "[OK] Repository created: $repoName" -ForegroundColor Green
} catch {
    if ($_.Exception.Message -notmatch "422|already exists|name already") {
        Write-Host "[WARN] Create repo: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

$remotes = & $git remote 2>$null
if ($remotes -notcontains "origin") {
    & $git remote add origin $remoteUrl
} else {
    & $git remote set-url origin $remoteUrl
}

& $git push -u origin main --force

try {
    $headers = @{
        Authorization          = "Bearer $($env:GH_TOKEN)"
        Accept                 = "application/vnd.github+json"
        "X-GitHub-Api-Version" = "2022-11-28"
    }
    $pagesBody = @{
        source = @{
            branch = "main"
            path   = "/"
        }
    } | ConvertTo-Json -Depth 3
    Invoke-RestMethod -Uri "https://api.github.com/repos/$githubUser/$repoName/pages" -Method Post -Headers $headers -Body $pagesBody -ContentType "application/json" | Out-Null
    Write-Host "[OK] GitHub Pages enabled" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Enable Pages manually: repo Settings -> Pages -> branch main, folder root" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Done! Wait 1-2 minutes, then open:" -ForegroundColor Green
Write-Host "  https://$githubUser.github.io/$repoName/" -ForegroundColor Cyan
Write-Host "  https://$githubUser.github.io/$repoName/aespa/" -ForegroundColor Cyan
Write-Host ""
