$srcDir = "d:\aplikasi developer\developer-1\src"

# Find ALL remaining slate/indigo patterns by scanning each file
$files = Get-ChildItem -Path $srcDir -Filter "*.tsx" -File -Recurse
$patternsFound = @{}

foreach ($file in $files) {
    $lines = Get-Content $file.FullName
    $lineNum = 0
    foreach ($line in $lines) {
        $lineNum++
        $matches = [regex]::Matches($line, '[\w:-]*(slate|indigo)-[\w/]+')
        foreach ($m in $matches) {
            $val = $m.Value
            if (-not $patternsFound.ContainsKey($val)) {
                $patternsFound[$val] = 0
            }
            $patternsFound[$val]++
        }
    }
}

Write-Host "REMAINING PATTERNS:"
$patternsFound.GetEnumerator() | Sort-Object -Property Value -Descending | ForEach-Object {
    Write-Host "  $($_.Key): $($_.Value) occurrences"
}
