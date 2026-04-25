$srcDir = "d:\aplikasi developer\developer-1\src\pages"

$totalChanges = 0

Get-ChildItem -Path $srcDir -Filter "*.tsx" -File -Recurse | ForEach-Object {
    $file = $_
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content

    # TR
    $content = [regex]::Replace($content, '<tr\b([^>]*)>', '<TR$1>')
    $content = [regex]::Replace($content, '</tr>', '</TR>')
    
    # TH
    $content = [regex]::Replace($content, '<th\b([^>]*)>', '<TH$1>')
    $content = [regex]::Replace($content, '</th>', '</TH>')
    
    # TD
    $content = [regex]::Replace($content, '<td\b([^>]*)>', '<TD$1>')
    $content = [regex]::Replace($content, '</td>', '</TD>')

    if ($content -cne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Updated rows/cells in $($file.Name)"
        $totalChanges++
    }
}

Write-Host "TOTAL files updated: $totalChanges"
