# 📘 Instructivo Oficial de Comentarios para el Proyecto de Grado (Versión Extensiva)

Este estándar está diseñado para **facilitar la comprensión del código por parte del jurado**, **ayudar a la memoria del sustentante** y **mejorar la documentación viva del proyecto**, incluso si eso implica más comentarios de lo habitual.

---

## 🟦 1. Comentario de Cabecera de Archivo **Solo uno por archivo.**

Debe incluirse **al inicio de cada archivo** (.py, .html, .js, .css).  
Sirve para indicar:

- **Ruta relativa del archivo** 
- **Propósito principal del archivo (maximo 2 lineas)**
- **Rol del archivo en el sistema (maximo 2 lineas)**
- Separadores visuales para mayor claridad

### Ejemplo en Python:
\`\`\`Python
# File: backend/core/processors/text_generator.py
# ──────────────────────────────────────────────────────────────────────
# Descripción: Módulo encargado de generar cuentos narrativos en texto
# a partir de los datos personalizados del niño/a. 
# ──────────────────────────────────────────────────────────────────────
\`\`\`

### Ejemplo en CSS:
\`\`\`css
/*File: frontend/assets/css/pages/dashboard.css
/* ────────────────────────────────────────────────────────────────────── */                         */
/* Propósito: Estilos específicos para el panel del usuario (dashboard). */
/* ────────────────────────────────────────────────────────────────────── */
\`\`\`

### Ejemplo en HTML:
\`\`\`HTML
<!-- File: frontend/pages/generate.html
<!-- ────────────────────────────────────────────────────────────────────── -->                                   -->
<!-- Propósito: Estructura HTML de la pantalla donde se genera el cuento. -->
<!-- ────────────────────────────────────────────────────────────────────── -->
\`\`\`

### Ejemplo en JS:
\`\`\`js
 File: frontend/assets/js/modules/pages/register.js
// ──────────────────────────────────────────────────────────────────────
// Descripción: Módulo que valida el formulario de registro de usuario.
// ──────────────────────────────────────────────────────────────────────
\`\`\`


 Cierre Comentario de Cabecera de Archivo
---

## 🟦 2. Comentarios de Bloque / Sección 

Sirven para **dividir lógicamente el archivo**. Se colocan antes de:

- Clases
- Funciones clave
- Componentes HTML
- Agrupaciones de variables o estilos
- Importaciones relevantes

### Ejemplo en Python:
\`\`\`python
# --- Función principal: generar_cuento() ---
# Toma los datos del niño/a y construye una historia estructurada con
# secciones como introducción, conflicto, resolución y moraleja.
def generar_cuento(user_data):
    ...
\`\`\`

### Ejemplo en CSS:
\`\`\`css
/* --- Estilos base para el contenedor del dashboard --- */
.dashboard-section {
    background-color: var(--clr-bg-soft);   /* Fondo suave */
    padding: var(--space-2);               /* Espaciado interno */
    border-radius: var(--radius-md);       /* Bordes redondeados */
    box-shadow: var(--shadow-md);          /* Sombra de profundidad */
}
\`\`\`

### Ejemplo en HTML:
\`\`\`html
<!-- --- Sección: Formulario de nombre y edad del niño/a --- -->
<section class="section-form-data">
  <input type="text" name="nombre" placeholder="Nombre del niño/a" />
</section>
\`\`\`

Cierre Comentarios de Bloque / Sección
---

## 🟦 3. Comentarios de Línea (Extensos, Explicativos)

Aquí se **acepta y recomienda el uso detallado**, especialmente para:

- Recordar qué hace una propiedad CSS
- Explicar por qué se eligió una variable
- Reforzar procesos como llamadas API, manejo de errores, estructuras SQL, etc.

### Ejemplo en JS:
\`\`\`js
// Captura el evento submit y previene comportamiento por defecto
form.addEventListener('submit', async (e) => {
  e.preventDefault(); // Para evitar recarga de página

  // Envia los datos a la API de registro mediante Axios
  const response = await apiClient.post('/auth/register', userData);
});
\`\`\`

### Ejemplo en CSS (estilo extendido):
\`\`\`css
/* Tarjeta principal del dashboard del usuario */
.dashboard-card {
  background-color: #fff;               /* Fondo blanco limpio */
  border-radius: 16px;                  /* Bordes redondeados suaves */
  padding: 24px;                        /* Espaciado interno cómodo */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); /* Sombra sutil para relieve */
  transition: transform 0.2s ease-in;   /* Efecto suave al hacer hover */
}
\`\`\`

Cierre  Comentarios de Línea
---

## 🟦 4. Comentarios de Uso para Scripts

Todos los archivos en `scripts/` deben incluir un bloque al inicio que indique cómo se ejecuta el script:

\`\`\`python
# Uso recomendado:
#   python3 scripts/purgar_archivos_assets.py
\`\`\`

Esto es **especialmente útil para el jurado**, ya que les permite probar directamente la herramienta sin documentación externa.

cierre Comentarios de Uso para Scripts
---

## 🟦 5.Comentarios para Importaciones
✅ Todas las importaciones deben estar comentadas, especialmente si el módulo o clase no es evidente por su nombre.

📌 Formato recomendado:

from moviepy.video.fx.resize import resize  # Importa efecto para cambiar el tamaño de clips (zoom, escalado)
from utils.logger import get_logger          # Importa función personalizada para registrar logs del sistema
from core.processors.audio_generator import AudioGenerator  # Módulo que genera audio a partir de texto

📍 Objetivo: poder explicar ante un jurado qué hace cada importación sin perder tiempo o dudas.

🟨 Ejemplos:

✔️ Recomendado:
from pathlib import Path  # Permite trabajar con rutas de archivos de forma multiplataforma
from moviepy import ImageClip  # Clip de imagen estática (frame visual del video)
from moviepy import TextClip   # Clip de texto sincronizado (para subtítulos)

❌ Evitar (sin contexto):

from moviepy import TextClip
from pathlib import Path

Cierre Comentarios para Importaciones

----

🔁 Buenas prácticas adicionales:
Agrupa primero las importaciones estándar de Python, luego las de librerías externas, y por último las de módulos internos del proyecto.

En archivos largos, puedes separar los grupos con un comentario tipo # --- Importaciones internas del sistema ---.

## 🔴 Comentarios que debes evitar

- “Alex, revisa esto”, “esto estaba antes en...”
- Frases como “esto es temporal”, “esto no se usa”
- Mensajes sin explicación (“fix rápido”, “esto ya funciona”)
- TODOs sin fecha ni responsable (si algo falta, ponlo en README o Notas de Integración)
- Comentarios redundantes que repiten el código
- Comentarios en inglés u otro idioma que no sea español
- Pon el código aquí -->
- <-- Elimina esta liena
- Emoticones

Cierre Buenas prácticas adicionales
---

## ✅ Reglas Finales

- Comenta siempre con el **propósito de explicar tu lógica o tu intención**.
- Usa español, ya que es el idioma del jurado.
- Aplica el mismo estándar en `.py`, `.js`, `.html` y `.css` y cualquier otro archivo que acepte comentarios.
