# Vẽ danh sách từ extract.js thành ảnh, rồi đặt ảnh demo bên dưới để so (xem cách dùng ở đầu extract.js).
param([string]$dir, [string]$refDir)
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Web.Extensions
$json = New-Object System.Web.Script.Serialization.JavaScriptSerializer
$json.MaxJsonLength = 100000000
$cache = @{}
function Get-Img($p) {
  if (-not $cache.ContainsKey($p)) { $cache[$p] = [System.Drawing.Image]::FromFile($p) }
  return $cache[$p]
}
for ($fi = 1; $fi -le 4; $fi++) {
  $items = $json.DeserializeObject([IO.File]::ReadAllText("$dir\frame$fi.json"))
  $bmp = New-Object System.Drawing.Bitmap 1920, 2160
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = 'HighQualityBilinear'
  # trời: dải màu như SkyGradient (trên xanh, dưới trắng xanh)
  $sky = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.Rectangle 0,0,1920,1080), ([System.Drawing.Color]::FromArgb(140,200,225)), ([System.Drawing.Color]::FromArgb(230,243,236)), 90
  $g.FillRectangle($sky, 0, 0, 1920, 1080)
  foreach ($it in $items) {
    if ($it.kind -eq 'poly') {
      $pts = [System.Drawing.PointF[]]($it.pts | ForEach-Object { New-Object System.Drawing.PointF ([float]$_[0]), ([float]$_[1]) })
      $c = $it.color
      $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb([int](255*$it.alpha), $c[0], $c[1], $c[2]))
      $g.FillPolygon($brush, $pts)
    } elseif ($it.kind -eq 'img') {
      $img = Get-Img $it.png
      $r = $it.rect
      $src = New-Object System.Drawing.RectangleF ([float]$r[0]), ([float]$r[1]), ([float]$r[2]), ([float]$r[3])
      $pts = [System.Drawing.PointF[]]($it.pts | ForEach-Object { New-Object System.Drawing.PointF ([float]$_[0]), ([float]$_[1]) })
      $attr = New-Object System.Drawing.Imaging.ImageAttributes
      if ($it.alpha -lt 0.999) {
        $cm = New-Object System.Drawing.Imaging.ColorMatrix
        $cm.Matrix33 = [float]$it.alpha
        $attr.SetColorMatrix($cm)
      }
      $g.DrawImage($img, $pts, $src, [System.Drawing.GraphicsUnit]::Pixel, $attr)
    }
  }
  $ref = [System.Drawing.Image]::FromFile("$refDir\demo_$fi.jpg")
  $g.DrawImage($ref, 0, 1080, 1920, 1080)
  $ref.Dispose()
  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::Red), 4
  $g.DrawLine($pen, 0, 1080, 1920, 1080)
  $bmp.Save("$dir\cmp$fi.png", [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  "frame $fi ok"
}
