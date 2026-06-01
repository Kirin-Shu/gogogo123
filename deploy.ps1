# GitHub Pages 一键部署（需 Personal Access Token，不能用登录密码）
# 用法：在 PowerShell 中运行
#   $env:GH_TOKEN = "ghp_你的Token"
#   .\deploy.ps1

$ErrorActionPreference = "Stop"
$git = "C:\Program Files\Git\cmd\git.exe"
$repoRoot = $PSScriptRoot
$repoName = "gogogo123"
$githubUser = "shuxianglin1126"

if (-not (Test-Path $git)) {
    Write-Host "未找到 Git，请先安装 Git for Windows。" -ForegroundColor Red
    exit 1
}

if (-not $env:GH_TOKEN) {
    Write-Host "请先设置 Token：" -ForegroundColor Yellow
    Write-Host '  $env:GH_TOKEN = "ghp_xxxxxxxx"' -ForegroundColor Cyan
    Write-Host "Token 获取：GitHub → Settings → Developer settings → Personal access tokens → Fine-grained 或 Classic（勾选 repo）"
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

$remoteUrl = "https://$githubUser`:$($env:GH_TOKEN)@github.com/$githubUser/$repoName.git"

# 创建远程仓库（已存在则忽略）
try {
    $headers = @{
        Authorization = "Bearer $($env:GH_TOKEN)"
        Accept        = "application/vnd.github+json"
        "X-GitHub-Api-Version" = "2022-11-28"
    }
    $body = @{ name = $repoName; private = $false; auto_init = $false } | ConvertTo-Json
    Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method Post -Headers $headers -Body $body -ContentType "application/json" | Out-Null
    Write-Host "已创建仓库 $repoName" -ForegroundColor Green
} catch {
    if ($_.Exception.Message -notmatch "422|already exists|name already") {
        Write-Host "创建仓库提示：$($_.Exception.Message)" -ForegroundColor Yellow
    }
}

$remotes = & $git remote 2>$null
if ($remotes -notcontains "origin") {
    & $git remote add origin $remoteUrl
} else {
    & $git remote set-url origin $remoteUrl
}

& $git push -u origin main --force

Write-Host ""
Write-Host "部署完成！约 1～2 分钟后访问：" -ForegroundColor Green
Write-Host "  https://$githubUser.github.io/$repoName/" -ForegroundColor Cyan
Write-Host "  https://$githubUser.github.io/$repoName/aespa/" -ForegroundColor Cyan
Write-Host ""
Write-Host "若 Pages 未开启：GitHub 仓库 → Settings → Pages → Branch 选 main / (root)" -ForegroundColor Yellow
