$json = Get-Content -Raw "data/panini_world_cup_2026_tracker.json" | ConvertFrom-Json
$sections = $json.FALTANTES | Select-Object -ExpandProperty "SECCIÓN" -Unique
$sections | Out-File -FilePath "sections.txt"
Write-Host "Unique Sections Found: $($sections.Count)"
