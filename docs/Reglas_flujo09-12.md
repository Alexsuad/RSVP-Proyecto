REGLAS_Y_CONTEXTO_PROYECTO.md

Aquí tienes el **documento completo**, limpio y profesional 
Incluye:

* Reglas generales
* Reglas de i18n
* Instructivo de comentarios
* Reglas de diseño
* Reglas de seguridad
* Reglas por agentes (Frontend, Backend, QA, Security, Diseño)
* Base de datos oficial
* Glosario de roles
* Flujo completo Orquestador ↔ Antigravity IDE
* Restricciones globales
* Nota explícita prohibiendo duplicación y código muerto
* SIEMPRE DEBES COMUNICARTE EN IDIOMA ESPAÑOL

---

# 📘 REGLAS_Y_CONTEXTO_PROYECTO.md

## (Documento unificado — Proyecto RSVP)

---

# 1. Contexto General del Proyecto RSVP

El proyecto RSVP es un sistema completo para la gestión de invitados de una boda.
Está compuesto por tres módulos principales:

### 1.1 APP de Invitados

Ruta: `/app/*`

Responsabilidades:

* Solicitud de acceso
* Login por email/teléfono
* Recuperación de código
* Formulario RSVP
* Página de confirmación

Características:

* **Totalmente multilingüe (ES/EN/RO)**
* Estética suave, elegante y emocional (tema boda)
* **Nunca contiene texto duro**: usa claves i18n en todo el frontend
* Alto énfasis en accesibilidad y experiencia móvil

---

### 1.2 Módulo ADMIN

Ruta: `/admin/*`

Responsabilidades:

* Login del organizador
* Dashboard
* Estadísticas
* Gestión de invitados (CRUD)
* Configuración del evento
* Reglas invitados: 
** Hay dos tipos de invitados
*** El que está invitado a la Ceremonia y recepción o fiesta
*** El que está invitado unicamente a la Recepción pero no a la Ceremonia.

Características:

* **Solo español neutro**
* Estilo profesional, limpio y claro
* Permite texto duro (pero coherente y no duplicado)
* No usa i18n

---

### 1.3 Backend API (FastAPI)

Responsabilidades:

* Autenticación de invitados
* CRUD de invitados
* Validación de códigos
* Gestión RSVP
* Envío de emails
* Persistencia de datos

Características:

* Arquitectura modular
* Debe mantener compatibilidad con el frontend
* Logs claros
* Responses tipadas mediante Pydantic

---

# 2. Arquitectura General del Proyecto

```
frontend/
   app/
   admin/
   assets/
   i18n/
   index.tsx
backend/
   app/
       routers/
       schemas/
       models/
       services/
       utils/
data/
   wedding_academico.db  ← Base de datos oficial
docs/
   REGLAS_Y_CONTEXTO_PROYECTO.md
   INSTRUCTIVO_COMENTARIOS.md
   DATOS_DE_PRUEBA_INVITADOS.md
   TAREAS/
```

---

# 3. Base de datos oficial del proyecto

La base de datos **oficial y vigente** es:

```
data/wedding_academico.db
```

Reglas globales:

1. Toda tarea que trabaje con datos reales debe asumir esta BD.
2. Otras bases (`wedding.db`, `test.db`, etc.) se consideran **obsoletas**.
3. Ningún agente puede crear, renombrar o mover la base de datos sin autorización explícita.
4. Para pruebas locales, Antigravity debe usar los datos documentados en:
   `/docs/DATOS_DE_PRUEBA_INVITADOS.md`

---

# 4. Reglas Globales del Proyecto

Estas reglas aplican SIEMPRE, en cualquier tarea y en cualquier módulo.

## 4.1 Regla de No-Asunción

El IDE no puede inventar:

* Rutas
* Modelos
* Lógicas no mencionadas
* Componentes nuevos
* Campos de BD
* Funciones no solicitadas

SIEMPRE debe pedir aclaración antes de actuar.

---

## 4.2 Regla de Alcance

Un agente solo puede modificar lo que la TAREA autoriza explícitamente:

* Si la tarea es de frontend → no toca backend.
* Si la tarea es de backend → no toca frontend.
* Si la tarea es de UX/UI → no toca lógica.
* Si la tarea es de QA → no toca código en absoluto.

---

## 4.3 Regla de Integridad

Ningún cambio puede:

* romper rutas
* romper la experiencia del usuario
* romper compatibilidad APP ↔ ADMIN ↔ API
* eliminar funciones esenciales
* introducir ambigüedad o duplicación
* dejar warnings o errores de compilación

---

## 4.4 Regla de No-mezcla de módulos

* APP ↔ ADMIN ↔ BACKEND deben mantenerse independientes.
* Textos, estilos o lógicas **no deben cruzarse** entre módulos.

---

## 4.5 Regla de No duplicación ni código muerto

**Prohibido explícitamente:**

* Repetir funciones o componentes ya existentes
* Crear versiones duplicadas del mismo archivo
* Dejar código sin uso, bloques comentados, restos de pruebas o mocks sin referencia
* Crear carpetas o módulos que no se usan

Todo código generado debe ser:

* limpio
* preciso
* sin duplicaciones
* sin funciones huérfanas

⭐ Esta regla es permanente y global.

---

# 5. Reglas de Idioma (i18n)

## 5.1 APP — Invitados

Todo texto visible debe provenir de i18n:

❌ Prohibido en APP:

* Texto duro en TSX
* Texto duro en HTML
* Texto duro en JS
* Texto duro en CSS (visible)
* Texto duro en emails

Ejemplo incorrecto:

```tsx
<p>Gracias por confirmar tu asistencia</p>
```

Ejemplo correcto:

```tsx
<p>{t("confirmed.thank_you")}</p>
```

---

## 5.2 ADMIN — Organizadores

* Solo español neutro
* Puede usar texto duro
* Debe ser profesional y consistente
* No debe duplicar textos

---

## 5.3 Emails

* Deben usar i18n de APP
* No deben contener texto duro embebido

---

# 6. Instructivo de Comentarios

Todos los archivos deben cumplir con `/docs/INSTRUCTIVO_COMENTARIOS.md`.

Resumen:

### Cabecera obligatoria

Incluye:

* ruta
* propósito
* rol en el sistema

### Comentarios de bloque

Separan partes lógicas del código.

### Comentarios de línea

Explican decisiones importantes, nunca obviedades.

### Idioma

Siempre español profesional.

### Prohibido

* rastros de IA
* comentarios de autogeneración

---

# 7. Reglas de Diseño Global

## APP (Invitados)

* Estética suave, elegante, emocional
* Colores pastel, tipografías delicadas
* Responsividad estricta (mobile-first)
* Accesibilidad recomendable

## ADMIN (Novios)

* Profesional
* Claro y ordenado
* Grillas definidas
* KPIs fáciles de leer

---

# 8. Glosario de Roles (Orquestador, IDE y Agentes)

### Orquestador (humano + asistente externo)

* Diseña las TAREAS
* Revisa planes
* Aprueba cambios
* Supervisa calidad

### Antigravity IDE

* Planifica, modifica código y verifica
* Usa agentes internos
* Necesita aprobación antes de aplicar cambios

### Backend Agent

* Modifica routers, modelos y servicios solo cuando la tarea lo indique
* Mantiene compatibilidad total con el frontend

### Frontend Agent

* Trabaja TSX, HTML, CSS
* Respeta i18n (en APP)
* Respeta español neutro (ADMIN)

### UX/UI Agent

* Solo propone y ajusta diseño
* No modifica lógica

### QA Agent

* No modifica código
* Detecta errores
* Sugiere tests

### Security Agent

* Audita vulnerabilidades
* No aplica cambios sin autorización

---

# 9. Reglas de Git y repositorio

### 9.1 Prohibido incluir rastros de IA

Los commits no deben contener:

* "IA", "ChatGPT", "Antigravity", "Claude", "Gemini", etc.
* Comentarios que indiquen autogeneración

### 9.2 Reglas de commits

* Commits pequeños
* Descripciones claras y técnicas
* Sin mezclas de cambios no relacionados

### 9.3 Archivos prohibidos en Git

* Carpeta de prompts o artefactos del IDE
* Logs
* Exportaciones temporales

---

# 10. Flujo de Trabajo Orquestador ↔ Antigravity IDE

Este flujo es **obligatorio** y garantiza control total del proyecto.

---

## 🔵 Paso 1 — El Orquestador crea la TAREA

En `/docs/TAREAS/TAREA_X.md`

Debe incluir:

* objetivo
* alcance
* reglas específicas
* archivos permitidos
* archivos prohibidos
* detalles de implementación

---

## 🔵 Paso 2 — El IDE lee la TAREA y genera un PLAN

El IDE NO actúa aún.
Propone:

* pasos
* riesgos
* archivos a tocar
* límites que entiende

---

## 🔵 Paso 3 — El Orquestador revisa el PLAN

Puede:

* Aprobado
* Solicitar ajustes
* Rechazar
* Pedir aclaraciones

---

## 🔵 Paso 4 — Si se aprueba, el IDE ejecuta los cambios

Pero **todavía no los aplica a los archivos reales**.
Solo muestra:

* diffs
* capturas
* explicaciones
* walkthrough

---

## 🔵 Paso 5 — Revisión final del Orquestador

Se comprueba:

* coherencia
* estilo
* i18n
* integridad
* no duplicación
* no ruptura del proyecto

---

## 🔵 Paso 6 — Aprobación explícita

El Orquestador debe escribir algo como:

> "Aprobado: aplicar cambios."

Sin esa frase, el IDE no puede modificar archivos reales.

---

## 🔵 Paso 7 — El IDE aplica los cambios

Con esto se finaliza la tarea.

---

# 11. Reglas de Seguridad Operativa

* El IDE NO puede aplicar cambios sin aprobación explícita.
* El IDE NO puede crear o borrar archivos sin permiso.
* El IDE NO puede alterar el backend, frontend o la DB si la tarea no lo autoriza.
* Todo cambio debe venir acompañado de explicación clara.

---

# 12. Conclusión

Este documento sirve como:

* **Guía global del proyecto**
* **Marco operativo para Antigravity**
* **Base de seguridad y control**
* **Garantía de consistencia académica y técnica**

Toda tarea futura debe alinearse con estas reglas, y toda excepción debe ser aprobada explícitamente por el Orquestador.

🔧 Regla fija: ejecución correcta de comandos en WSL (obligatoria)

Problema recurrente detectado
Algunos IDEs intentan ejecutar comandos en WSL usando el argumento -c, lo cual NO es válido en wsl.exe y provoca errores de ejecución.

Ejemplo incorrecto (prohibido):

wsl -c "python -m py_compile app/main.py"


Esto siempre produce errores del tipo:

“Argumento de línea de comandos no válido: -c”

✅ Norma obligatoria de ejecución (Windows → WSL)

Siempre que el IDE necesite ejecutar comandos dentro de WSL desde Windows, DEBE usar exactamente este formato:

wsl -e bash -lc "<COMANDO>"


Donde:

bash -lc abre un shell Linux real

<COMANDO> incluye el cd a la ruta Linux correcta

✅ Plantillas oficiales (usar siempre)

Backend

wsl -e bash -lc "cd /home/nalex/Proyectos/RSVP-Proyecto/backend && <COMANDO>"


Frontend

wsl -e bash -lc "cd /home/nalex/Proyectos/RSVP-Proyecto/frontend && <COMANDO>"

✅ Ejemplos válidos

Verificación de sintaxis backend (Python):

wsl -e bash -lc "cd /home/nalex/Proyectos/RSVP-Proyecto/backend && python3 -m py_compile app/routers/admin.py app/schemas.py && echo 'Backend OK'"


Verificación frontend (TypeScript):

wsl -e bash -lc "cd /home/nalex/Proyectos/RSVP-Proyecto/frontend && npx tsc --noEmit | head -50"

⚠️ Regla adicional importante

Si el IDE ya está ejecutándose dentro de una terminal WSL, NO debe usar wsl.

En ese caso, los comandos se ejecutan directamente con rutas Linux (/home/...).
Al usar wsl -e bash -lc, SIEMPRE usar rutas Linux, nunca rutas Windows (C:\...).

🚫 Prohibición explícita

Queda expresamente prohibido el uso de:
wsl -c
