# 📚 Syntaxer: Documentación Completa del Proceso de Desarrollo

**Fecha:** 23 de julio de 2025  
**Proyecto:** Plugin de Figma para gestión de code syntax de variables  
**Versión:** 1.0.0  

---

## 🎯 Resumen Ejecutivo

El proyecto **Syntaxer** es un plugin de Figma diseñado para automatizar la aplicación de code syntax a variables locales, permitiendo a los diseñadores y desarrolladores mantener consistencia en la nomenclatura de sus design tokens. Durante el desarrollo, enfrentamos múltiples desafíos técnicos que nos llevaron a importantes aprendizajes sobre el desarrollo de plugins para Figma.

---

## 📖 Índice

1. [Contexto Inicial](#contexto-inicial)
2. [Problemas Identificados](#problemas-identificados)
3. [Proceso de Resolución](#proceso-de-resolución)
4. [Solución Final](#solución-final)
5. [Lecciones Aprendidas](#lecciones-aprendidas)
6. [Consideraciones Futuras](#consideraciones-futuras)
7. [Guía de Uso](#guía-de-uso)
8. [Arquitectura Técnica](#arquitectura-técnica)
9. [Troubleshooting](#troubleshooting)

---

## 🚀 Contexto Inicial

### Objetivo del Proyecto
Crear un plugin de Figma que permita:
- Visualizar colecciones de variables locales
- Aplicar diferentes convenciones de nomenclatura (kebab-case, camelCase, etc.)
- Configurar prefijos, sufijos y separadores personalizados
- Aplicar code syntax a múltiples variables simultáneamente

### Estado Inicial del Código
El proyecto comenzó con:
- Un manifest.json básico
- Una interfaz HTML con Bootstrap
- Lógica TypeScript para comunicación con la API de Figma
- Problemas de renderizado y funcionalidad

---

## ⚠️ Problemas Identificados

### 1. Problemas de UI y Estilos
**Síntoma:** El plugin no mostraba estilos de Bootstrap correctamente
```
❌ Bootstrap styles not loading
❌ Icons not displaying
❌ Dark theme inconsistencies
```

**Causa raíz:** 
- Sandbox de Figma bloquea recursos externos por defecto
- Manifest no incluía dominios permitidos para CDN

### 2. Arquitectura de Datos Incorrecta
**Síntoma:** El plugin mostraba grupos en lugar de colecciones
```javascript
// ❌ Enfoque incorrecto - basado en grupos
const groups = await figma.variables.getLocalVariableGroupsAsync();
```

**Causa raíz:**
- Confusión entre API de grupos vs colecciones
- Las variables en Figma se organizan por colecciones, no grupos

### 3. API Incorrecta para Code Syntax
**Síntoma:** Los cambios no se aplicaban realmente en Figma
```javascript
// ❌ API inexistente
variable.setCodeSyntaxAsync(platform, syntax);
```

**Causa raíz:**
- Uso de API inexistente o deprecated
- Falta de comprensión de la API correcta de Figma

### 4. Corrupción del HTML
**Síntoma:** JavaScript mezclado dentro de tags HTML
```html
<!-- ❌ Código corrupto -->
<link rel="stylesheet" href="...">
  function corrupted() { ... }
</link>
```

**Causa raíz:**
- Ediciones erróneas que mezclaron código JavaScript con HTML
- Falta de validación de estructura HTML

### 5. Problemas de Comunicación UI-Backend
**Síntoma:** Mensajes no se transmitían correctamente
```javascript
// ❌ Estructura de mensaje inconsistente
parent.postMessage({ type: 'load' }); // Incorrecto
```

**Causa raíz:**
- Estructura de mensajes inconsistente entre UI y backend
- Falta de debugging y logging

---

## 🔧 Proceso de Resolución

### Fase 1: Corrección del Manifest y CDN
```json
{
  "networkAccess": {
    "allowedDomains": [
      "https://cdn.jsdelivr.net",
      "https://fonts.googleapis.com",
      "https://fonts.gstatic.com"
    ]
  }
}
```

**Acciones tomadas:**
1. Agregamos `networkAccess` al manifest.json
2. Especificamos dominios permitidos para Bootstrap y Google Fonts
3. Confirmamos que `"ui": "ui.html"` apuntaba al archivo correcto

### Fase 2: Migración de Grupos a Colecciones
```typescript
// ✅ Enfoque correcto - basado en colecciones
const allVariables = await figma.variables.getLocalVariablesAsync();
const allCollections = await figma.variables.getLocalVariableCollectionsAsync();
```

**Acciones tomadas:**
1. Reemplazamos `getLocalVariableGroupsAsync()` por `getLocalVariableCollectionsAsync()`
2. Mapeamos variables a sus colecciones correspondientes
3. Creamos estructura de datos consistente

### Fase 3: Identificación de la API Correcta
Después de múltiples intentos con APIs incorrectas, descubrimos:

```typescript
// ✅ API correcta
variable.setVariableCodeSyntax("WEB" as any, formattedName);
```

**Proceso de descubrimiento:**
1. Probamos `setCodeSyntaxAsync()` - No existe
2. Investigamos `setCodeSyntax()` - Deprecated
3. Encontramos `setVariableCodeSyntax()` - ¡Funciona!

### Fase 4: Restauración y Refactoring del HTML
```bash
# Estrategia de recuperación
1. Identificar corrupción usando grep_search
2. Restaurar desde backup (ui_backup.html)
3. Aplicar cambios incrementales
4. Validar cada cambio
```

**Proceso sistemático:**
1. Restauramos `ui.html` desde `ui_backup.html`
2. Reemplazamos arquitectura de acordeón por cards con checkboxes
3. Actualizamos toda la lógica JavaScript para manejar selecciones
4. Implementamos contadores y modales mejorados

### Fase 5: Implementación de Cards Horizontales
```css
.collection-card {
  background-color: #2a2f33;
  border: none;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  padding: 1rem;
  transition: background-color 0.2s ease;
}

.collection-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0;
}
```

### Fase 6: Debugging y Logging Robusto
```javascript
// UI
console.log("📩 Mensaje recibido en UI:", event.data);

// Backend
console.log("📨 Mensaje recibido:", msg);
console.log(`✅ ${variable.name} -> ${formattedName}`);
```

---

## ✅ Solución Final

### Arquitectura del Plugin

#### 1. **manifest.json** - Configuración
```json
{
  "name": "Syntaxer",
  "main": "code.js",
  "ui": "ui.html",
  "networkAccess": {
    "allowedDomains": [
      "https://cdn.jsdelivr.net",
      "https://fonts.googleapis.com",
      "https://fonts.gstatic.com"
    ]
  }
}
```

#### 2. **code.ts** - Backend Logic
**Funciones principales:**
- `loadVariableData()`: Carga colecciones y variables
- `formatVariableName()`: Aplica convenciones de nomenclatura
- Message handler para comunicación con UI

**APIs utilizadas:**
- `figma.variables.getLocalVariablesAsync()`
- `figma.variables.getLocalVariableCollectionsAsync()`
- `variable.setVariableCodeSyntax(platform, syntax)`

#### 3. **ui.html** - Frontend Interface
**Componentes principales:**
- Selector de presets (Tailwind, Android, iOS, SCSS)
- Configuración de convenciones de nomenclatura
- Cards de colecciones con checkboxes
- Vista previa de transformaciones
- Modales de confirmación

### Flujo de Datos
```
1. UI carga → Envía 'load-data'
2. Backend → Carga colecciones → Envía 'collections'
3. Usuario selecciona → Configura opciones
4. Usuario aplica → Envía 'apply-code-syntax'
5. Backend procesa → Aplica API → Envía resultado
6. UI muestra feedback → Usuario confirmado
```

### Funcionalidades Implementadas

#### ✅ Gestión de Colecciones
- Visualización como cards horizontales
- Checkbox individual y maestro
- Contador de selecciones en tiempo real
- Display de total de variables por colección

#### ✅ Convenciones de Nomenclatura
- kebab-case: `color-bg-primary`
- camelCase: `colorBgPrimary`
- PascalCase: `ColorBgPrimary`
- snake_case: `color_bg_primary`
- dot.notation: `color.bg.primary`

#### ✅ Presets Predefinidos
- **Tailwind/CSS**: `var(--color-bg-primary)`
- **Android**: `@android/color.bg.primary`
- **iOS**: `color.bg.primary`
- **SCSS**: `$color-bg-primary`

#### ✅ Validación y Feedback
- Modales de confirmación
- Snackbars de estado
- Manejo de errores robusto
- Logging detallado

---

## 🎓 Lecciones Aprendidas

### 1. **Sandbox de Figma es Restrictivo**
**Aprendizaje:** Los plugins de Figma ejecutan en un entorno sandbox que bloquea recursos externos por defecto.

**Solución:** Siempre configurar `networkAccess` en el manifest para permitir CDNs necesarios.

**Código:**
```json
"networkAccess": {
  "allowedDomains": ["https://cdn.jsdelivr.net"]
}
```

### 2. **API de Figma Cambia Frecuentemente**
**Aprendizaje:** Las APIs pueden ser deprecated o cambiar nombres sin previo aviso.

**Solución:** 
- Consultar documentación oficial regularmente
- Probar APIs en consola de desarrollador
- Implementar manejo de errores robusto

### 3. **Comunicación UI-Backend Requiere Estructura**
**Aprendizaje:** Los mensajes entre UI y backend deben seguir una estructura consistente.

**Mejores prácticas:**
```javascript
// ✅ Estructura consistente
parent.postMessage({
  pluginMessage: {
    type: 'action-name',
    data: { ... }
  }
}, '*');
```

### 4. **Debugging es Esencial**
**Aprendizaje:** Sin logging adecuado, es imposible diagnosticar problemas en plugins.

**Implementación:**
```javascript
console.log("🔄 Loading data...");
console.log("✅ Success:", result);
console.log("❌ Error:", error);
```

### 5. **Backup y Versionado Son Críticos**
**Aprendizaje:** Los archivos pueden corromperse durante el desarrollo iterativo.

**Estrategia:** Mantener múltiples versiones de respaldo (`ui_backup.html`, `ui_simple.html`, etc.)

### 6. **UI Patterns de Figma**
**Aprendizaje:** Los usuarios esperan patrones familiares (cards, checkboxes, modales).

**Implementación:** Usar Bootstrap con tema dark para mantener consistencia visual.

### 7. **Performance con Variables**
**Aprendizaje:** Procesar muchas variables puede ser lento.

**Optimización:**
- Filtrar variables antes de procesar
- Mostrar progreso al usuario
- Manejar errores individualmente

---

## 🔮 Consideraciones Futuras

### 1. **Mejoras de Funcionalidad**

#### A. Soporte Multi-Plataforma
```typescript
// Implementar para múltiples plataformas
const platforms = ["WEB", "ANDROID", "iOS"];
platforms.forEach(platform => {
  variable.setVariableCodeSyntax(platform, getFormattedName(platform));
});
```

#### B. Plantillas Personalizadas
```javascript
// Sistema de plantillas más flexible
const templates = {
  "custom-css": "var(--${name})",
  "js-object": "${prefix}.${name}",
  "json-path": "${path}.${name}"
};
```

#### C. Importar/Exportar Configuraciones
```json
{
  "presetName": "My Custom Preset",
  "convention": "kebab",
  "prefix": "var(--",
  "suffix": ")",
  "platforms": ["WEB"]
}
```

### 2. **Mejoras de UX/UI**

#### A. Vista Previa en Tiempo Real
- Mostrar transformaciones en tiempo real mientras el usuario escribe
- Preview de variables seleccionadas específicamente

#### B. Historial de Cambios
- Mantener log de transformaciones aplicadas
- Función de "deshacer" cambios

#### C. Búsqueda y Filtrado
```javascript
// Filtros avanzados
const filters = {
  byType: ["COLOR", "NUMBER", "STRING"],
  byCollection: ["Brand Colors", "Typography"],
  byName: "background"
};
```

### 3. **Mejoras Técnicas**

#### A. TypeScript Más Estricto
```typescript
interface VariableCodeSyntaxOptions {
  convention: 'kebab' | 'camel' | 'pascal' | 'snake' | 'dot';
  prefix: string;
  suffix: string;
  separator?: string;
}
```

#### B. Testing Automatizado
```javascript
// Tests unitarios para transformaciones
describe('formatVariableName', () => {
  it('should format kebab-case correctly', () => {
    expect(formatName('Color/Background/Primary', 'kebab'))
      .toBe('color-background-primary');
  });
});
```

#### C. Manejo de Estados
```javascript
// State management más robusto
const state = {
  collections: [],
  selectedCollections: [],
  options: defaultOptions,
  isLoading: false
};
```

### 4. **Integración con Herramientas**

#### A. Exportación a Style Dictionary
```json
{
  "color": {
    "background": {
      "primary": {
        "value": "{color.blue.500}",
        "type": "color"
      }
    }
  }
}
```

#### B. Integración con Design Systems
- Tokens Studio compatibility
- Figma Variables API v2 support

### 5. **Monitoreo y Analytics**

#### A. Error Tracking
```javascript
// Implementar Sentry o similar
try {
  await applyCodeSyntax();
} catch (error) {
  errorTracker.captureException(error);
}
```

#### B. Usage Analytics
- Qué presets se usan más
- Patrones de uso comunes
- Feedback de usuarios

---

## 📘 Guía de Uso

### Instalación
1. Abrir Figma
2. Ir a Plugins → Development → Import plugin from manifest
3. Seleccionar `manifest.json` del proyecto

### Flujo de Trabajo Básico

#### 1. **Configurar Preset**
- Seleccionar preset predefinido (Tailwind, Android, iOS, SCSS)
- O configurar "Personalizado" con opciones específicas

#### 2. **Seleccionar Colecciones**
- Usar checkbox maestro para seleccionar todas
- O seleccionar colecciones individuales
- Verificar contador de selección

#### 3. **Configurar Opciones**
- Elegir convención de nomenclatura
- Configurar prefijo y sufijo
- Ajustar separador si es necesario

#### 4. **Vista Previa**
- Revisar transformaciones en la tabla de preview
- Ajustar configuración si es necesario

#### 5. **Aplicar Cambios**
- Hacer clic en "Aplicar cambios"
- Confirmar en modal
- Verificar feedback de éxito

### Casos de Uso Comunes

#### CSS Custom Properties
```
Configuración:
- Preset: Tailwind/CSS
- Convención: kebab-case
- Prefijo: var(--
- Sufijo: )

Resultado: var(--color-background-primary)
```

#### SCSS Variables
```
Configuración:
- Preset: SCSS
- Convención: kebab-case
- Prefijo: $
- Sufijo: 

Resultado: $color-background-primary
```

#### JavaScript Objects
```
Configuración:
- Preset: Personalizado
- Convención: camelCase
- Prefijo: theme.
- Sufijo: 

Resultado: theme.colorBackgroundPrimary
```

---

## 🏗️ Arquitectura Técnica

### Estructura de Archivos
```
Syntaxer/
├── manifest.json       # Configuración del plugin
├── code.ts            # Lógica backend (TypeScript)
├── code.js            # Lógica backend (JavaScript compilado)
├── ui.html            # Interfaz de usuario
├── ui_backup.html     # Backup de UI
├── ui_simple.html     # Versión simplificada
├── package.json       # Dependencias y scripts
├── tsconfig.json      # Configuración TypeScript
└── README.md          # Documentación básica
```

### Comunicación Plugin-UI

#### Mensajes UI → Backend
```javascript
// Cargar datos
{ type: 'load-data' }

// Aplicar code syntax
{
  type: 'apply-code-syntax',
  collections: ['collection-id-1', 'collection-id-2'],
  options: {
    convention: 'kebab',
    prefix: 'var(--',
    suffix: ')'
  }
}
```

#### Mensajes Backend → UI
```javascript
// Enviar colecciones
{
  type: 'collections',
  data: [
    {
      id: 'collection-id',
      name: 'Brand Colors',
      variables: [...],
      variableCount: 24
    }
  ]
}

// Resultado de aplicación
{
  type: 'apply-code-syntax-success',
  data: { processedVariables: 24 }
}

// Error
{
  type: 'apply-code-syntax-error',
  data: { error: 'Error message' }
}
```

### APIs de Figma Utilizadas

#### Variables API
```typescript
// Obtener variables locales
const variables = await figma.variables.getLocalVariablesAsync();

// Obtener colecciones
const collections = await figma.variables.getLocalVariableCollectionsAsync();

// Aplicar code syntax
variable.setVariableCodeSyntax(platform, syntax);
```

#### UI API
```typescript
// Mostrar UI
figma.showUI(__html__, { width: 800, height: 720 });

// Comunicación
figma.ui.postMessage(data);
figma.ui.onmessage = (msg) => { ... };

// Notificaciones
figma.notify(message);
```

### Compilación TypeScript
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["ES2017", "DOM"],
    "strict": true
  },
  "include": ["code.ts"]
}
```

```bash
# Compilar
npx tsc
```

---

## 🔍 Troubleshooting

### Problema: Bootstrap no carga
**Síntomas:**
- Styles no aplicados
- Layout roto
- Icons no visibles

**Solución:**
1. Verificar `networkAccess` en manifest.json
2. Confirmar URLs de CDN correctas
3. Revisar consola del navegador para errores de CORS

### Problema: Variables no se cargan
**Síntomas:**
- Lista de colecciones vacía
- Error "No variables found"

**Solución:**
1. Verificar que hay variables locales en el archivo
2. Comprobar permisos de documentAccess
3. Revisar logs en consola de desarrollo

### Problema: Code syntax no se aplica
**Síntomas:**
- Plugin dice "éxito" pero variables no cambian
- Error en aplicación

**Solución:**
1. Verificar API correcta: `setVariableCodeSyntax`
2. Confirmar formato de platform: "WEB", "ANDROID", "iOS"
3. Validar que variable existe y es accesible

### Problema: UI corrupta o no responde
**Síntomas:**
- Layout roto
- JavaScript errors
- Funcionalidad no funciona

**Solución:**
1. Restaurar desde backup: `ui_backup.html`
2. Verificar estructura HTML válida
3. Comprobar event listeners correctos

### Problema: Comunicación UI-Backend falla
**Síntomas:**
- Mensajes no llegan
- Datos no se cargan
- Acciones no funcionan

**Solución:**
1. Verificar estructura de mensajes consistente
2. Añadir logging en ambos lados
3. Confirmar `pluginMessage` wrapper

### Debug Mode
Añadir al código para debugging intensivo:

```javascript
// En UI
window.DEBUG = true;
if (window.DEBUG) {
  console.log('Debug info:', data);
}

// En Backend
const DEBUG = true;
if (DEBUG) {
  console.log('Backend debug:', msg);
}
```

---

## 📝 Conclusiones

### Éxitos del Proyecto

1. **Plugin Funcional**: Logramos crear un plugin completamente funcional que aplica code syntax a variables de Figma
2. **UI Profesional**: Interfaz limpia y moderna usando Bootstrap con tema oscuro
3. **Flexibilidad**: Soporte para múltiples convenciones y presets predefinidos
4. **Robustez**: Manejo de errores y comunicación estable entre componentes
5. **Experiencia de Usuario**: Feedback claro, confirmaciones y progreso visible

### Desafíos Superados

1. **Sandbox Restrictions**: Aprendimos a configurar networkAccess correctamente
2. **API Discovery**: Encontramos la API correcta después de múltiples intentos
3. **Data Architecture**: Migramos de grupos a colecciones exitosamente
4. **Code Corruption**: Implementamos estrategias de backup y recovery
5. **Communication Patterns**: Establecimos protocolo robusto UI-Backend

### Valor del Proceso

Este proyecto demostró la importancia de:
- **Documentación continua**: Cada problema y solución documentados
- **Iteración rápida**: Probar, fallar, aprender, mejorar
- **Backup strategies**: Múltiples versiones de respaldo salvaron el proyecto
- **Systematic debugging**: Logging detallado fue crucial para resolver problemas
- **User-centric design**: Priorizar la experiencia del usuario final

---

## 🎯 Próximos Pasos Inmediatos

### Semana 1-2
- [ ] Implementar soporte multi-plataforma completo
- [ ] Añadir más presets (React Native, Flutter, etc.)
- [ ] Mejorar vista previa en tiempo real

### Mes 1
- [ ] Sistema de plantillas personalizadas
- [ ] Importar/exportar configuraciones
- [ ] Testing automatizado básico

### Trimestre 1
- [ ] Integración con Style Dictionary
- [ ] Analytics de uso
- [ ] Marketplace de Figma submission

---

**Documento creado el 23 de julio de 2025**  
**Autor:** GitHub Copilot con Maximiliano Avendaño  
**Versión:** 1.0.0  

*Este documento representa el knowledge completo adquirido durante el desarrollo del plugin Syntaxer para Figma. Cada sección está basada en experiencias reales y problemas resueltos durante el proceso.*
