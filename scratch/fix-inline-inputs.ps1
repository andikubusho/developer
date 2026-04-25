$srcDir = "d:\aplikasi developer\developer-1\src"

$replacements = @(
    # Replace inline input/select/textarea styling patterns with glass-input
    ,@('border border-white/60 bg-white', 'glass-input')
    ,@('border border-white/50 bg-white', 'glass-input')
    ,@('bg-white border border-white/50', 'glass-input')
    ,@('bg-white/30 border-none', 'glass-input border-none')
    # Replace focus ring patterns on inline elements
    ,@('focus:outline-none focus:ring-2 focus:ring-accent-lavender/50', 'focus:outline-none')
    ,@('focus:outline-none focus:ring-2 focus:ring-primary', 'focus:outline-none')
    ,@('focus:ring-2 focus:ring-primary/20 outline-none', 'glass-input focus:outline-none')
    ,@('focus:ring-2 focus:ring-accent-lavender/50/20', 'focus:outline-none')
)

$totalChanges = 0

Get-ChildItem -Path $srcDir -Filter "*.tsx" -File -Recurse | ForEach-Object {
    $file = $_
    $content = Get-Content $file.FullName -Raw
    $fileChanges = 0

    foreach ($pair in $replacements) {
        $old = $pair[0]
        $new = $pair[1]
        $count = ([regex]::Matches($content, [regex]::Escape($old))).Count
        if ($count -gt 0) {
            $content = $content -replace [regex]::Escape($old), $new
            $fileChanges += $count
        }
    }

    if ($fileChanges -gt 0) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "$($file.Name): $fileChanges replacements"
        $totalChanges += $fileChanges
    }
}

Write-Host ""
Write-Host "TOTAL: $totalChanges inline glass-input replacements"
