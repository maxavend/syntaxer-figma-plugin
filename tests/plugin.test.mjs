// Runs the compiled plugin (code.js) against a minimal mock of the Figma API.
// Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../code.js', import.meta.url), 'utf8');

function bootPlugin(variableNames, { failLoad = false, failGet = false } = {}) {
  const variables = {};
  const writes = [];
  const messages = [];
  const notifications = [];
  let uiOptions = null;
  let closed = false;
  let loaded = false;

  variableNames.forEach((name, i) => {
    const id = `v${i}`;
    variables[id] = {
      id,
      name,
      scopes: [],
      setVariableCodeSyntax: (platform, value) => writes.push({ name, platform, value }),
      removeVariableCodeSyntax: (platform) => writes.push({ name, platform, value: null }),
    };
  });

  const figma = {
    showUI: (_html, options) => { uiOptions = options; },
    notify: (message, options) => notifications.push({ message, error: Boolean(options && options.error) }),
    closePlugin: () => { closed = true; },
    ui: { postMessage: (msg) => messages.push(JSON.parse(JSON.stringify(msg))), onmessage: null },
    variables: {
      getLocalVariableCollectionsAsync: async () => {
        if (failLoad) throw new Error('load failed');
        return [{ id: 'c1', name: 'Tokens', variableIds: Object.keys(variables) }];
      },
      getVariableByIdAsync: async (id) => {
        if (failGet && loaded) throw new Error('get failed');
        return variables[id];
      },
    },
  };

  new Function('figma', '__html__', 'console', source)(figma, '', { log() {}, warn() {}, error() {} });

  return {
    send: async (msg) => {
      await figma.ui.onmessage(msg);
      if (msg.type === 'init') loaded = true;
    },
    last: (type) => messages.filter((m) => m.type === type).pop(),
    previewNames: () => messages.filter((m) => m.type === 'preview-updated').pop().variables.map((v) => v.newName),
    writes,
    notifications,
    uiOptions: () => uiOptions,
    closed: () => closed,
  };
}

const levels = (count) => Array.from({ length: count }, (_, index) => ({ name: `Level ${index + 1}`, active: true, index }));

function state(overrides = {}) {
  return {
    scopes: levels(3),
    platforms: { web: true, android: false, ios: false },
    replacements: [],
    previewFilter: '',
    collections: { tokens: { selected: true, groups: { color: true, spacing: true, typography: true } } },
    settings: { preset: 'css-variables', naming: 'kebab-case', prefix: 'var(--', suffix: ')', separator: '-', preserveCase: false },
    ...overrides,
  };
}

const NAMES = ['color/blue/500', 'spacing/(sm)', 'typography/base/fontFamily'];

test('opens a 320px window that follows the Figma theme', () => {
  const plugin = bootPlugin(NAMES);
  assert.deepEqual(plugin.uiOptions(), { width: 320, height: 640, themeColors: true });
});

test('generates CSS variable syntax and splits camelCase words', async () => {
  const plugin = bootPlugin(NAMES);
  await plugin.send({ type: 'init' });
  await plugin.send({ type: 'update-settings', state: state() });
  assert.deepEqual(plugin.previewNames(), ['var(--color-blue-500)', 'var(--spacing-sm)', 'var(--typography-base-font-family)']);
});

test('keeps original casing when asked', async () => {
  const plugin = bootPlugin(NAMES);
  await plugin.send({ type: 'init' });
  const settings = { ...state().settings, preserveCase: true, prefix: '', suffix: '' };
  await plugin.send({ type: 'update-settings', state: state({ settings }) });
  assert.ok(plugin.previewNames().includes('typography-base-fontFamily'));
});

test('treats word replacements as literal text', async () => {
  const plugin = bootPlugin(NAMES);
  await plugin.send({ type: 'init' });
  await plugin.send({ type: 'update-settings', state: state({ replacements: [{ original: '(sm)', replacement: 'small' }] }) });
  assert.ok(plugin.previewNames().includes('var(--spacing-small)'));
});

test('detects as many levels as the deepest variable path', async () => {
  const plugin = bootPlugin(['brand/color/surface/button/primary/hover', 'color/blue/500']);
  await plugin.send({ type: 'init' });
  const collections = { tokens: { selected: true, groups: { brand: true, color: true } } };
  const settings = { ...state().settings, prefix: '', suffix: '' };

  // Before the UI sends its levels, the plugin uses the detected depth
  await plugin.send({ type: 'update-settings', state: { collections, settings } });
  assert.deepEqual(plugin.previewNames(), ['brand-color-surface-button-primary-hover', 'color-blue-500']);

  // Drop level 1 and move level 6 to the second position
  const scopes = levels(6);
  scopes[0].active = false;
  scopes.splice(1, 0, scopes.splice(5, 1)[0]);
  await plugin.send({ type: 'update-settings', state: { scopes, collections, settings } });
  assert.deepEqual(plugin.previewNames(), ['hover-color-surface-button-primary', 'blue-500']);
});

test('still understands the legacy root…variant scope names', async () => {
  const plugin = bootPlugin(NAMES);
  await plugin.send({ type: 'init' });
  const scopes = ['root', 'domain', 'context', 'element', 'variant'].map((name) => ({ name, active: name !== 'root' }));
  await plugin.send({ type: 'update-settings', state: state({ scopes }) });
  assert.ok(plugin.previewNames().includes('var(--blue-500)'));
});

test('applies only to checked groups, even with a preview filter', async () => {
  const plugin = bootPlugin(NAMES);
  await plugin.send({ type: 'init' });
  const collections = { tokens: { selected: false, groups: { color: true, spacing: false, typography: false } } };
  await plugin.send({ type: 'update-settings', state: state({ collections, previewFilter: 'Tokens::spacing' }) });
  await plugin.send({ type: 'apply-changes' });
  assert.deepEqual(plugin.last('changes-applied'), { type: 'changes-applied', ok: true, count: 1 });
  assert.deepEqual(plugin.writes, [{ name: 'color/blue/500', platform: 'WEB', value: 'var(--color-blue-500)' }]);
});

test('writes to every active platform and clears them', async () => {
  const plugin = bootPlugin(NAMES);
  await plugin.send({ type: 'init' });
  await plugin.send({ type: 'update-settings', state: state({ platforms: { web: true, android: false, ios: true } }) });
  await plugin.send({ type: 'apply-changes' });
  assert.equal(plugin.writes.length, 6);
  assert.ok(plugin.writes.every((w) => w.platform === 'WEB' || w.platform === 'iOS'));

  plugin.writes.length = 0;
  await plugin.send({ type: 'clear-syntax' });
  assert.deepEqual(plugin.last('syntax-cleared'), { type: 'syntax-cleared', ok: true, count: 3 });
  assert.ok(plugin.writes.every((w) => w.value === null));
});

test('answers with an error when no platform is active', async () => {
  const plugin = bootPlugin(NAMES);
  await plugin.send({ type: 'init' });
  await plugin.send({ type: 'update-settings', state: state({ platforms: { web: false, android: false, ios: false } }) });
  await plugin.send({ type: 'apply-changes' });
  assert.deepEqual(plugin.last('changes-applied'), { type: 'changes-applied', ok: false, count: 0, error: 'Select at least one platform.' });
  assert.equal(plugin.writes.length, 0);
});

test('answers with an error when nothing is selected', async () => {
  const plugin = bootPlugin(NAMES);
  await plugin.send({ type: 'init' });
  const collections = { tokens: { selected: false, groups: { color: false, spacing: false, typography: false } } };
  await plugin.send({ type: 'update-settings', state: state({ collections }) });
  await plugin.send({ type: 'clear-syntax' });
  assert.equal(plugin.last('syntax-cleared').ok, false);
});

test('answers with an error when the Figma API throws', async () => {
  const plugin = bootPlugin(NAMES, { failGet: true });
  await plugin.send({ type: 'init' });
  await plugin.send({ type: 'update-settings', state: state() });
  await plugin.send({ type: 'apply-changes' });
  assert.deepEqual(plugin.last('changes-applied'), { type: 'changes-applied', ok: false, count: 0, error: 'get failed' });
  assert.ok(plugin.notifications.some((n) => n.error));
});

test('reports a load failure instead of leaving the UI waiting', async () => {
  const plugin = bootPlugin(NAMES, { failLoad: true });
  await plugin.send({ type: 'init' });
  assert.deepEqual(plugin.last('collections-loaded'), { type: 'collections-loaded', collections: [], error: 'load failed' });
});

test('applies presets and closes on request', async () => {
  const plugin = bootPlugin(NAMES);
  await plugin.send({ type: 'apply-preset', preset: 'scss' });
  assert.equal(plugin.last('preset-applied').settings.prefix, '$');
  await plugin.send({ type: 'close' });
  assert.ok(plugin.closed());
});
