

---

# 📘 Instructivo Oficial de Comentarios 

****TODOS LOS COMENTARIOS DEBEN SER EN ESPAÑOL***

*(Versión actualizada para uso con IAs, incluido Antigravity)*

Este estándar está diseñado para:

* Facilitar la comprensión del código por parte del jurado.
* Ayudar a la memoria del sustentante.
* Mejorar la documentación viva del proyecto.

> 🔴 **Regla global para IAs (Antigravity, ChatGPT, etc.)**
> Si generas o modificas código en este proyecto, **debes cumplir SIEMPRE este instructivo**.

---

## 🟦 0. Antes de escribir o modificar código (Regla para Antigravity y otras IAs)

Cada vez que una IA (por ejemplo, Antigravity) cree o modifique un archivo:

1. **Comprueba el encabezado:**

   * Si el archivo **ya tiene un comentario de cabecera correcto**, respétalo.
   * Si el archivo **no tiene cabecera**, tu primera acción debe ser **añadirla** siguiendo la sección 1.
   * El comentario de cabecera debe ser **la primera línea del archivo**, sin líneas en blanco antes.

2. **Comprueba el diseño (para archivos de frontend):**

   * Si el archivo es `.html`, `.css`, `.js`, `.tsx` o similar:

     * Asegúrate de que el resultado **mantiene un diseño homogéneo**, agradable y coherente con una web de organización de bodas.
     * No introduzcas estilos o componentes que rompan la línea visual general del proyecto.
   * Si haces un cambio que afecta a la UI:

     * Verifica que la vista sigue siendo legible, usable y consistente.

---

## 🟦 1. Comentario de Cabecera de Archivo

**(Obligatorio, solo uno por archivo, siempre al inicio)**

Debe incluirse **al inicio de cada archivo** (`.py`, `.html`, `.js`, `.css`, `.tsx`, etc.).
Sirve para indicar:

* **Ruta relativa del archivo**
* **Propósito principal del archivo (máximo 2 líneas)**
* **Rol del archivo en el sistema (máximo 2 líneas, opcional si el propósito ya lo cubre)**

🔹 Regla para IAs:

> Si creas un archivo nuevo, debes añadir este encabezado.
> Si editas un archivo sin encabezado, debes crearlo antes de hacer otros cambios.

### Ejemplo en Python

```python
# File: backend/core/processors/text_generator.py
# ──────────────────────────────────────────────────────────────────────
# Descripción: Módulo encargado de generar cuentos narrativos en texto
# a partir de los datos personalizados del niño/a.
# ──────────────────────────────────────────────────────────────────────
```

### Ejemplo en CSS

```css
/* File: frontend/assets/css/pages/dashboard.css
   ──────────────────────────────────────────────────────────────────────
   Propósito: Estilos específicos para el panel del usuario (dashboard).
   ────────────────────────────────────────────────────────────────────── */
```

### Ejemplo en HTML

```html
<!-- File: frontend/pages/generate.html
     ──────────────────────────────────────────────────────────────────────
     Propósito: Estructura HTML de la pantalla donde se genera el cuento.
     ────────────────────────────────────────────────────────────────────── -->
```

### Ejemplo en JS

```js
// File: frontend/assets/js/modules/pages/register.js
// ──────────────────────────────────────────────────────────────────────
// Descripción: Módulo que valida el formulario de registro de usuario.
// ──────────────────────────────────────────────────────────────────────
```

> 🔎 Nota: Las líneas como “Cierre Comentario de Cabecera de Archivo” son solo texto explicativo del instructivo. **No deben copiarse dentro de los archivos de código.**

---

## 🟦 2. Comentarios de Bloque / Sección

Sirven para **dividir lógicamente el archivo**. Se colocan antes de:

* Clases
* Funciones clave
* Componentes HTML
* Agrupaciones de variables o estilos
* Importaciones relevantes

### Ejemplo en Python

```python
# --- Función principal: generar_cuento() ---
# Toma los datos del niño/a y construye una historia estructurada con
# secciones como introducción, conflicto, resolución y moraleja.
def generar_cuento(user_data):
    ...
```

### Ejemplo en CSS

```css
/* --- Estilos base para el contenedor del dashboard --- */
.dashboard-section {
    background-color: var(--clr-bg-soft);   /* Fondo suave */
    padding: var(--space-2);               /* Espaciado interno */
    border-radius: var(--radius-md);       /* Bordes redondeados */
    box-shadow: var(--shadow-md);          /* Sombra de profundidad */
}
```

### Ejemplo en HTML

```html
<!-- --- Sección: Formulario de nombre y edad del niño/a --- -->
<section class="section-form-data">
  <input type="text" name="nombre" placeholder="Nombre del niño/a" />
</section>
```

---

## 🟦 3. Comentarios de Línea (explicativos y extensos)

Se **recomienda** usarlos de forma generosa para:

* Explicar decisiones de diseño o lógica.
* Recordar qué hace una propiedad CSS.
* Aclarar por qué se eligió una variable o estructura.
* Explicar llamadas a APIs, manejo de errores, consultas SQL, etc.

### Ejemplo en JS

```js
// Captura el evento submit y previene el comportamiento por defecto
form.addEventListener('submit', async (e) => {
  e.preventDefault(); // Evita recargar la página

  // Envía los datos a la API de registro mediante Axios
  const response = await apiClient.post('/auth/register', userData);
});
```

### Ejemplo en CSS

```css
/* Tarjeta principal del dashboard del usuario */
.dashboard-card {
  background-color: #fff;                     /* Fondo blanco limpio */
  border-radius: 16px;                        /* Bordes redondeados suaves */
  padding: 24px;                              /* Espaciado interno cómodo */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);  /* Sombra sutil para relieve */
  transition: transform 0.2s ease-in;         /* Efecto suave al hacer hover */
}
```

---

## 🟦 4. Comentarios de Uso para Scripts

Todos los archivos en `scripts/` deben incluir un bloque al inicio que indique **cómo se ejecuta el script**:

```python
# Uso recomendado:
#   python3 scripts/purgar_archivos_assets.py
```

Esto es especialmente útil para el jurado, ya que les permite usar las herramientas sin buscar documentación externa.

---

## 🟦 5. Comentarios para Importaciones

Todas las importaciones deben tener un comentario breve, especialmente si el módulo no es evidente por su nombre.

📌 Formato recomendado:

```python
from moviepy.video.fx.resize import resize   # Efecto para cambiar el tamaño de clips (zoom, escalado)
from utils.logger import get_logger          # Función personalizada para registrar logs del sistema
from core.processors.audio_generator import AudioGenerator  # Genera audio a partir de texto
```

📍 Objetivo: que el jurado pueda entender qué hace cada importación sin dudas.

### Ejemplos

✔️ Recomendado:

```python
from pathlib import Path     # Permite trabajar con rutas de archivos de forma multiplataforma
from moviepy import ImageClip  # Clip de imagen estática (frame visual del video)
from moviepy import TextClip   # Clip de texto sincronizado (para subtítulos)
```

❌ Evitar (sin contexto):

```python
from moviepy import TextClip
from pathlib import Path
```

> Buena práctica adicional:
>
> * Agrupa primero importaciones estándar de Python, luego librerías externas, y al final módulos internos del proyecto.
> * En archivos largos, puedes separar con comentarios tipo:
>   `# --- Importaciones internas del sistema ---`.

---

## 🔴 Comentarios que debes evitar

No deben aparecer en el código:

* “Alex, revisa esto”, “esto estaba antes en...”.
* Frases como “esto es temporal”, “esto no se usa”.
* Mensajes sin explicación (“fix rápido”, “esto ya funciona”).
* TODOs sin fecha ni responsable.
* Comentarios que repiten exactamente lo que ya se ve en el código.
* Comentarios en idiomas distintos al español.
* Indicaciones tipo “Pon el código aquí -->”, “<-- Elimina esta línea”.
* Emoticones u otros símbolos informales.

---

## ✅ Reglas finales

* Comenta siempre con el **propósito de explicar la lógica o la intención**.
* Usa español, que es el idioma del jurado.
* Aplica el mismo estándar en `.py`, `.js`, `.html`, `.css`, `.tsx` y cualquier otro archivo que acepte comentarios.
* Si eres una IA (como Antigravity), **no debes omitir el encabezado** y **no debes romper el diseño homogéneo del proyecto** al modificar el frontend.

---

