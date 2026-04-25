$srcDir = "d:\aplikasi developer\developer-1\src"
$totalChanges = 0

Get-ChildItem -Path $srcDir -Filter "*.tsx" -File -Recurse | ForEach-Object {
    $file = $_
    $content = Get-Content $file.FullName -Raw
    $count = ([regex]::Matches($content, 'rounded-lg')).Count
    if ($count -gt 0) {
        $content = $content -replace 'rounded-lg', 'rounded-xl'
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "$($file.Name): $count rounded-lg -> rounded-xl"
        $totalChanges += $count
    }
}

Write-Host ""
Write-Host "TOTAL: $totalChanges rounded-lg replacements"
