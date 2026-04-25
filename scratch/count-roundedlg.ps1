$srcDir = "d:\aplikasi developer\developer-1\src"
$files = Get-ChildItem -Path $srcDir -Filter "*.tsx" -File -Recurse
$total = 0
foreach ($f in $files) {
    $t = Get-Content $f.FullName -Raw
    $c = ([regex]::Matches($t, 'rounded-lg')).Count
    if ($c -gt 0) {
        Write-Host "$($f.Name): $c"
        $total += $c
    }
}
Write-Host ""
Write-Host "Total rounded-lg remaining: $total"
