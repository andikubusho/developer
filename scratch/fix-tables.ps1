$srcDir = "d:\aplikasi developer\developer-1\src\pages"

$totalChanges = 0

Get-ChildItem -Path $srcDir -Filter "*.tsx" -File -Recurse | ForEach-Object {
    $file = $_
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content

    # Replace the starting tag
    $content = [regex]::Replace($content, '<div className="overflow-x-auto">\s*<table[^>]*min-w-\[800px\][^>]*>', '<Table className="min-w-[800px]">')
    
    # Replace the starting tag if no min-w is present but it's the exact string
    $content = [regex]::Replace($content, '<div className="overflow-x-auto">\s*<table[^>]*>', '<Table>')

    # Replace the ending tag
    # Be careful: only replace </table></div> if we replaced the start tag.
    # A simple regex for </table>\s*</div>
    $content = [regex]::Replace($content, '</table>\s*</div>', '</Table>')
    
    # Also replace <thead> with <THead>
    $content = [regex]::Replace($content, '<thead[^>]*>', '<THead>')
    $content = [regex]::Replace($content, '</thead>', '</THead>')
    
    # Replace <tbody> with <TBody>
    $content = [regex]::Replace($content, '<tbody[^>]*>', '<TBody>')
    $content = [regex]::Replace($content, '</tbody>', '</TBody>')

    if ($content -cne $originalContent) {
        
        # Make sure Table components are imported if we use them
        if ($content -notmatch "import.*Table.*from") {
            $content = [regex]::Replace($content, "(import React.*`r`n|import React.*`n)", "`$1import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';`r`n")
        }
        
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Updated tables in $($file.Name)"
        $totalChanges++
    }
}

Write-Host "TOTAL files updated: $totalChanges"
