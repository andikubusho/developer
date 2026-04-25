$pagesDir = "d:\aplikasi developer\developer-1\src\pages"

# Define replacement mappings (order matters - more specific first)
$replacements = @(
    # Text colors
    ,@('text-slate-900', 'text-text-primary')
    ,@('text-slate-800', 'text-text-primary')
    ,@('text-slate-700', 'text-text-primary')
    ,@('text-slate-600', 'text-text-secondary')
    ,@('text-slate-500', 'text-text-secondary')
    ,@('text-slate-400', 'text-text-muted')
    ,@('text-slate-300', 'text-text-muted')
    ,@('text-indigo-600', 'text-accent-dark')
    ,@('text-indigo-500', 'text-accent-dark')
    ,@('text-indigo-700', 'text-accent-dark')

    # Background colors
    ,@('bg-slate-50/50', 'bg-white/20')
    ,@('bg-slate-50', 'bg-white/30')
    ,@('bg-slate-100', 'bg-white/40')
    ,@('bg-slate-200', 'bg-white/50')
    ,@('bg-indigo-600', 'bg-accent-dark')
    ,@('bg-indigo-500', 'bg-accent-lavender/50')
    ,@('bg-indigo-50', 'bg-accent-lavender/20')
    ,@('bg-indigo-100', 'bg-accent-lavender/30')

    # Border colors
    ,@('border-slate-100', 'border-white/30')
    ,@('border-slate-200', 'border-white/50')
    ,@('border-slate-300', 'border-white/60')
    ,@('border-indigo-500', 'border-accent-lavender')
    ,@('border-indigo-600', 'border-accent-dark')

    # Hover states
    ,@('hover:bg-slate-50', 'hover:bg-white/40')
    ,@('hover:bg-slate-100', 'hover:bg-white/50')
    ,@('hover:text-slate-700', 'hover:text-text-primary')
    ,@('hover:text-slate-900', 'hover:text-text-primary')
    ,@('hover:border-indigo-500', 'hover:border-accent-lavender')
    ,@('hover:border-indigo-600', 'hover:border-accent-dark')

    # Ring/focus colors
    ,@('ring-indigo-500', 'ring-accent-lavender/50')
    ,@('ring-indigo-600', 'ring-accent-lavender/50')
    ,@('focus:ring-indigo-500', 'focus:ring-accent-lavender/50')
    ,@('focus:ring-indigo-600', 'focus:ring-accent-lavender/50')

    # Divide colors
    ,@('divide-slate-100', 'divide-white/20')
    ,@('divide-slate-200', 'divide-white/30')
    ,@('divide-slate-50', 'divide-white/20')

    # Shadow
    ,@('shadow-indigo-200', 'shadow-glass')
    ,@('shadow-indigo-100', 'shadow-glass')
)

$files = Get-ChildItem -Path $pagesDir -Filter "*.tsx" -File
$totalChanges = 0

foreach ($file in $files) {
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
Write-Host "TOTAL: $totalChanges replacements across $($files.Count) files"
