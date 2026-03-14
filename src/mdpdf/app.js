// MD to PDF Application Logic
// All computational code lives here. Event handlers attach via DOMContentLoaded.

(function() {
  'use strict';

  // ==================== DOM ELEMENT REFERENCES ====================
  let markdownInput, preview, downloadBtn, copyHtmlBtn, clearBtn, btnText, toast;
  let installBanner, installBtn, dropOverlay, svgToPngToggle, printContainer;

  // ==================== STATE ====================
  let deferredPrompt;
  let dragCounter = 0;
  let mermaidId = 0;

  // ==================== INITIALIZATION ====================
  function initializeElements() {
    markdownInput = document.getElementById('markdown');
    preview = document.getElementById('preview');
    downloadBtn = document.getElementById('downloadBtn');
    copyHtmlBtn = document.getElementById('copyHtmlBtn');
    clearBtn = document.getElementById('clearBtn');
    btnText = document.getElementById('btnText');
    toast = document.getElementById('toast');
    installBanner = document.getElementById('installBanner');
    installBtn = document.getElementById('installBtn');
    dropOverlay = document.getElementById('dropOverlay');
    svgToPngToggle = document.getElementById('svgToPngToggle');
    printContainer = document.getElementById('printContainer');
  }

  function initializeMermaid() {
    if (typeof mermaid !== 'undefined') {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        fontFamily: 'system-ui, sans-serif',
        // Prevent external font loading by using system fonts only
        themeCSS: `
          * { font-family: system-ui, -apple-system, sans-serif !important; }
        `,
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'basis'
        },
        sequence: { useMaxWidth: true },
        gantt: { useMaxWidth: true },
        // Disable external image loading
        mindmap: { useMaxWidth: true }
      });
    }
  }

  function initializeMarked() {
    if (typeof marked !== 'undefined') {
      marked.setOptions({ breaks: true, gfm: true });
    }
  }

  // ==================== UTILITY FUNCTIONS ====================
  function debounce(fn, delay) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  // ==================== MATH PROTECTION ====================
  // Protect math regions from marked.js processing (breaks: true converts
  // newlines to <br>, and underscores/backslashes can be mangled).
  function protectMath(text) {
    const regions = [];
    let idx = 0;

    function replacer(match) {
      const placeholder = `MATHPH${idx}ENDPH`;
      regions.push({ placeholder, content: match });
      idx++;
      return placeholder;
    }

    // Block math: $$...$$ (may span multiple lines)
    text = text.replace(/\$\$([\s\S]*?)\$\$/g, replacer);
    // Block math: \[...\]
    text = text.replace(/\\\[([\s\S]*?)\\\]/g, replacer);
    // Inline math: $...$  (single line only, non-greedy)
    text = text.replace(/\$([^\$\n]+?)\$/g, replacer);
    // Inline math: \(...\)
    text = text.replace(/\\\((.+?)\\\)/g, replacer);

    return { text, regions };
  }

  function restoreMath(html, regions) {
    for (const { placeholder, content } of regions) {
      html = html.replace(placeholder, content);
    }
    return html;
  }

  // ==================== SVG TO PNG CONVERSION ====================
  async function convertSvgToPng(svgElement) {
    try {
      // Get the parent .mermaid container which has proper styling
      const parentContainer = svgElement.closest('.mermaid') || svgElement.parentElement;
      const svg = svgElement;

      let width = 800;
      let height = 600;
      const viewBoxAttr = svg.getAttribute('viewBox');
      if (viewBoxAttr) {
        const parts = viewBoxAttr.trim().split(/\s+/);
        if (parts.length >= 4) {
          width = Math.max(100, Math.ceil(parseFloat(parts[2])));
          height = Math.max(50, Math.ceil(parseFloat(parts[3])));
        }
      } else {
        // Fallback
        width = parseFloat(svg.getAttribute('width')) || 800;
        height = parseFloat(svg.getAttribute('height')) || 600;
      }
      // Allowance for .mermaid padding: 20px each side
      width += 40;
      height += 40;

      console.log('Using viewBox dimensions:', width, 'x', height);

      // Clone the PARENT container (not just SVG) to preserve styles
      const clone = parentContainer.cloneNode(true);
      clone.style.position = 'static';
      clone.style.visibility = 'visible';

      // The element must be fully visible for html2canvas to render it.
      // An opaque overlay (managed by convertSvgsToPngs) hides it from view.
      const tempWrapper = document.createElement('div');
      tempWrapper.style.position = 'fixed';
      tempWrapper.style.left = '0';
      tempWrapper.style.top = '0';
      tempWrapper.style.width = width + 'px';
      tempWrapper.style.height = height + 'px';
      tempWrapper.style.zIndex = '2147483646';
      tempWrapper.style.pointerEvents = 'none';
      tempWrapper.appendChild(clone);
      document.body.appendChild(tempWrapper);

      // Force reflow
      tempWrapper.offsetHeight;

      // Small delay for rendering
      await new Promise(resolve => setTimeout(resolve, 100));

      if (typeof html2canvas === 'undefined') {
        console.error('html2canvas library not loaded');
        document.body.removeChild(tempWrapper);
        return null;
      }

      // Capture the cloned container (fully visible, behind the overlay)
      const canvas = await html2canvas(clone, {
        scale: window.devicePixelRatio || 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#f8fafc',
        logging: true,
        width: width,
        height: height,
        foreignObjectRendering: true
      });

      console.log('Canvas created:', canvas.width, 'x', canvas.height);

      // Clean up
      document.body.removeChild(tempWrapper);

      // Convert to PNG
      const dataUrl = canvas.toDataURL('image/png');
      console.log('PNG data URL length:', dataUrl.length);

      return dataUrl;
    } catch (err) {
      console.error('html2canvas conversion error:', err);
      return null;
    }
  }

  async function convertSvgsToPngs(element) {
    // Find SVGs within .mermaid containers specifically
    const mermaidContainers = element.querySelectorAll('.mermaid');
    console.log(`Found ${mermaidContainers.length} .mermaid container(s) to convert`);

    if (mermaidContainers.length === 0) return;

    // Add an opaque overlay matching the page background so the fully-visible
    // temp elements used by html2canvas are hidden from the user.
    const conversionOverlay = document.createElement('div');
    conversionOverlay.style.cssText =
      'position:fixed;inset:0;z-index:2147483647;' +
      'background:linear-gradient(135deg,#e0e7ff 0%,#c7d2fe 50%,#ddd6fe 100%);' +
      'display:flex;align-items:center;justify-content:center;flex-direction:column;' +
      'pointer-events:none;';

    const spinnerKeyframes = document.createElement('style');
    spinnerKeyframes.textContent =
      '@keyframes mdpdf-spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}';
    conversionOverlay.appendChild(spinnerKeyframes);

    const spinner = document.createElement('div');
    spinner.style.cssText =
      'width:40px;height:40px;border:4px solid #a5b4fc;' +
      'border-top-color:#4f46e5;border-radius:50%;' +
      'animation:mdpdf-spin .8s linear infinite;margin-bottom:16px;';
    conversionOverlay.appendChild(spinner);

    const overlayMsg = document.createElement('div');
    overlayMsg.textContent = 'Rendering diagrams\u2026';
    overlayMsg.style.cssText =
      'color:#4338ca;font-family:system-ui,sans-serif;font-size:1.1rem;' +
      'font-weight:500;letter-spacing:0.02em;';
    conversionOverlay.appendChild(overlayMsg);

    document.body.appendChild(conversionOverlay);

    try {
      for (let i = 0; i < mermaidContainers.length; i++) {
        const container = mermaidContainers[i];
        const svg = container.querySelector('svg');

        if (!svg) {
          console.warn(`No SVG found in container ${i + 1}`);
          continue;
        }

        console.log(`Converting container ${i + 1}/${mermaidContainers.length}...`);

        try {
          const pngData = await convertSvgToPng(svg);

          if (pngData) {
            const img = document.createElement('img');
            img.src = pngData;
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.alt = 'Converted diagram';
            img.className = 'mermaid-png';

            // Replace the entire .mermaid container content
            container.innerHTML = '';
            container.appendChild(img);
            console.log(`Container ${i + 1} converted successfully`);
          } else {
            console.warn(`Container ${i + 1} conversion failed`);
          }
        } catch (err) {
          console.error(`Container ${i + 1} conversion failed:`, err);
        }
      }
    } finally {
      // Always remove the overlay, even if an error occurred
      document.body.removeChild(conversionOverlay);
    }
  }

  // ==================== RENDERING ====================
  async function renderMermaid() {
    const codeBlocks = preview.querySelectorAll('code.language-mermaid');

    for (const code of codeBlocks) {
      const pre = code.parentElement;
      const mermaidCode = code.textContent;

      const div = document.createElement('div');
      div.className = 'mermaid';
      mermaidId++;
      div.id = `mermaid-${mermaidId}`;

      try {
        const { svg } = await mermaid.render(`mermaid-${mermaidId}-svg`, mermaidCode);
        div.innerHTML = svg;
      } catch (err) {
        div.innerHTML = `<pre style="color: #ef4444; background: #fef2f2; padding: 10px; border-radius: 4px;">Mermaid Error: ${err.message}</pre>`;
      }

      pre.replaceWith(div);
    }
  }

  function renderMath() {
    if (typeof renderMathInElement !== 'undefined') {
      renderMathInElement(preview, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\[', right: '\\]', display: true },
          { left: '\\(', right: '\\)', display: false }
        ],
        throwOnError: false,
        errorColor: '#ef4444'
      });
    }
  }

  async function updatePreview() {
    const md = markdownInput.value.trim();

    if (!md) {
      preview.innerHTML = `
        <div class="empty-state">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          <p>Your preview will appear here</p>
        </div>
      `;
      downloadBtn.disabled = true;
      copyHtmlBtn.disabled = true;
      return;
    }

    mermaidId = 0;
    const { text: safeMd, regions } = protectMath(md);
    const html = restoreMath(marked.parse(safeMd), regions);
    preview.innerHTML = html;

    // Always enable buttons when there's content, even if rendering fails
    downloadBtn.disabled = false;
    copyHtmlBtn.disabled = false;

    try {
      await renderMermaid();
      renderMath();
    } catch (err) {
      console.error('Rendering error:', err);
    }
  }

  // ==================== PWA & SERVICE WORKER ====================
  function showUpdatePrompt() {
    const banner = document.createElement('div');
    banner.className = 'update-banner';
    banner.innerHTML = `
      <span>🎉 A new version is available!</span>
      <button onclick="window.location.reload()">Update now</button>
      <button class="dismiss" onclick="this.parentElement.remove()">Later</button>
    `;
    document.body.appendChild(banner);
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => {
          console.log('Service Worker registered', reg.scope);
          reg.onupdatefound = () => {
            const newWorker = reg.installing;
            newWorker.onstatechange = () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                showUpdatePrompt();
              }
            };
          };

          // Periodically check for SW updates (every 60 minutes)
          // so long-lived / installed PWA sessions discover new versions
          setInterval(() => {
            reg.update().catch(() => {});
          }, 60 * 60 * 1000);
        })
        .catch((err) => console.log('Service Worker registration failed', err));

      // When a new service worker takes over, reload to get fresh assets
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  }

  function setupPWAInstall() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      installBanner.classList.add('show');
    });

    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        installBanner.classList.remove('show');
      }
      deferredPrompt = null;
    });

    window.addEventListener('appinstalled', () => {
      installBanner.classList.remove('show');
      showToast('App installed successfully!');
    });
  }

  function setupFileHandling() {
    if ('launchQueue' in window) {
      launchQueue.setConsumer(async (launchParams) => {
        if (launchParams.files && launchParams.files.length > 0) {
          const file = await launchParams.files[0].getFile();
          const text = await file.text();
          markdownInput.value = text;
          updatePreview();
          showToast(`Opened: ${file.name}`);
        }
      });
    }
  }

  // ==================== DRAG & DROP ====================
  function setupDragAndDrop() {
    document.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      if (e.dataTransfer.types.includes('Files')) {
        dropOverlay.classList.add('active');
      }
    });

    document.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter === 0) {
        dropOverlay.classList.remove('active');
      }
    });

    document.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    document.addEventListener('drop', async (e) => {
      e.preventDefault();
      dragCounter = 0;
      dropOverlay.classList.remove('active');

      const file = e.dataTransfer.files[0];
      const validTypes = ['text/plain', 'text/markdown'];
      const validExtensions = ['.md', '.markdown', '.txt'];

      const isValidType = validTypes.includes(file?.type);
      const hasValidExt = validExtensions.some(ext => file?.name?.toLowerCase().endsWith(ext));

      if (file && (isValidType || hasValidExt)) {
        const text = await file.text();
        markdownInput.value = text;
        updatePreview();
        showToast(`Opened: ${file.name}`);
      } else if (file) {
        showToast('Please drop a Markdown (.md) file');
      }
    });
  }

  // ==================== BUTTON HANDLERS ====================
  function setupButtonHandlers() {
    // Clear button
    clearBtn.addEventListener('click', () => {
      markdownInput.value = '';
      updatePreview();
    });

    // Copy HTML button
    copyHtmlBtn.addEventListener('click', async () => {
      if (!markdownInput.value.trim()) return;

      try {
        const clone = preview.cloneNode(true);

        if (svgToPngToggle.checked) {
          await convertSvgsToPngs(clone);
        }

        const html = clone.innerHTML;
        const blob = new Blob([html], { type: 'text/html' });
        const plainBlob = new Blob([html], { type: 'text/plain' });

        await navigator.clipboard.write([
          new ClipboardItem({ 'text/html': blob, 'text/plain': plainBlob })
        ]);
        showToast(svgToPngToggle.checked ? 'HTML with PNG images copied!' : 'HTML copied to clipboard!');
      } catch (err) {
        try {
          await navigator.clipboard.writeText(preview.innerHTML);
          showToast('Copied as plain text (rich text not supported)');
        } catch (e) {
          showToast('Failed to copy');
        }
      }
    });

    // Download PDF button
    downloadBtn.addEventListener('click', async () => {
      if (!markdownInput.value.trim()) return;

      printContainer.innerHTML = preview.innerHTML;

      if (svgToPngToggle.checked) {
        await convertSvgsToPngs(printContainer);
      } else {
        const svgs = printContainer.querySelectorAll('.mermaid svg');
        svgs.forEach(svg => {
          svg.style.maxWidth = '100%';
          svg.style.height = 'auto';
          svg.removeAttribute('width');
          if (!svg.getAttribute('viewBox') && svg.getAttribute('width') && svg.getAttribute('height')) {
            const w = svg.getAttribute('width');
            const h = svg.getAttribute('height');
            svg.setAttribute('viewBox', `0 0 ${parseFloat(w)} ${parseFloat(h)}`);
          }
        });
      }

      window.print();

      setTimeout(() => {
        printContainer.innerHTML = '';
      }, 1000);
    });
  }

  function setupInputHandler() {
    markdownInput.addEventListener('input', debounce(updatePreview, 300));
  }

  // ==================== MAIN INITIALIZATION ====================
  function init() {
    initializeElements();
    initializeMermaid();
    initializeMarked();
    registerServiceWorker();
    setupPWAInstall();
    setupFileHandling();
    setupDragAndDrop();
    setupButtonHandlers();
    setupInputHandler();
    updatePreview();
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
