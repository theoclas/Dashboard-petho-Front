import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('petho_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    config.headers['x-auth-token'] = token; // Respaldo para Hostinger/Apache
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('petho_token');
      localStorage.removeItem('petho_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/** Petición cancelada con AbortController / axios (no mostrar error al usuario). */
export function isRequestCanceled(e: unknown): boolean {
  if (axios.isCancel(e)) return true;
  const err = e as { code?: string; name?: string };
  return err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError';
}

// ── Pedidos ──
export const getPedidos = (params?: Record<string, unknown>) =>
  api.get('/pedidos', { params }).then((r) => r.data);

/** Descarga Excel con los mismos filtros que el listado (sin paginación). POST evita pérdida de query en proxies/caché. */
export const exportPedidosExcel = (body: Record<string, unknown>) =>
  api.post<Blob>('/pedidos/export', body, {
    responseType: 'blob',
    timeout: 300000,
    headers: { 'Content-Type': 'application/json' },
  });

export const getPedidoByDropiId = (idDropi: string) =>
  api.get(`/pedidos/dropi/${idDropi}`).then((r) => r.data);

export const getDashboardStats = (params?: { startDate?: string; endDate?: string }) =>
  api.get('/pedidos/stats', { params }).then((r) => r.data);

export const updatePedido = (id: number, data: Record<string, unknown>) =>
  api.patch(`/pedidos/${id}`, data).then((r) => r.data);

// ── Cartera ──
export const getCartera = (params?: Record<string, unknown>) =>
  api.get('/cartera', { params }).then((r) => r.data);

export const getCarteraPorPedido = (ordenId: string) =>
  api.get(`/cartera/por-pedido/${ordenId}`).then((r) => r.data);

// ── Mapeo Estados ──
export const getMapeoEstados = () =>
  api.get('/mapeo-estados').then((r) => r.data);

export const createMapeoEstado = (data: Record<string, unknown>) =>
  api.post('/mapeo-estados', data).then((r) => r.data);

export const updateMapeoEstado = (id: number, data: Record<string, unknown>) =>
  api.patch(`/mapeo-estados/${id}`, data).then((r) => r.data);

export const deleteMapeoEstado = (id: number) =>
  api.delete(`/mapeo-estados/${id}`).then((r) => r.data);

// ── Productos Detalle ──
export const getProductosDetalle = (pedidoIdDropi?: string) =>
  api.get('/productos-detalle', { params: { pedido_id_dropi: pedidoIdDropi } }).then((r) => r.data);

export const getUniqueProductNames = () =>
  api.get('/productos-detalle/unique/names').then((r) => r.data);

// ── CPA ──
export const getCpas = (params?: Record<string, unknown>) =>
  api.get('/cpa', { params }).then((r) => r.data);

export const getCpaStats = (params?: { startDate?: string; endDate?: string }) =>
  api.get('/cpa/stats', { params }).then((r) => r.data);

export const createCpa = (data: Record<string, unknown>) =>
  api.post('/cpa', data).then((r) => r.data);

export const updateCpa = (id: number, data: Record<string, unknown>) =>
  api.patch(`/cpa/${id}`, data).then((r) => r.data);

export const deleteCpa = (id: number) =>
  api.delete(`/cpa/${id}`).then((r) => r.data);

// ── Reportes logística / rentabilidad (fase 1) ──
export type EfectividadTransportadoraRow = {
  empresa: string;
  enviados: number;
  transito: number;
  pctTransito: number;
  devoluciones: number;
  pctDevoluciones: number;
  cancelados: number;
  rechazados: number;
  entregados: number;
  pctEntregados: number;
};

export const getEfectividadTransportadoras = (
  params?: {
    desde?: string;
    hasta?: string;
    transportadora?: string;
  },
  opts?: { signal?: AbortSignal },
) =>
  api
    .get<EfectividadTransportadoraRow[]>('/reportes-logistica/efectividad-transportadoras', {
      params,
      signal: opts?.signal,
    })
    .then((r) => r.data);

export type ComparativaGeograficaPunto = {
  ubicacion: string;
  transportadora: string;
  valorPct: number;
};

export type ComparativaGeograficaResponse = {
  dimension: 'departamento' | 'ciudad';
  metrica: 'efectividad' | 'devolucion';
  ubicaciones: string[];
  puntos: ComparativaGeograficaPunto[];
};

export const getComparativaGeografica = (
  params?: {
    dimension?: 'departamento' | 'ciudad';
    metrica?: 'efectividad' | 'devolucion';
    top?: number;
    desde?: string;
    hasta?: string;
  },
  opts?: { signal?: AbortSignal },
) =>
  api
    .get<ComparativaGeograficaResponse>('/reportes-logistica/comparativa-geografica', {
      params,
      signal: opts?.signal,
    })
    .then((r) => r.data);

export type RentabilidadProductoRow = {
  producto: string;
  entr: number;
  pctEfectividad: number;
  tran: number;
  pctTransito: number;
  dev: number;
  pctDevolucion: number;
  ventas: number;
  pauta: number;
  utilidad: number;
};

export type RentabilidadPorProductoResponse = {
  data: RentabilidadProductoRow[];
  total: number;
  page: number;
  limit: number;
};

export const getRentabilidadPorProducto = (
  params?: {
    desde?: string;
    hasta?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    order?: 'asc' | 'desc';
    search?: string;
  },
  opts?: { signal?: AbortSignal },
) =>
  api
    .get<RentabilidadPorProductoResponse>('/reportes-rentabilidad/por-producto', {
      params,
      signal: opts?.signal,
    })
    .then((r) => r.data);

// ── Import ──
export const importFile = (
  endpoint: 'pedidos' | 'productos' | 'cartera' | 'cpa' | 'mapeo-estados',
  file: File,
  onProgress?: (percent: number) => void,
) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/import/${endpoint}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 1800000, // 30 minutos de timeout
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  }).then((r) => r.data);
};

/** Remapeo masivo por lotes en servidor; puede tardar varios minutos con miles de pedidos. */
export const remapearEstados = () =>
  api.post('/import/remapear-estados', null, { timeout: 600000 }).then((r) => r.data);

export type WipeImportedResponse = {
  deleted: {
    productos_detalle: number;
    cartera_movimientos: number;
    pedidos: number;
  };
};

/** Solo ADMIN; requiere IMPORT_WIPE_SECRET en el servidor = misma contraseña. */
export const wipeImportedTables = (password: string) =>
  api
    .post<WipeImportedResponse>('/import/wipe-imported-tables', { password }, { timeout: 120000 })
    .then((r) => r.data);

export default api;
