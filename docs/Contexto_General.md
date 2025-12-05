🏗️ CONTEXTO DEL PROYECTO RSVP

Documento maestro para agentes, arquitectos IA y desarrolladores humanos.

📌 0. Propósito del documento

Este archivo define:

El alcance real del proyecto RSVP.

Las reglas obligatorias que deben seguir los agentes de Antigravity.

La estructura actual del repositorio.

Qué partes del código sí pueden ser modificadas por agentes.

Qué partes no pueden tocarse sin autorización explícita.

Estándares de estilo, documentación, i18n y nomenclatura.

Endpoints reales del backend y contratos de datos.

Flujos de usuario confirmados (invitado + organizador).

Este documento funciona como marco de seguridad para que los agentes trabajen sin desviarse, sin inventar estructuras y sin romper funcionalidades estables.

1️⃣ Descripción general del proyecto RSVP

RSVP-Proyecto es una plataforma real usada en una boda internacional.
Cuenta con:

Frontend (React + Vite)

Backend (FastAPI)

Base de datos (PostgreSQL / SQLite según entorno)

Sistema de email

Soporte multiidioma (ES, EN, RO)

Flujo de invitado para confirmar asistencia

Flujo de organizador para ver invitados, editar datos, ver KPIs y exportar información

El proyecto se usa en dos entornos:

Uso real — invitados reales confirmarán asistencia.

Proyecto académico — debe demostrar CRUD, autenticación, arquitectura clara, i18n, UX, documentación y seguridad mínima.


Base de datos oficial del proyecto

El proyecto tiene varios archivos de base de datos, pero solo se considera válida para el entorno académico la base de datos: data/wedding_academico.db.

Cualquier otro archivo .db del repositorio se considera legacy o de pruebas y no debe usarse, migrarse ni modificarse.

Los agentes deben asumir que toda la lógica de lectura/escritura de datos apunta a data/wedding_academico.db.


2️⃣ Estructura real del repositorio

/backend/

main.py

routers/auth.py

routers/rsvp.py

routers/admin.py

email_service/

models/

database.py

schemas/

utils/translations.py

tests/

/frontend/

src/pages/app/

src/pages/admin/

src/components/

src/contexts/I18nContext.tsx

src/services/api.ts

public/app/ (HTML de invitado)

public/admin/ (HTML de administrador)

/docs/ — documentación de proyecto
/scripts/ — scripts de soporte
/i18n/ — traducciones

⚠️ Regla para agentes:
No inventar nuevas carpetas.
No renombrar carpetas existentes.
Solo crear archivos dentro de carpetas existentes, nunca estructuras nuevas.

3️⃣ Reglas de oro para agentes de Antigravity
🚫 3.1 Bloque de prohibiciones absolutas

Los agentes NO deben:

Modificar la base de datos sin autorización explícita.

Crear nuevas tablas, columnas o borrar columnas.

Renombrar endpoints del backend.

Cambiar la estructura de respuesta JSON de la API.

Eliminar funciones existentes sin revisión humana.

Crear flujos nuevos no definidos en este documento.

Modificar autenticación o tokens JWT.

Cambiar el sistema i18n sin autorización.

Tocar configuración de Docker, hosting o dominio.

Modificar CSS global de forma destructiva.

Reescribir completamente un archivo sin justificarlo.

Cambiar IDs, rutas o nombres que ya están en producción real.

Inventar rutas, carpetas o componentes.

✔️ 3.2 Bloque de modificaciones permitidas

Los agentes SÍ pueden:

Crear componentes React nuevos.

Crear páginas nuevas dentro de /admin/ o /app/.

Mejorar CSS sin romper layout existente.

Añadir tests unitarios.

Añadir validaciones no intrusivas.

Implementar filtros, KPIs, tablas y exportaciones.

Modificar HTML estático manteniendo IDs existentes.

Realizar refactor siempre dentro de límites locales al archivo.

Usar el navegador para verificar UI y corregir visuales.

4️⃣ Estándares obligatorios de estilo y documentación
📄 Reglas extraídas del archivo real INSTRUCTIVO_COMENTARIOS.md

Los agentes deben:

Añadir encabezados en cada archivo con:

propósito

rol en el sistema

dependencias

Documentar por bloques, no línea a línea.

No escribir comentarios "basura".

Mantener estilo formal, claro y profesional.

Mantener consistencia en nomenclatura.

Para React:

funciones claras

evitar duplicación

componentes pequeños y reutilizables

5️⃣ EndPoints del backend (contrato oficial)

Los agentes deben respetar exactamente estas rutas y sus métodos:

Auth

POST /auth/login

POST /auth/request-access

POST /auth/recover-code

RSVP Invitados

GET /guests/{guest_code}

POST /rsvp/send

Admin (organizadores)

POST /admin/login

GET /admin/guests

POST /admin/guests

PUT /admin/guests/{id}

DELETE /admin/guests/{id}

⚠️ Regla:
Los agentes NO pueden alterar estos endpoints sin aprobación explícita.

6️⃣ Flujos de usuario confirmados
👤 6.1 Flujo Invitado

Entra a /app/login.base
Introduce guest_code o llega con URL prellenada

Verifica identidad

Accede a /app/rsvp.html

Completa formulario sobre asistencia, comida, alergias, acompañantes

Ve página de confirmación

Recibe email de confirmación

👩‍💼 6.2 Flujo Organizador

Entra a /admin/login.html

Accede a /admin/dashboard.html

Ve KPIs

Entra a /admin/guests.html

Filtra

Edita

Elimina

Exporta CSV

Opcional: Ver detalle extendido (modal o sidebar)

7️⃣ i18n — Reglas obligatorias
Invitado:

ES / EN / RO obligatorio.

Admin:

Solo ES.

Reglas:

No inventar claves nuevas.

Reutilizar claves existentes.

Mantener lenguaje formal.

No agregar idiomas nuevos.

8️⃣ Lista de tareas que SÍ deben delegarse a agentes

Crear componentes React siguiendo diseño actual.

Añadir KPIs a dashboard.

Implementar tabla CRUD en /admin/guests.

Implementar exportación CSV.

Integrar validaciones de formularios.

Generar tests de UI.

Usar navegador para verificar flujo de invitado.

Mejorar performance pequeña en frontend.

9️⃣ Lista de tareas que NO deben delegarse a agentes

Cambios en la base de datos.

Cambios en autenticación.

Cambios en emails transaccionales.

Cambios en estructura del backend.

Cambios de rutas o arquitectura.

Modificaciones profundas sin plan aprobado humano.

🔟 Contexto humano / instrucciones pedagógicas

Los agentes deben comunicarse en:

Lenguaje sencillo, claro y educativo.

Explicar qué pretenden hacer antes de modificar código.

Mostrar diffs antes de aplicarlos.

Permitir revisión humana antes de ejecutar terminal o modificaciones amplias.

Evitar saltarse pasos.

Mantener siempre un tono profesional y amable.

🔚 Fin del documento

Este archivo debe ser interpretado como la norma superior del proyecto.
Ante cualquier conflicto, estas reglas prevalecen.





✅ 1. REGLA FUNDAMENTAL

En el repositorio NO puede existir ningún rastro de:

trabajo realizado por IA,

instrucciones dirigidas a una IA,

prompts,

logs de agentes,

archivos generados por Antigravity,

carpetas internas usadas por agentes,

metadatos,

notas de conversación o recomendaciones de IA,

comentarios en código que delaten la intervención de IA.

👉 Al jurado se le entrega un proyecto limpio, humano, profesional.

✅ 2. ¿Dónde sí debe existir la documentación para los agentes?

La documentación (ANTIGRAVITY_PROJECT_CONTEXT.md) y las reglas para agentes:

NO deben estar en el repositorio público del proyecto.
SÍ deben estar fuera del repositorio, por ejemplo:

en tu PC,

en una carpeta privada,

o en la carpeta interna que Antigravity crea dentro de tu perfil,

o incluso en Notion/OneDrive/Drive.

Esto garantiza:

que tú y yo podemos usarlo,

que Antigravity puede acceder a él,

que nadie del jurado verá jamás ese documento.

✅ 3. ¿Qué documentos sí pueden estar en el repositorio?

Solo documentos neutros, profesionales y típicos de una entrega DAW:

✔ Archivos válidos en el repositorio:

Documentación funcional (README, guía de despliegue).

Documentación técnica (diagrama DB, endpoints, arquitectura).

Comentarios de código siguiendo tu “INSTRUCTIVO_COMENTARIOS.md”.

Manual de usuario (invitado y admin).

Memoria escrita del proyecto.

❗Pero deben estar redactados como si los hubieras escrito tú, sin referencias a IA.
❌ 4. ¿Qué NO puede aparecer en el repositorio?

Esto es clave:

❌ Archivos como:

ANTIGRAVITY_PROJECT_CONTEXT.md (NO puede estar).

agent_rules.md

prompts_for_ai.txt

ai_instructions.txt

antigravity_plan.md

llm_notes.md

❌ Comentarios como:

"La IA generó este código"

"Recomendación del agente"

"Generado automáticamente"

"Trabajo asistido por Antigravity"

"Este componente fue propuesto por la IA"

❌ Pruebas o artefactos:

capturas de actividades del agente,

logs o trazas de decisiones,

videos o recorridos del agente,

diffs anotados por la IA.

❌ Code smells delatan IA:

métodos con nombres extremadamente genéricos,

comentarios largos y narrativos,

estructuras repetitivas típicas de LLM,

refactors demasiado “perfectos” sin motivo.

Todo eso se revisa antes del push final.


Nota: para efecto de pruebas en pantalla los  datos de los invitados para los accesos se pueden usar cualquiera de los siguientes (Login.html - Reques-Access.html) :

sqlite> SELECT id, guest_code, email, phone
1|JUANFEL-XHS9||+34624439896
2|ALEXAND-N6L6|nalexsua75@gmail.com|+34641987220
3|LEONORA-XH3D||+34614332342
4|CONSTAN-QA6P||+40744608813
5|RUXANDA-Z7WI||+491772870456

