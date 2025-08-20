# Guía de Diseño UI - Estilo Figma Dark Mode

Esta guía proporciona las instrucciones y prompts necesarios para crear interfaces de usuario con el mismo nivel de calidad y consistencia que la interfaz Syntaxer, replicando el estilo de Figma con modo oscuro.

## 🎨 Filosofía de Diseño

### Principios Fundamentales
- **Pixel Perfect**: Cada elemento debe seguir exactamente las especificaciones de Figma
- **Design Tokens**: Sistema consistente de colores, espaciado y tipografía
- **Dark Mode First**: Optimizado para modo oscuro con excelente contraste
- **Responsive**: Funciona perfectamente en todas las resoluciones
- **Accesibilidad**: Alto contraste y navegación intuitiva

## 🎯 Prompt Principal para Interfaces Similares

```
Crea una interfaz web estilo Figma con modo oscuro usando HTML, CSS y Bootstrap 5. 

ESPECIFICACIONES TÉCNICAS:
- HTML semántico con estructura de contenedores
- CSS variables para design tokens
- Bootstrap 5 CDN + Bootstrap Icons
- Fuente: Inter (Google Fonts)
- JavaScript vanilla para interactividad

SISTEMA DE DESIGN TOKENS:
- Colores: Paleta oscura (#1e1e1e fondo, #ffffff texto principal, #cdcdcd secundario)
- Espaciado: Sistema 150/200/300/400/600px
- Border radius: 8px consistente
- Tipografía: Inter, 16px base, jerarquía clara

ESTRUCTURA REQUERIDA:
- Container principal: max-width 720px, centrado
- Header: Logo + título alineados izquierda horizontal
- Secciones: Title container + Content container
- Formularios: Labels, inputs, selects con estilos personalizados
- Botones: Estados normal/hover/active bien definidos
- Responsive: Mantener alineación horizontal en mobile

COMPONENTES CLAVE:
- Section containers con padding y background secundario
- Custom checkboxes con iconos Bootstrap
- Toggle buttons con estados activos
- Form inputs con chevrons personalizados (selects)
- Tables con bordes y spacing consistente
- Action buttons con flex 50/50

INTERACTIVIDAD:
- Hover states sutiles con transiciones 0.2s
- Toggle functionality para checkboxes y botones
- Smooth animations para expansión de contenido
- Color consistency en todos los estados

CALIDAD VISUAL:
- Contraste perfecto para dark mode
- Iconos con mismo color que texto relevante
- Spacing consistente usando design tokens
- Elementos perfectamente alineados y contenidos
```

## 🎨 Design Tokens System

### Colores
```css
:root {
  /* Texto */
  --sds-color-text-default-default: #ffffff;
  --sds-color-text-neutral-secondary: #cdcdcd;
  --sds-color-text-positive-secondary: #85e0a3;
  
  /* Iconos */
  --sds-color-icon-default-default: #ffffff;
  --sds-color-icon-brand-on-brand: #1e1e1e;
  
  /* Fondos */
  --sds-color-background-default-default: #1e1e1e;
  --sds-color-background-default-secondary: #2c2c2c;
  --sds-color-background-brand-secondary: #444444;
  --sds-color-background-brand-default: #f5f5f5;
  
  /* Bordes */
  --sds-color-border-default-default: #444444;
  
  /* Espaciado */
  --sds-size-space-150: 6px;
  --sds-size-space-200: 8px;
  --sds-size-space-300: 12px;
  --sds-size-space-400: 16px;
  --sds-size-space-600: 24px;
  
  /* Radius */
  --sds-size-radius-100: 8px;
  --sds-size-radius-200: 8px;
  
  /* Borders */
  --sds-size-stroke-border: 1px;
}
```

## 🏗️ Estructura de Componentes

### Container Principal
```html
<div class="syntaxer-container">
  <!-- Contenido aquí -->
</div>
```

```css
.syntaxer-container {
  background-color: var(--sds-color-background-default-default);
  border-radius: var(--sds-size-radius-200);
  max-width: 720px;
  margin: 0 auto;
  padding: var(--sds-size-space-600);
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}
```

### Header con Logo
```html
<div class="syntaxer-header">
  <div class="syntaxer-header-top">
    <!-- SVG Logo aquí -->
    <h1 class="syntaxer-title">Nombre App</h1>
  </div>
  <p class="syntaxer-subtitle">Descripción</p>
</div>
```

### Secciones Estándar
```html
<div class="section-container">
  <div class="section-title-container">
    <h3 class="section-title">Título Sección</h3>
    <p class="section-subtitle">Descripción opcional</p>
  </div>
  
  <div class="section-content-container">
    <!-- Contenido de la sección -->
  </div>
</div>
```

### Custom Checkboxes
```html
<div class="custom-checkbox checked" onclick="toggle()">
  <i class="bi bi-check"></i>
</div>
```

### Toggle Buttons
```html
<button class="scope-btn active" onclick="toggle()">Texto</button>
```

### Form Inputs
```html
<label class="form-label">Label</label>
<input type="text" class="form-control" value="Valor">
<select class="form-select">
  <option>Opción</option>
</select>
```

## 🎨 Prompts Específicos por Componente

### Para Formularios
```
Crea formularios estilo Figma dark mode con:
- Labels en color neutral secondary (#cdcdcd)
- Inputs con fondo negro (#1e1e1e) y borde gris (#444444)
- Focus state con borde azul y sombra sutil
- Selects con chevron blanco personalizado
- Placeholder text en color secundario
- Border radius 8px consistente
```

### Para Botones
```
Diseña botones toggle estilo Figma con:
- Estado inactivo: fondo gris (#444444), texto blanco
- Estado activo: fondo blanco (#f5f5f5), texto negro
- Hover inactivo: mismo fondo + borde blanco
- Hover activo: mantener apariencia activa
- Transiciones suaves 0.2s
- Padding 8px horizontal, 12px vertical
```

### Para Tablas
```
Crea tablas estilo Figma con:
- Headers con fondo brand secondary y texto blanco
- Celdas con padding 12px 16px
- Bordes sutiles en color border default
- Última fila sin borde inferior
- Texto code en color positive secondary (#85e0a3)
- Font monospace para código
```

### Para Checkboxes Personalizados
```
Diseña checkboxes custom estilo Figma:
- Tamaño 20x20px
- Border radius 4px
- Estado unchecked: fondo transparente, borde gris
- Estado checked: fondo blanco, icono check negro
- Transición opacity para icono 0.1s
- Hover state sutil
```

## 📱 Responsive Design Patterns

### Mobile Strategy
```css
@media (max-width: 768px) {
  .syntaxer-header-top {
    justify-content: flex-start; /* Mantener izquierda */
    align-items: center;
    text-align: left;
  }
  
  .action-buttons {
    flex-direction: column;
    gap: var(--sds-size-space-300);
  }
  
  .action-buttons button {
    width: 100%;
  }
}
```

## 🎯 Prompts de Validación

### Checklist de Calidad
```
Verifica que la interfaz cumple con:

VISUAL:
✅ Contraste perfecto en modo oscuro
✅ Iconos mismo color que texto relevante  
✅ Spacing consistente con design tokens
✅ Border radius 8px en todos los elementos
✅ Tipografía Inter, jerarquía clara

LAYOUT:
✅ Container principal 720px max-width
✅ Header logo+título siempre horizontal izquierda
✅ Secciones con title+content containers
✅ Elementos perfectamente alineados y contenidos

INTERACCIÓN:
✅ Hover states sutiles y consistentes
✅ Transiciones suaves 0.2s
✅ Estados activos bien diferenciados
✅ Responsive mantiene alineación horizontal

TÉCNICO:
✅ HTML semántico y accesible
✅ CSS variables para design tokens
✅ Bootstrap 5 + Bootstrap Icons
✅ JavaScript vanilla para interactividad
```

## 🚀 Prompts de Extensión

### Para Nuevas Secciones
```
Añade una nueva sección siguiendo el patrón Syntaxer:
- Usa .section-container como wrapper
- Title container con h3.section-title y p.section-subtitle opcional
- Content container con fondo secondary y padding 16px
- Mantén spacing consistente con design tokens
- [Describe el contenido específico de la sección]
```

### Para Nuevos Componentes
```
Crea un componente [TIPO] estilo Figma dark mode que:
- Siga el sistema de design tokens establecido
- Use colores de la paleta (#1e1e1e, #ffffff, #cdcdcd, #444444)
- Tenga estados hover/active apropiados
- Sea responsive y accesible
- Se integre visualmente con el resto de la interfaz
- [Especificaciones específicas del componente]
```

## 📚 Recursos y Referencias

### Dependencies
```html
<!-- Bootstrap 5 -->
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">

<!-- Bootstrap Icons -->
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.2/font/bootstrap-icons.css" rel="stylesheet">

<!-- Google Fonts - Inter -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
```

### Figma Design System
- Usar Figma design tokens como referencia
- Mantener consistencia con componentes nativos de Figma
- Priorizar legibilidad y accesibilidad en modo oscuro
- Seguir principios de Material Design adaptados a dark mode

---

**Nota**: Esta guía está basada en el análisis de la interfaz Syntaxer, que logra un excelente equilibrio entre funcionalidad, estética y usabilidad siguiendo los estándares de diseño de Figma.
