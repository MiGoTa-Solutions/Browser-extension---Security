Add-Type -AssemblyName System.Drawing

$sizes = @(16, 48, 128)

foreach ($size in $sizes) {
    $bitmap = New-Object System.Drawing.Bitmap $size, $size

    for ($x = 0; $x -lt $size; $x++) {
        for ($y = 0; $y -lt $size; $y++) {
            $bitmap.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, 59, 130, 246))
        }
    }

    $fileName = "icon$size.png"
    $target = Join-Path -Path "extension-shell/icons" -ChildPath $fileName
    $bitmap.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Dispose()
}
