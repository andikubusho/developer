$srcDir = "d:\aplikasi developer\developer-1\src"

$replacements = @(
    ,@('border-indigo-100', 'border-accent-lavender/30')
    ,@('border-indigo-200', 'border-accent-lavender/40')
    ,@('border-indigo-600', 'border-accent-dark')
    ,@('text-indigo-100', 'text-white')
    ,@('text-indigo-900', 'text-accent-dark')
    ,@('shadow-indigo-600/20', 'shadow-glass')
    ,@('shadow-slate-200', 'shadow-glass')
    ,@('shadow-slate-900/20', 'shadow-glass')
    ,@('from-indigo-500', 'from-accent-lavender')
    ,@('from-indigo-600', 'from-accent-dark')
    ,@('to-indigo-600', 'to-accent-dark')
    ,@('to-indigo-700', 'to-accent-dark/80')
    ,@('placeholder-slate-300', 'placeholder-text-muted')
    ,@('placeholder-slate-400', 'placeholder-text-muted')
    ,@('bg-slate-50', 'bg-white/30')
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
Write-Host "TOTAL: $totalChanges final replacements"
