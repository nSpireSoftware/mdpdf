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
        flowchart: { useMaxWidth: true, htmlLabels: true },
        sequence: { useMaxWidth: true },
        gantt: { useMaxWidth: true }
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

  // ==================== SVG TO PNG CONVERSION ====================
  async function convertSvgToPng(svgElement) {
    try {
      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(svgElement);

      let width, height;
      const viewBox = svgElement.getAttribute('viewBox');

      if (svgElement.hasAttribute('width') && svgElement.hasAttribute('height')) {
        width = parseFloat(svgElement.getAttribute('width'));
        height = parseFloat(svgElement.getAttribute('height'));
      }

      if ((!width || !height) && viewBox) {
        const viewBoxParts = viewBox.split(/\s+/);
        if (viewBoxParts.length === 4) {
          width = parseFloat(viewBoxParts[2]);
          height = parseFloat(viewBoxParts[3]);
        }
      }

      if ((!width || !height) && svgElement.getBoundingClientRect) {
        const rect = svgElement.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
      }

      if (!width || !height || width === 0 || height === 0) {
        width = 800;
        height = 600;
      }

      const scale = window.devicePixelRatio || 1;
      const canvasWidth = width * scale;
      const canvasHeight = height * scale;

      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d');

      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);
          ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(null);
        };
        img.src = url;
      });
    } catch (err) {
      console.error('SVG to PNG conversion error:', err);
      return null;
    }
  }

  async function convertSvgsToPngs(element) {
    const svgs = element.querySelectorAll('svg');
    const conversions = Array.from(svgs).map(svg => convertSvgToPng(svg));
    const pngDataUrls = await Promise.all(conversions);

    svgs.forEach((svg, index) => {
      const pngData = pngDataUrls[index];
      if (pngData) {
        const img = document.createElement('img');
        img.src = pngData;
        img.style.maxWidth = '100%';
        img.style.height = 'auto';

        const parentMermaid = svg.closest('.mermaid');
        if (parentMermaid) {
          img.className = 'mermaid-png';
        }

        svg.parentNode.replaceChild(img, svg);
      }
    });
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
    preview.innerHTML = marked.parse(md);
    await renderMermaid();
    renderMath();

    downloadBtn.disabled = false;
    copyHtmlBtn.disabled = false;
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
        })
        .catch((err) => console.log('Service Worker registration failed', err));
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
