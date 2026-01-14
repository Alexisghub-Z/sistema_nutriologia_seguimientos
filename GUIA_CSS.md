# Guía de Estilos CSS - Sistema de Nutriólogo

Este documento describe cómo trabajar con los estilos en este proyecto usando CSS puro.

## 📋 Índice

1. [Filosofía de Diseño](#filosofía-de-diseño)
2. [Variables CSS](#variables-css)
3. [CSS Modules](#css-modules)
4. [Componentes UI Comunes](#componentes-ui-comunes)
5. [Mejores Prácticas](#mejores-prácticas)

---

## Filosofía de Diseño

Este proyecto utiliza **CSS Puro** en lugar de frameworks CSS como Tailwind por las siguientes razones:

✅ **Control Total**: Control completo sobre cada línea de CSS
✅ **Sin Dependencias**: No dependemos de frameworks externos para estilos
✅ **Rendimiento**: Solo cargamos el CSS que realmente usamos
✅ **Mantenibilidad**: CSS más semántico y fácil de mantener
✅ **Curva de Aprendizaje**: CSS estándar que cualquier desarrollador conoce

---

## Variables CSS

Todas las variables CSS están centralizadas en `src/app/globals.css`.

### Colores

```css
/* Colores principales */
--color-primary: #2d9f5d;
--color-primary-dark: #247a47;
--color-primary-light: #4db87a;
--color-secondary: #3b82f6;

/* Colores semánticos */
--color-success: #10b981;
--color-warning: #f59e0b;
--color-error: #ef4444;
--color-info: #3b82f6;

/* Escala de grises */
--color-gray-50: #f9fafb;
--color-gray-100: #f3f4f6;
/* ... hasta gray-900 */
```

**Uso:**
```css
.miComponente {
  background-color: var(--color-primary);
  color: var(--color-white);
}
```

### Espaciado

```css
--spacing-xs: 0.25rem;   /* 4px */
--spacing-sm: 0.5rem;    /* 8px */
--spacing-md: 1rem;      /* 16px */
--spacing-lg: 1.5rem;    /* 24px */
--spacing-xl: 2rem;      /* 32px */
--spacing-2xl: 3rem;     /* 48px */
```

**Uso:**
```css
.miComponente {
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
}
```

### Border Radius

```css
--radius-sm: 0.25rem;
--radius-md: 0.5rem;
--radius-lg: 0.75rem;
--radius-xl: 1rem;
--radius-full: 9999px;
```

### Sombras

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
```

### Tipografía

```css
/* Tamaños */
--font-size-xs: 0.75rem;
--font-size-sm: 0.875rem;
--font-size-md: 1rem;
--font-size-lg: 1.125rem;
--font-size-xl: 1.25rem;
--font-size-2xl: 1.5rem;
--font-size-3xl: 1.875rem;
--font-size-4xl: 2.25rem;

/* Pesos */
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
```

### Transiciones

```css
--transition-fast: 150ms ease;
--transition-normal: 300ms ease;
--transition-slow: 500ms ease;
```

---

## CSS Modules

Usamos **CSS Modules** para encapsular los estilos de cada componente.

### Estructura de Archivos

```
MiComponente/
├── MiComponente.tsx
└── MiComponente.module.css
```

### Ejemplo Completo

**MiComponente.tsx:**
```tsx
import styles from './MiComponente.module.css'

export default function MiComponente() {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Título</h2>
      <p className={styles.description}>Descripción</p>
      <button className={styles.button}>
        Acción
      </button>
    </div>
  )
}
```

**MiComponente.module.css:**
```css
.container {
  padding: var(--spacing-lg);
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
}

.title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
  margin-bottom: var(--spacing-md);
}

.description {
  font-size: var(--font-size-md);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-lg);
}

.button {
  padding: var(--spacing-sm) var(--spacing-lg);
  background-color: var(--color-primary);
  color: var(--color-white);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.button:hover {
  background-color: var(--color-primary-dark);
}
```

### Combinando Clases

Usa la función `cn()` de `src/lib/utils.ts`:

```tsx
import { cn } from '@/lib/utils'
import styles from './MiComponente.module.css'

export default function MiComponente({ isActive }: { isActive: boolean }) {
  return (
    <div className={cn(styles.container, isActive && styles.active)}>
      Contenido
    </div>
  )
}
```

---

## Componentes UI Comunes

Tenemos estilos predefinidos para componentes comunes en `src/components/ui/common.module.css`.

### Botones

```tsx
import styles from '@/components/ui/common.module.css'

// Botón primario
<button className={styles.button + ' ' + styles.buttonPrimary}>
  Guardar
</button>

// Botón secundario
<button className={styles.button + ' ' + styles.buttonSecondary}>
  Cancelar
</button>

// Botón outline
<button className={styles.button + ' ' + styles.buttonOutline}>
  Editar
</button>

// Botón peligroso
<button className={styles.button + ' ' + styles.buttonDanger}>
  Eliminar
</button>

// Tamaños
<button className={styles.button + ' ' + styles.buttonPrimary + ' ' + styles.buttonSmall}>
  Pequeño
</button>

<button className={styles.button + ' ' + styles.buttonPrimary + ' ' + styles.buttonLarge}>
  Grande
</button>
```

### Inputs

```tsx
import styles from '@/components/ui/common.module.css'

<div className={styles.formGroup}>
  <label className={styles.label}>Email</label>
  <input
    type="email"
    className={styles.input}
    placeholder="tu@email.com"
  />
  <span className={styles.errorMessage}>
    Este campo es requerido
  </span>
</div>
```

### Cards

```tsx
import styles from '@/components/ui/common.module.css'

<div className={styles.card}>
  <div className={styles.cardHeader}>
    <h3 className={styles.cardTitle}>Título de la Card</h3>
    <p className={styles.cardDescription}>Descripción opcional</p>
  </div>
  <div className={styles.cardBody}>
    Contenido de la card
  </div>
  <div className={styles.cardFooter}>
    <button className={styles.button + ' ' + styles.buttonOutline}>
      Cancelar
    </button>
    <button className={styles.button + ' ' + styles.buttonPrimary}>
      Guardar
    </button>
  </div>
</div>
```

### Badges

```tsx
import styles from '@/components/ui/common.module.css'

<span className={styles.badge + ' ' + styles.badgeSuccess}>
  Completada
</span>

<span className={styles.badge + ' ' + styles.badgeWarning}>
  Pendiente
</span>

<span className={styles.badge + ' ' + styles.badgeError}>
  Cancelada
</span>
```

### Alerts

```tsx
import styles from '@/components/ui/common.module.css'

<div className={styles.alert + ' ' + styles.alertSuccess}>
  ✅ Operación exitosa
</div>

<div className={styles.alert + ' ' + styles.alertError}>
  ❌ Ocurrió un error
</div>

<div className={styles.alert + ' ' + styles.alertWarning}>
  ⚠️ Advertencia
</div>

<div className={styles.alert + ' ' + styles.alertInfo}>
  ℹ️ Información
</div>
```

### Loading Spinner

```tsx
import styles from '@/components/ui/common.module.css'

<div className={styles.spinner} />
```

---

## Mejores Prácticas

### ✅ DO - Hacer

1. **Usar variables CSS siempre que sea posible**
   ```css
   .miBoton {
     padding: var(--spacing-md);
     background-color: var(--color-primary);
   }
   ```

2. **Nombrar clases de forma semántica**
   ```css
   /* ✅ Bueno */
   .cardHeader { }
   .submitButton { }

   /* ❌ Malo */
   .blueBox { }
   .btn1 { }
   ```

3. **Usar CSS Modules para componentes**
   ```tsx
   import styles from './MiComponente.module.css'
   <div className={styles.container}>...</div>
   ```

4. **Mantener estilos específicos en el módulo del componente**
   ```css
   /* MiComponente.module.css */
   .container {
     /* Estilos específicos de este componente */
   }
   ```

5. **Reutilizar estilos comunes desde common.module.css**
   ```tsx
   import commonStyles from '@/components/ui/common.module.css'
   <button className={commonStyles.button}>...</button>
   ```

### ❌ DON'T - No hacer

1. **No usar estilos inline**
   ```tsx
   /* ❌ Evitar */
   <div style={{ color: 'red', padding: '16px' }}>...</div>

   /* ✅ Usar CSS Modules */
   <div className={styles.container}>...</div>
   ```

2. **No duplicar variables CSS**
   ```css
   /* ❌ Malo */
   .miComponente {
     color: #2d9f5d; /* Duplica el valor */
   }

   /* ✅ Bueno */
   .miComponente {
     color: var(--color-primary);
   }
   ```

3. **No usar !important a menos que sea absolutamente necesario**
   ```css
   /* ❌ Evitar */
   .miClase {
     color: red !important;
   }
   ```

4. **No abusar de las clases utility globales**
   ```tsx
   /* ❌ Evitar */
   <div className="flex items-center justify-between mb-md mt-lg gap-sm">
     ...
   </div>

   /* ✅ Mejor */
   <div className={styles.header}>
     ...
   </div>
   ```

### Responsive Design

Usa media queries en tus CSS Modules:

```css
.container {
  padding: var(--spacing-md);
}

/* Tablet */
@media (min-width: 768px) {
  .container {
    padding: var(--spacing-lg);
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .container {
    padding: var(--spacing-xl);
  }
}
```

### Organización de Archivos CSS

```css
/* MiComponente.module.css */

/* 1. Contenedor principal */
.container {
  /* ... */
}

/* 2. Elementos hijos */
.header {
  /* ... */
}

.body {
  /* ... */
}

.footer {
  /* ... */
}

/* 3. Modificadores */
.containerLarge {
  /* ... */
}

.headerActive {
  /* ... */
}

/* 4. Estados */
.button:hover {
  /* ... */
}

.button:disabled {
  /* ... */
}

/* 5. Media queries */
@media (min-width: 768px) {
  .container {
    /* ... */
  }
}
```

---

## Recursos Adicionales

- [CSS Variables (MDN)](https://developer.mozilla.org/es/docs/Web/CSS/Using_CSS_custom_properties)
- [CSS Modules (Next.js)](https://nextjs.org/docs/app/building-your-application/styling/css-modules)
- [BEM Methodology](https://getbem.com/)

---

**¿Preguntas?** Consulta con el equipo de desarrollo.
