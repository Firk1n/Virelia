# Export the book to the PDF the site serves -- the automated attempt.
#
# NOT THE SUPPORTED PATH. On this document Word's COM export does not finish
# in any usable time: ninety minutes on the full file, and twelve minutes
# without reaching page four of a four-page range, because it must paginate
# the whole thing first either way. Interactive Word does the same job in
# a couple of minutes, so `npm run pdf` prepares the file and hands it over.
# This is kept because it is correct, and may simply be a Word version away
# from being practical.
#
# The Book is the full document -- images, layout, everything the .txt export
# throws away. It has to be generated rather than copied: the Virelia.pdf
# sitting next to the .docx is an older export, and shipping that would put a
# book on the site that disagrees with the wiki beside it.
#
#     powershell -ExecutionPolicy Bypass -File scripts/export-book-pdf.ps1
#     powershell -ExecutionPolicy Bypass -File scripts/export-book-pdf.ps1 -Pages 4
#
# -Pages exports only the first N pages. Use it to check the pipeline works
# before committing to the full run.
#
# It exports build/Virelia-print.docx, not the author's file. The original is
# 108 MB of lossless PNG and Word will grind on it for over an hour without
# finishing; scripts/shrink-docx.py re-encodes those photographs to JPEG at
# identical dimensions, which is a third of the size and the same layout. Run
# that first -- npm run pdf does both.

param(
    [int]$Pages = 0
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$docx = Join-Path $root 'build\Virelia-print.docx'
$outDir = Join-Path $root 'book'
$pdf = Join-Path $outDir 'Virelia.pdf'

if (-not (Test-Path $docx)) {
    throw "No print copy at $docx. Run: python scripts/shrink-docx.py"
}
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory $outDir | Out-Null }
if ($Pages -gt 0) { $pdf = Join-Path $outDir 'Virelia-sample.pdf' }

Write-Host ("Source: {0} ({1:N0} MB)" -f $docx, ((Get-Item $docx).Length / 1MB))
$started = Get-Date

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
    # ReadOnly, and never written back.
    $doc = $word.Documents.Open($docx, $false, $true)
    try {
        # 17 = wdExportFormatPDF. OptimizeFor 1 is on-screen rather than print,
        # which is what a website wants. Structure tags and doc properties are
        # off because they cost time and buy nothing here; heading bookmarks
        # stay on, because a book deserves a PDF outline.
        # Range 3 = wdExportFromTo, 0 = wdExportAllDocument.
        $range = if ($Pages -gt 0) { 3 } else { 0 }
        $to = if ($Pages -gt 0) { $Pages } else { 1 }
        $doc.ExportAsFixedFormat(
            $pdf, 17, $false, 1,
            $range, 1, $to, 0,
            $false, $true, 1, $false, $true, $false)
    } finally {
        $doc.Close($false)
    }
} finally {
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}

$out = Get-Item $pdf
Write-Host ("Wrote {0} ({1:N1} MB) in {2:N1} min" -f `
    $out.FullName, ($out.Length / 1MB), ((Get-Date) - $started).TotalMinutes)
