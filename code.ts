// Syntaxer Plugin - Automatiza la transformación de nombres de variables locales
// Soporte para múltiples convenciones de nomenclatura y plataformas

figma.showUI(__html__, {
  width: 820,
  height: 900,
  themeColors: true,
});

// === Tipos ===

interface VariableData {
  id: string;
  name: string;
  collectionId: string;
  collectionName: string;
  originalName: string;
  newName: string;
  scopes: VariableScope[];
}

interface CollectionData {
  id: string;
  name: string;
  variableCount: number;
  variables: VariableData[];
}

interface AppSettings {
  preset: string;
  naming: string;
  prefix: string;
  suffix: string;
  separator: string;
  preserveCase: boolean;
}

interface Scope {
  name: string;
  active: boolean;
}

interface AppState {
  scopes: Scope[];
  platforms: Record<string, boolean>;
  collections: Record<string, { selected: boolean; groups: Record<string, boolean> }>;
  replacements: Array<{ original: string; replacement: string }>;
  settings: AppSettings;
  previewFilter: string; // Filtro del dropdown
}

type PluginMessageType =
  | 'init'
  | 'update-settings'
  | 'apply-preset'
  | 'apply-changes'
  | 'clear-syntax'
  | 'close';

interface PluginMessage {
  type: PluginMessageType;
  state?: Partial<AppState>;
  preset?: string;
}

// === Estado global ===
let variables: VariableData[] = [];
let collections: CollectionData[] = [];

let currentState: AppState = {
  scopes: [
    { name: 'root', active: true },
    { name: 'domain', active: true },
    { name: 'context', active: true },
    { name: 'element', active: true },
    { name: 'variant', active: true }
  ],
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

// === Utilidades ===

const DEBUG = true;

function kebabKey(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '-');
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function normalizeNameBase(name: string): string {
  return name.replace(/[^\w\s/.-]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Divide un nombre en palabras. Los límites camelCase (fontFamily → font, Family)
// también separan palabras, salvo que se pida conservar el casing original.
function splitWords(str: string): string[] {
  let s = normalizeNameBase(str);
  if (!currentState.settings.preserveCase) {
    s = s.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
  }
  return s.split(/[._/\s-]+/).filter(Boolean);
}

function caseWord(w: string): string {
  return currentState.settings.preserveCase ? w : w.toLowerCase();
}

function capitalize(w: string): string {
  const cased = caseWord(w);
  return cased.charAt(0).toUpperCase() + cased.slice(1);
}

function toCamelCase(str: string): string {
  const [first = '', ...rest] = splitWords(str);
  const head = caseWord(first);
  return head.charAt(0).toLowerCase() + head.slice(1) + rest.map(capitalize).join('');
}

function toPascalCase(str: string): string {
  return splitWords(str).map(capitalize).join('');
}

function toSnakeCase(str: string): string {
  return splitWords(str).map(caseWord).join('_');
}

function toKebabCase(str: string): string {
  return splitWords(str).map(caseWord).join('-');
}

function toDotCase(str: string): string {
  return splitWords(str).map(caseWord).join('.');
}

function toPathCase(str: string): string {
  return splitWords(str).map(caseWord).join('/');
}

function toTrainCase(str: string): string {
  return splitWords(str).map(capitalize).join('-');
}

function toUpperCaseFlat(str: string): string {
  return splitWords(str).join('').toUpperCase();
}

function toLowerCaseFlat(str: string): string {
  return splitWords(str).join('').toLowerCase();
}

function toTitleCaseWithSpaces(str: string): string {
  return splitWords(str).map(capitalize).join(' ');
}


// === Lógica del Plugin ===

async function mapVariablesAndCollections() {
  try {
    const localCollections = await figma.variables.getLocalVariableCollectionsAsync();
    collections = [];
    variables = [];
    currentState.collections = {}; // Reiniciar estado de colecciones

    for (const collection of localCollections) {
      const collectionVariables: VariableData[] = [];

      for (const variableId of collection.variableIds) {
        const variable = await figma.variables.getVariableByIdAsync(variableId);
        if (variable) {
          collectionVariables.push({
            id: variable.id,
            name: variable.name,
            collectionId: collection.id,
            collectionName: collection.name,
            originalName: variable.name,
            newName: variable.name,
            scopes: Array.isArray(variable.scopes) ? (variable.scopes as VariableScope[]) : [],
          });
        }
      }
      
      variables.push(...collectionVariables);
      collections.push({
        id: collection.id,
        name: collection.name,
        variableCount: collectionVariables.length,
        variables: collectionVariables,
      });

      const collectionKey = kebabKey(collection.name);
      currentState.collections[collectionKey] = {
        selected: false,
        groups: {},
      };
      
      const groupSet = new Set<string>(
        collectionVariables.map(v => v.originalName.split('/')[0]).filter(Boolean)
      );
      
      groupSet.forEach(groupName => {
        currentState.collections[collectionKey].groups[groupName] = false;
      });
    }

    figma.ui.postMessage({ type: 'collections-loaded', collections });
  } catch (error) {
    figma.notify('Error loading variables: ' + String(error), { error: true });
  }
}

// --- LÓGICA DE PRESETS COMPLEJOS ---
const SCALE_KEYWORDS = ['spacing', 'radius', 'size', 'font-size', 'shadow', 'elevation'];

function applyAndroidConvention(name: string): string {
  const lowerName = name.toLowerCase();
  const isScale = SCALE_KEYWORDS.some(keyword => lowerName.includes(keyword)) || /^\d+$/.test(name);
  return isScale ? toSnakeCase(name) : toCamelCase(name);
}

function applyTailwindConvention(name: string): string {
    const parts = name.toLowerCase().split('/');
    const lastPart = parts[parts.length - 1];
    
    if (name.includes('color/background')) return `bg-${toKebabCase(parts.slice(2).join('-'))}`;
    if (name.includes('color/text')) return `text-${toKebabCase(parts.slice(2).join('-'))}`;
    if (name.includes('spacing/padding')) return `p-${lastPart}`;
    if (name.includes('spacing/margin')) return `m-${lastPart}`;
    if (name.includes('radius')) return `rounded-${lastPart}`;
    if (name.includes('font-size')) return `text-${lastPart}`;
    if (name.includes('shadow')) return `shadow-${lastPart}`;
    
    return toKebabCase(name);
}

function applyNamingConvention(name: string, convention: string): string {
  const originalParts = name.split('/');
  
  // Reordenar las partes del nombre según el orden de los scopes
  const reorderedParts = currentState.scopes.map(scope => {
    const scopeMap = { root: 0, domain: 1, context: 2, element: 3, variant: 4 };
    const index = scopeMap[scope.name as keyof typeof scopeMap];
    return { part: originalParts[index], active: scope.active };
  }).filter(item => item.active && item.part)
    .map(item => item.part);
  
  let processedName = reorderedParts.join('/');

  (currentState.replacements || []).forEach(r => {
    if (!r || !r.original) return;
    const rx = new RegExp(r.original, 'gi');
    processedName = processedName.replace(rx, r.replacement ?? '');
  });

  if (convention === 'android') {
    return applyAndroidConvention(processedName);
  }
  if (convention === 'tailwind') {
    return applyTailwindConvention(name);
  }

  switch (convention) {
    case 'kebab-case': return toKebabCase(processedName);
    case 'camelCase': return toCamelCase(processedName);
    case 'PascalCase': return toPascalCase(processedName);
    case 'snake_case': return toSnakeCase(processedName);
    case 'dot.case': return toDotCase(processedName);
    case 'path/case': return toPathCase(processedName);
    case 'Train-Case': return toTrainCase(processedName);
    case 'SCREAMING_SNAKE_CASE': return toSnakeCase(processedName).toUpperCase();
    case 'UPPERCASE': return toUpperCaseFlat(processedName);
    case 'lowercase': return toLowerCaseFlat(processedName);
    case 'Title Case': return toTitleCaseWithSpaces(processedName);
    default: return toKebabCase(processedName);
  }
}

function generateFinalName(baseName: string): string {
  const { prefix, suffix, separator, naming } = currentState.settings;
  
  if (naming === 'tailwind') {
    return baseName;
  }
  
  const adjusted =
    naming === 'kebab-case' && separator && separator !== '-'
      ? baseName.replace(/-/g, separator)
      : baseName;
  return `${prefix ?? ''}${adjusted}${suffix ?? ''}`;
}

// Variables afectadas por Apply / Clear: solo depende de los grupos marcados
function getSelectedVariables(): VariableData[] {
  return variables.filter((v) => {
    const collectionKey = kebabKey(v.collectionName);
    const groupName = v.originalName.split('/')[0];
    return Boolean(currentState.collections[collectionKey]?.groups?.[groupName]);
  });
}

// El filtro del preview solo acota lo que se muestra, nunca lo que se aplica
function getPreviewVariables(): VariableData[] {
  const selected = getSelectedVariables();
  if (!currentState.previewFilter) return selected;

  const [colName, groupName] = currentState.previewFilter.split('::');
  return selected.filter(v => {
    if (v.collectionName !== colName) return false;
    return !groupName || v.originalName.split('/')[0] === groupName;
  });
}

function updatePreview() {
  const previewVariables = getPreviewVariables().map((v) => {
    const baseName = applyNamingConvention(v.originalName, currentState.settings.naming);
    const finalName = generateFinalName(baseName);
    return { ...v, newName: finalName };
  });

  figma.ui.postMessage({
    type: 'preview-updated',
    variables: previewVariables,
  });
}

async function applyChanges() {
  try {
    let updatedCount = 0;
    const variablesToUpdate = getSelectedVariables();

    for (const v of variablesToUpdate) {
      const figmaVariable = await figma.variables.getVariableByIdAsync(v.id);
      if (!figmaVariable) continue;

      const baseName = applyNamingConvention(v.originalName, currentState.settings.naming);
      const finalName = generateFinalName(baseName);

      let changed = false;
      
      Object.keys(currentState.platforms).forEach((platform: string) => {
        const isActive = currentState.platforms[platform];
        if (isActive) {
          const variableWithApi = figmaVariable as any;
          const platformKey = (platform === 'ios' ? 'iOS' : platform.toUpperCase()) as 'WEB' | 'ANDROID' | 'iOS';
          
          if (typeof variableWithApi.setVariableCodeSyntax === 'function') {
            variableWithApi.setVariableCodeSyntax(platformKey, finalName);
            changed = true;
          }
        }
      });
      
      if (changed) {
        updatedCount++;
      }
    }

    figma.notify(`✅ Code Syntax updated for ${updatedCount} variables.`);
    updatePreview();
  } catch (error) {
    figma.notify('Error applying changes: ' + String(error), { error: true });
  }
}

async function clearSelectedVariablesSyntax() {
  try {
    let clearedCount = 0;
    const variablesToClear = getSelectedVariables();
    if (variablesToClear.length === 0) return;

    const firstVar = await figma.variables.getVariableByIdAsync(variablesToClear[0].id);
    if (firstVar && typeof (firstVar as any).removeVariableCodeSyntax !== 'function') {
      figma.notify('Error: To clear syntax, please update your packages with `npm install @figma/plugin-typings@latest`', { error: true, timeout: 5000 });
      return;
    }

    for (const v of variablesToClear) {
      const figmaVariable = await figma.variables.getVariableByIdAsync(v.id);
      if (!figmaVariable) continue;

      let changed = false;
      Object.keys(currentState.platforms).forEach((platform: string) => {
        const isActive = currentState.platforms[platform];
        if (isActive) {
          const variableWithApi = figmaVariable as any;
          const platformKey = (platform === 'ios' ? 'iOS' : platform.toUpperCase()) as 'WEB' | 'ANDROID' | 'iOS';
          
          variableWithApi.removeVariableCodeSyntax(platformKey); 
          changed = true;
        }
      });
      if (changed) {
        clearedCount++;
      }
    }

    figma.notify(`🗑️ Code Syntax cleared for ${clearedCount} variables.`);
    updatePreview();
  } catch (error) {
    figma.notify('Error clearing Code Syntax: ' + String(error), { error: true });
  }
}

function applyPreset(preset: string) {
  let newSettings = { ...currentState.settings, preset };

  switch (preset) {
    case 'css-variables':
      newSettings = { ...newSettings, naming: 'kebab-case', prefix: 'var(--', suffix: ')', separator: '-' };
      break;
    case 'scss':
      newSettings = { ...newSettings, naming: 'kebab-case', prefix: '$', suffix: '', separator: '-' };
      break;
    case 'less':
      newSettings = { ...newSettings, naming: 'kebab-case', prefix: '@', suffix: '', separator: '-' };
      break;
    case 'android':
      newSettings = { ...newSettings, naming: 'android', prefix: '', suffix: '', separator: '_' };
      break;
    case 'ios':
      newSettings = { ...newSettings, naming: 'PascalCase', prefix: '', suffix: '', separator: '' };
      break;
    case 'tailwind':
      newSettings = { ...newSettings, naming: 'tailwind', prefix: '', suffix: '', separator: '-' };
      break;
  }
  
  currentState.settings = newSettings;
  figma.ui.postMessage({ type: 'preset-applied', settings: currentState.settings });
}

function deepMergeState<T extends object>(target: T, source: Partial<T>): T {
  const output = { ...target };
  (Object.keys(source) as Array<keyof T>).forEach((key) => {
    const targetValue = target[key];
    const sourceValue = source[key];

    if (isPlainObject(targetValue) && isPlainObject(sourceValue)) {
      output[key] = deepMergeState(targetValue, sourceValue as Partial<typeof targetValue>);
    } 
    else if (sourceValue !== undefined) {
      output[key] = sourceValue;
    }
  });

  return output;
}


// === Mensajería UI <-> Plugin ===

figma.ui.onmessage = async (msg: PluginMessage) => {
  if (DEBUG) console.log('[Syntaxer][Backend] Message received:', msg);

  try {
    switch (msg.type) {
      case 'init':
        await mapVariablesAndCollections();
        updatePreview();
        break;

      case 'update-settings':
        if (msg.state) {
          currentState = deepMergeState(currentState as AppState, msg.state);
          updatePreview();
        }
        break;

      case 'apply-preset':
        if (msg.preset) {
          applyPreset(msg.preset);
          updatePreview();
        }
        break;
      
      case 'apply-changes':
        await applyChanges();
        figma.ui.postMessage({ type: 'changes-applied' });
        break;

      case 'clear-syntax':
        await clearSelectedVariablesSyntax();
        figma.ui.postMessage({ type: 'syntax-cleared' });
        break;

      case 'close':
        figma.closePlugin();
        break;

      default:
        if (DEBUG) console.warn('[Syntaxer][Backend] Unknown message type:', msg.type);
    }
  } catch (err) {
    if (DEBUG) console.error('[Syntaxer][Backend] Error processing message:', err);
    figma.notify('Error in backend: ' + String(err), { error: true });
  }
};