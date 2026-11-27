const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

/**
 * Cleans up Windows shell "%V" quoting edge cases (e.g. `D:\"` -> `D:\`).
 */
function normalizeDirArg(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let cleaned = raw.trim().replace(/^"+|"+$/g, '');
  // Handle bare drive letter like "D:" -> "D:\"
  if (/^[a-zA-Z]:$/.test(cleaned)) {
    cleaned += '\\';
  }
  return cleaned;
}

function isUsableDirectory(dirPath) {
  if (!dirPath) return false;
  try {
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  } catch (_) {
    return false;
  }
}

function isIgnoredDefaultCwd(dirPath, execPath) {
  if (!dirPath) return true;
  const norm = path.resolve(dirPath).toLowerCase();
  const winDir = (process.env.WINDIR || 'C:\\Windows').toLowerCase();
  const sys32 = path.join(winDir, 'system32');
  const sysWow = path.join(winDir, 'syswow64');
  const execDir = execPath ? path.resolve(path.dirname(execPath)).toLowerCase() : '';

  return (
    norm === winDir ||
    norm === sys32 ||
    norm === sysWow ||
    (execDir && norm === execDir)
  );
}

/**
 * Resolves the starting working directory when Aether is launched via:
 *  - Right-click -> "Open in Aether" (`Aether.exe --cwd "%V"`)
 *  - Typing `aether` in File Explorer's address bar (process.cwd() = current Explorer folder)
 *  - CLI (`aether D:\Projects` or `aether .`)
 *  - Normal Desktop / Start Menu shortcut (defaults to user home directory)
 */
function resolveLaunchCwd(argv = process.argv, processCwd = process.cwd(), execPath = process.execPath, isPackaged = true) {
  const args = Array.isArray(argv) ? argv.slice(isPackaged ? 1 : 2) : [];

  // 1. Explicit --cwd flag (--cwd <dir> or --cwd=<dir>)
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--cwd' && i + 1 < args.length) {
      const candidate = normalizeDirArg(args[i + 1]);
      if (isUsableDirectory(candidate)) {
        return path.resolve(candidate);
      }
    } else if (typeof arg === 'string' && arg.startsWith('--cwd=')) {
      const candidate = normalizeDirArg(arg.slice('--cwd='.length));
      if (isUsableDirectory(candidate)) {
        return path.resolve(candidate);
      }
    }
  }

  // 2. Positional directory argument (e.g. `aether D:\Projects` or `aether .`)
  for (const arg of args) {
    if (!arg || typeof arg !== 'string' || arg.startsWith('-')) continue;
    const candidate = normalizeDirArg(arg);
    const resolved = path.isAbsolute(candidate)
      ? candidate
      : path.resolve(processCwd, candidate);
    if (isUsableDirectory(resolved)) {
      return path.resolve(resolved);
    }
  }

  // 3. Inherited process.cwd() (e.g. typing "aether" in File Explorer address bar!)
  if (isUsableDirectory(processCwd) && !isIgnoredDefaultCwd(processCwd, execPath)) {
    return path.resolve(processCwd);
  }

  // 4. Default home directory
  return os.homedir();
}

const REG_KEYS = [
  'HKCU\\Software\\Classes\\Directory\\Background\\shell\\Aether',
  'HKCU\\Software\\Classes\\Directory\\shell\\Aether',
  'HKCU\\Software\\Classes\\Drive\\shell\\Aether',
];

const APP_PATHS_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\aether.exe';

function getExplorerIntegrationStatus() {
  try {
    execFileSync('reg.exe', ['query', REG_KEYS[0]], { stdio: 'ignore', windowsHide: true });
    return { enabled: true };
  } catch (_) {
    return { enabled: false };
  }
}

function setExplorerIntegration(enabled, exePath) {
  if (!exePath || !fs.existsSync(exePath)) {
    return { ok: false, enabled: false, error: 'Aether executable not found' };
  }

  const exeDir = path.dirname(exePath);

  try {
    if (enabled) {
      for (const key of REG_KEYS) {
        execFileSync('reg.exe', ['add', key, '/ve', '/d', 'Open in Aether', '/f'], { stdio: 'ignore', windowsHide: true });
        execFileSync('reg.exe', ['add', key, '/v', 'Icon', '/d', `${exePath},0`, '/f'], { stdio: 'ignore', windowsHide: true });
        execFileSync('reg.exe', ['add', `${key}\\command`, '/ve', '/d', `"${exePath}" --cwd "%V"`, '/f'], { stdio: 'ignore', windowsHide: true });
      }
      execFileSync('reg.exe', ['add', APP_PATHS_KEY, '/ve', '/d', exePath, '/f'], { stdio: 'ignore', windowsHide: true });
      execFileSync('reg.exe', ['add', APP_PATHS_KEY, '/v', 'Path', '/d', exeDir, '/f'], { stdio: 'ignore', windowsHide: true });

      // Add to User PATH so `aether` works from Explorer address bar, Win+R, and other terminals
      const psAdd = `$d = '${exeDir.replace(/'/g, "''")}'; $p = [Environment]::GetEnvironmentVariable('Path','User'); $parts = @(); if ($p) { $parts = $p -split ';' | Where-Object { $_ -and ($_ -ine $d) } }; [Environment]::SetEnvironmentVariable('Path', (($parts + $d) -join ';'), 'User')`;
      execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psAdd], { stdio: 'ignore', windowsHide: true });

      return { ok: true, enabled: true };
    } else {
      for (const key of REG_KEYS) {
        try {
          execFileSync('reg.exe', ['delete', key, '/f'], { stdio: 'ignore', windowsHide: true });
        } catch (_) {}
      }
      try {
        execFileSync('reg.exe', ['delete', APP_PATHS_KEY, '/f'], { stdio: 'ignore', windowsHide: true });
      } catch (_) {}

      const psRem = `$d = '${exeDir.replace(/'/g, "''")}'; $p = [Environment]::GetEnvironmentVariable('Path','User'); if ($p) { $parts = $p -split ';' | Where-Object { $_ -and ($_ -ine $d) }; [Environment]::SetEnvironmentVariable('Path', ($parts -join ';'), 'User') }`;
      execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psRem], { stdio: 'ignore', windowsHide: true });

      return { ok: true, enabled: false };
    }
  } catch (err) {
    return { ok: false, enabled: getExplorerIntegrationStatus().enabled, error: err.message };
  }
}

module.exports = {
  normalizeDirArg,
  resolveLaunchCwd,
  getExplorerIntegrationStatus,
  setExplorerIntegration,
};
