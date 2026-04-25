$srcDir = "d:\aplikasi developer\developer-1\src"

$totalChanges = 0

Get-ChildItem -Path $srcDir -Filter "*.tsx" -File -Recurse | ForEach-Object {
    $file = $_
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content

    # 1. Replace all tailwind shadows with shadow-glass
    $content = [regex]::Replace($content, '\bshadow-(sm|md|lg|xl)\b', 'shadow-glass')
    $content = [regex]::Replace($content, '\bshadow-[a-z0-9-]+/[0-9]+\b', 'shadow-glass')
    
    # 2. Standardize border radius (except pill)
    $content = [regex]::Replace($content, '\brounded-2xl\b', 'rounded-xl')
    $content = [regex]::Replace($content, '\brounded-3xl\b', 'rounded-xl')
    
    # 3. Clean up weird border colors and use our glass border
    $content = [regex]::Replace($content, '\bborder-white/30\b', 'border-white/40')
    $content = [regex]::Replace($content, '\bborder-white/50\b', 'border-white/40')
    
    # 4. Convert specific "bg-white border ... shadow-glass" to "glass-card"
    # This is tricky with regex, but let's try to convert bg-white cards to glass-card
    # We look for bg-white inside classNames that also have rounded-xl and shadow-glass
    $content = [regex]::Replace($content, '\bbg-white\b(?=.*?rounded-xl.*?shadow-glass)', 'glass-card')
    $content = [regex]::Replace($content, '\bbg-white/80\b', 'glass-card')
    $content = [regex]::Replace($content, '\bbg-white/90\b', 'glass-card')

    if ($content -cne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Updated shadows & radius in $($file.Name)"
        $totalChanges++
    }
}

Write-Host "TOTAL files updated: $totalChanges"
