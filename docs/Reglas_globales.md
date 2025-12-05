PROYECTO: plataforma RSVP para boda real + proyecto académico DAW.
WORKSPACE: carpeta completa del repositorio RSVP-Proyecto en mi máquina.

OBJETIVO DE LOS AGENTES
- Tu foco principal es el MÓDULO ADMIN (organizador/novios), no el flujo de invitado.
- Primero trabajaremos páginas y componentes del área /admin (dashboard, listado de invitados, filtros, etc.).
- No puedes inventar nuevas secciones de negocio; te adaptas a lo que ya existe.

REGLAS CRÍTICAS (OBLIGATORIAS)
1) PROHIBIDO dejar rastros de IA
   - No escribas en ningún archivo palabras como "IA", "AI", "Antigravity", "agent", "LLM" o similares.
   - No generes comentarios que digan que algo fue “generado automáticamente”.
   - No crees archivos con nombres que sugieran trabajo con IA.

2) ALCANCE TÉCNICO
   - Trabaja SOLO en frontend (React, TypeScript, CSS) del módulo admin.
   - NO toques backend (FastAPI), ni la base de datos, ni migraciones.
   - NO cambies endpoints, rutas de API ni contratos JSON ya existentes.
   - NO crees nuevas tablas ni campos; asume que la BD oficial es `data/wedding_academico.db` y es responsabilidad del backend.

3) MÓDULO ADMIN (IDIOMA Y UX)
   - Todas las pantallas, textos y mensajes del MÓDULO ADMIN deben estar en español neutro.
   - El área admin es para los novios/organizadores, no para el invitado.
   - No uses i18n en admin (no hace falta multiidioma allí), solo texto en ES claro y profesional.

4) i18n EN EL RESTO DEL PROYECTO
   - NO cambies nada relacionado con i18n del flujo de invitado en esta fase.
   - No introduzcas nuevas claves sin una razón muy justificada.
   - No toques `translations.py` ni el sistema de traducciones del backend.

5) ESTILO DE CÓDIGO Y ESTRUCTURA
   - Respeta la estructura actual del proyecto (carpetas, nombres de archivos).
   - NO renombres archivos ni carpetas existentes.
   - Evita código duplicado y funciones innecesarias.
   - Los componentes deben ser pequeños, claros y fáciles de leer.
   - Sigue el estilo de comentarios técnico-profesionales (sin chistes, sin emojis).

6) DOCUMENTACIÓN Y COMENTARIOS
   - Si necesitas dejar comentarios, que sean técnicos y breves.
   - No expliques tu propio trabajo como IA dentro del código.
   - No generes bloques de texto largos dentro de comentarios.

7) SEGURIDAD Y ESTABILIDAD
   - Antes de proponer cambios grandes, analiza el código actual y propón un plan.
   - No elimines lógica ya existente sin una justificación muy clara (y preferible en el plan, no en el código).
   - Siempre intenta mantener el sistema funcionando aunque una parte del módulo admin quede incompleta.

MODO DE TRABAJO
- Usa PLANNING MODE para tareas grandes (como crear el Dashboard admin).
- Siempre que sea posible, genera un plan de implementación + un plan de verificación (tests o comprobaciones en el navegador).
- Usa el navegador integrado para verificar el módulo admin:
  - Abrir la página admin correspondiente.
  - Interactuar con filtros y tablas.
  - Verificar que todo responde sin errores visibles ni en consola.

ROL DEL HUMANO (ALEX)
- Alex revisa y aprueba los cambios; tú no tienes la última palabra.
- Si un cambio puede afectar a más de una pantalla, primero explica el impacto en tu plan.
- No asumas que puedes reescribir todo un archivo sin revisión.
