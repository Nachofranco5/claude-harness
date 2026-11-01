# claude-buscar.ps1 — imprime la ruta del Claude Code más nuevo de esta PC (o nada si no hay).
# La app de escritorio NO pone `claude` en el PATH y su carpeta cambia con cada versión. Lo usan instalar.ps1 y
# claude.cmd (el acceso que instalar.ps1 deja en ~\.local\bin para plugins como TokenEconomizer y para `claude -p`).
# Dónde puede estar: app instalada de la tienda (MSIX) = %LOCALAPPDATA%\Claude-Data\<id>\claude-code\<ver>\<hash>\;
# instalador clásico = %APPDATA%\Claude\claude-code\<ver>\; CLI nativo = ~\.local\bin\claude.exe.
$ErrorActionPreference = 'SilentlyContinue'
if ($env:CLAUDE_CODE_EXECPATH -and (Test-Path $env:CLAUDE_CODE_EXECPATH)) { $env:CLAUDE_CODE_EXECPATH; exit 0 }
$nativo = Join-Path $env:USERPROFILE '.local\bin\claude.exe'
if (Test-Path $nativo) { $nativo; exit 0 }
$bases = @((Join-Path $env:LOCALAPPDATA 'Claude-Data'), (Join-Path $env:APPDATA 'Claude')) | Where-Object { Test-Path $_ }
$exe = Get-ChildItem $bases -Recurse -Depth 5 -Filter claude.exe |
    Where-Object { $_.FullName -match '\\claude-code\\(\d+\.\d+\.\d+)\\' } |
    Sort-Object { [version]([regex]::Match($_.FullName, '\\claude-code\\(\d+\.\d+\.\d+)\\').Groups[1].Value) }, LastWriteTime -Descending |
    Select-Object -First 1 -ExpandProperty FullName
if ($exe) { $exe }
