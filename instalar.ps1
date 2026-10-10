# instalar.ps1 — instala el harness de Nacho en ESTA PC (una vez por PC; repetirlo no rompe nada).
# Lo más fácil: doble clic en INSTALAR.bat (al lado de este archivo).
#
# ¿Qué le digo a Claude en una PC nueva?
#   1) Instalá Claude (app de escritorio) y GitHub CLI (https://cli.github.com), y en una terminal:
#        gh auth login
#        gh repo clone Nachofranco5/claude-harness "$HOME\Documents\Trabajos\claude-harness"
#   2) Doble clic en Documents\Trabajos\claude-harness\INSTALAR.bat
#      (o decile a Claude: "Corré instalar.ps1 de Documents\Trabajos\claude-harness y decime qué salió").
#   3) Cerrá Claude del todo y abrilo de nuevo. En cualquier proyecto, la primera respuesta ya trae el tablero.
#
# Qué hace: agrega el marketplace privado Nachofranco5/claude-harness, instala harness-nacho + uso-widget +
# semaforo (alcance usuario), prende la auto-actualización y crea el CLAUDE.md global mínimo (sin pisar
# uno que ya exista). Repetirlo también ACTUALIZA los plugins (si la auto-actualización no los bajó).
# Respeta CLAUDE_CONFIG_DIR (sirve para probarlo en una carpeta vacía).

$ErrorActionPreference = 'Stop'
$Repo = 'Nachofranco5/claude-harness'
$Market = 'claude-harness'
$Plugins = @('harness-nacho', 'uso-widget', 'semaforo')

function Paso($t) { Write-Host "`n== $t" -ForegroundColor Cyan }
function Ok($t) { Write-Host "   OK: $t" -ForegroundColor Green }
function Falla($t) { Write-Host "`nERROR: $t" -ForegroundColor Red; exit 1 }

# --- 1. Claude Code (CLI en el PATH o el que trae la app de escritorio) ---
Paso 'Buscando Claude Code'
$Claude = $null
$cmd = Get-Command claude -ErrorAction SilentlyContinue
if ($cmd) { $Claude = $cmd.Source }
if (-not $Claude) {
    $base = Join-Path $env:APPDATA 'Claude\claude-code'
    if (Test-Path $base) {
        $Claude = Get-ChildItem $base -Recurse -Filter claude.exe -ErrorAction SilentlyContinue |
            Sort-Object { try { [version]$_.Directory.Parent.Name } catch { [version]'0.0' } } -Descending |
            Select-Object -First 1 -ExpandProperty FullName
    }
}
if (-not $Claude) { Falla 'No encontré Claude Code. Instalá la app de escritorio de Claude, abrila una vez y volvé a correr esto.' }
Ok $Claude

$ConfigDir = if ($env:CLAUDE_CONFIG_DIR) { $env:CLAUDE_CONFIG_DIR } else { Join-Path $env:USERPROFILE '.claude' }
New-Item -ItemType Directory -Force $ConfigDir | Out-Null

# --- 2. Acceso a GitHub (el repo es privado) ---
Paso 'Revisando acceso a GitHub'
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Falla 'Falta Git. Instalalo (https://git-scm.com) y volvé a correr esto.' }
$env:GIT_TERMINAL_PROMPT = '0'
function PuedeLeerRepo { & git ls-remote "https://github.com/$Repo.git" HEAD *> $null; return ($LASTEXITCODE -eq 0) }
if (-not (PuedeLeerRepo)) {
    $gh = Get-Command gh -ErrorAction SilentlyContinue
    if (-not $gh) { $gh = Get-Item 'C:\Program Files\GitHub CLI\gh.exe' -ErrorAction SilentlyContinue }
    if (-not $gh) { Falla 'No puedo leer el repo privado y falta GitHub CLI. Instalalo (https://cli.github.com), corré "gh auth login" y volvé a correr esto.' }
    $ghExe = if ($gh.Source) { $gh.Source } else { $gh.FullName }
    & $ghExe auth status *> $null
    if ($LASTEXITCODE -ne 0) { Falla 'GitHub CLI no tiene sesión. Corré "gh auth login" (con la cuenta Nachofranco5) y volvé a correr esto.' }
    & $ghExe auth setup-git
    if (-not (PuedeLeerRepo)) { Falla "Sigo sin poder leer github.com/$Repo. ¿La cuenta de gh tiene acceso a ese repo?" }
}
Ok "puedo leer github.com/$Repo"

# --- 3. Marketplace (agregar o actualizar) ---
Paso "Marketplace $Market"
$lista = (& $Claude plugin marketplace list) -join "`n"
if ($lista -match "(?m)^\s*>?\s*$Market\s*$") {
    & $Claude plugin marketplace update $Market
} else {
    & $Claude plugin marketplace add $Repo --scope user
}
if ($LASTEXITCODE -ne 0) { Falla "No pude agregar/actualizar el marketplace $Market (mensaje arriba)." }
Ok 'marketplace listo'

# --- 4. Plugins ---
Paso 'Plugins'
foreach ($p in $Plugins) {
    & $Claude plugin install "$p@$Market" --scope user
    if ($LASTEXITCODE -ne 0) { Falla "No pude instalar $p (mensaje arriba)." }
    # Si ya estaba instalado, "install" no lo actualiza: así repetir este script = actualizar a mano.
    & $Claude plugin update "$p@$Market" --scope user
    if ($LASTEXITCODE -ne 0) { Falla "No pude actualizar $p (mensaje arriba)." }
}
Ok ($Plugins -join ', ')

# --- 5. Auto-actualización (no hay opción de línea de comandos: se escribe en settings.json) ---
Paso 'Auto-actualización'
$settingsPath = Join-Path $ConfigDir 'settings.json'
$s = if (Test-Path $settingsPath) { Get-Content $settingsPath -Raw -Encoding UTF8 | ConvertFrom-Json } else { $null }
if (-not $s) { $s = New-Object PSObject }
if (-not $s.extraKnownMarketplaces) { $s | Add-Member -NotePropertyName extraKnownMarketplaces -NotePropertyValue (New-Object PSObject) }
$m = $s.extraKnownMarketplaces.$Market
if (-not $m) {
    $m = [pscustomobject]@{ source = [pscustomobject]@{ source = 'github'; repo = $Repo } }
    $s.extraKnownMarketplaces | Add-Member -NotePropertyName $Market -NotePropertyValue $m
}
if ($m.autoUpdate -ne $true) {
    if (Test-Path $settingsPath) { Copy-Item $settingsPath "$settingsPath.antes-del-harness" -Force }
    $m | Add-Member -NotePropertyName autoUpdate -NotePropertyValue $true -Force
    # UTF-8 SIN BOM (con BOM Claude Code no lee el archivo)
    [IO.File]::WriteAllText($settingsPath, ($s | ConvertTo-Json -Depth 50), (New-Object Text.UTF8Encoding $false))
    Ok 'prendida (copia del anterior: settings.json.antes-del-harness)'
} else { Ok 'ya estaba prendida' }

# --- 6. CLAUDE.md global mínimo (el plugin se engancha a ese bloque de instrucciones) ---
Paso 'CLAUDE.md global'
$global = Join-Path $ConfigDir 'CLAUDE.md'
$bloque = @'
# Global de Nacho
Las reglas de trabajo las carga el plugin `harness-nacho` (repo privado `Nachofranco5/claude-harness`,
local en `Documents\Trabajos\claude-harness`). No borrar este archivo: el plugin se engancha acá.
Si en tu contexto NO aparecen "Reglas de Nacho", el plugin no está instalado en esta PC: avisale a Nacho
y ofrecé correr `Documents\Trabajos\claude-harness\instalar.ps1` (o `INSTALAR.bat`).
'@
$utf8 = New-Object Text.UTF8Encoding $false
if (-not (Test-Path $global)) {
    [IO.File]::WriteAllText($global, $bloque + "`r`n", $utf8)
    Ok 'creado'
} elseif ((Get-Content $global -Raw -Encoding UTF8) -notmatch 'harness-nacho') {
    [IO.File]::AppendAllText($global, "`r`n" + $bloque + "`r`n", $utf8)
    Ok 'ya existía: le agregué el bloque del harness al final'
} else { Ok 'ya estaba' }

# --- 7. Verificar ---
Paso 'Verificando'
$inst = (& $Claude plugin list) -join "`n"
$faltan = @($Plugins | Where-Object { $inst -notmatch [regex]::Escape("$_@$Market") })
if ($faltan.Count) { Falla ("No aparecen instalados: " + ($faltan -join ', ')) }
Ok 'los 3 plugins aparecen instalados'
Write-Host "`nLISTO. Cerrá Claude del todo y abrilo de nuevo: en cualquier proyecto la primera respuesta trae el tablero." -ForegroundColor Green
exit 0
