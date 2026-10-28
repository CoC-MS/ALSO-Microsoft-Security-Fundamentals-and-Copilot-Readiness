param(
    [Parameter(Mandatory = $true)]
    [string]$SourceRoot
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$root = (Resolve-Path -LiteralPath $SourceRoot).Path
$output = Join-Path $PSScriptRoot '..\site\downloads'
[void][System.IO.Directory]::CreateDirectory($output)
$packages = @(
    @{ id = 'conditional-access'; folder = 'CA'; title = 'Conditional Access' },
    @{ id = 'app-protection'; folder = 'app protection'; title = 'App protection' },
    @{ id = 'device-compliance'; folder = 'device compliance'; title = 'Device compliance' },
    @{ id = 'defender-onboarding'; folder = 'auto onboarding defender'; title = 'Defender auto onboarding' },
    @{ id = 'defender-security'; folder = 'defender security settings'; additionalFolder = 'device security settings'; title = 'Defender security settings' },
    @{ id = 'browser-protection'; folder = 'browser protection policies'; title = 'Browser protection' }
)
$manifest = [ordered]@{
    description = 'Supplied ALSO exports. Original file bytes, filenames, tenant identifiers, and payloads are preserved. Review and adapt before importing into another tenant.'
    packages = @()
}

foreach ($package in $packages) {
    $sources = @($package.folder)
    if ($package.additionalFolder) { $sources += $package.additionalFolder }
    $sourceFiles = @{}
    foreach ($folder in $sources) {
        $source = Join-Path $root $folder
        if (-not (Test-Path -LiteralPath $source -PathType Container)) {
            throw "Missing source folder: $folder"
        }
        $files = @(Get-ChildItem -LiteralPath $source -Recurse -File)
        if ($files.Count -eq 0) { throw "Empty package source: $folder" }
        foreach ($file in $files) {
            if ($package.id -eq 'conditional-access' -and $file.Directory.Name -eq 'ConditionalAccess' -and $file.Name -match '-CA101-') { continue }
            $relative = $file.FullName.Substring($source.Length).TrimStart('\', '/').Replace('\', '/')
            if ($sourceFiles.ContainsKey($relative)) { throw "Duplicate archive path: $relative" }
            $sourceFiles[$relative] = $file
        }
    }
    $entries = @()
    foreach ($relative in ($sourceFiles.Keys | Sort-Object)) {
        $file = $sourceFiles[$relative]
        if ($file.Extension -ne '.json') { throw "Review unexpected source file before publishing: $($file.Name)" }
        # Validate both UTF-8 and UTF-16 exports without rewriting their original bytes.
        [void](Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json)
        $entries += [ordered]@{
            path = $relative
            bytes = $file.Length
            sha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
        }
    }
    $archive = Join-Path $output "$($package.id).zip"
    if (Test-Path -LiteralPath $archive) {
        Remove-Item -LiteralPath $archive
    }
    $zip = [System.IO.Compression.ZipFile]::Open($archive, [System.IO.Compression.ZipArchiveMode]::Create)
    try {
        foreach ($entry in $entries) {
            $file = $sourceFiles[$entry.path].FullName
            [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                $zip, $file, $entry.path, [System.IO.Compression.CompressionLevel]::Optimal
            )
        }
    } finally {
        $zip.Dispose()
    }
    $zip = [System.IO.Compression.ZipFile]::OpenRead($archive)
    try {
        $zipFiles = @($zip.Entries | Where-Object { $_.Name -ne '' })
        if ($zipFiles.Count -ne $entries.Count) { throw "Archive entry count mismatch: $($package.id)" }
        foreach ($entry in $entries) {
            $zipped = $zip.GetEntry($entry.path)
            if ($null -eq $zipped) { throw "Missing archived file: $($entry.path)" }
            $stream = $zipped.Open()
            $sha = [System.Security.Cryptography.SHA256]::Create()
            try {
                $hash = ([BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-', '').ToLowerInvariant()
                if ($hash -ne $entry.sha256) { throw "Archived content mismatch: $($entry.path)" }
            } finally {
                $sha.Dispose()
                $stream.Dispose()
            }
        }
    } finally {
        $zip.Dispose()
    }
    $manifest.packages += [ordered]@{
        id = $package.id
        title = $package.title
        sourceFolder = $package.folder
        sourceFolders = $sources
        archive = "$($package.id).zip"
        bytes = (Get-Item -LiteralPath $archive).Length
        sha256 = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
        fileCount = $entries.Count
        files = $entries
    }
    Write-Output "$($package.title): $($entries.Count) files, verified byte-for-byte"
}

$json = $manifest | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText(
    (Join-Path $output 'manifest.json'), $json + [Environment]::NewLine,
    [System.Text.UTF8Encoding]::new($false)
)
