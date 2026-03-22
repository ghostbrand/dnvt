# Script para gerar icones Android com dimensoes corretas
Add-Type -AssemblyName System.Drawing

function Create-Icon {
    param(
        [string]$OutputPath,
        [int]$Size = 1024
    )
    
    $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 15, 23, 42))
    $graphics.FillRectangle($bgBrush, 0, 0, $Size, $Size)
    
    $circleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 59, 130, 246))
    $margin = $Size * 0.11
    $circleSize = $Size - ($margin * 2)
    $graphics.FillEllipse($circleBrush, $margin, $margin, $circleSize, $circleSize)
    
    $fontSize = [int]($Size * 0.18)
    $fontSizeSmall = [int]($Size * 0.08)
    $font = New-Object System.Drawing.Font("Arial", $fontSize, [System.Drawing.FontStyle]::Bold)
    $fontSmall = New-Object System.Drawing.Font("Arial", $fontSizeSmall, [System.Drawing.FontStyle]::Bold)
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    
    $stringFormat = New-Object System.Drawing.StringFormat
    $stringFormat.Alignment = [System.Drawing.StringAlignment]::Center
    $stringFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
    
    $textY = $Size * 0.45
    $textRect = New-Object System.Drawing.RectangleF(0, $textY, $Size, ($Size * 0.2))
    $graphics.DrawString("DNVT", $font, $textBrush, $textRect, $stringFormat)
    
    $textYSmall = $Size * 0.58
    $textRectSmall = New-Object System.Drawing.RectangleF(0, $textYSmall, $Size, ($Size * 0.1))
    $graphics.DrawString("ANGOLA", $fontSmall, $textBrush, $textRectSmall, $stringFormat)
    
    $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $graphics.Dispose()
    $bitmap.Dispose()
    $bgBrush.Dispose()
    $circleBrush.Dispose()
    $textBrush.Dispose()
    $font.Dispose()
    $fontSmall.Dispose()
    
    Write-Host "Criado: $OutputPath com $Size px" -ForegroundColor Green
}

Write-Host "Gerando icones para Android..." -ForegroundColor Cyan

Create-Icon -OutputPath "assets\icon.png" -Size 1024
Create-Icon -OutputPath "assets\adaptive-icon.png" -Size 1024
Create-Icon -OutputPath "assets\notification-icon.png" -Size 96

Write-Host "`nTodos os icones foram gerados!" -ForegroundColor Green
Write-Host "Proximos passos:" -ForegroundColor Yellow
Write-Host "1. npm run build:android:preview"
Write-Host "2. Desinstalar app antigo"
Write-Host "3. Instalar novo APK"
