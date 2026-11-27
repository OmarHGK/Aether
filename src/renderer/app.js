(function () {
  const STORAGE_KEY = 'aether-settings-v2';
  const THEMES = window.AETHER_THEMES;
  const FONTS = window.AETHER_FONTS;
  const THEME_ORDER = Object.keys(THEMES);

  const HELP_COMMANDS = [
    { cmd: 'cd <path>', insert: 'cd ', desc: 'Change folder (works across drives, e.g. cd D:\\Projects)' },
    { cmd: 'cd ~', insert: 'cd ~', desc: 'Jump to your home directory' },
    { cmd: 'cd -', insert: 'cd -', desc: 'Switch back to your previous directory' },
    { cmd: 'cd ..', insert: 'cd ..', desc: 'Move up one parent folder' },
    { cmd: 'dir', insert: 'dir', desc: 'List files and folders in current directory' },
    { cmd: 'cls / clear', insert: 'clear', desc: 'Clear the terminal output' },
    { cmd: 'mkdir <name>', insert: 'mkdir ', desc: 'Create a new directory' },
    { cmd: 'git status', insert: 'git status', desc: 'Check modified files and current Git branch' },
    { cmd: 'git branch', insert: 'git branch', desc: 'List local Git branches' },
    { cmd: 'git checkout -b <name>', insert: 'git checkout -b ', desc: 'Create and switch to a new Git branch' },
    { cmd: 'git log --oneline -n 10', insert: 'git log --oneline -n 10', desc: 'View recent commit history' },
    { cmd: 'explorer .', insert: 'explorer .', desc: 'Open current folder in Windows File Explorer' },
    { cmd: 'code .', insert: 'code .', desc: 'Open current folder in VS Code' },
    { cmd: 'ipconfig', insert: 'ipconfig', desc: 'Show network adapters and IP addresses' },
    { cmd: 'tasklist', insert: 'tasklist', desc: 'Display currently running Windows processes' },
    { cmd: 'systeminfo', insert: 'systeminfo', desc: 'Show detailed OS and hardware information' },
    { cmd: 'ping <host>', insert: 'ping ', desc: 'Test network connectivity to a host' },
    { cmd: 'where <app>', insert: 'where ', desc: 'Locate an executable file on your PATH' },
    { cmd: 'exit', insert: 'exit', desc: 'Close the current terminal session' },
  ];

  const HELP_SHORTCUTS = [
    { keys: 'Ctrl + T', desc: 'Open a new terminal tab' },
    { keys: 'Ctrl + Shift + T', desc: 'Open alternate shell (PowerShell / Default)' },
    { keys: 'Ctrl + W', desc: 'Close current tab (or middle-click tab)' },
    { keys: 'Ctrl + Tab / 1–9', desc: 'Switch between open tabs' },
    { keys: 'Ctrl + F', desc: 'Search text inside terminal output' },
    { keys: 'Ctrl + L', desc: 'Clear terminal screen' },
    { keys: 'Ctrl + ,', desc: 'Open Appearance & Theme settings' },
    { keys: 'Ctrl + /  or  F1', desc: 'Open this Command Reference' },
    { keys: 'Ctrl + Shift + C / V', desc: 'Copy selection / Paste (or right-click)' },
    { keys: 'Ctrl + = / - / 0', desc: 'Zoom font size in, out, or reset' },
  ];

  const defaultSettings = {
    themeId: 'obsidian-glass',
    fontId: 'Cascadia Code',
    fontSize: 14,
    lineHeight: 1.05,
    transparencyEnabled: true,
    opacity: 0.94,
    cursorStyle: 'bar',
    cursorBlink: true,
    scanlines: false,
    defaultShell: 'cmd',
  };

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...defaultSettings };
      const parsed = JSON.parse(raw);
      const merged = { ...defaultSettings, ...parsed };
      if (!THEMES[merged.themeId]) merged.themeId = defaultSettings.themeId;
      return merged;
    } catch (_) {
      return { ...defaultSettings };
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (_) {}
  }

  const settings = loadSettings();
  const tabs = new Map(); // id -> { id, shellType, label, defaultTabTitle, paneEl, tabEl, term, fitAddon, searchAddon }
  let activeTabId = null;
  let tabCounter = 0;
  let helpFilterMode = 'all';
  let toastTimer = null;

  // DOM refs
  const appShell = document.getElementById('app-shell');
  const tabsContainer = document.getElementById('tabs-container');
  const terminalStage = document.getElementById('terminal-stage');
  const btnNewTab = document.getElementById('btn-new-tab');
  const btnShellMenu = document.getElementById('btn-shell-menu');
  const shellDropdown = document.getElementById('shell-dropdown');
  const btnCycleTheme = document.getElementById('btn-cycle-theme');
  const themePillName = document.getElementById('theme-pill-name');
  const btnSearch = document.getElementById('btn-search');
  const searchBar = document.getElementById('search-bar');
  const searchInput = document.getElementById('search-input');
  const btnSearchPrev = document.getElementById('btn-search-prev');
  const btnSearchNext = document.getElementById('btn-search-next');
  const btnSearchClose = document.getElementById('btn-search-close');
  const btnSettings = document.getElementById('btn-settings');
  const drawer = document.getElementById('customizer-drawer');
  const btnCloseDrawer = document.getElementById('btn-close-drawer');
  const themeGrid = document.getElementById('theme-grid');
  const selectFont = document.getElementById('select-font');
  const rangeFontSize = document.getElementById('range-fontsize');
  const valFontSize = document.getElementById('val-fontsize');
  const rangeLineHeight = document.getElementById('range-lineheight');
  const valLineHeight = document.getElementById('val-lineheight');
  const toggleTransparency = document.getElementById('toggle-transparency');
  const opacityControl = document.getElementById('opacity-control');
  const rangeOpacity = document.getElementById('range-opacity');
  const valOpacity = document.getElementById('val-opacity');
  const toggleBlink = document.getElementById('toggle-blink');
  const toggleScanlines = document.getElementById('toggle-scanlines');
  const toggleExplorer = document.getElementById('toggle-explorer');
  const rowExplorerIntegration = document.getElementById('row-explorer-integration');
  const cursorStyleControl = document.getElementById('cursor-style-control');
  const defaultShellControl = document.getElementById('default-shell-control');
  const statusShellText = document.getElementById('status-shell-text');
  const statusGitPill = document.getElementById('status-git-pill');
  const statusGitBranch = document.getElementById('status-git-branch');
  const statusGitDirty = document.getElementById('status-git-dirty');
  const iconMaximize = document.getElementById('icon-maximize');
  const iconRestore = document.getElementById('icon-restore');
  const btnHelp = document.getElementById('btn-help');
  const helpBackdrop = document.getElementById('help-backdrop');
  const btnCloseHelp = document.getElementById('btn-close-help');
  const helpSearchInput = document.getElementById('help-search-input');
  const helpTabs = document.getElementById('help-tabs');
  const helpBody = document.getElementById('help-body');
  const toastEl = document.getElementById('toast');

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('visible');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('visible');
    }, 1500);
  }

  function getFontStack(fontId) {
    const found = FONTS.find((f) => f.id === fontId);
    return found ? found.stack : FONTS[0].stack;
  }

  /**
   * Sanitizes raw Windows shell OSC window titles so ugly paths like
   * "C:\WINDOWS\system32\cmd.exe" or "cmd.exe - agy" become "Aether" or "agy".
   */
  function sanitizeTabTitle(rawTitle, fallbackLabel) {
    let title = (rawTitle || '').trim();
    if (!title) return fallbackLabel;

    title = title.replace(/^Administrator:\s*/i, '');

    const cmdDashMatch = title.match(
      /^(?:.*\\)?(?:cmd(?:\.exe)?|command prompt|powershell(?:\.exe)?|windows powershell|pwsh(?:\.exe)?)\s*[-–—:]\s*(.+)$/i
    );
    if (cmdDashMatch && cmdDashMatch[1]) {
      title = cmdDashMatch[1].trim();
    } else if (
      /^(?:.*\\)?(?:cmd(?:\.exe)?|command prompt|powershell(?:\.exe)?|windows powershell|pwsh(?:\.exe)?)$/i.test(
        title
      )
    ) {
      return fallbackLabel;
    }

    if (/aether-(?:init|cd|git|prompt|pushd|popd)\.(?:cmd|ps1)/i.test(title)) {
      return fallbackLabel;
    }

    if (/^[a-zA-Z]:\\/.test(title)) {
      const parts = title.split(/[\\/]/).filter(Boolean);
      const leaf = parts[parts.length - 1] || fallbackLabel;
      if (/^(?:cmd|powershell|pwsh)\.exe$/i.test(leaf)) {
        return fallbackLabel;
      }
      return leaf;
    }

    return title || fallbackLabel;
  }

  // Expose helper for automated testing
  window.__aetherSanitizeTabTitle = sanitizeTabTitle;

  function applySettingsToUI() {
    const theme = THEMES[settings.themeId] || THEMES['obsidian-glass'];

    const root = document.documentElement;
    for (const [prop, val] of Object.entries(theme.css)) {
      root.style.setProperty(prop, val);
    }

    themePillName.textContent = theme.name;
    appShell.classList.toggle('crt-enabled', Boolean(settings.scanlines));
    appShell.classList.toggle('opaque-mode', !settings.transparencyEnabled);

    const effectiveOpacity = settings.transparencyEnabled ? settings.opacity : 1;
    window.aetherAPI.setOpacity(effectiveOpacity);

    document.querySelectorAll('.theme-card').forEach((card) => {
      card.classList.toggle('active', card.dataset.themeId === settings.themeId);
    });
    selectFont.value = settings.fontId;
    rangeFontSize.value = String(settings.fontSize);
    valFontSize.textContent = `${settings.fontSize}px`;
    rangeLineHeight.value = String(settings.lineHeight);
    valLineHeight.textContent = Number(settings.lineHeight).toFixed(2);

    toggleTransparency.checked = Boolean(settings.transparencyEnabled);
    opacityControl.classList.toggle('disabled', !settings.transparencyEnabled);
    rangeOpacity.disabled = !settings.transparencyEnabled;
    rangeOpacity.value = String(settings.opacity);
    valOpacity.textContent = settings.transparencyEnabled
      ? `${Math.round(settings.opacity * 100)}%`
      : 'Off (100%)';

    toggleBlink.checked = Boolean(settings.cursorBlink);
    toggleScanlines.checked = Boolean(settings.scanlines);

    cursorStyleControl.querySelectorAll('.seg-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.cursor === settings.cursorStyle);
    });
    defaultShellControl.querySelectorAll('.seg-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.defaultShell === settings.defaultShell);
    });

    const fontFamily = getFontStack(settings.fontId);
    for (const tab of tabs.values()) {
      tab.term.options.theme = { ...theme.xterm };
      tab.term.options.fontFamily = fontFamily;
      tab.term.options.fontSize = settings.fontSize;
      tab.term.options.lineHeight = settings.lineHeight;
      tab.term.options.cursorStyle = settings.cursorStyle;
      tab.term.options.cursorBlink = settings.cursorBlink;
    }

    fitActiveTerminal();
    saveSettings();
  }

  function buildCustomizerOptions() {
    themeGrid.innerHTML = '';
    for (const id of THEME_ORDER) {
      const theme = THEMES[id];
      const card = document.createElement('button');
      card.className = 'theme-card';
      card.dataset.themeId = id;
      card.title = theme.tagline;

      const swatches = theme.swatches
        .map((c) => `<span class="theme-swatch" style="background:${c}"></span>`)
        .join('');

      card.innerHTML = `
        <div class="theme-swatches">${swatches}</div>
        <div class="theme-card-name">${theme.name}</div>
      `;

      card.addEventListener('click', () => {
        settings.themeId = id;
        settings.scanlines = Boolean(theme.scanlines);
        if (settings.transparencyEnabled) {
          settings.opacity = theme.defaultOpacity;
        }
        applySettingsToUI();
      });

      themeGrid.appendChild(card);
    }

    selectFont.innerHTML = '';
    for (const font of FONTS) {
      const opt = document.createElement('option');
      opt.value = font.id;
      opt.textContent = font.label;
      selectFont.appendChild(opt);
    }
  }

  function renderHelpModal() {
    const query = (helpSearchInput.value || '').trim().toLowerCase();
    helpBody.innerHTML = '';
    let renderedAny = false;

    const showCommands = helpFilterMode === 'all' || helpFilterMode === 'commands';
    const showShortcuts = helpFilterMode === 'all' || helpFilterMode === 'shortcuts';

    if (showCommands) {
      const matches = HELP_COMMANDS.filter(
        (c) => !query || c.cmd.toLowerCase().includes(query) || c.desc.toLowerCase().includes(query)
      );
      if (matches.length > 0) {
        renderedAny = true;
        const sec = document.createElement('div');
        sec.innerHTML = `<div class="help-section-title">Shell Commands</div>`;
        const list = document.createElement('div');
        list.className = 'help-list';

        for (const item of matches) {
          const btn = document.createElement('button');
          btn.className = 'help-item clickable';
          btn.type = 'button';
          btn.innerHTML = `
            <span class="help-item-cmd">${item.cmd}</span>
            <span class="help-item-desc">${item.desc}</span>
          `;
          btn.addEventListener('click', () => {
            if (activeTabId) {
              window.aetherAPI.writePty(activeTabId, item.insert);
              toggleHelp(false);
              const tab = tabs.get(activeTabId);
              if (tab) tab.term.focus();
              showToast(`Inserted "${item.insert.trim()}"`);
            }
          });
          list.appendChild(btn);
        }
        sec.appendChild(list);
        helpBody.appendChild(sec);
      }
    }

    if (showShortcuts) {
      const matches = HELP_SHORTCUTS.filter(
        (s) => !query || s.keys.toLowerCase().includes(query) || s.desc.toLowerCase().includes(query)
      );
      if (matches.length > 0) {
        renderedAny = true;
        const sec = document.createElement('div');
        sec.innerHTML = `<div class="help-section-title">Keyboard Shortcuts</div>`;
        const list = document.createElement('div');
        list.className = 'help-list';

        for (const item of matches) {
          const row = document.createElement('div');
          row.className = 'help-item';
          row.innerHTML = `
            <span class="help-item-desc">${item.desc}</span>
            <kbd class="help-item-kbd">${item.keys}</kbd>
          `;
          list.appendChild(row);
        }
        sec.appendChild(list);
        helpBody.appendChild(sec);
      }
    }

    if (!renderedAny) {
      helpBody.innerHTML = `<div class="help-empty">No commands or shortcuts match "${query}"</div>`;
    }
  }

  function toggleHelp(force) {
    const willOpen = typeof force === 'boolean' ? force : helpBackdrop.hidden;
    helpBackdrop.hidden = !willOpen;
    if (willOpen) {
      toggleDrawer(false);
      helpSearchInput.value = '';
      renderHelpModal();
      requestAnimationFrame(() => helpSearchInput.focus());
    } else if (activeTabId && tabs.has(activeTabId)) {
      tabs.get(activeTabId).term.focus();
    }
  }

  function toggleSearch(force) {
    const willOpen = typeof force === 'boolean' ? force : searchBar.hidden;
    searchBar.hidden = !willOpen;
    if (willOpen) {
      requestAnimationFrame(() => {
        searchInput.focus();
        searchInput.select();
      });
    } else {
      const tab = activeTabId ? tabs.get(activeTabId) : null;
      if (tab && tab.searchAddon) {
        try {
          tab.searchAddon.clearDecorations();
        } catch (_) {}
      }
      if (tab) tab.term.focus();
    }
  }

  function runTerminalSearch(backward = false) {
    const tab = activeTabId ? tabs.get(activeTabId) : null;
    if (!tab || !tab.searchAddon) return;
    const q = searchInput.value;
    if (!q) {
      try {
        tab.searchAddon.clearDecorations();
      } catch (_) {}
      return;
    }
    if (backward) {
      tab.searchAddon.findPrevious(q);
    } else {
      tab.searchAddon.findNext(q);
    }
  }

  function fitActiveTerminal() {
    if (!activeTabId) return;
    const tab = tabs.get(activeTabId);
    if (!tab) return;
    try {
      tab.fitAddon.fit();
      const { cols, rows } = tab.term;
      window.aetherAPI.resizePty(tab.id, cols, rows);
    } catch (_) {}
  }

  function updateStatusBarGit(tab) {
    if (!tab || !tab.gitBranch) {
      statusGitPill.hidden = true;
      statusGitBranch.textContent = '';
      statusGitDirty.hidden = true;
      return;
    }
    statusGitPill.hidden = false;
    statusGitBranch.textContent = tab.gitBranch;
    statusGitDirty.hidden = !tab.gitDirty;
    statusGitPill.title = tab.gitDirty
      ? `Git branch: ${tab.gitBranch} (uncommitted changes)`
      : `Git branch: ${tab.gitBranch} (clean)`;
  }

  function activateTab(id) {
    if (!tabs.has(id)) return;
    activeTabId = id;

    for (const [tabId, tab] of tabs) {
      const isActive = tabId === id;
      tab.tabEl.classList.toggle('active', isActive);
      tab.tabEl.setAttribute('aria-selected', String(isActive));
      tab.paneEl.classList.toggle('active', isActive);
    }

    const activeTab = tabs.get(id);
    statusShellText.textContent = activeTab.label;
    updateStatusBarGit(activeTab);

    requestAnimationFrame(() => {
      fitActiveTerminal();
      activeTab.term.focus();
    });
  }

  function closeTab(id) {
    const tab = tabs.get(id);
    if (!tab) return;

    const orderedIds = Array.from(tabs.keys());
    const idx = orderedIds.indexOf(id);

    window.aetherAPI.killPty(id);
    tab.term.dispose();
    tab.tabEl.remove();
    tab.paneEl.remove();
    tabs.delete(id);

    if (tabs.size === 0) {
      window.aetherAPI.closeWindow();
      return;
    }

    if (activeTabId === id) {
      const nextId = orderedIds[idx + 1] || orderedIds[idx - 1];
      if (nextId && tabs.has(nextId)) {
        activateTab(nextId);
      }
    }
  }

  async function createTab(shellType = settings.defaultShell) {
    const theme = THEMES[settings.themeId] || THEMES['obsidian-glass'];
    const num = ++tabCounter;

    const paneEl = document.createElement('div');
    paneEl.className = 'terminal-pane';
    terminalStage.appendChild(paneEl);

    const TerminalCtor = window.Terminal;
    const FitAddonCtor = window.FitAddon.FitAddon;
    const WebLinksAddonCtor = window.WebLinksAddon.WebLinksAddon;
    const SearchAddonCtor = window.SearchAddon && window.SearchAddon.SearchAddon;
    const WebglAddonCtor = window.WebglAddon && window.WebglAddon.WebglAddon;
    const ImageAddonCtor = window.ImageAddon && window.ImageAddon.ImageAddon;

    const term = new TerminalCtor({
      allowTransparency: true,
      customGlyphs: true,
      fontFamily: getFontStack(settings.fontId),
      fontSize: settings.fontSize,
      lineHeight: settings.lineHeight,
      cursorStyle: settings.cursorStyle,
      cursorBlink: settings.cursorBlink,
      scrollback: 5000,
      theme: { ...theme.xterm },
      windowsMode: false,
    });

    const fitAddon = new FitAddonCtor();
    const webLinksAddon = new WebLinksAddonCtor((_event, uri) => {
      window.aetherAPI.openExternal(uri);
    });
    const searchAddon = SearchAddonCtor ? new SearchAddonCtor() : null;

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    if (searchAddon) term.loadAddon(searchAddon);
    term.open(paneEl);

    // Hardware-accelerated GPU rendering for gapless block glyphs
    if (WebglAddonCtor) {
      try {
        const webglAddon = new WebglAddonCtor();
        webglAddon.onContextLoss(() => {
          try {
            webglAddon.dispose();
          } catch (_) {}
        });
        term.loadAddon(webglAddon);
      } catch (_) {}
    }

    // Inline terminal graphics (Sixel & iTerm2 OSC 1337)
    if (ImageAddonCtor) {
      try {
        const imageAddon = new ImageAddonCtor({
          enableSizeReports: true,
          sixelSupport: true,
          sixelScrolling: true,
          sixelPaletteLimit: 256,
          iipSupport: true,
          showPlaceholder: false,
        });
        term.loadAddon(imageAddon);
      } catch (_) {}
    }

    let cols = 100;
    let rows = 30;
    try {
      fitAddon.fit();
      cols = term.cols || 100;
      rows = term.rows || 30;
    } catch (_) {}

    const info = await window.aetherAPI.createPty({ shellType, cols, rows });
    const id = info.id;

    const defaultTabTitle =
      shellType === 'powershell'
        ? num === 1 ? 'PowerShell' : `PowerShell · ${num}`
        : num === 1 ? 'Aether' : `Aether · ${num}`;

    const tabEl = document.createElement('div');
    tabEl.className = 'tab-item';
    tabEl.setAttribute('role', 'tab');
    tabEl.dataset.tabId = id;

    const badgeClass = shellType === 'powershell' ? 'tab-badge ps' : 'tab-badge';
    const badgeText = shellType === 'powershell' ? 'PS' : '>_';

    tabEl.innerHTML = `
      <span class="${badgeClass}">${badgeText}</span>
      <span class="tab-title">${defaultTabTitle}</span>
      <button class="tab-close" title="Close Tab (Ctrl+W)" aria-label="Close tab">&times;</button>
    `;

    tabEl.addEventListener('click', (e) => {
      if (e.target.closest('.tab-close')) return;
      activateTab(id);
    });

    // Middle-click to close tab
    tabEl.addEventListener('auxclick', (e) => {
      if (e.button === 1) {
        e.preventDefault();
        closeTab(id);
      }
    });

    tabEl.querySelector('.tab-close').addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(id);
    });

    tabsContainer.appendChild(tabEl);

    const tabEntry = {
      id,
      shellType,
      label: info.label,
      defaultTabTitle,
      gitBranch: '',
      gitDirty: false,
      paneEl,
      tabEl,
      term,
      fitAddon,
      searchAddon,
    };
    tabs.set(id, tabEntry);

    // Track live Git branch via OSC 9999 emitted by Aether shell prompts
    if (term.parser && typeof term.parser.registerOscHandler === 'function') {
      term.parser.registerOscHandler(9999, (data) => {
        if (typeof data !== 'string' || !data.startsWith('aether_git:')) {
          return false;
        }
        const payload = data.slice('aether_git:'.length);
        if (!payload) {
          tabEntry.gitBranch = '';
          tabEntry.gitDirty = false;
        } else {
          const sep = payload.indexOf(':');
          if (sep !== -1) {
            tabEntry.gitDirty = payload.slice(0, sep) === '1';
            tabEntry.gitBranch = payload.slice(sep + 1).trim();
          } else {
            tabEntry.gitDirty = false;
            tabEntry.gitBranch = payload.trim();
          }
        }
        if (activeTabId === id) {
          updateStatusBarGit(tabEntry);
        }
        return true;
      });
    }

    term.onData((data) => {
      window.aetherAPI.writePty(id, data);
    });

    term.onTitleChange((title) => {
      const cleaned = sanitizeTabTitle(title, defaultTabTitle);
      const titleEl = tabEl.querySelector('.tab-title');
      if (titleEl) {
        titleEl.textContent = cleaned;
        titleEl.title = cleaned;
      }
    });

    // Right-click: copy selection if any, otherwise paste
    paneEl.addEventListener('contextmenu', async (e) => {
      e.preventDefault();
      if (term.hasSelection()) {
        await navigator.clipboard.writeText(term.getSelection());
        term.clearSelection();
        showToast('Copied to clipboard');
      } else {
        try {
          const text = await navigator.clipboard.readText();
          if (text) window.aetherAPI.writePty(id, text);
        } catch (_) {}
      }
    });

    // App-level shortcuts pass through xterm
    term.attachCustomKeyEventHandler((ev) => {
      if (ev.type !== 'keydown') return true;
      if (ev.key === 'F1') return false;
      const ctrl = ev.ctrlKey && !ev.altKey;
      if (ctrl && ev.shiftKey && ev.code === 'KeyC') {
        if (term.hasSelection()) {
          navigator.clipboard.writeText(term.getSelection());
          showToast('Copied to clipboard');
        }
        return false;
      }
      if (ctrl && ev.shiftKey && ev.code === 'KeyV') {
        navigator.clipboard.readText().then((text) => {
          if (text) window.aetherAPI.writePty(id, text);
        });
        return false;
      }
      if (
        ctrl &&
        (ev.code === 'KeyT' ||
          ev.code === 'KeyW' ||
          ev.code === 'KeyF' ||
          ev.code === 'KeyL' ||
          ev.code === 'Tab' ||
          ev.code === 'Comma' ||
          ev.code === 'Slash' ||
          ev.code === 'Equal' ||
          ev.code === 'Minus' ||
          ev.code === 'Digit0' ||
          /^Digit[1-9]$/.test(ev.code))
      ) {
        return false;
      }
      return true;
    });

    activateTab(id);
  }

  // PTY IPC Listeners
  window.aetherAPI.onPtyData(({ id, data }) => {
    const tab = tabs.get(id);
    if (tab) {
      tab.term.write(data);
    }
  });

  window.aetherAPI.onPtyExit(({ id }) => {
    if (tabs.has(id)) {
      closeTab(id);
    }
  });

  // Sync maximize / restore icon state
  window.aetherAPI.onWindowState(({ maximized }) => {
    iconMaximize.hidden = Boolean(maximized);
    iconRestore.hidden = !maximized;
  });

  // Resize observer
  const resizeObserver = new ResizeObserver(() => {
    fitActiveTerminal();
  });
  resizeObserver.observe(terminalStage);

  // Titlebar & Drawer Controls
  btnNewTab.addEventListener('click', () => createTab(settings.defaultShell));

  btnShellMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    shellDropdown.hidden = !shellDropdown.hidden;
  });

  shellDropdown.querySelectorAll('.dropdown-item').forEach((item) => {
    item.addEventListener('click', () => {
      shellDropdown.hidden = true;
      createTab(item.dataset.shell);
    });
  });

  document.addEventListener('click', (e) => {
    if (!shellDropdown.hidden && !e.target.closest('.new-tab-group')) {
      shellDropdown.hidden = true;
    }
  });

  btnCycleTheme.addEventListener('click', () => {
    const idx = THEME_ORDER.indexOf(settings.themeId);
    const nextId = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
    const nextTheme = THEMES[nextId];
    settings.themeId = nextId;
    settings.scanlines = Boolean(nextTheme.scanlines);
    if (settings.transparencyEnabled) {
      settings.opacity = nextTheme.defaultOpacity;
    }
    applySettingsToUI();
  });

  function toggleDrawer(force) {
    const isOpen = typeof force === 'boolean' ? force : !drawer.classList.contains('open');
    drawer.classList.toggle('open', isOpen);
    drawer.setAttribute('aria-hidden', String(!isOpen));
    if (isOpen) {
      helpBackdrop.hidden = true;
    }
  }

  btnSettings.addEventListener('click', () => toggleDrawer());
  btnCloseDrawer.addEventListener('click', () => toggleDrawer(false));

  // Search bar handlers
  btnSearch.addEventListener('click', () => toggleSearch());
  btnSearchClose.addEventListener('click', () => toggleSearch(false));
  btnSearchNext.addEventListener('click', () => runTerminalSearch(false));
  btnSearchPrev.addEventListener('click', () => runTerminalSearch(true));
  searchInput.addEventListener('input', () => runTerminalSearch(false));
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runTerminalSearch(e.shiftKey);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      toggleSearch(false);
    }
  });

  // Help Modal (?) handlers
  btnHelp.addEventListener('click', () => toggleHelp());
  btnCloseHelp.addEventListener('click', () => toggleHelp(false));
  helpBackdrop.addEventListener('click', (e) => {
    if (e.target === helpBackdrop) toggleHelp(false);
  });
  helpSearchInput.addEventListener('input', renderHelpModal);
  helpTabs.querySelectorAll('.help-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      helpFilterMode = btn.dataset.filter;
      helpTabs.querySelectorAll('.help-tab').forEach((b) => {
        b.classList.toggle('active', b === btn);
      });
      renderHelpModal();
    });
  });

  // Window control buttons
  document.getElementById('btn-minimize').addEventListener('click', () => window.aetherAPI.minimizeWindow());
  document.getElementById('btn-maximize').addEventListener('click', () => window.aetherAPI.maximizeWindow());
  document.getElementById('btn-close').addEventListener('click', () => window.aetherAPI.closeWindow());

  // Customizer input handlers
  selectFont.addEventListener('change', () => {
    settings.fontId = selectFont.value;
    applySettingsToUI();
  });

  rangeFontSize.addEventListener('input', () => {
    settings.fontSize = Number(rangeFontSize.value);
    applySettingsToUI();
  });

  rangeLineHeight.addEventListener('input', () => {
    settings.lineHeight = Number(rangeLineHeight.value);
    applySettingsToUI();
  });

  toggleTransparency.addEventListener('change', () => {
    settings.transparencyEnabled = toggleTransparency.checked;
    applySettingsToUI();
  });

  rangeOpacity.addEventListener('input', () => {
    settings.opacity = Number(rangeOpacity.value);
    applySettingsToUI();
  });

  toggleBlink.addEventListener('change', () => {
    settings.cursorBlink = toggleBlink.checked;
    applySettingsToUI();
  });

  toggleScanlines.addEventListener('change', () => {
    settings.scanlines = toggleScanlines.checked;
    applySettingsToUI();
  });

  if (window.aetherAPI.getExplorerIntegration) {
    window.aetherAPI.getExplorerIntegration().then((res) => {
      if (!res || !res.supported) {
        if (rowExplorerIntegration) rowExplorerIntegration.style.display = 'none';
        return;
      }
      toggleExplorer.checked = Boolean(res.enabled);
    });

    toggleExplorer.addEventListener('change', async () => {
      const want = toggleExplorer.checked;
      const res = await window.aetherAPI.setExplorerIntegration(want);
      toggleExplorer.checked = Boolean(res && res.enabled);
      if (res && res.ok) {
        showToast(want ? 'Added "Open in Aether" to Explorer' : 'Removed from File Explorer');
      } else {
        showToast('Could not update Explorer integration');
      }
    });
  }

  cursorStyleControl.querySelectorAll('.seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      settings.cursorStyle = btn.dataset.cursor;
      applySettingsToUI();
    });
  });

  defaultShellControl.querySelectorAll('.seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      settings.defaultShell = btn.dataset.defaultShell;
      applySettingsToUI();
    });
  });

  // Global keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.key === 'F1') {
      e.preventDefault();
      toggleHelp();
      return;
    }

    if (e.key === 'Escape') {
      if (!helpBackdrop.hidden) {
        toggleHelp(false);
        return;
      }
      if (!searchBar.hidden) {
        toggleSearch(false);
        return;
      }
      if (drawer.classList.contains('open')) {
        toggleDrawer(false);
        return;
      }
    }

    if (!e.ctrlKey || e.altKey) return;

    if (e.code === 'KeyT') {
      e.preventDefault();
      if (e.shiftKey) {
        const altShell = settings.defaultShell === 'cmd' ? 'powershell' : 'cmd';
        createTab(altShell);
      } else {
        createTab(settings.defaultShell);
      }
    } else if (e.code === 'KeyW') {
      e.preventDefault();
      if (activeTabId) closeTab(activeTabId);
    } else if (e.code === 'KeyF') {
      e.preventDefault();
      toggleSearch(true);
    } else if (e.code === 'KeyL') {
      e.preventDefault();
      if (activeTabId) {
        const tab = tabs.get(activeTabId);
        if (tab) {
          tab.term.clear();
          window.aetherAPI.writePty(activeTabId, 'cls\r');
        }
      }
    } else if (e.code === 'Comma') {
      e.preventDefault();
      toggleDrawer();
    } else if (e.code === 'Slash') {
      e.preventDefault();
      toggleHelp();
    } else if (e.code === 'Tab') {
      e.preventDefault();
      const ids = Array.from(tabs.keys());
      if (ids.length < 2) return;
      const idx = ids.indexOf(activeTabId);
      const nextIdx = e.shiftKey
        ? (idx - 1 + ids.length) % ids.length
        : (idx + 1) % ids.length;
      activateTab(ids[nextIdx]);
    } else if (/^Digit[1-9]$/.test(e.code)) {
      const targetIdx = Number(e.code.replace('Digit', '')) - 1;
      const ids = Array.from(tabs.keys());
      if (ids[targetIdx]) {
        e.preventDefault();
        activateTab(ids[targetIdx]);
      }
    } else if (e.code === 'Equal') {
      e.preventDefault();
      settings.fontSize = Math.min(22, settings.fontSize + 1);
      applySettingsToUI();
    } else if (e.code === 'Minus') {
      e.preventDefault();
      settings.fontSize = Math.max(11, settings.fontSize - 1);
      applySettingsToUI();
    } else if (e.code === 'Digit0') {
      e.preventDefault();
      settings.fontSize = 14;
      applySettingsToUI();
    }
  });

  // Boot
  buildCustomizerOptions();
  applySettingsToUI();
  createTab(settings.defaultShell);
})();
