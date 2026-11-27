const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const pty = require('node-pty');
const { resolveLaunchCwd } = require('../src/explorer-integration');

const ROOT = path.resolve(__dirname, '..');
const results = [];

function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  const tag = pass ? 'PASS' : 'FAIL';
  console.log(`[${tag}] ${name}${detail ? ' — ' + detail : ''}`);
}

function stripAnsi(str) {
  return str
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
    .replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '')
    .replace(/\r/g, '');
}

function runPtySession(file, args, commands, cwd = os.homedir(), stepMs = 600) {
  return new Promise((resolve, reject) => {
    const p = pty.spawn(file, args, {
      name: 'xterm-256color',
      cols: 140,
      rows: 30,
      cwd,
      useConpty: true,
      useConptyDll: true,
    });

    let raw = '';
    p.onData((d) => {
      raw += d;
    });

    const timeout = setTimeout(() => {
      try { p.kill(); } catch (_) {}
      reject(new Error('PTY test timed out'));
    }, 35000);

    let delay = 950;
    for (const cmd of commands) {
      setTimeout(() => {
        p.write(cmd + '\r');
      }, delay);
      delay += stepMs;
    }

    setTimeout(() => {
      p.write('exit\r');
    }, delay + 350);

    p.onExit(() => {
      clearTimeout(timeout);
      resolve({ raw, clean: stripAnsi(raw) });
    });
  });
}

async function runStaticChecks() {
  const html = fs.readFileSync(path.join(ROOT, 'src', 'renderer', 'index.html'), 'utf8');
  const appJs = fs.readFileSync(path.join(ROOT, 'src', 'renderer', 'app.js'), 'utf8');
  record('UI: window dimensions removed', !html.includes('status-size'));
  record('UI: "?" help button present', html.includes('id="btn-help"') && html.includes('id="help-modal"'));
  record('UI: transparency toggle present', html.includes('id="toggle-transparency"'));
  record('UI: Ctrl+F search bar present', html.includes('id="search-bar"') && html.includes('addon-search.js'));
  record('UI: WebGL & Image addons loaded', html.includes('addon-webgl.js') && html.includes('addon-image.js'));
  record('UI: Git status bar pill present', html.includes('id="status-git-pill"') && appJs.includes('registerOscHandler(9999'));
  record('UI: Explorer integration toggle present', html.includes('id="toggle-explorer"'));
  record('Build: NSIS Explorer integration script present', fs.existsSync(path.join(ROOT, 'build', 'installer.nsh')));

  const pngPath = path.join(ROOT, 'assets', 'aether-logo.png');
  const icoPath = path.join(ROOT, 'assets', 'aether.ico');
  record('Assets: aether-logo.png valid', fs.existsSync(pngPath) && fs.statSync(pngPath).size > 5000);
  record('Assets: aether.ico valid', fs.existsSync(icoPath) && fs.statSync(icoPath).size > 5000);

  const searchGlobal = fs.readFileSync(
    path.join(ROOT, 'node_modules', '@xterm', 'addon-search', 'lib', 'addon-search.js'),
    'utf8'
  );
  record('Addon: SearchAddon UMD global matches', searchGlobal.includes('SearchAddon'));
}

async function runSanitizerChecks() {
  const appJs = fs.readFileSync(path.join(ROOT, 'src', 'renderer', 'app.js'), 'utf8');
  const fnMatch = appJs.match(/function sanitizeTabTitle\([\s\S]*?\n  \}/);
  if (!fnMatch) {
    record('Title sanitizer extracted', false, 'Function not found');
    return;
  }
  const sanitizeTabTitle = new Function('rawTitle', 'fallbackLabel', fnMatch[0] + '\nreturn sanitizeTabTitle(rawTitle, fallbackLabel);');

  const cases = [
    ['C:\\WINDOWS\\system32\\cmd.exe', 'Aether', 'Aether'],
    ['cmd.exe', 'Aether', 'Aether'],
    ['C:\\WINDOWS\\system32\\cmd.exe - agy', 'Aether', 'agy'],
    ['Administrator: Command Prompt - npm run dev', 'Aether', 'npm run dev'],
    ['Windows PowerShell', 'PowerShell', 'PowerShell'],
    ['C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe - python', 'PowerShell', 'python'],
    ['C:\\WINDOWS\\system32\\cmd.exe - call "D:\\CMD\\src\\shell\\aether-init.cmd"', 'Aether', 'Aether'],
    ['C:\\WINDOWS\\system32\\cmd.exe - call "D:\\CMD\\src\\shell\\aether-git.cmd" status', 'Aether', 'Aether'],
  ];

  for (const [input, fallback, expected] of cases) {
    const actual = sanitizeTabTitle(input, fallback);
    record(`Title sanitize: "${input}" -> "${expected}"`, actual === expected, actual === expected ? '' : `got "${actual}"`);
  }
}

async function runCmdCdChecks() {
  const initScript = path.join(ROOT, 'src', 'shell', 'aether-init.cmd');
  const home = os.homedir();

  const { clean: out } = await runPtySession(
    'cmd.exe',
    ['/k', 'call', initScript],
    [
      'cd D:\\CMD',
      'echo T1=%CD%',
      'cd ..',
      'echo T2=%CD%',
      'cd -',
      'echo T3=%CD%',
      'cd ~',
      'echo T4=%CD%',
      'cd -',
      'echo T4B=%CD%',
      'cd "C:\\Program Files"',
      'echo T5=%CD%',
      'cd C:\\Program Files\\Common Files',
      'echo T6=%CD%',
      'cd /d D:\\CMD',
      'echo T7=%CD%',
      'cd',
      'cd C:\\nonexistent_aether_dir_999',
      'echo T9=%CD%',
      'clear',
      'echo T10=CLEAR_OK',
    ],
    home
  );

  record('CMD cd: cross-drive (cd D:\\CMD)', out.includes('T1=D:\\CMD'));
  record('CMD cd: parent dir (cd ..)', out.includes('T2=D:\\'));
  record('CMD cd: previous dir (cd -)', out.includes('T3=D:\\CMD'));
  record('CMD cd: home dir (cd ~)', out.toLowerCase().includes(('T4=' + home).toLowerCase()));
  record('CMD cd: return after cd ~ (cd -)', out.includes('T4B=D:\\CMD'));
  record('CMD cd: quoted spaces (cd "C:\\Program Files")', out.includes('T5=C:\\Program Files'));
  record('CMD cd: unquoted spaces (cd C:\\Program Files\\Common Files)', out.includes('T6=C:\\Program Files\\Common Files'));
  record('CMD cd: explicit /d (cd /d D:\\CMD)', out.includes('T7=D:\\CMD'));
  record('CMD cd: invalid path keeps CWD', out.includes('T9=D:\\CMD') && /cannot find the path/i.test(out));
  record('CMD clear alias works', out.includes('T10=CLEAR_OK') && !/not recognized/i.test(out));
}

async function runGitTrackingChecks() {
  const repoDir = path.join(os.tmpdir(), 'aether-git-test-' + Date.now());
  const nestedDir = path.join(repoDir, 'sub', 'nested');
  fs.mkdirSync(nestedDir, { recursive: true });

  try {
    execFileSync('git', ['init', '-b', 'main'], { cwd: repoDir, stdio: 'ignore' });
    execFileSync('git', ['config', 'user.email', 'test@aether.dev'], { cwd: repoDir, stdio: 'ignore' });
    execFileSync('git', ['config', 'user.name', 'Aether Test'], { cwd: repoDir, stdio: 'ignore' });
    fs.writeFileSync(path.join(repoDir, 'README.md'), '# Aether Git Test\n');
    execFileSync('git', ['add', '.'], { cwd: repoDir, stdio: 'ignore' });
    execFileSync('git', ['commit', '-m', 'initial commit'], { cwd: repoDir, stdio: 'ignore' });

    // 1) CMD Git branch tracking
    const cmdInit = path.join(ROOT, 'src', 'shell', 'aether-init.cmd');
    const cmdRes = await runPtySession(
      'cmd.exe',
      ['/k', 'call', cmdInit],
      [
        `cd "${repoDir}"`,
        `cd "${nestedDir}"`,
        'echo dirty > dirty.txt',
        'git status -s',
        'git checkout -b feature/git-bar',
        'git add .',
        'git commit -m "add dirty"',
        `cd "${os.tmpdir()}"`,
      ],
      os.tmpdir(),
      750
    );

    record('CMD git: shows clean (main) branch in prompt', cmdRes.clean.includes('(main)>'));
    record('CMD git: emits clean OSC 9999 for main', cmdRes.raw.includes('aether_git:0:main'));
    record('CMD git: tracks branch inside nested subfolder', cmdRes.clean.includes('sub\\nested (main)>'));
    record('CMD git: shows dirty indicator (main *) after file change', cmdRes.clean.includes('(main *)>'));
    record('CMD git: updates branch on git checkout -b', cmdRes.clean.includes('(feature/git-bar *)>'));
    record('CMD git: clears dirty indicator after git commit', cmdRes.clean.includes('(feature/git-bar)>'));
    record('CMD git: emits OSC 9999 for new branch', cmdRes.raw.includes('aether_git:0:feature/git-bar'));

    // 2) PowerShell Git branch tracking
    const psInit = path.join(ROOT, 'src', 'shell', 'aether-init.ps1');
    const psRes = await runPtySession(
      'powershell.exe',
      ['-NoLogo', '-NoExit', '-ExecutionPolicy', 'Bypass', '-File', psInit],
      [
        `cd "${repoDir}"`,
        'git checkout main',
        `cd "${os.tmpdir()}"`,
      ],
      os.tmpdir(),
      900
    );

    record('PowerShell git: shows (feature/git-bar) in prompt', psRes.clean.includes('(feature/git-bar)>'));
    record('PowerShell git: switches to (main) after git checkout', psRes.clean.includes('(main)>'));
    record('PowerShell git: emits OSC 9999 for main', psRes.raw.includes('aether_git:0:main'));
  } finally {
    fs.rmSync(repoDir, { recursive: true, force: true });
  }
}

async function runPowerShellCdChecks() {
  const psInit = path.join(ROOT, 'src', 'shell', 'aether-init.ps1');
  const { clean: out } = await runPtySession(
    'powershell.exe',
    ['-NoLogo', '-NoExit', '-ExecutionPolicy', 'Bypass', '-File', psInit],
    [
      'cd D:\\CMD',
      'Write-Output ("PS1=" + (Get-Location).Path)',
      'cd ..',
      'Write-Output ("PS2=" + (Get-Location).Path)',
    ],
    os.homedir(),
    800
  );

  record('PowerShell cd: cross-drive (cd D:\\CMD)', out.includes('PS1=D:\\CMD'));
  record('PowerShell cd: parent dir (cd ..)', out.includes('PS2=D:\\'));
}

async function runExplorerLaunchChecks() {
  const fakeExe = 'C:\\Users\\Omar\\AppData\\Local\\Programs\\Aether\\Aether.exe';
  const fakeInstallDir = path.dirname(fakeExe);

  record(
    'Explorer launch: --cwd D:\\CMD',
    resolveLaunchCwd([fakeExe, '--cwd', 'D:\\CMD'], fakeInstallDir, fakeExe, true) === 'D:\\CMD'
  );
  record(
    'Explorer launch: drive root trailing quote (--cwd D:\\")',
    resolveLaunchCwd([fakeExe, '--cwd', 'D:\\"'], fakeInstallDir, fakeExe, true) === 'D:\\'
  );
  record(
    'Explorer launch: --cwd=C:\\Program Files',
    resolveLaunchCwd([fakeExe, '--cwd=C:\\Program Files'], fakeInstallDir, fakeExe, true) === 'C:\\Program Files'
  );
  record(
    'Explorer launch: positional path (aether D:\\CMD)',
    resolveLaunchCwd([fakeExe, 'D:\\CMD'], os.homedir(), fakeExe, true) === 'D:\\CMD'
  );
  record(
    'Explorer launch: address bar inherited cwd (D:\\CMD)',
    resolveLaunchCwd([fakeExe], 'D:\\CMD', fakeExe, true) === 'D:\\CMD'
  );
  record(
    'Explorer launch: desktop shortcut falls back to home',
    resolveLaunchCwd([fakeExe], fakeInstallDir, fakeExe, true).toLowerCase() === os.homedir().toLowerCase()
  );
  record(
    'Explorer launch: System32 cwd falls back to home',
    resolveLaunchCwd([fakeExe], 'C:\\Windows\\System32', fakeExe, true).toLowerCase() === os.homedir().toLowerCase()
  );
}

(async () => {
  try {
    await runStaticChecks();
    await runSanitizerChecks();
    await runExplorerLaunchChecks();
    await runCmdCdChecks();
    await runGitTrackingChecks();
    await runPowerShellCdChecks();

    const failed = results.filter((r) => !r.pass);
    console.log(`\nSummary: ${results.length - failed.length}/${results.length} passed`);
    process.exit(failed.length === 0 ? 0 : 1);
  } catch (err) {
    console.error('TEST RUNNER ERROR:', err);
    process.exit(1);
  }
})();
