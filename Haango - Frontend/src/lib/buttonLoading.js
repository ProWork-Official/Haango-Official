const loadingSelector = 'button[data-loading="true"]';

function clearLoadingButtons() {
  document.querySelectorAll(loadingSelector).forEach((button) => {
    button.removeAttribute('data-loading');
    button.removeAttribute('aria-busy');
    button.disabled = false;
  });
}

export function installGlobalButtonLoading() {
  let activeRequests = 0;
  let navigationTimer;
  const originalFetch = window.fetch.bind(window);

  const handleClick = (event) => {
    const button = event.target.closest?.('button');
    if (!button || button.disabled || button.dataset.noLoading === 'true') return;

    button.dataset.loading = 'true';
    button.setAttribute('aria-busy', 'true');
    button.disabled = true;
    window.clearTimeout(navigationTimer);
    navigationTimer = window.setTimeout(() => {
      if (activeRequests === 0) clearLoadingButtons();
    }, 1200);
  };

  const trackedFetch = (...args) => {
    activeRequests += 1;
    return originalFetch(...args).finally(() => {
      activeRequests = Math.max(0, activeRequests - 1);
      if (activeRequests === 0) {
        window.setTimeout(clearLoadingButtons, 80);
      }
    });
  };

  document.addEventListener('click', handleClick, true);
  window.fetch = trackedFetch;

  return () => {
    document.removeEventListener('click', handleClick, true);
    window.fetch = originalFetch;
    window.clearTimeout(navigationTimer);
    clearLoadingButtons();
  };
}
