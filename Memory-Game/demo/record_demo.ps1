# PowerShell helper to start static server, run autoplay, and record screen with ffmpeg
# Usage: run from the repo root
# Ensure python and ffmpeg are in PATH

$projectDir = Join-Path $PSScriptRoot '..\Memory-Game' -Resolve
$serveDir = Join-Path $projectDir 'Memory-Game' -Resolve
$port = 8081

Write-Host "Serving from: $serveDir on port $port"
$python = Get-Command python -ErrorAction SilentlyContinue
if(-not $python){ Write-Error 'python not found in PATH'; exit 1 }

# start python server in background
$ps = Start-Process -FilePath python -ArgumentList "-m","http.server",$port -WorkingDirectory $serveDir -WindowStyle Hidden -PassThru
Start-Sleep -Milliseconds 800

# start puppeteer autoplay (runs visible browser and interacts)
Write-Host 'Launching auto-play script (Puppeteer)'
Start-Process -FilePath node -ArgumentList (Join-Path $PSScriptRoot 'auto_play.js') -WorkingDirectory $PSScriptRoot
Start-Sleep -Milliseconds 1000

# record desktop with ffmpeg for 18 seconds
$out = Join-Path $PSScriptRoot 'video.mp4'
$ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
if(-not $ffmpeg){ Write-Error 'ffmpeg not found in PATH'; exit 1 }
Write-Host "Recording desktop to: $out"
# gdigrab captures the desktop on Windows
& ffmpeg -y -f gdigrab -framerate 25 -t 18 -i desktop -pix_fmt yuv420p $out

Write-Host 'Stopping python server'
Stop-Process -Id $ps.Id -Force
Write-Host 'Done. Video saved to:' $out
