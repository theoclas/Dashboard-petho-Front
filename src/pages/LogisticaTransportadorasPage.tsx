import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Card,
  DatePicker,
  Empty,
  Flex,
  Input,
  Segmented,
  Space,
  Spin,
  Table,
  Typography,
} from 'antd';
import { LineChartOutlined, TruckOutlined } from '@ant-design/icons';
import { Column } from '@ant-design/charts';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import type { AxiosError } from 'axios';
import {
  getComparativaGeografica,
  getEfectividadTransportadoras,
  isRequestCanceled,
  type ComparativaGeograficaResponse,
  type EfectividadTransportadoraRow,
} from '../api';

const { RangePicker } = DatePicker;
const { Text, Title } = Typography;

/** Colores alineados a la referencia (leyenda transportadoras). */
const TRANSPORTADORA_COLOR: Record<string, string> = {
  COORDINADORA: '#3B82F6',
  ENVIA: '#EF4444',
  INTERRAPIDISIMO: '#F97316',
  TCC: '#EAB308',
};

const cardSurface = {
  background: '#141428',
  border: '1px solid rgba(255,255,255,0.06)',
} as const;

/** Referencia estable para no romper memoización ni disparar updates infinitos en @ant-design/plots. */
const EMPTY_UBICACIONES: string[] = [];

function paletteForCarriers(names: string[]) {
  const order = ['COORDINADORA', 'ENVIA', 'INTERRAPIDISIMO', 'TCC'];
  const domain = [...new Set(names)].sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  const range = domain.map((n) => TRANSPORTADORA_COLOR[n] || '#64748b');
  return { domain, range };
}

function errMsg(e: unknown): string {
  const ax = e as AxiosError<{ message?: string | string[] }>;
  if (ax.response?.data?.message) {
    const m = ax.response.data.message;
    return Array.isArray(m) ? m.join(', ') : m;
  }
  if (e instanceof Error) return e.message;
  return 'Error al cargar';
}

export default function LogisticaTransportadorasPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<EfectividadTransportadoraRow[]>([]);
  const [comparativa, setComparativa] = useState<ComparativaGeograficaResponse | null>(null);
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [dimension, setDimension] = useState<'departamento' | 'ciudad'>('departamento');
  const [metrica, setMetrica] = useState<'efectividad' | 'devolucion'>('efectividad');
  const [empresaFilter, setEmpresaFilter] = useState('');

  const rangeKey =
    range?.[0] && range?.[1]
      ? `${range[0].valueOf()}-${range[1].valueOf()}`
      : 'all';

  useEffect(() => {
    const ac = new AbortController();
    let active = true;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const desde = range?.[0]?.startOf('day').toISOString();
        const hasta = range?.[1]?.endOf('day').toISOString();
        const dateOpts = desde && hasta ? { desde, hasta } : undefined;
        const [ef, cg] = await Promise.all([
          getEfectividadTransportadoras(dateOpts, { signal: ac.signal }),
          getComparativaGeografica(
            {
              ...dateOpts,
              dimension,
              metrica,
              top: 15,
            },
            { signal: ac.signal },
          ),
        ]);
        if (!active || ac.signal.aborted) return;
        setRows(ef);
        setComparativa(cg);
      } catch (e: unknown) {
        if (!active || ac.signal.aborted || isRequestCanceled(e)) return;
        setError(errMsg(e));
      } finally {
        if (active && !ac.signal.aborted) setLoading(false);
      }
    })();
    return () => {
      active = false;
      ac.abort();
    };
  }, [rangeKey, dimension, metrica, range]);

  const filteredRows = useMemo(() => {
    const q = empresaFilter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.empresa.toLowerCase().includes(q));
  }, [rows, empresaFilter]);

  const chartData = comparativa?.puntos ?? [];
  const carriers = useMemo(
    () => [...new Set(chartData.map((p) => p.transportadora))],
    [chartData],
  );
  const colorScale = useMemo(() => paletteForCarriers(carriers), [carriers]);
  const ubicaciones = comparativa?.ubicaciones ?? EMPTY_UBICACIONES;

  /**
   * La lib compara config con isEqual y hace chart.update() si cambia.
   * Funciones nuevas en cada render (tooltip, formatters) provocan updates continuos y canvas en blanco (sobre todo en prod).
   */
  const comparativaColumnConfig = useMemo(
    () => ({
      containerStyle: { width: '100%', height: 420 } as const,
      data: chartData,
      xField: 'ubicacion' as const,
      yField: 'valorPct' as const,
      colorField: 'transportadora' as const,
      group: true,
      height: 380,
      autoFit: true,
      scale: {
        y: { domainMax: 100, nice: true },
        x: ubicaciones.length ? { domain: ubicaciones } : undefined,
        color:
          colorScale.domain.length > 0
            ? { domain: colorScale.domain, range: colorScale.range }
            : undefined,
      },
      axis: {
        y: {
          labelFormatter: (v: string | number) => `${v}%`,
          gridLineDash: [4, 4] as [number, number],
          gridStroke: 'rgba(255,255,255,0.12)',
          labelFill: 'rgba(255,255,255,0.65)',
          titleFill: 'rgba(255,255,255,0.65)',
        },
        x: {
          labelAutoRotate: true,
          labelAutoHide: true,
          labelFill: 'rgba(255,255,255,0.65)',
          titleFill: 'rgba(255,255,255,0.65)',
        },
      },
      legend: {
        color: {
          position: 'bottom' as const,
          layout: { justifyContent: 'center' },
          itemMarker: { symbol: 'circle' as const },
          itemLabelFill: 'rgba(255,255,255,0.75)',
        },
      },
      tooltip: {
        title: (d: { ubicacion?: string }) => String(d.ubicacion),
        items: [
          (d: { transportadora?: string; valorPct?: number }) => ({
            name: d.transportadora,
            value: `${d.valorPct}%`,
          }),
        ],
      },
    }),
    [chartData, ubicaciones, colorScale],
  );

  const columns: ColumnsType<EfectividadTransportadoraRow> = [
    {
      title: 'EMPRESA',
      dataIndex: 'empresa',
      key: 'empresa',
      sorter: (a, b) => a.empresa.localeCompare(b.empresa),
      render: (v: string) => <Text strong>{v}</Text>,
      onHeaderCell: () => ({ style: { textAlign: 'left' } }),
      onCell: () => ({ style: { textAlign: 'left' } }),
    },
    {
      title: 'ENVIADOS',
      dataIndex: 'enviados',
      key: 'enviados',
      sorter: (a, b) => a.enviados - b.enviados,
      onHeaderCell: () => ({ style: { textAlign: 'right' } }),
      onCell: () => ({ style: { textAlign: 'right', color: 'rgba(255,255,255,0.65)' } }),
    },
    {
      title: 'TRÁNSITO',
      key: 'transito',
      sorter: (a, b) => a.transito - b.transito,
      render: (_, r) => (
        <Text style={{ color: '#3B82F6' }}>
          {r.transito} ({r.pctTransito}%)
        </Text>
      ),
      onHeaderCell: () => ({ style: { textAlign: 'right' } }),
      onCell: () => ({ style: { textAlign: 'right' } }),
    },
    {
      title: 'DEVOLUCIONES',
      key: 'devoluciones',
      sorter: (a, b) => a.devoluciones - b.devoluciones,
      render: (_, r) => (
        <Text style={{ color: '#EF4444' }}>
          {r.devoluciones} ({r.pctDevoluciones}%)
        </Text>
      ),
      onHeaderCell: () => ({ style: { textAlign: 'right' } }),
      onCell: () => ({ style: { textAlign: 'right' } }),
    },
    {
      title: 'CANCELADOS',
      dataIndex: 'cancelados',
      key: 'cancelados',
      sorter: (a, b) => a.cancelados - b.cancelados,
      onHeaderCell: () => ({ style: { textAlign: 'right' } }),
      onCell: () => ({ style: { textAlign: 'right', color: 'rgba(255,255,255,0.65)' } }),
    },
    {
      title: 'RECHAZADOS',
      dataIndex: 'rechazados',
      key: 'rechazados',
      sorter: (a, b) => a.rechazados - b.rechazados,
      render: (v: number) => <Text style={{ color: '#EC4899' }}>{v}</Text>,
      onHeaderCell: () => ({ style: { textAlign: 'right' } }),
      onCell: () => ({ style: { textAlign: 'right' } }),
    },
    {
      title: 'ENTREGADOS',
      key: 'entregados',
      sorter: (a, b) => a.entregados - b.entregados,
      render: (_, r) => (
        <Text strong style={{ color: '#10B981' }}>
          {r.entregados} ({r.pctEntregados}%)
        </Text>
      ),
      onHeaderCell: () => ({ style: { textAlign: 'right' } }),
      onCell: () => ({
        style: {
          textAlign: 'right',
          background: 'rgba(16, 185, 129, 0.08)',
        },
      }),
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Title level={4} style={{ margin: 0 }}>
          <TruckOutlined style={{ marginRight: 8 }} />
          Logística y transportadoras
        </Title>
        <Text type="secondary">Efectividad por empresa y comparativa geográfica (Top 15).</Text>
      </div>

      <Card size="small" style={cardSurface} styles={{ body: { padding: '12px 16px' } }}>
        <Space wrap align="center">
          <Text type="secondary">Rango de fechas (opcional):</Text>
          <RangePicker
            value={range}
            onChange={(v) => setRange(v as [Dayjs | null, Dayjs | null] | null)}
            allowEmpty={[true, true]}
            format="DD/MM/YYYY"
          />
        </Space>
      </Card>

      {error && <Alert type="error" message={error} showIcon />}

      <Spin spinning={loading}>
        <Card
          style={cardSurface}
          styles={{ header: { borderBottom: '1px solid rgba(255,255,255,0.06)' } }}
          title={
            <Space>
              <TruckOutlined />
              <span>Efectividad Transportadora</span>
            </Space>
          }
          extra={
            <Input.Search
              allowClear
              placeholder="Filtrar por empresa"
              onChange={(e) => setEmpresaFilter(e.target.value)}
              style={{ width: 220 }}
            />
          }
        >
          <Table<EfectividadTransportadoraRow>
            rowKey={(r) => r.empresa}
            columns={columns}
            dataSource={filteredRows}
            pagination={false}
            size="middle"
            showSorterTooltip
            locale={{ emptyText: <Empty description="Sin datos" /> }}
          />
        </Card>

        <Card
          style={{ ...cardSurface, marginTop: 24 }}
          styles={{ header: { borderBottom: '1px solid rgba(255,255,255,0.06)' } }}
          title={
            <Space direction="vertical" size={0}>
              <Space>
                <LineChartOutlined />
                <span>Comparativa de Transportadoras</span>
              </Space>
              <Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>
                Analiza el rendimiento geográfico (Top 15)
              </Text>
            </Space>
          }
          extra={
            <Flex wrap="wrap" gap={8} justify="flex-end">
              <Segmented
                size="small"
                value={dimension}
                onChange={(v) => setDimension(v as 'departamento' | 'ciudad')}
                options={[
                  { label: 'Departamentos', value: 'departamento' },
                  { label: 'Ciudades', value: 'ciudad' },
                ]}
              />
              <Segmented
                size="small"
                value={metrica}
                onChange={(v) => setMetrica(v as 'efectividad' | 'devolucion')}
                options={[
                  { label: '% Efectividad', value: 'efectividad' },
                  { label: '% Devolución', value: 'devolucion' },
                ]}
              />
            </Flex>
          }
        >
          {chartData.length === 0 ? (
            <Empty description="Sin datos para el gráfico con los filtros actuales" />
          ) : (
            <div style={{ width: '100%', minHeight: 420, minWidth: 0 }}>
              <Column
                key={`${dimension}-${metrica}-${rangeKey}`}
                {...comparativaColumnConfig}
              />
            </div>
          )}
        </Card>
      </Spin>
    </Space>
  );
}
