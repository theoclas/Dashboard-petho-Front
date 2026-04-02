# Plan por fases — UI rentabilidad por producto

Implementación en **Dashboard-petho-Front** de la tabla **Rentabilidad por Producto**: misma estructura conceptual que la referencia (producto, ENTR, % efec., tránsito, % trán., dev, % dev., ventas, pauta, utilidad), con **filtrado por nombre** y **ordenación** por columnas clave. El contrato de datos debe seguir [Dashboard-Petho-back/docs/PLAN-FASES-RENTABILIDAD-POR-PRODUCTO.md](../../Dashboard-Petho-back/docs/PLAN-FASES-RENTABILIDAD-POR-PRODUCTO.md).

**Stack relevante**

- Ant Design `Table`, `Input`, `Card`, `Button`, `Space`, `Typography`.
- Formato monetario COP (separador de miles como en el resto del proyecto; revisar [`PedidosPage.tsx`](../src/pages/PedidosPage.tsx) / utilidades si existen).
- Cliente API: [`src/api.ts`](../src/api.ts). Navegación: [`src/App.tsx`](../src/App.tsx).

---

## 1. Objetivo y alcance

| Requisito | Detalle |
|-----------|---------|
| **Tabla** | Cabecera gris claro, texto en mayúsculas; filas con nombre de producto en negrita alineado a la izquierda; números alineados al centro o derecha. |
| **Colores** | % efectividad y utilidad en verde; % tránsito en azul; % devolución en rojo; pauta puede mostrar “-” cuando sea null. |
| **Filtro** | Búsqueda por texto sobre el nombre de producto (debounce recomendado, p. ej. 300 ms) para no saturar el API si el filtro es server-side. |
| **Orden** | Clic en cabeceras para ordenar por campos acordados (`utilidad`, `ventas`, `% dev`, etc.); implementación **controlada por API** si el backend expone `sortBy`/`order` y paginación (recomendado). |
| **CTA pauta** | Botón o enlace “DA CLIC PARA AÑADIR TU GASTO EN PAUTA” (o texto final de producto) que lleve a [`CpaPage`](../src/pages/CpaPage.tsx) vía `setCurrentPage('cpa')` **o** `useNavigate('/cpa')` si en el futuro se unifica URL con menú. |

### Estado de avance (checklist)

| Fase | Estado |
|------|--------|
| Fase 0 | Parcial — tipos en `api.ts`; `formatCOP` en página; rango de fechas opcional. |
| Fase 1 | **Hecha** — `getRentabilidadPorProducto`, [`RentabilidadProductoPage.tsx`](../src/pages/RentabilidadProductoPage.tsx), menú `rentabilidad-producto` + `App.tsx`. |
| Fase 2 | **Hecha** — búsqueda con debounce + orden server-side (`sortBy`/`order`). |
| Fase 3 | **Hecha** — CTA a CPA, colores por métrica, cabeceras en mayúsculas. |
| Fase 4 | **Hecha** — `AbortController` + flag `active`; mensajes `Empty` según búsqueda/rango; sin React Query. |

---

## 2. Supuestos

1. Endpoint `GET /api/reportes-rentabilidad/por-producto` (nombre final según back) con `data`, `total`, `page`, `limit`.
2. Si el MVP del back devuelve lista completa sin paginación, la tabla puede usar `sorter: true` local de antd **temporalmente**; el documento del backend marcará migración a server-side.
3. Usuarios sin permiso de CPA no deben ver el CTA o deben ver mensaje alternativo según `user.role` en `AuthContext`.

---

## 3. Fases de implementación

### Fase 0 — Tipos y formato

- [x] Tipos `RentabilidadProductoRow` / respuesta en [`api.ts`](../src/api.ts).
- [x] Formato moneda y pauta “—” vía helper local en [`RentabilidadProductoPage.tsx`](../src/pages/RentabilidadProductoPage.tsx) (`formatCOP`); sin `formatPct` dedicado (se concatena `%` en columnas).
- [x] Rango de fechas **opcional** (`RangePicker` en la página).

**Criterio de hecho:** tipos y formatos unit-testeados o verificados manualmente en Story/dev.

---

### Fase 1 — API y página mínima

- [x] `getRentabilidadPorProducto` en [`api.ts`](../src/api.ts) (la página aún no envía `search` / `sortBy` dinámico; Fase 2).
- [x] [`RentabilidadProductoPage.tsx`](../src/pages/RentabilidadProductoPage.tsx): tabla + paginación server-side; orden fijo `utilidad` desc.
- [x] Menú **Rentabilidad producto** (`AppstoreOutlined`), clave `rentabilidad-producto`, en [`App.tsx`](../src/App.tsx) (ADMIN y OPERADOR).

**Criterio de hecho:** datos reales cargan con paginación correcta.

---

### Fase 2 — Filtro y orden controlados

- [x] `Input.Search` + debounce 300 ms → parámetro `search`; reset de página vía `useLayoutEffect` al cambiar filtros/orden.
- [x] `Table` `onChange`: paginación + `sorter` → `sortBy` / `order` (keys = contrato backend).
- [x] Whitelist implícita: solo columnas con `key` alineadas al DTO del backend.

**Criterio de hecho:** combinar búsqueda + orden + cambio de página mantiene consistencia con `total`.

---

### Fase 3 — Estilo y CTA

- [x] Card + `AppstoreOutlined`; CTA naranja con `useDashboardNav` → `cpa` ([`DashboardNavContext`](../src/contexts/DashboardNavContext.tsx)).
- [x] Colores en % y utilidad; cabeceras `PRODUCTO`, `ENTR`, etc.

**Criterio de hecho:** comparación visual aceptable con la referencia en tema actual (claro/oscuro).

---

### Fase 4 — UX y rendimiento

- [x] `Spin` + `Empty` con textos según búsqueda y rango de fechas.
- [x] Cancelación con `AbortController` e `isRequestCanceled` en [`api.ts`](../src/api.ts); página [`RentabilidadProductoPage.tsx`](../src/pages/RentabilidadProductoPage.tsx).
- [ ] Opcional: `@tanstack/react-query` para cache (no implementado).

**Criterio de hecho:** no parpadeos incoherentes ni resultados desordenados al escribir en el filtro.

---

## 4. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Orden local + paginación | Incorrecto; usar siempre orden server-side cuando haya `limit`. |
| CTA sin permiso | Ocultar o mostrar tooltip según rol. |
| Desfase CPA–producto | UI puede mostrar “-” en pauta; documentar en tooltip “sin datos CPA para este producto”. |

---

## 5. Referencia cruzada

- Backend: [Dashboard-Petho-back/docs/PLAN-FASES-RENTABILIDAD-POR-PRODUCTO.md](../../Dashboard-Petho-back/docs/PLAN-FASES-RENTABILIDAD-POR-PRODUCTO.md).
- UI logística (misma convención de menú/API): [PLAN-FASES-UI-LOGISTICA.md](./PLAN-FASES-UI-LOGISTICA.md).
