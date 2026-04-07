import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Space,
  Typography,
  message,
  Popconfirm,
  InputNumber,
  DatePicker,
  Upload,
  Progress,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { FilterDropdownProps } from 'antd/es/table/interface';
import type { AxiosError } from 'axios';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  DownloadOutlined,
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  getCpas,
  createCpa,
  updateCpa,
  deleteCpa,
  importFile,
  wipeCpaTable,
  exportCpaExcel,
} from '../api';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';
import {
  fmtCalendarDateDdMmYyyy,
  dayjsFromIsoDateForPicker,
  dayjsFromYmdFilterString,
} from '../utils/calendarDateLocal';

const { Title, Paragraph, Text } = Typography;
const { RangePicker } = DatePicker;

const CPA_COLUMN_FILTER_KEYS = [
  'id',
  'semana',
  'fecha',
  'producto',
  'cuenta_publicitaria',
  'gasto_publicidad',
  'conversaciones',
  'total_facturado',
  'ganancia_promedio',
  'ventas',
  'ticket_promedio_producto',
  'cpa',
  'conversion_rate',
  'costo_publicitario',
  'rentabilidad',
  'utilidad_aproximada',
] as const;

type CpaColumnFilterKey = (typeof CPA_COLUMN_FILTER_KEYS)[number];

const initialCpaColumnFilters: Record<CpaColumnFilterKey, string> = {
  id: '',
  semana: '',
  fecha: '',
  producto: '',
  cuenta_publicitaria: '',
  gasto_publicidad: '',
  conversaciones: '',
  total_facturado: '',
  ganancia_promedio: '',
  ventas: '',
  ticket_promedio_producto: '',
  cpa: '',
  conversion_rate: '',
  costo_publicitario: '',
  rentabilidad: '',
  utilidad_aproximada: '',
};

/** Celda sin dato en BD (null/undefined); distinto de 0, que es un valor real. */
const CPA_EMPTY = '—';

function isCpaValueAbsent(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string' && v.trim() === '') return true;
  return false;
}

/** True si la fila tiene algún número distinto de 0 en métricas CPA (un 0 suelto puede ser dato real). */
function hasAnyNumericCpaActivity(r: CpaRecord): boolean {
  const pos = (x: unknown) => x != null && !Number.isNaN(Number(x)) && Number(x) !== 0;
  return (
    pos(r.gasto_publicidad) ||
    pos(r.ventas) ||
    pos(r.utilidad_aproximada) ||
    pos(r.cpa) ||
    pos(r.conversaciones) ||
    pos(r.ganancia_promedio) ||
    pos(r.total_facturado) ||
    pos(r.ticket_promedio_producto) ||
    pos(r.conversion_rate) ||
    pos(r.costo_publicitario) ||
    pos(r.rentabilidad)
  );
}

/**
 * Importes viejos guardaron celdas vacías como 0: si toda la fila es “todo cero” y sin actividad, se muestra como sin dato.
 * Si hay actividad en otro campo, un 0 en esta columna es un cero real.
 */
function fmtCpaMoneyCell(v: unknown, r: CpaRecord): string {
  if (isCpaValueAbsent(v)) return CPA_EMPTY;
  const n = Number(v);
  if (Number.isNaN(n)) return CPA_EMPTY;
  if (n === 0 && !hasAnyNumericCpaActivity(r)) return CPA_EMPTY;
  return n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

function fmtCpaIntCell(v: unknown, r: CpaRecord): string {
  if (isCpaValueAbsent(v)) return CPA_EMPTY;
  const n = Number(v);
  if (Number.isNaN(n)) return CPA_EMPTY;
  if (n === 0 && !hasAnyNumericCpaActivity(r)) return CPA_EMPTY;
  return n.toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

function fmtCpaDecimalCell(v: unknown, r: CpaRecord, fractionDigits: number): string {
  if (isCpaValueAbsent(v)) return CPA_EMPTY;
  const n = Number(v);
  if (Number.isNaN(n)) return CPA_EMPTY;
  if (n === 0 && !hasAnyNumericCpaActivity(r)) return CPA_EMPTY;
  return n.toLocaleString('es-CO', {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: 0,
  });
}

function wipeErrMsg(e: unknown): string {
  const ax = e as AxiosError<{ message?: string | string[] }>;
  const m = ax.response?.data?.message;
  if (m) return Array.isArray(m) ? m.join(', ') : m;
  if (e instanceof Error) return e.message;
  return 'Error desconocido';
}

interface CpaRecord {
  id: number;
  semana: string;
  fecha: string;
  producto: string;
  cuenta_publicitaria: string;
  gasto_publicidad: number | null;
  conversaciones: number | null;
  total_facturado: number | null;
  ganancia_promedio: number | null;
  ventas: number | null;
  ticket_promedio_producto: number | null;
  cpa: number | null;
  conversion_rate: number | null;
  costo_publicitario: number | null;
  rentabilidad: number | null;
  utilidad_aproximada: number | null;
}

/** Vista previa local; debe coincidir con `applyCpaDerivedFields` en el API. */
function previewCpaDerived(values: {
  gasto_publicidad?: number | null;
  ventas?: number | null;
  conversaciones?: number | null;
  total_facturado?: number | null;
  ganancia_promedio?: number | null;
}) {
  const roundDec = (n: number, scale: number) =>
    Math.round(n * 10 ** scale) / 10 ** scale;

  const gasto =
    values.gasto_publicidad != null && !Number.isNaN(Number(values.gasto_publicidad))
      ? Number(values.gasto_publicidad)
      : null;
  const ventas =
    values.ventas != null && !Number.isNaN(Number(values.ventas))
      ? Math.trunc(Number(values.ventas))
      : null;
  const conv =
    values.conversaciones != null && !Number.isNaN(Number(values.conversaciones))
      ? Math.trunc(Number(values.conversaciones))
      : null;
  const total =
    values.total_facturado != null && !Number.isNaN(Number(values.total_facturado))
      ? Number(values.total_facturado)
      : null;
  const gan =
    values.ganancia_promedio != null && !Number.isNaN(Number(values.ganancia_promedio))
      ? Number(values.ganancia_promedio)
      : null;

  const costo_publicitario = gasto != null ? roundDec(gasto, 2) : null;
  let ticket_promedio_producto: number | null = null;
  let cpa: number | null = null;
  if (ventas != null && ventas > 0) {
    ticket_promedio_producto = total != null ? roundDec(total / ventas, 2) : null;
    cpa = gasto != null ? roundDec(gasto / ventas, 2) : null;
  }
  const conversion_rate =
    conv != null && conv > 0 && ventas != null && !Number.isNaN(ventas)
      ? roundDec(ventas / conv, 4)
      : null;
  const utilidad_aproximada =
    gan != null && ventas != null && gasto != null
      ? roundDec(gan * ventas - gasto, 2)
      : null;
  const util =
    utilidad_aproximada != null && !Number.isNaN(utilidad_aproximada)
      ? utilidad_aproximada
      : null;
  const rentabilidad =
    gasto != null && gasto > 0 && util != null
      ? roundDec(util / gasto, 4)
      : null;

  return {
    costo_publicitario,
    ticket_promedio_producto,
    cpa,
    conversion_rate,
    utilidad_aproximada,
    rentabilidad,
  };
}

function fmtPreviewMoney(n: number | null): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

function fmtPreviewRatio(n: number | null): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString('es-CO', { maximumFractionDigits: 4 });
}

export default function CpaPage() {
  const { user } = useAuth();
  const [data, setData] = useState<CpaRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CpaRecord | null>(null);
  const [filters, setFilters] = useState({
    ...initialCpaColumnFilters,
    startDate: '',
    endDate: '',
  });
  const [sortField, setSortField] = useState<string>('fecha');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [form] = Form.useForm();
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [errorsModalOpen, setErrorsModalOpen] = useState(false);
  const [wipePassword, setWipePassword] = useState('');
  const [wipeLoading, setWipeLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [cpaPage, setCpaPage] = useState(1);
  const [cpaPageSize, setCpaPageSize] = useState(20);

  const buildListParams = useCallback((): Record<string, unknown> => {
    const params: Record<string, unknown> = { sortField, sortOrder };
    for (const k of CPA_COLUMN_FILTER_KEYS) {
      const v = filters[k]?.trim();
      if (!v) continue;
      if (k === 'fecha') params.fecha_contains = v;
      else params[k] = v;
    }
    if (filters.startDate && filters.endDate) {
      params.startDate = filters.startDate;
      params.endDate = filters.endDate;
    }
    return params;
  }, [filters, sortField, sortOrder]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getCpas(buildListParams());
      setData(Array.isArray(result) ? result : []);
    } catch {
      message.error('Error cargando datos de CPA');
    }
    setLoading(false);
  }, [buildListParams]);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const res = await exportCpaExcel(buildListParams());
      const blob = res.data;
      if (blob.type && blob.type.includes('application/json')) {
        message.error('Error al exportar (respuesta inválida). Revisa sesión o despliegue del API.');
        return;
      }
      const truncated =
        String(res.headers['x-export-truncated'] ?? '').toLowerCase() === 'true';
      const totalMatching = res.headers['x-export-total-matching'];
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const nameSuffix =
        filters.startDate && filters.endDate
          ? `${filters.startDate}_a_${filters.endDate}`
          : dayjs().format('YYYY-MM-DD_HHmm');
      a.download = `cpa_${nameSuffix}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      if (truncated && totalMatching != null) {
        message.warning(
          `Se exportaron las primeras 50.000 filas (${Number(totalMatching).toLocaleString()} coincidencias en total).`,
        );
      } else {
        message.success('Excel descargado');
      }
    } catch {
      message.error('Error al exportar a Excel');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(data.length / cpaPageSize) || 1);
    if (cpaPage > totalPages) setCpaPage(totalPages);
  }, [data.length, cpaPageSize, cpaPage]);

  const gastoW = Form.useWatch('gasto_publicidad', form);
  const ventasW = Form.useWatch('ventas', form);
  const convW = Form.useWatch('conversaciones', form);
  const totalW = Form.useWatch('total_facturado', form);
  const ganW = Form.useWatch('ganancia_promedio', form);
  const derivedPreview = useMemo(
    () =>
      previewCpaDerived({
        gasto_publicidad: gastoW,
        ventas: ventasW,
        conversaciones: convW,
        total_facturado: totalW,
        ganancia_promedio: ganW,
      }),
    [gastoW, ventasW, convW, totalW, ganW],
  );

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (record: CpaRecord) => {
    setEditingRecord(record);
    form.setFieldsValue({
      semana: record.semana,
      fecha: dayjsFromIsoDateForPicker(record.fecha),
      producto: record.producto,
      cuenta_publicitaria: record.cuenta_publicitaria,
      gasto_publicidad: record.gasto_publicidad,
      conversaciones: record.conversaciones,
      total_facturado: record.total_facturado,
      ganancia_promedio: record.ganancia_promedio,
      ventas: record.ventas,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteCpa(id);
      message.success('Registro eliminado');
      await fetchData();
    } catch {
      message.error('Error eliminando registro');
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        semana: values.semana,
        fecha: values.fecha ? values.fecha.format('YYYY-MM-DD') : null,
        producto: values.producto,
        cuenta_publicitaria: values.cuenta_publicitaria,
        gasto_publicidad: values.gasto_publicidad,
        conversaciones: values.conversaciones,
        total_facturado: values.total_facturado,
        ganancia_promedio: values.ganancia_promedio,
        ventas: values.ventas,
      };

      if (editingRecord) {
        await updateCpa(editingRecord.id, payload);
        message.success('Registro actualizado');
      } else {
        await createCpa(payload);
        message.success('Registro creado');
      }
      setModalOpen(false);
      await fetchData();
    } catch {
      /* validation error */
    }
  };

  const sortOrderFor = (field: string) =>
    sortField === field ? (sortOrder === 'ASC' ? ('ascend' as const) : ('descend' as const)) : undefined;

  const getColumnSearchProps = (title: string, filterKey: CpaColumnFilterKey) => ({
    filterDropdown: ({
      setSelectedKeys,
      selectedKeys,
      confirm,
      clearFilters,
    }: FilterDropdownProps) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          placeholder={`Buscar ${title}`}
          value={String(selectedKeys[0] ?? '')}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => confirm()}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => confirm()}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Buscar
          </Button>
          <Button
            onClick={() => {
              clearFilters?.();
              confirm();
            }}
            size="small"
            style={{ width: 90 }}
          >
            Limpiar
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered: boolean) => (
      <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />
    ),
    filteredValue: filters[filterKey] ? [filters[filterKey]] : null,
  });

  /** Mismo orden que la exportación Excel del API (hoja CPA). */
  const columns: ColumnsType<CpaRecord> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 72,
      fixed: 'left',
      sorter: true,
      sortOrder: sortOrderFor('id'),
      align: 'right',
      ...getColumnSearchProps('ID', 'id'),
    },
    {
      title: 'Semana',
      dataIndex: 'semana',
      key: 'semana',
      width: 100,
      ellipsis: true,
      sorter: true,
      sortOrder: sortOrderFor('semana'),
      ...getColumnSearchProps('Semana', 'semana'),
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 108,
      sorter: true,
      sortOrder: sortOrderFor('fecha'),
      ...getColumnSearchProps('fecha (texto)', 'fecha'),
      render: (v: string) => fmtCalendarDateDdMmYyyy(v),
    },
    {
      title: 'Producto',
      dataIndex: 'producto',
      key: 'producto',
      width: 180,
      ellipsis: true,
      sorter: true,
      sortOrder: sortOrderFor('producto'),
      ...getColumnSearchProps('Producto', 'producto'),
    },
    {
      title: 'Cuenta publicitaria',
      dataIndex: 'cuenta_publicitaria',
      key: 'cuenta_publicitaria',
      width: 140,
      ellipsis: true,
      sorter: true,
      sortOrder: sortOrderFor('cuenta_publicitaria'),
      ...getColumnSearchProps('Cuenta publicitaria', 'cuenta_publicitaria'),
    },
    {
      title: 'Gasto publicidad',
      dataIndex: 'gasto_publicidad',
      key: 'gasto_publicidad',
      width: 128,
      sorter: true,
      sortOrder: sortOrderFor('gasto_publicidad'),
      align: 'right',
      ...getColumnSearchProps('Gasto publicidad', 'gasto_publicidad'),
      render: (v: unknown, record: CpaRecord) => fmtCpaMoneyCell(v, record),
    },
    {
      title: 'Conversaciones',
      dataIndex: 'conversaciones',
      key: 'conversaciones',
      width: 110,
      sorter: true,
      sortOrder: sortOrderFor('conversaciones'),
      align: 'right',
      ...getColumnSearchProps('Conversaciones', 'conversaciones'),
      render: (v: unknown, record: CpaRecord) => fmtCpaIntCell(v, record),
    },
    {
      title: 'Total facturado',
      dataIndex: 'total_facturado',
      key: 'total_facturado',
      width: 128,
      sorter: true,
      sortOrder: sortOrderFor('total_facturado'),
      align: 'right',
      ...getColumnSearchProps('Total facturado', 'total_facturado'),
      render: (v: unknown, record: CpaRecord) => fmtCpaMoneyCell(v, record),
    },
    {
      title: 'Ganancia promedio',
      dataIndex: 'ganancia_promedio',
      key: 'ganancia_promedio',
      width: 128,
      sorter: true,
      sortOrder: sortOrderFor('ganancia_promedio'),
      align: 'right',
      ...getColumnSearchProps('Ganancia promedio', 'ganancia_promedio'),
      render: (v: unknown, record: CpaRecord) => fmtCpaMoneyCell(v, record),
    },
    {
      title: 'Ventas',
      dataIndex: 'ventas',
      key: 'ventas',
      width: 84,
      sorter: true,
      sortOrder: sortOrderFor('ventas'),
      align: 'right',
      ...getColumnSearchProps('Ventas', 'ventas'),
      render: (v: unknown, record: CpaRecord) => fmtCpaIntCell(v, record),
    },
    {
      title: 'Ticket prom. producto',
      dataIndex: 'ticket_promedio_producto',
      key: 'ticket_promedio_producto',
      width: 132,
      sorter: true,
      sortOrder: sortOrderFor('ticket_promedio_producto'),
      align: 'right',
      ...getColumnSearchProps('Ticket prom. producto', 'ticket_promedio_producto'),
      render: (v: unknown, record: CpaRecord) => fmtCpaMoneyCell(v, record),
    },
    {
      title: 'CPA',
      dataIndex: 'cpa',
      key: 'cpa',
      width: 104,
      sorter: true,
      sortOrder: sortOrderFor('cpa'),
      align: 'right',
      ...getColumnSearchProps('CPA', 'cpa'),
      render: (v: unknown, record: CpaRecord) => fmtCpaMoneyCell(v, record),
    },
    {
      title: 'Conversion rate',
      dataIndex: 'conversion_rate',
      key: 'conversion_rate',
      width: 118,
      sorter: true,
      sortOrder: sortOrderFor('conversion_rate'),
      align: 'right',
      ...getColumnSearchProps('Conversion rate', 'conversion_rate'),
      render: (v: unknown, record: CpaRecord) => fmtCpaDecimalCell(v, record, 4),
    },
    {
      title: 'Costo publicitario',
      dataIndex: 'costo_publicitario',
      key: 'costo_publicitario',
      width: 128,
      sorter: true,
      sortOrder: sortOrderFor('costo_publicitario'),
      align: 'right',
      ...getColumnSearchProps('Costo publicitario', 'costo_publicitario'),
      render: (v: unknown, record: CpaRecord) => fmtCpaMoneyCell(v, record),
    },
    {
      title: 'Rentabilidad',
      dataIndex: 'rentabilidad',
      key: 'rentabilidad',
      width: 108,
      sorter: true,
      sortOrder: sortOrderFor('rentabilidad'),
      align: 'right',
      ...getColumnSearchProps('Rentabilidad', 'rentabilidad'),
      render: (v: unknown, record: CpaRecord) => fmtCpaDecimalCell(v, record, 4),
    },
    {
      title: 'Utilidad aproximada',
      dataIndex: 'utilidad_aproximada',
      key: 'utilidad_aproximada',
      width: 136,
      sorter: true,
      sortOrder: sortOrderFor('utilidad_aproximada'),
      align: 'right',
      ...getColumnSearchProps('Utilidad aproximada', 'utilidad_aproximada'),
      render: (v: unknown, record: CpaRecord) => {
        if (isCpaValueAbsent(v)) return <span>{CPA_EMPTY}</span>;
        const n = Number(v);
        if (Number.isNaN(n)) return <span>{CPA_EMPTY}</span>;
        if (n === 0 && !hasAnyNumericCpaActivity(record)) return <span>{CPA_EMPTY}</span>;
        return (
          <span style={{ color: n >= 0 ? 'green' : 'red', fontWeight: 'bold' }}>
            {n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
          </span>
        );
      },
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 100,
      fixed: 'right' as const,
      render: (_: unknown, record: CpaRecord) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="¿Eliminar?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleUpload = async (file: File) => {
    setImporting(true);
    setImportProgress(0);
    setImportErrors([]);
    try {
      const result = await importFile('cpa', file, (pct) => setImportProgress(pct));
      message.success(`${result.imported} registros importados correctamente.`);
      if (result.errors?.length) {
        setImportErrors(result.errors);
        setErrorsModalOpen(true);
        message.warning(`${result.errors.length} fila(s) con avisos; abra el detalle si lo necesita.`);
      }
      await fetchData();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } }; message?: string };
      message.error(ax.response?.data?.message ?? ax.message ?? 'Error al importar');
    } finally {
      setImporting(false);
      setImportProgress(0);
    }
    return false;
  };

  const openWipeCpaConfirm = () => {
    const pwd = wipePassword.trim();
    if (!pwd) {
      message.warning('Escribe la contraseña de limpieza (la misma que IMPORT_WIPE_SECRET en el servidor).');
      return;
    }
    Modal.confirm({
      title: '¿Vaciar toda la tabla de CPA?',
      width: 480,
      content: (
        <div>
          <p style={{ marginBottom: 8 }}>
            Se eliminarán <strong>todos los registros</strong> de la tabla <strong>cpas</strong>.
          </p>
          <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>
            Misma contraseña que en Importar → limpieza masiva (IMPORT_WIPE_SECRET). No se puede deshacer.
          </Text>
        </div>
      ),
      okText: 'Sí, borrar todo',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        setWipeLoading(true);
        try {
          const res = await wipeCpaTable(pwd);
          message.success(`Eliminados ${res.deleted} registro(s) de CPA.`);
          setWipePassword('');
          await fetchData();
        } catch (e: unknown) {
          message.error(wipeErrMsg(e));
          throw e;
        } finally {
          setWipeLoading(false);
        }
      },
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>📊 Gestión de CPA</Title>
        <Space wrap align="center">
          <RangePicker
            placeholder={['Desde', 'Hasta']}
            format="DD/MM/YYYY"
            inputReadOnly
            value={
              filters.startDate && filters.endDate
                ? [dayjsFromYmdFilterString(filters.startDate), dayjsFromYmdFilterString(filters.endDate)]
                : null
            }
            onChange={(dates) => {
              const d0 = dates?.[0];
              const d1 = dates?.[1];
              setCpaPage(1);
              if (!d0 || !d1) {
                setFilters((f) => ({ ...f, startDate: '', endDate: '' }));
              } else {
                setFilters((f) => ({
                  ...f,
                  startDate: d0.format('YYYY-MM-DD'),
                  endDate: d1.format('YYYY-MM-DD'),
                }));
              }
            }}
          />
          <Space direction="vertical" size={4} style={{ minWidth: 200 }}>
            <Upload accept=".xlsx,.xls" showUploadList={false} beforeUpload={handleUpload} disabled={importing}>
              <Tooltip
                title="Hoja INPUT_DATA o Sheet1. Columnas flexibles: Semana, Fecha (DD/MM/YYYY, etc.), Producto, Cuenta, Gasto publicidad, Ventas y demás campos opcionales."
              >
                <Button icon={<UploadOutlined />} loading={importing}>
                  Importar Excel
                </Button>
              </Tooltip>
            </Upload>
            {importing && importProgress > 0 && importProgress < 100 && (
              <Progress percent={importProgress} size="small" status="active" />
            )}
          </Space>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExportExcel}
            loading={exporting}
          >
            Exportar Excel
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            Recargar
          </Button>
          <Text type="secondary">{data.length.toLocaleString()} resultados</Text>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Nuevo Registro
          </Button>
          {user?.role === 'ADMIN' && (
            <>
              <Input.Password
                id="cpa-import-wipe-secret"
                name="cpa-import-wipe-secret"
                placeholder="Contraseña IMPORT_WIPE_SECRET"
                value={wipePassword}
                onChange={(e) => setWipePassword(e.target.value)}
                style={{ width: 200 }}
                disabled={wipeLoading}
                autoComplete="new-password"
              />
              <Tooltip title="Elimina todos los registros CPA; requiere la misma clave del .env del servidor.">
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  loading={wipeLoading}
                  onClick={openWipeCpaConfirm}
                >
                  Vaciar tabla CPA
                </Button>
              </Tooltip>
            </>
          )}
        </Space>
      </div>

      <Table<CpaRecord>
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        size="small"
        scroll={{ x: 2600 }}
        pagination={{
          current: cpaPage,
          pageSize: cpaPageSize,
          total: data.length,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100, 200, 800],
          showTotal: (t) => `Total: ${t.toLocaleString()}`,
        }}
        onChange={(pagination, tableFilters, sorter, extra) => {
          if (extra?.action === 'paginate') {
            setCpaPage(pagination.current ?? 1);
            setCpaPageSize(pagination.pageSize ?? 20);
            return;
          }
          setCpaPage(1);
          const ord = Array.isArray(sorter) ? sorter[0] : sorter;
          const fieldRaw = ord && typeof ord === 'object' ? ord.field : undefined;
          const sortCol =
            fieldRaw == null
              ? undefined
              : Array.isArray(fieldRaw)
                ? String(fieldRaw[0])
                : String(fieldRaw);
          const order = ord && typeof ord === 'object' ? ord.order : undefined;
          if (sortCol && order) {
            setSortField(sortCol);
            setSortOrder(order === 'ascend' ? 'ASC' : 'DESC');
          } else {
            setSortField('fecha');
            setSortOrder('DESC');
          }
          setFilters((prev) => {
            const next = { ...prev };
            for (const k of CPA_COLUMN_FILTER_KEYS) {
              const fv = tableFilters?.[k];
              const first = Array.isArray(fv) ? fv[0] : undefined;
              next[k] = first != null && first !== '' ? String(first) : '';
            }
            return next;
          });
        }}
      />

      <Modal
        title="Importación CPA — filas no cargadas"
        open={errorsModalOpen}
        onCancel={() => setErrorsModalOpen(false)}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Paragraph type="secondary" style={{ marginBottom: 12 }}>
          Estas filas del Excel no se incluyeron o tienen datos incompletos (por ejemplo falta fecha o producto).
        </Paragraph>
        <div
          style={{
            maxHeight: 360,
            overflow: 'auto',
            fontFamily: 'ui-monospace, monospace',
            fontSize: 12,
            lineHeight: 1.5,
            padding: 8,
            background: 'rgba(0,0,0,0.2)',
            borderRadius: 6,
          }}
        >
          {importErrors.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      </Modal>

      <Modal
        title={editingRecord ? 'Editar Registro CPA' : 'Nuevo Registro CPA'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText="Guardar"
        cancelText="Cancelar"
        width={800}
      >
        <Form form={form} layout="vertical">
          <Space size="large" style={{ width: '100%' }} align="start">
            <div style={{ flex: 1 }}>
              <Form.Item name="semana" label="Semana">
                <Input placeholder="Ej: Semana 10" />
              </Form.Item>
              <Form.Item name="fecha" label="Fecha">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="producto" label="Producto" rules={[{ required: true, whitespace: true }]}>
                <Input placeholder="Escribe el nombre del producto" allowClear />
              </Form.Item>
              <Form.Item name="cuenta_publicitaria" label="Cuenta Publicitaria">
                <Input placeholder="Nombre de la cuenta" />
              </Form.Item>
              <Form.Item name="gasto_publicidad" label="Gasto Publicidad">
                <InputNumber style={{ width: '100%' }} formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
              </Form.Item>
              <Form.Item name="conversaciones" label="Conversaciones">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="total_facturado" label="Total Facturado">
                <InputNumber style={{ width: '100%' }} formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
              </Form.Item>
              <Form.Item name="ganancia_promedio" label="Ganancia Promedio">
                <InputNumber style={{ width: '100%' }} formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
              </Form.Item>
            </div>
            <div style={{ flex: 1 }}>
              <Form.Item name="ventas" label="Ventas">
                <InputNumber style={{ width: '100%' }} min={0} precision={0} />
              </Form.Item>
              <Paragraph type="secondary" style={{ margin: '0 0 8px', fontSize: 12 }}>
                Calculado al guardar (mismo criterio que el Excel modelo): ticket promedio, CPA, tasa de conversión, costo
                publicitario, rentabilidad y utilidad aproximada.
              </Paragraph>
              <Form.Item label="Ticket promedio producto">
                <Input readOnly value={fmtPreviewMoney(derivedPreview.ticket_promedio_producto)} />
              </Form.Item>
              <Form.Item label="CPA">
                <Input readOnly value={fmtPreviewMoney(derivedPreview.cpa)} />
              </Form.Item>
              <Form.Item label="Conversion rate (ventas / conversaciones)">
                <Input readOnly value={fmtPreviewRatio(derivedPreview.conversion_rate)} />
              </Form.Item>
              <Form.Item label="Costo publicitario (= gasto publicidad)">
                <Input readOnly value={fmtPreviewMoney(derivedPreview.costo_publicitario)} />
              </Form.Item>
              <Form.Item label="Rentabilidad (utilidad / gasto)">
                <Input readOnly value={fmtPreviewRatio(derivedPreview.rentabilidad)} />
              </Form.Item>
              <Form.Item label="Utilidad aproximada ((ganancia prom. × ventas) − gasto)">
                <Input
                  readOnly
                  value={fmtPreviewMoney(derivedPreview.utilidad_aproximada)}
                  style={{
                    color:
                      derivedPreview.utilidad_aproximada != null &&
                      derivedPreview.utilidad_aproximada >= 0
                        ? '#52c41a'
                        : '#ff4d4f',
                    fontWeight: 600,
                  }}
                />
              </Form.Item>
            </div>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
