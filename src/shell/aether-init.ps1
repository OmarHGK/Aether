function global:prompt {
  $esc = [char]27
  $loc = (Get-Location).Path
  $dir = $loc
  $gitRoot = $null

  while ($dir) {
    if (Test-Path (Join-Path $dir '.git')) {
      $gitRoot = $dir
      break
    }
    $parent = Split-Path -Parent $dir
    if (-not $parent -or $parent -eq $dir) { break }
    $dir = $parent
  }

  $branch = $null
  $dirty = $false

  if ($gitRoot) {
    $headFile = Join-Path (Join-Path $gitRoot '.git') 'HEAD'
    if (Test-Path $headFile -PathType Leaf) {
      $head = Get-Content -Path $headFile -TotalCount 1 -ErrorAction SilentlyContinue
      if ($head -and $head.StartsWith('ref: refs/heads/')) {
        $branch = $head.Substring(16).Trim()
      } elseif ($head) {
        $trimmed = $head.Trim()
        $branch = $trimmed.Substring(0, [Math]::Min(7, $trimmed.Length))
      }
    } else {
      $b = (& git rev-parse --abbrev-ref HEAD 2>$null)
      if ($LASTEXITCODE -eq 0 -and $b) {
        $branch = ($b | Select-Object -First 1).Trim()
      }
    }

    if ($branch) {
      $st = (& git status --porcelain 2>$null | Select-Object -First 1)
      if ($st) { $dirty = $true }
    }
  }

  if ($branch) {
    $dFlag = if ($dirty) { '1' } else { '0' }
    $osc = "$esc]9999;aether_git:$dFlag`:$branch$esc\"
    $branchColor = if ($dirty) { "$esc[33m" } else { "$esc[35m" }
    $branchSuffix = if ($dirty) { " ($branch *)" } else { " ($branch)" }
    return "$osc$esc[36m$loc$branchColor$branchSuffix$esc[90m>$esc[0m "
  } else {
    $osc = "$esc]9999;aether_git:$esc\"
    return "$osc$esc[36m$loc$esc[90m>$esc[0m "
  }
}
