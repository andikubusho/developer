$srcDir = "d:\aplikasi developer\developer-1\src"
$files = Get-ChildItem -Path $srcDir -Filter "*.tsx" -File -Recurse
$found = $false

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $slateCount = ([regex]::Matches($content, 'slate-')).Count
    $indigoCount = ([regex]::Matches($content, 'indigo-')).Count
    $total = $slateCount + $indigoCount
    if ($total -gt 0) {
        Write-Host "$($file.Name): slate=$slateCount indigo=$indigoCount"
        $found = $true
    }
}

if (-not $found) {
    Write-Host "ALL CLEAN! No slate- or indigo- classes found."
}
