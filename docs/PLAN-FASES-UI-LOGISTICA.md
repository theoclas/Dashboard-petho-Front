# Plan por fases — UI logística (Efectividad y comparativa transportadoras)

Implementación en **Dashboard-petho-Front** de las vistas inspiradas en las referencias: **Efectividad Transportadora** (tabla resumen) y **Comparativa de Transportadoras** (gráfico de barras agrupadas con toggles). Consumen los endpoints descritos en el backend: [Dashboard-Petho-back/docs/PLAN-FASES-LOGISTICA-TRANSPORTADORAS.md](../../Dashboard-Petho-back/docs/PLAN-FASES-LOGISTICA-TRANSPORTADORAS.md).

**Stack relevante**

- React 19, Vite, TypeScript, Ant Design 6, `@ant-design/icons`.
- Gráficos: comparativa en **HTML/CSS** en esta página; en el resto del proyecto sigue [`DashboardPage.tsx`](../src/pages/DashboardPage.tsx) con `@ant-design/charts` (`Pie`, `Column`, `Line`).
- Navegación interna: [`src/App.tsx`](../src/App.tsx) (`currentPage`, `menuItems`, `renderPage`); HTTP: [`src/api.ts`](../src/api.ts).

---

## 1. Objetivo y alcance

| Componente UI | Comportamiento |
|---------------|----------------|
| **Efectividad Transportadora** | Tarjeta (`Card`) con título + icono tipo camión (`TruckOutlined`). Tabla: empresa, enviados, tránsito (número + % azul), devoluciones (número + % rojo), cancelados, rechazados (rosa), entregados (número + % verde + fondo suave en columna). Alineación: primera columna a la izquierda; resto centrado. |
| **Comparativa de Transportadoras** | Tarjeta con título, subtítulo “Analiza el rendimiento geográfico (Top 15)”, toggles a la derecha: **Departamentos | Ciudades** y **% Efectividad | % Devolución**. Gráfico de barras agrupadas (eje Y 0–100 %, rejilla horizontal). Leyenda inferior con colores por transportadora (COORDINADORA, ENVIA, INTERRAPIDISIMO, TCC). |

**Fuera de alcance de este documento:** tabla de rentabilidad por producto → [PLAN-FASES-UI-RENTABILIDAD-PRODUCTO.md](./PLAN-FASES-UI-RENTABILIDAD-PRODUCTO.md).

### Estado de avance (checklist)

| Fase | Estado |
|------|--------|
| Fase 0 | **Hecha** — página, paleta `TRANSPORTADORA_COLOR`, cards `#141428`. |
| Fase 1 | **Hecha** — API + página + menú. |
| Fase 2 | **Hecha** — tabla con colores, alineación, filtro por empresa, orden por columnas (cliente). |
| Fase 3 | **Hecha** — comparativa con `Segmented` (depto/ciudad, efectividad/devolución) + `Column` agrupado. |
| Fase 4 | **Hecha** — scroll horizontal gráfico + tabla; `main` / `region` / `aria-labelledby`; `Spin`, `autoFit`, `AbortController`. |

---

## 1.b Qué falta (resumen)

| Pendiente | Notas |
|-----------|--------|
| **URL y menú** | `currentPage` sin `react-router` en varias pantallas; mejora: `navigate('/logistica')` alineado al menú (§4). |
| **Roles** | Decidir si OPERADOR/LECTOR ven Logística igual que ahora (§2). |
| **Comparativa** | Implementada con barras DOM (sin canvas); riesgo G2/Brave cubierto en esta pantalla. |

---

## 2. Supuestos

1. Los endpoints backend existen o se implementan según el plan del back (`/api/reportes-logistica/...` o nombres finales acordados).
2. Opcional: rango de fechas compartido con el dashboard (reutilizar `RangePicker` + dayjs como en `DashboardPage.tsx`).
3. Roles: decidir si **OPERADOR** / **LECTOR** ven solo pedidos o también estos reportes; por defecto alinear con quien puede ver `GET /api/pedidos` o restringir a roles con acceso a analítica.

---

## 3. Fases de implementación

### Fase 0 — Diseño UI y tokens

- [x] **Una página** “Logística” con efectividad + comparativa.
- [x] Paleta `TRANSPORTADORA_COLOR` en [`LogisticaTransportadorasPage.tsx`](../src/pages/LogisticaTransportadorasPage.tsx).
- [x] Superficie de card coherente con `DashboardPage` (`#141428`).

**Criterio de hecho:** mock estático o captura aprobada.

---

### Fase 1 — API client y página mínima

- [x] [`api.ts`](../src/api.ts): `getEfectividadTransportadoras`, `getComparativaGeografica` (backend en producción).
- [x] [`LogisticaTransportadorasPage.tsx`](../src/pages/LogisticaTransportadorasPage.tsx): rango de fechas opcional + tabla + `Spin` / `Alert`.
- [x] [`App.tsx`](../src/App.tsx): menú `logistica`, `TruckOutlined`, `case 'logistica'` en `renderPage` (ADMIN y OPERADOR).

**Criterio de hecho:** con backend disponible, la página muestra datos reales sin errores de consola.

---

### Fase 2 — Tabla “Efectividad Transportadora”

- [x] Colores (#3B82F6, #EF4444, #EC4899, #10B981) y números alineados a la derecha.
- [x] Fondo suave en columna entregados.
- [x] Formato `count (pct%)`; `Input.Search` filtra por empresa; `sorter` en columnas.
- [x] `loading` / `error` / `Empty`.

**Criterio de hecho:** paridad visual razonable con la referencia en tipografía y jerarquía.

---

### Fase 3 — Gráfico comparativa + toggles

- [x] Estado `dimension` / `metrica` + `Segmented` en card “Comparativa”.
- [x] Refetch al cambiar rango, dimensión o métrica (`getComparativaGeografica`).
- [x] Comparativa: **barras agrupadas en DOM** (sin canvas G2): eje Y 0–100 %, una columna por `ubicacion`, leyenda por transportadora; se abandonó `Column` de `@ant-design/charts` por fallos en Brave/hosting.
- [x] Leyenda inferior; `Empty` si no hay puntos.

**Criterio de hecho:** alternar los cuatro combinaciones (2×2) sin romper el gráfico.

---

### Fase 4 — Pulido, responsive y accesibilidad

- [x] `Spin` alrededor de la tabla (fase 1 mínima).
- [x] Móvil: contenedor con `overflow-x: auto`, ancho mínimo del chart según cantidad de ubicaciones; tabla con `scroll={{ x: 'max-content' }}`.
- [x] `main` + `role="region"` + `aria-labelledby` en cards; iconos decorativos con `aria-hidden`.

**Criterio de hecho:** uso aceptable en viewport estrecho; sin warnings graves de React.

---

## 4. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Muchas etiquetas en eje X | rotación, `interval`, o mostrar cada N etiquetas. |
| Tema oscuro vs referencia clara | fondo de card explícito y colores ajustados. |
| URL no sincronizada con `currentPage` | opcional: llamar `navigate()` al cambiar menú (mejora futura documentada). |

---

## 5. Referencia cruzada

- Backend: [Dashboard-Petho-back/docs/PLAN-FASES-LOGISTICA-TRANSPORTADORAS.md](../../Dashboard-Petho-back/docs/PLAN-FASES-LOGISTICA-TRANSPORTADORAS.md).

---

## 6. Changelog del documento

| Fecha (aprox.) | Cambio |
|----------------|--------|
| 2026-04 | Fase 0 cerrada; “Qué falta”; nota api/comparativa al día; Fase 4 responsive/a11y. |
