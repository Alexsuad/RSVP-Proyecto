FOCO ACTUAL: MÓDULO ADMIN

PÁGINAS OBJETIVO (FRONTEND)
- /admin/login      → Login para organizadores.
- /admin/dashboard  → Panel de KPIs/resumen.
- /admin/guests     → Listado, filtros, CRUD y export de invitados.

PRIORIDAD DE FASE 1
1) /admin/dashboard:
   - Mostrar tarjetas resumen (KPIs): total invitados, confirmados, pendientes, acompañantes, niños, alergias.
   - Mostrar accesos rápidos a:
     - “Ver listado de invitados”.
     - “Exportar datos”.
   - Todo en español, textos claros para los novios.

2) /admin/guests:
   - Tabla con columnas claras (nombre, lado, idioma/país, estado RSVP, acompañantes, niños, alergias, fecha actualización).
   - Filtros en la parte superior (por estado RSVP, lado, idioma/país, texto libre).
   - Posibilidad de ver detalle de un invitado (modal o panel lateral).
   - CRUD con confirmación visual al guardar o eliminar.
   - Botón para exportar CSV a partir de los datos visibles.

LIMITACIONES
- NO crear nuevas rutas de API; usa las que ya existan para admin.
- Si necesitas datos agregados para KPIs, asume que el backend lo expone vía endpoints ya definidos; si no es así, solo deja el componente preparado para recibir esos datos vía props o llamadas a una función service, pero no inventes endpoints.
- No toques el flujo de invitado.

UX Y ESTILO
- El módulo admin debe verse como una herramienta clara, sin adornos excesivos.
- Usa componentes y estilos ya existentes en el proyecto cuando sea posible.
- Respeta la maquetación responsive que ya tenga el proyecto (contenedores, grid, etc.).
