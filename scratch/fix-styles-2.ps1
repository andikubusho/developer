$srcDir = "d:\aplikasi developer\developer-1\src"

$replacements = @(
    ,@('border-slate-800', 'border-white/30')
    ,@('border-slate-700', 'border-white/40')
    ,@('border-slate-400', 'border-white/50')
    ,@('border-slate-50', 'border-white/20')
    ,@('bg-slate-800', 'bg-accent-dark/80')
    ,@('bg-slate-700', 'bg-accent-dark/60')
    ,@('bg-slate-900', 'bg-accent-dark')
    ,@('bg-slate-300', 'bg-white/60')
    ,@('bg-slate-400', 'bg-white/50')
    ,@('bg-slate-500', 'bg-white/40')
    ,@('bg-slate-600', 'bg-accent-dark/50')
    ,@('text-slate-100', 'text-white')
    ,@('text-slate-200', 'text-white')
    ,@('text-indigo-400', 'text-accent-lavender')
    ,@('text-indigo-300', 'text-accent-lavender')
    ,@('hover:bg-indigo-700', 'hover:bg-accent-dark/80')
    ,@('hover:bg-indigo-600', 'hover:bg-accent-dark/70')
    ,@('ring-slate-', 'ring-white/')
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
Write-Host "TOTAL: $totalChanges additional replacements"
