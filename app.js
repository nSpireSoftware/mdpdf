// Initialize Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'system-ui, sans-serif',
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true
  },
  sequence: {
    useMaxWidth: true
  },
  gantt: {
    useMaxWidth: true
  }
});

const markdownInput = document.getElementById('markdown');
const preview = document.getElementById('preview');
const downloadBtn = document.getElementById('downloadBtn');
const copyHtmlBtn = document.getElementById('copyHtmlBtn');
const clearBtn = document.getElementById('clearBtn');
const btnText = document.getElementById('btnText');
const toast = document.getElementById('toast');
const installBanner = document.getElementById('installBanner');
const installBtn = document.getElementById('installBtn');
const dropOverlay = document.getElementById('dropOverlay');

let deferredPrompt;
let dragCounter = 0;
let mermaidId = 0;

// Drag and drop handling
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
  if (file && (file.name.endsWith('.md') || file.name.endsWith('.markdown') || file.name.endsWith('.txt') || file.type === 'text/plain' || file.type === 'text/markdown')) {
    const text = await file.text();
    markdownInput.value = text;
    updatePreview();
    showToast(`Opened: ${file.name}`);
  } else if (file) {
    showToast('Please drop a Markdown (.md) file');
  }
});

// PWA Install handling
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

// Service Worker Registration with update prompt
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

// Configure marked (default settings)
marked.setOptions({
  breaks: true,
  gfm: true
});

// Render mermaid diagrams (post-process)
async function renderMermaid() {
  // Find code blocks with language-mermaid class
  const codeBlocks = preview.querySelectorAll('code.language-mermaid');

  for (const code of codeBlocks) {
    const pre = code.parentElement;
    const mermaidCode = code.textContent;

    // Create mermaid container
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

    // Replace the pre>code with the rendered diagram
    pre.replaceWith(div);
  }
}

// Render LaTeX math
function renderMath() {
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

// Update preview
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

  // Reset mermaid ID counter for consistent rendering
  mermaidId = 0;

  // Parse markdown
  preview.innerHTML = marked.parse(md);

  // Render mermaid diagrams
  await renderMermaid();

  // Render math
  renderMath();

  downloadBtn.disabled = false;
  copyHtmlBtn.disabled = false;
}

// Debounce function
function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

markdownInput.addEventListener('input', debounce(updatePreview, 300));

// Clear button
clearBtn.addEventListener('click', () => {
  markdownInput.value = '';
  updatePreview();
});

// Copy HTML button
copyHtmlBtn.addEventListener('click', async () => {
  if (!markdownInput.value.trim()) return;

  try {
    const html = preview.innerHTML;
    const blob = new Blob([html], { type: 'text/html' });
    const plainBlob = new Blob([html], { type: 'text/plain' });

    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': blob,
        'text/plain': plainBlob
      })
    ]);
    showToast('HTML copied to clipboard!');
  } catch (err) {
    // Fallback: copy as plain text
    try {
      await navigator.clipboard.writeText(preview.innerHTML);
      showToast('Copied as plain text (rich text not supported)');
    } catch (e) {
      showToast('Failed to copy');
    }
  }
});

// Show toast
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// Download PDF via window.print() — produces selectable text & scalable vector SVGs
downloadBtn.addEventListener('click', () => {
  if (!markdownInput.value.trim()) return;

  const printContainer = document.getElementById('printContainer');

  // Clone the preview content into the print container
  printContainer.innerHTML = preview.innerHTML;

  // Ensure all Mermaid SVGs are properly sized for print
  const svgs = printContainer.querySelectorAll('.mermaid svg');
  svgs.forEach(svg => {
    svg.style.maxWidth = '100%';
    svg.style.height = 'auto';
    svg.removeAttribute('width');
    // Preserve viewBox for proper scaling
    if (!svg.getAttribute('viewBox') && svg.getAttribute('width') && svg.getAttribute('height')) {
      const w = svg.getAttribute('width');
      const h = svg.getAttribute('height');
      svg.setAttribute('viewBox', `0 0 ${parseFloat(w)} ${parseFloat(h)}`);
    }
  });

  // Trigger browser print dialog (user can choose "Save as PDF")
  window.print();

  // Clean up the print container after printing
  setTimeout(() => {
    printContainer.innerHTML = '';
  }, 1000);
});

// Handle files opened with the PWA (File Handling API)
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

// Initialize
updatePreview();
