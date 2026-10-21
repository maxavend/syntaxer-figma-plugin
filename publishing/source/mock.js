// Screenshot harness for dist/ui.html: plays the plugin side with sample variables.
// Query params: theme=dark|light, scroll=<element id>, open=<fig-select id>
(function () {
  const params = new URLSearchParams(location.search);
  document.documentElement.className = `figma-${params.get('theme') || 'dark'}`;

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const send = (msg) => window.postMessage({ pluginMessage: msg }, '*');
  const variable = (name) => ({ name, originalName: name });

  const PREVIEW = [
    ['color/blue/500', 'var(--color-blue-500)'],
    ['color/blue/600', 'var(--color-blue-600)'],
    ['color/gray/100', 'var(--color-gray-100)'],
    ['spacing/sm', 'var(--spacing-sm)'],
    ['spacing/md', 'var(--spacing-md)'],
    ['radius/full', 'var(--radius-full)'],
    ['color/background/primary', 'var(--color-bg-primary)'],
    ['color/text/default', 'var(--color-text-default)'],
  ];

  window.addEventListener('load', async () => {
    send({
      type: 'collections-loaded',
      collections: [
        { id: 'c1', name: 'Primitives', variables: ['color/blue/500', 'color/blue/600', 'color/gray/100', 'spacing/sm', 'spacing/md', 'radius/full'].map(variable) },
        { id: 'c2', name: 'Semantic tokens', variables: ['color/background/primary', 'color/text/default', 'typography/body/fontFamily', 'brand/color/surface/button/primary/hover'].map(variable) },
      ],
    });
    await wait(200);

    const check = (selector) => document.querySelector(selector)?.querySelector('input')?.click();
    check('fig-checkbox[data-platform="web"]');
    check('fig-checkbox[data-platform="android"]');
    check('fig-checkbox[data-collection-key="primitives"]:not([data-group])');
    check('fig-checkbox[data-collection-key="semantic-tokens"][data-group="color"]');
    document.querySelectorAll('.disclosure')[1]?.click();

    document.getElementById('add-replacement').click();
    await wait(50);
    const row = document.querySelector('.replacement');
    const type = (field, value) => {
      const input = row.querySelector(`[data-field="${field}"] input`);
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    type('original', 'background');
    type('replacement', 'bg');
    document.activeElement?.blur();

    send({ type: 'preview-updated', variables: PREVIEW.map(([originalName, newName]) => ({ originalName, newName })) });
    await wait(150);

    const scrollTarget = params.get('scroll');
    if (scrollTarget) document.getElementById(scrollTarget)?.scrollIntoView({ block: 'start' });

    const open = params.get('open');
    if (open) {
      const select = document.getElementById(open);
      select.scrollIntoView({ block: 'center' });
      await wait(50);
      select.setAttribute('open', '');
    }
  });
})();
