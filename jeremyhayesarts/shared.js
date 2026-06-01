(() => {
  const cacheVersion = 'shared-3';
  const pages = [
    { href: 'index.html', label: 'Home' },
    { href: 'gallery.html', label: 'Gallery' },
    { href: 'dreamscapes.html', label: 'Dreamscapes' },
    { href: 'commissions.html', label: 'Commissions' },
    { href: 'request.html', label: 'Request' },
    { href: 'model-agreement.html', label: 'Models' },
    { href: 'https://jeremyhayesarts.printify.me/', label: 'Store', external: true },
    { href: 'about.html', label: 'About' },
    { href: 'contact.html', label: 'Contact' }
  ];

  const footerLinks = [
    { href: 'mailto:jeremyhayes@jeremyhayesarts.com', label: 'Email' },
    { href: 'model-agreement.html', label: 'Model Agreement' },
    { href: 'https://www.instagram.com/jeremyhayesarts/', label: '@jeremyhayesarts', external: true },
    { href: 'https://www.facebook.com/share/1DHbp1F35e/?mibextid=wwXIfr', label: 'Facebook', external: true },
    { href: 'https://jeremyhayesarts.printify.me/', label: 'Printify Store', external: true }
  ];

  function ensureSharedCss() {
    if (document.querySelector('link[data-jha-shared-css]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `shared.css?v=${cacheVersion}`;
    link.setAttribute('data-jha-shared-css', 'true');
    document.head.appendChild(link);
  }

  function getCurrentPage() {
    const file = window.location.pathname.split('/').pop();
    return file || 'index.html';
  }

  function getSubtitle() {
    const file = getCurrentPage();
    const map = {
      'index.html': 'Fantasy Realism • Dreamscapes • Original Work',
      'gallery.html': 'Personal Gallery',
      'dreamscapes.html': 'Dreamscapes',
      'commissions.html': 'Commissions',
      'request.html': 'Artwork Request',
      'model-agreement.html': 'Model Agreement',
      'about.html': 'About',
      'contact.html': 'Contact'
    };
    return map[file] || 'Fantasy Realism • Dreamscapes • Original Work';
  }

  function buildHeader() {
    const current = getCurrentPage();
    const nav = pages.map((page) => {
      const active = page.href === current ? ' aria-current="page"' : '';
      const externalAttrs = page.external ? ' target="_blank" rel="noopener"' : '';
      return `<a href="${page.href}"${active}${externalAttrs}>${page.label}</a>`;
    }).join('');

    return `
      <header class="site-header jha-shared-header" id="top">
        <a class="brand" href="index.html" aria-label="Jeremy Hayes Arts home">
          <span class="brand-mark">JHA</span>
          <span class="brand-text">
            <strong>Jeremy Hayes Arts</strong>
            <small>${getSubtitle()}</small>
          </span>
        </a>
        <nav class="site-nav" aria-label="Main navigation">${nav}</nav>
      </header>
    `;
  }

  function buildFooter() {
    const links = footerLinks.map((link) => {
      const attrs = link.external ? ' target="_blank" rel="noopener"' : '';
      return `<a class="jha-footer-button" href="${link.href}"${attrs}>${link.label}</a>`;
    }).join('');

    return `
      <footer class="site-footer jha-shared-footer">
        <div class="jha-footer-brand">
          <strong>Jeremy Hayes Arts</strong>
          <span>Fantasy realism, Dreamscapes, commissions, prints, merch, and original work.</span>
          <small>© 2026 Jeremy Hayes Arts.</small>
        </div>
        <nav class="jha-footer-links" aria-label="Footer links">${links}</nav>
      </footer>
    `;
  }

  function replaceSharedParts() {
    ensureSharedCss();

    const oldHeader = document.querySelector('.site-header');
    if (oldHeader) oldHeader.outerHTML = buildHeader();

    const oldFooter = document.querySelector('.site-footer');
    if (oldFooter) oldFooter.outerHTML = buildFooter();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', replaceSharedParts);
  } else {
    replaceSharedParts();
  }
})();
