# Flujo de Trabajo con Git

Este proyecto utiliza un flujo de trabajo con dos ramas principales:

## Ramas

### `main` (Producción)
- Código estable y probado
- Solo se actualiza mediante Pull Requests desde `develop`
- Representa el código en producción

### `develop` (Desarrollo)
- Rama de desarrollo activo
- Aquí se prueban nuevas funcionalidades
- Una vez probadas y estables, se fusionan a `main`

## Flujo de Trabajo Recomendado

### 1. Trabajar en `develop`

```bash
# Asegúrate de estar en develop
git checkout develop

# Actualizar develop con los últimos cambios
git pull origin develop

# Hacer tus cambios...
# (editar archivos, agregar funcionalidades, etc.)

# Agregar archivos modificados
git add .

# Hacer commit
git commit -m "Descripción de los cambios"

# Subir a GitHub
git push origin develop
```

### 2. Probar los Cambios

Después de hacer push a `develop`, prueba tu aplicación:
- Ejecuta tests
- Prueba manualmente las funcionalidades
- Verifica que no haya errores

### 3. Fusionar a `main` (cuando esté probado)

Cuando los cambios en `develop` estén probados y funcionando:

```bash
# Cambiar a main
git checkout main

# Actualizar main
git pull origin main

# Fusionar develop en main
git merge develop

# Subir a GitHub
git push origin main

# Volver a develop para seguir trabajando
git checkout develop
```

## Alternativa: Pull Requests en GitHub

También puedes usar Pull Requests en GitHub:

1. Haz push a `develop`
2. Ve a GitHub: https://github.com/Alexisghub-Z/sistema_nutriologia_seguimientos
3. Crea un Pull Request de `develop` → `main`
4. Revisa los cambios
5. Aprueba y fusiona el Pull Request

## Comandos Útiles

```bash
# Ver en qué rama estás
git branch

# Ver el estado de tus archivos
git status

# Ver los cambios que has hecho
git diff

# Ver el historial de commits
git log --oneline

# Deshacer cambios no confirmados
git checkout -- archivo.txt

# Ver ramas remotas
git branch -r
```

## Buenas Prácticas

1. **Siempre trabaja en `develop`** para nuevas funcionalidades
2. **Haz commits pequeños y frecuentes** con mensajes descriptivos
3. **Prueba antes de fusionar a `main`**
4. **Mantén `main` siempre funcional**
5. **Actualiza frecuentemente** con `git pull` antes de hacer cambios

## Mensajes de Commit

Usa mensajes descriptivos:

```bash
# Buenos ejemplos
git commit -m "Agregar validación de email en formulario de contacto"
git commit -m "Corregir error en cálculo de IMC"
git commit -m "Actualizar diseño del calendario"

# Malos ejemplos
git commit -m "fix"
git commit -m "cambios"
git commit -m "update"
```

## Estado Actual

- **Rama activa**: `develop`
- Trabajarás aquí para hacer pruebas y desarrollo
- Cuando todo funcione bien, fusionarás a `main`
