import '@rogieking/figui3/fig.css';
import '@rogieking/figui3/fig-editor.css';
import '@rogieking/figui3/fig.js';
import '@rogieking/figui3/fig-editor.js';
import './styles.css';
import { dragHandle } from './icons.js';

// === State (same shape the plugin's AppState expects) ===
const state = {
  // One entry per path level (a/b/c → Level 1, 2, 3), built from the file's variables
  scopes: [],
  platforms: { web: false, android: false, ios: false },
  collections: {},
  replacements: [],
  settings: {
    preset: 'css-variables',
    naming: 'kebab-case',
    prefix: 'var(--',
    suffix: ')',
    separator: '-',
    preserveCase: false,
  },
  previewFilter: '',
};
let localCollections = [];
let levelSamples = [];
let busyTimer = null;

const BUSY_TIMEOUT_MS = 30000;
const AFFIX_MAX_LENGTH = 32;

const $ = (id) => document.getElementById(id);
const dom = {
  preset: $('preset'),
  naming: $('naming'),
  prefix: $('prefix'),
  separator: $('separator'),
  suffix: $('suffix'),
  affixError: $('affix-error'),
  preserveCase: $('preserveCase'),
  scopes: $('scopes'),
  levelsCount: $('levels-count'),
  addReplacement: $('add-replacement'),
  replacements: $('replacements'),
  platforms: document.querySelectorAll('fig-checkbox[data-platform]'),
  selectAll: $('select-all'),
  collections: $('collections'),
  previewFilter: $('preview-filter'),
  preview: $('preview'),
  applyBtn: $('apply-btn'),
  clearBtn: $('clear-btn'),
};

// Collection / group checkboxes by key, so we never build selectors from document data
const collectionEls = new Map();

// === Bridge: same message contract as the previous UI ===
function post(type, payload = {}) {
  parent.postMessage({ pluginMessage: { type, ...payload } }, '*');
}
const sendState = () => post('update-settings', { state });

// === Helpers ===
function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value === false || value == null) return;
    if (key === 'text') node.textContent = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else node.setAttribute(key, value === true ? '' : String(value));
  });
  [].concat(children).forEach((child) => child && node.append(child));
  return node;
}

function kebabKey(s) {
  return s.toLowerCase().replace(/\s+/g, '-');
}

function groupOf(variableName) {
  return (variableName || '').split('/')[0];
}

function isChecked(checkbox) {
  if (typeof checkbox.checked === 'boolean') return checkbox.checked;
  const attr = checkbox.getAttribute('checked');
  return attr !== null && attr !== 'false';
}

function setChecked(checkbox, checked, indeterminate = false) {
  checkbox.checked = checked;
  if (checked) checkbox.setAttribute('checked', 'true');
  else checkbox.removeAttribute('checked');
  checkbox.indeterminate = indeterminate;
  checkbox.toggleAttribute('indeterminate', indeterminate);
  checkbox.dataset.mixed = String(indeterminate);
}

function eventChecked(event, checkbox) {
  // A mixed checkbox becomes checked on click (FigUI3 would uncheck it)
  if (checkbox.dataset.mixed === 'true') return true;
  return typeof event.detail?.checked === 'boolean' ? event.detail.checked : isChecked(checkbox);
}

function setSelectValue(select, value) {
  select.setAttribute('value', value);
  if ('value' in select) select.value = value;
}

function setInputValue(input, value) {
  input.setAttribute('value', value);
  if ('value' in input) input.value = value;
}

function setDisabled(node, disabled) {
  node.toggleAttribute('disabled', disabled);
}

// === Syntax settings ===
function validateAffix(value) {
  if (value.length > AFFIX_MAX_LENGTH) return `Keep it under ${AFFIX_MAX_LENGTH} characters.`;
  // eslint-disable-next-line no-control-regex
  if (/[\s\u0000-\u001f]/.test(value)) return 'Spaces and line breaks are not allowed.';
  return '';
}

function handleAffixInput(event) {
  const input = event.currentTarget;
  const value = input.value ?? '';
  const error = validateAffix(value);
  input.setAttribute('aria-invalid', String(Boolean(error)));
  const anyInvalid = [dom.prefix, dom.separator, dom.suffix].some((node) => node.getAttribute('aria-invalid') === 'true');
  dom.affixError.textContent = error || (anyInvalid ? 'Fix the highlighted field.' : '');
  dom.affixError.hidden = !anyInvalid;
  if (error) return;
  state.settings[input.id] = value;
  sendState();
}

function updateFormFromSettings(settings) {
  Object.assign(state.settings, settings);
  setSelectValue(dom.preset, state.settings.preset);
  setSelectValue(dom.naming, state.settings.naming);
  setInputValue(dom.prefix, state.settings.prefix);
  setInputValue(dom.separator, state.settings.separator);
  setInputValue(dom.suffix, state.settings.suffix);
  setChecked(dom.preserveCase, Boolean(state.settings.preserveCase));
  [dom.prefix, dom.separator, dom.suffix].forEach((node) => node.setAttribute('aria-invalid', 'false'));
  dom.affixError.hidden = true;
  updatePreserveHint();
}

function updatePreserveHint() {
  $('preserve-hint').textContent = state.settings.preserveCase
    ? 'On: fontFamily stays fontFamily'
    : 'Off: fontFamily → font-family';
}

// === Name structure (scopes) ===
// Levels follow the deepest variable path; its segments serve as examples
function buildLevels() {
  const names = localCollections.flatMap((collection) => collection.variables.map((v) => v.name || ''));
  const deepest = names.reduce((best, name) => (name.split('/').length > best.split('/').length ? name : best), '');
  levelSamples = deepest ? deepest.split('/') : [];
  state.scopes = levelSamples.map((_, index) => ({ name: `Level ${index + 1}`, active: true, index }));
}

function renderScopes() {
  const count = state.scopes.length;
  dom.levelsCount.textContent = count ? `${count} ${count === 1 ? 'level' : 'levels'}` : '';
  dom.scopes.replaceChildren(
    ...state.scopes.map((scope) => {
      const handle = el('span', { class: 'drag-handle' });
      handle.innerHTML = dragHandle; // static SVG generated at build time, not document data
      const checkbox = el('fig-checkbox', { label: scope.name, dataset: { level: scope.index } });
      setChecked(checkbox, scope.active);
      const sample = el('span', { class: 'count sample', text: levelSamples[scope.index] || '', title: 'Example segment' });
      return el('div', { class: 'row', 'aria-label': scope.name, dataset: { level: scope.index } }, [handle, checkbox, sample]);
    }),
  );
  dom.scopes.refresh?.();
}

function handleScopeToggle(event) {
  const checkbox = event.target.closest('fig-checkbox[data-level]');
  if (!checkbox) return;
  const scope = state.scopes.find((s) => String(s.index) === checkbox.dataset.level);
  if (!scope) return;
  scope.active = eventChecked(event, checkbox);
  sendState();
}

function handleScopeReorder(event) {
  const { oldIndex, newIndex } = event.detail || {};
  if (!Number.isInteger(oldIndex) || !Number.isInteger(newIndex)) return;
  const [moved] = state.scopes.splice(oldIndex, 1);
  state.scopes.splice(newIndex, 0, moved);
  sendState();
}

// === Word replacements ===
function renderReplacements() {
  const rows = state.replacements.map((replacement, index) => {
    const original = el('fig-input-text', { full: true, placeholder: 'Find', 'aria-label': `Find ${index + 1}` });
    setInputValue(original, replacement.original);
    original.dataset.field = 'original';
    const replaceWith = el('fig-input-text', { full: true, placeholder: 'Replace', 'aria-label': `Replace ${index + 1}` });
    setInputValue(replaceWith, replacement.replacement);
    replaceWith.dataset.field = 'replacement';
    const remove = el('fig-button', { variant: 'ghost', icon: true, 'aria-label': `Remove replacement ${index + 1}` }, [
      el('fig-icon', { name: 'minus' }),
    ]);
    remove.dataset.action = 'remove';
    return el('div', { class: 'replacement', dataset: { index } }, [original, replaceWith, remove]);
  });
  dom.replacements.replaceChildren(...rows);
  dom.replacements.hidden = rows.length === 0;
  const error = el('p', { class: 'message message--error', id: 'replacement-error', role: 'alert' });
  error.hidden = true;
  dom.replacements.append(error);
}

function validateReplacements() {
  const seen = new Set();
  for (const { original } of state.replacements) {
    const key = original.trim().toLowerCase();
    if (!key) continue;
    if (seen.has(key)) return `"${original.trim()}" is replaced twice.`;
    seen.add(key);
  }
  return '';
}

function handleReplacementInput(event) {
  const input = event.target.closest('fig-input-text');
  const row = event.target.closest('.replacement');
  if (!input || !row) return;
  const replacement = state.replacements[Number(row.dataset.index)];
  replacement[input.dataset.field] = input.value ?? '';
  const error = validateReplacements();
  const errorNode = $('replacement-error');
  errorNode.textContent = error;
  errorNode.hidden = !error;
  if (!error) sendState();
}

function handleReplacementClick(event) {
  const remove = event.target.closest('[data-action="remove"]');
  if (!remove) return;
  state.replacements.splice(Number(remove.closest('.replacement').dataset.index), 1);
  renderReplacements();
  sendState();
}

function addReplacement() {
  state.replacements.push({ original: '', replacement: '' });
  renderReplacements();
  const rows = dom.replacements.querySelectorAll('.replacement');
  rows[rows.length - 1]?.querySelector('fig-input-text')?.focus();
}

// === Platforms ===
function handlePlatformToggle(event) {
  const checkbox = event.target.closest('fig-checkbox[data-platform]');
  if (!checkbox) return;
  state.platforms[checkbox.dataset.platform] = eventChecked(event, checkbox);
  sendState();
}

// === Collections & groups ===
function buildCollectionState() {
  state.collections = {};
  localCollections.forEach((collection) => {
    const groups = {};
    collection.variables.forEach((v) => {
      const group = groupOf(v.name);
      if (group) groups[group] = false;
    });
    state.collections[kebabKey(collection.name)] = { selected: false, groups };
  });
}

function renderCollections(errorText) {
  collectionEls.clear();
  if (errorText || localCollections.length === 0) {
    dom.selectAll.hidden = true;
    dom.collections.replaceChildren(
      el('p', { class: errorText ? 'message message--error' : 'hint', text: errorText || 'This file has no local variables.' }),
    );
    return;
  }

  dom.selectAll.hidden = false;
  const items = localCollections.map((collection, index) => {
    const key = kebabKey(collection.name);
    const panelId = `groups-${index}`;
    const counts = new Map();
    collection.variables.forEach((v) => counts.set(groupOf(v.name), (counts.get(groupOf(v.name)) || 0) + 1));

    const disclosure = el('fig-button', {
      variant: 'ghost', icon: true, class: 'disclosure',
      'aria-expanded': 'false', 'aria-controls': panelId, 'aria-label': `Show groups in ${collection.name}`,
    }, [el('fig-icon', { name: 'chevron', size: 'small' })]);
    const collectionCheck = el('fig-checkbox', { label: collection.name, dataset: { collectionKey: key } });
    const groupChecks = new Map();
    const groupRows = [...counts.entries()].filter(([group]) => group).map(([group, count]) => {
      const groupCheck = el('fig-checkbox', { label: group, dataset: { collectionKey: key, group } });
      groupChecks.set(group, groupCheck);
      return el('div', { class: 'row row--group' }, [groupCheck, el('span', { class: 'count', text: String(count) })]);
    });
    collectionEls.set(key, { checkbox: collectionCheck, groups: groupChecks });

    const panel = el('div', { class: 'groups', id: panelId }, groupRows);
    panel.hidden = true;
    return el('div', { class: 'collection' }, [
      el('div', { class: 'row row--collection' }, [
        disclosure,
        collectionCheck,
        el('span', { class: 'count', text: String(collection.variables.length) }),
      ]),
      panel,
    ]);
  });
  dom.collections.replaceChildren(...items);
  syncSelectionCheckboxes();
}

// Collection / "All" state is derived from the checked groups
function syncSelectionCheckboxes() {
  let total = 0;
  let checkedTotal = 0;
  Object.entries(state.collections).forEach(([key, collection]) => {
    const values = Object.values(collection.groups);
    const checked = values.filter(Boolean).length;
    total += values.length;
    checkedTotal += checked;
    collection.selected = values.length > 0 && checked === values.length;
    const els = collectionEls.get(key);
    if (!els) return;
    setChecked(els.checkbox, collection.selected, checked > 0 && !collection.selected);
    els.groups.forEach((checkbox, group) => setChecked(checkbox, Boolean(collection.groups[group])));
  });
  const all = total > 0 && checkedTotal === total;
  setChecked(dom.selectAll, all, checkedTotal > 0 && !all);
}

function handleCollectionsChange(event) {
  const checkbox = event.target.closest('fig-checkbox[data-collection-key]');
  if (!checkbox) return;
  const collection = state.collections[checkbox.dataset.collectionKey];
  if (!collection) return;
  const checked = eventChecked(event, checkbox);
  if (checkbox.dataset.group !== undefined) {
    collection.groups[checkbox.dataset.group] = checked;
  } else {
    Object.keys(collection.groups).forEach((group) => { collection.groups[group] = checked; });
  }
  syncSelectionCheckboxes();
  sendState();
}

function handleSelectAll(event) {
  const checked = eventChecked(event, dom.selectAll);
  Object.values(state.collections).forEach((collection) => {
    Object.keys(collection.groups).forEach((group) => { collection.groups[group] = checked; });
  });
  syncSelectionCheckboxes();
  sendState();
}

function handleCollectionsClick(event) {
  const disclosure = event.target.closest('.disclosure');
  if (!disclosure) return;
  const panel = $(disclosure.getAttribute('aria-controls'));
  const expanded = disclosure.getAttribute('aria-expanded') !== 'true';
  disclosure.setAttribute('aria-expanded', String(expanded));
  panel.hidden = !expanded;
}

// === Preview ===
function fillPreviewFilter() {
  const options = [el('fig-select-option', { value: '', text: 'All selected' })];
  localCollections.forEach((collection) => {
    options.push(el('fig-select-option', { value: collection.name, text: collection.name }));
    new Set(collection.variables.map((v) => groupOf(v.name))).forEach((group) => {
      if (group) options.push(el('fig-select-option', { value: `${collection.name}::${group}`, text: `${collection.name} / ${group}` }));
    });
  });
  dom.previewFilter.replaceChildren(el('fig-select-options', {}, options));
  state.previewFilter = '';
  setSelectValue(dom.previewFilter, '');
}

function renderPreview(variables) {
  const list = Array.isArray(variables) ? variables : [];
  if (!list.length) {
    dom.preview.replaceChildren(el('li', { class: 'hint', text: 'Select variables to preview their code syntax.' }));
    return;
  }
  dom.preview.replaceChildren(
    ...list.map((v) => el('li', { class: 'preview-row' }, [
      el('span', { class: 'preview-from', text: v.originalName || v.name || '' }),
      el('code', { class: 'preview-to', text: v.newName || '' }),
    ])),
  );
}

// === Footer actions ===
function setBusy(button, busy) {
  [dom.applyBtn, dom.clearBtn].forEach((btn) => setDisabled(btn, busy));
  button.setAttribute('aria-busy', String(busy));
  button.querySelector('fig-spinner')?.remove();
  if (busy) button.prepend(el('fig-spinner', { size: 'small', 'aria-label': 'Working' }));
  clearTimeout(busyTimer);
  // Never leave the buttons stuck if the plugin doesn't answer
  if (busy) busyTimer = setTimeout(() => setBusy(button, false), BUSY_TIMEOUT_MS);
}

function runAction(button, type) {
  if (button.hasAttribute('disabled')) return;
  setBusy(button, true);
  post(type);
}

// === Messages from the plugin ===
window.addEventListener('message', (event) => {
  const msg = event.data && event.data.pluginMessage;
  if (!msg) return;

  switch (msg.type) {
    case 'collections-loaded':
      localCollections = Array.isArray(msg.collections) ? msg.collections : [];
      buildCollectionState();
      buildLevels();
      renderScopes();
      renderCollections(msg.error);
      fillPreviewFilter();
      sendState();
      break;
    case 'preview-updated':
      renderPreview(msg.variables);
      break;
    case 'preset-applied':
      updateFormFromSettings(msg.settings || {});
      sendState();
      break;
    case 'changes-applied':
      setBusy(dom.applyBtn, false);
      break;
    case 'syntax-cleared':
      setBusy(dom.clearBtn, false);
      break;
  }
});

// === Startup ===
function bindEvents() {
  dom.preset.addEventListener('change', () => {
    state.settings.preset = dom.preset.value;
    post('apply-preset', { preset: state.settings.preset });
  });
  dom.naming.addEventListener('change', () => {
    state.settings.naming = dom.naming.value;
    sendState();
  });
  [dom.prefix, dom.separator, dom.suffix].forEach((input) => input.addEventListener('input', handleAffixInput));
  dom.preserveCase.addEventListener('change', (event) => {
    state.settings.preserveCase = eventChecked(event, dom.preserveCase);
    updatePreserveHint();
    sendState();
  });
  dom.scopes.addEventListener('change', handleScopeToggle);
  dom.scopes.addEventListener('reorder', handleScopeReorder);
  dom.addReplacement.addEventListener('click', addReplacement);
  dom.replacements.addEventListener('input', handleReplacementInput);
  dom.replacements.addEventListener('click', handleReplacementClick);
  dom.platforms.forEach((checkbox) => checkbox.addEventListener('change', handlePlatformToggle));
  dom.selectAll.addEventListener('change', handleSelectAll);
  dom.collections.addEventListener('change', handleCollectionsChange);
  dom.collections.addEventListener('click', handleCollectionsClick);
  dom.previewFilter.addEventListener('change', () => {
    state.previewFilter = dom.previewFilter.value || '';
    sendState();
  });
  dom.applyBtn.addEventListener('click', () => runAction(dom.applyBtn, 'apply-changes'));
  dom.clearBtn.addEventListener('click', () => runAction(dom.clearBtn, 'clear-syntax'));
}

updateFormFromSettings(state.settings);
renderScopes();
renderReplacements();
renderPreview([]);
bindEvents();
post('init');
