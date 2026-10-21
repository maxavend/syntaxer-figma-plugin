// Syntaxer Plugin - Automatiza la transformación de nombres de variables locales
// Soporte para múltiples convenciones de nomenclatura y plataformas

figma.showUI(__html__, {
  width: 320,
  height: 640,
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

// Un nivel de la ruta de la variable (a/b/c → nivel 0, 1, 2). `index` es la posición
// original del segmento; el orden del array define cómo se recompone el nombre.
interface Scope {
  name: string;
  active: boolean;
  index?: number;
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

// Respuesta de 'changes-applied' / 'syntax-cleared': siempre se envía, también si falla
interface ActionResult {
  ok: boolean;
  count: number;
  error?: string;
}

type CodeSyntaxPlatformKey = 'WEB' | 'ANDROID' | 'iOS';

// === Estado global ===
let variables: VariableData[] = [];
let collections: CollectionData[] = [];

let currentState: AppState = {
  scopes: buildLevelScopes(5),
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

function buildLevelScopes(depth: number): Scope[] {
  return Array.from({ length: depth }, (_, index) => ({ name: `Level ${index + 1}`, active: true, index }));
}

// Nombres de la versión anterior (5 niveles fijos), por si llega un estado antiguo
const LEGACY_SCOPE_INDEX: Record<string, number> = { root: 0, domain: 1, context: 2, element: 3, variant: 4 };

const DEBUG = false;

function kebabKey(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '-');
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getActivePlatformKeys(): CodeSyntaxPlatformKey[] {
  return Object.keys(currentState.platforms)
    .filter((platform) => currentState.platforms[platform])
    .map((platform) => (platform === 'ios' ? 'iOS' : platform.toUpperCase()) as CodeSyntaxPlatformKey);
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

    // Tantos niveles como la ruta más profunda del archivo
    const depth = Math.max(1, ...variables.map(v => v.originalName.split('/').length));
    currentState.scopes = buildLevelScopes(depth);

    figma.ui.postMessage({ type: 'collections-loaded', collections });
  } catch (error) {
    figma.notify('Error loading variables: ' + errorMessage(error), { error: true });
    // La UI queda esperando esta respuesta: enviarla vacía con el error
    figma.ui.postMessage({ type: 'collections-loaded', collections: [], error: errorMessage(error) });
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
  
  // Reordenar las partes del nombre según el orden de los niveles
  const reorderedParts = currentState.scopes.map(scope => {
    const index = typeof scope.index === 'number' ? scope.index : LEGACY_SCOPE_INDEX[scope.name];
    return { part: originalParts[index], active: scope.active };
  }).filter(item => item.active && item.part)
    .map(item => item.part);
  
  let processedName = reorderedParts.join('/');

  (currentState.replacements || []).forEach(r => {
    if (!r || !r.original) return;
    // Reemplazo literal (sin distinguir mayúsculas): "(" o "." no rompen ni comodinan
    const rx = new RegExp(escapeRegExp(r.original), 'gi');
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

async function applyChanges(): Promise<ActionResult> {
  const platformKeys = getActivePlatformKeys();
  const variablesToUpdate = getSelectedVariables();
  if (platformKeys.length === 0) return { ok: false, count: 0, error: 'Select at least one platform.' };
  if (variablesToUpdate.length === 0) return { ok: false, count: 0, error: 'Select at least one collection or group.' };

  let updatedCount = 0;
  for (const v of variablesToUpdate) {
    const figmaVariable = await figma.variables.getVariableByIdAsync(v.id);
    if (!figmaVariable) continue;

    const baseName = applyNamingConvention(v.originalName, currentState.settings.naming);
    const finalName = generateFinalName(baseName);
    platformKeys.forEach((platformKey) => figmaVariable.setVariableCodeSyntax(platformKey, finalName));
    updatedCount++;
  }

  figma.notify(`Code syntax updated for ${updatedCount} variables.`);
  updatePreview();
  return { ok: true, count: updatedCount };
}

async function clearSelectedVariablesSyntax(): Promise<ActionResult> {
  const platformKeys = getActivePlatformKeys();
  const variablesToClear = getSelectedVariables();
  if (platformKeys.length === 0) return { ok: false, count: 0, error: 'Select at least one platform.' };
  if (variablesToClear.length === 0) return { ok: false, count: 0, error: 'Select at least one collection or group.' };

  let clearedCount = 0;
  for (const v of variablesToClear) {
    const figmaVariable = await figma.variables.getVariableByIdAsync(v.id);
    if (!figmaVariable) continue;

    platformKeys.forEach((platformKey) => figmaVariable.removeVariableCodeSyntax(platformKey));
    clearedCount++;
  }

  figma.notify(`Code syntax cleared for ${clearedCount} variables.`);
  updatePreview();
  return { ok: true, count: clearedCount };
}

// Ejecuta una acción principal y siempre responde a la UI, para que nunca quede en "cargando"
async function runAction(responseType: 'changes-applied' | 'syntax-cleared', action: () => Promise<ActionResult>) {
  let result: ActionResult;
  try {
    result = await action();
  } catch (error) {
    result = { ok: false, count: 0, error: errorMessage(error) };
  }
  if (!result.ok && result.error) figma.notify(result.error, { error: true });
  figma.ui.postMessage({ type: responseType, ...result });
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
        await runAction('changes-applied', applyChanges);
        break;

      case 'clear-syntax':
        await runAction('syntax-cleared', clearSelectedVariablesSyntax);
        break;

      case 'close':
        figma.closePlugin();
        break;

      default:
        if (DEBUG) console.warn('[Syntaxer][Backend] Unknown message type:', msg.type);
    }
  } catch (err) {
    if (DEBUG) console.error('[Syntaxer][Backend] Error processing message:', err);
    figma.notify('Error in backend: ' + errorMessage(err), { error: true });
  }
};