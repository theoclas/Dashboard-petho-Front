import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { Card, Row, Col, Statistic, Typography, Spin, Space, DatePicker, Divider, Tooltip } from 'antd';
import { Pie, Column, Line } from '@ant-design/charts';
import {
  ShoppingCartOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  TruckOutlined,
  WarningOutlined,
  BarChartOutlined,
  InboxOutlined,
  QuestionCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { getDashboardStats, getCpaStats } from '../api';
import dayjs, { Dayjs } from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface Stats {
  total: number;
  entregados: number;
  devoluciones: number;
  enProceso: number;
  totalVentas: number;
  totalGanancia: number;
  totalCartera: number;
  sinMapear: number;
  /** Pedidos con número de guía no vacío (mismo rango de fechas). */
  totalGuias?: number;
  /** Suma de cantidades en productos_detalle de esos pedidos. */
  productosVendidos?: number;
  daily?: any[];
}

interface CpaStats {
  /** Compat: coincide con cpaPromedio si existe. */
  totalCpa: number;
  /** Promedio del campo CPA por fila (estilo Excel / CPA Resumen). */
  cpaPromedio?: number | null;
  /** Σ gasto ÷ Σ ventas. */
  cpaPonderado?: number | null;
  totalGasto: number;
  totalUtilidadCpa: number;
  totalVentasCpa: number;
  totalConversacionesCpa: number;
  dailyCpa: any[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [cpaStats, setCpaStats] = useState<CpaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<keyof Stats>('total');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const params: { startDate?: string; endDate?: string } = {};
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }
      
      const [calc, cpaCalc] = await Promise.all([
        getDashboardStats(params),
        getCpaStats(params)
      ]);
      setStats(calc);
      setCpaStats(cpaCalc);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [dateRange]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!stats) return null;

  type DashCard = {
    title: string;
    value: number;
    dataKey: string;
    icon: ReactNode;
    color: string;
    suffix?: string;
    prefix?: string;
    isMoney?: boolean;
    isCpa?: boolean;
    tooltip?: string;
  };

  const cards: DashCard[] = [
    {
      title: 'Total Pedidos',
      value: stats.total,
      dataKey: 'total',
      icon: <ShoppingCartOutlined />,
      color: '#1890ff',
    },
    {
      title: 'Total guías',
      value: stats.totalGuias ?? 0,
      dataKey: 'totalGuias',
      icon: <TruckOutlined />,
      color: '#2f54eb',
      tooltip: 'Pedidos con guía asignada (campo no vacío) en el rango de fechas.',
    },
    {
      title: 'Productos vendidos',
      value: stats.productosVendidos ?? 0,
      dataKey: 'productosVendidos',
      icon: <InboxOutlined />,
      color: '#722ed1',
      tooltip: 'Suma de unidades (cantidad) en el detalle de productos de esos pedidos.',
    },
    {
      title: 'Entregados',
      value: stats.entregados,
      dataKey: 'entregados',
      icon: <CheckCircleOutlined />,
      color: '#52c41a',
      suffix: `(${((stats.entregados / (stats.total || 1)) * 100).toFixed(1)}%)`,
    },
    {
      title: 'Devoluciones',
      value: stats.devoluciones,
      dataKey: 'devoluciones',
      icon: <CloseCircleOutlined />,
      color: '#ff4d4f',
      suffix: `(${((stats.devoluciones / (stats.total || 1)) * 100).toFixed(1)}%)`,
    },
    {
      title: 'En Proceso',
      value: stats.enProceso,
      dataKey: 'enProceso',
      icon: <ClockCircleOutlined />,
      color: '#faad14',
      suffix: `(${((stats.enProceso / (stats.total || 1)) * 100).toFixed(1)}%)`,
    },
    {
      title: 'Total Ventas',
      value: stats.totalVentas,
      dataKey: 'totalVentas',
      icon: <DollarOutlined />,
      color: '#13c2c2',
      prefix: '$',
      isMoney: true,
    },
    {
      title: 'Ganancia Total',
      value: stats.totalCartera,
      dataKey: 'totalCartera',
      icon: <DollarOutlined />,
      color: '#52c41a',
      prefix: '$',
      isMoney: true,
    },
    {
      title: 'Ganancia Proyectada',
      value: stats.totalGanancia,
      dataKey: 'totalGanancia',
      icon: <DollarOutlined />,
      color: '#722ed1',
      prefix: '$',
      isMoney: true,
    },
    {
      title: 'Sin Mapear',
      value: stats.sinMapear,
      dataKey: 'sinMapear',
      icon: <WarningOutlined />,
      color: '#faad14',
    },
    {
      title: 'CPA promedio',
      value:
        cpaStats?.cpaPromedio != null && Number.isFinite(Number(cpaStats.cpaPromedio))
          ? Number(cpaStats.cpaPromedio)
          : cpaStats?.totalCpa || 0,
      dataKey: 'cpa_only',
      icon: <BarChartOutlined />,
      color: '#eb2f96',
      prefix: '$',
      isMoney: true,
      isCpa: true,
      tooltip:
        'Promedio del campo CPA por fila en el rango (como “CPA prom.” en CPA Resumen / Excel). El CPA ponderado (Σ gasto ÷ Σ ventas) suele ser menor; no se usa la suma de CPAs por fila.',
    },
  ];

  const axisMuted = 'rgba(255,255,255,0.12)';
  const axisLabel = 'rgba(255,255,255,0.72)';

  const isTotalVsDevoluciones = selectedMetric === 'total';

  const activeLineCard = cards.find((c) => c.dataKey === selectedMetric);
  const ordersLineColor = activeLineCard?.color ?? '#6366f1';
  const ordersLineData: Record<string, unknown>[] = isTotalVsDevoluciones
    ? (stats.daily ?? []).flatMap((row: Record<string, unknown>) => {
        const date = String(row.date ?? '');
        return [
          { date, series: 'Total Pedidos', value: Number(row.total ?? 0) },
          { date, series: 'Devoluciones', value: Number(row.devoluciones ?? 0) },
        ];
      })
    : (stats.daily ?? []).map((row: Record<string, unknown>) => ({
        ...row,
        series: activeLineCard?.title ?? 'Serie',
      }));
  const cpaLineData = (cpaStats?.dailyCpa ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    series: 'CPA',
  }));

  const ordersLineAxis = {
    x: {
      title: false,
      labelFill: axisLabel,
      lineStroke: axisMuted,
      tickStroke: axisMuted,
      labelFormatter: (d: string) =>
        dayjs(d, 'YYYY-MM-DD', true).isValid() ? dayjs(d).format('DD/MM') : String(d),
    },
    y: {
      title: false,
      labelFill: axisLabel,
      lineStroke: axisMuted,
      tickStroke: axisMuted,
      grid: true,
      gridStroke: 'rgba(255,255,255,0.08)',
      gridLineDash: [4, 4],
      labelFormatter: (d: number | string) => {
        const n = Number(d);
        if (Number.isNaN(n)) return String(d);
        if (isTotalVsDevoluciones) return n.toLocaleString();
        return activeLineCard?.isMoney ? `$${n.toLocaleString()}` : n.toLocaleString();
      },
    },
  };

  const cpaLineAxis = {
    x: {
      title: false,
      labelFill: axisLabel,
      lineStroke: axisMuted,
      tickStroke: axisMuted,
      labelFormatter: (d: string) =>
        dayjs(d, 'YYYY-MM-DD', true).isValid() ? dayjs(d).format('DD/MM') : String(d),
    },
    y: {
      title: false,
      labelFill: axisLabel,
      lineStroke: axisMuted,
      tickStroke: axisMuted,
      grid: true,
      gridStroke: 'rgba(255,255,255,0.08)',
      gridLineDash: [4, 4],
      labelFormatter: (d: number | string) => {
        const n = Number(d);
        if (Number.isNaN(n)) return String(d);
        return `$${n.toLocaleString()}`;
      },
    },
  };

  const lineLegend = {
    color: {
      position: 'top' as const,
      layout: { justifyContent: 'center' as const },
      itemLabelFill: 'rgba(255,255,255,0.88)',
      itemMarkerSize: 10,
    },
  };

  const lineLegendBottom = {
    color: {
      position: 'bottom' as const,
      layout: { justifyContent: 'center' as const },
      itemLabelFill: 'rgba(255,255,255,0.88)',
      itemMarkerSize: 10,
    },
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>📊 Dashboard</Title>
        <Space>
          <Text type="secondary">Filtrar por fecha:</Text>
          <RangePicker
            value={dateRange as [Dayjs, Dayjs]}
            onChange={(dates) => {
              if (dates) {
                setDateRange(dates as [Dayjs | null, Dayjs | null]);
              }
            }}
            format="DD/MM/YYYY"
            allowClear={false}
          />
        </Space>
      </div>
      <Row gutter={[16, 16]}>
        {cards.map((card) => (
          <Col xs={24} sm={12} md={8} lg={6} key={card.title}>
            <Card
              hoverable
              onClick={() => {
                if (!card.isCpa) {
                  setSelectedMetric(card.dataKey as keyof Stats);
                }
              }}
              style={{
                borderTop: `3px solid ${card.color}`,
                cursor: card.isCpa ? 'default' : 'pointer',
                border: (!card.isCpa && selectedMetric === card.dataKey) ? `2px solid ${card.color}` : `1px solid rgba(255,255,255,0.06)`,
                transform: (!card.isCpa && selectedMetric === card.dataKey) ? 'scale(1.02)' : 'none',
                transition: 'all 0.3s ease',
                background: (!card.isCpa && selectedMetric === card.dataKey) ? 'rgba(255,255,255,0.05)' : undefined
              }}
            >
              <Statistic
                title={
                  card.tooltip ? (
                    <span>
                      {card.title}{' '}
                      <Tooltip title={card.tooltip}>
                        <QuestionCircleOutlined style={{ opacity: 0.55, fontSize: 12, cursor: 'help' }} />
                      </Tooltip>
                    </span>
                  ) : (
                    card.title
                  )
                }
                value={card.value}
                prefix={card.icon}
                suffix={card.suffix}
                precision={card.isCpa ? undefined : card.isMoney ? 0 : undefined}
                formatter={(v) => {
                  const n = Number(v);
                  if (card.isCpa) {
                    if (!Number.isFinite(n)) return '—';
                    return new Intl.NumberFormat('es-CO', {
                      style: 'currency',
                      currency: 'COP',
                      maximumFractionDigits: 0,
                    }).format(n);
                  }
                  return card.isMoney
                    ? `$${Number(v).toLocaleString('es-CO')}`
                    : Number(v).toLocaleString('es-CO');
                }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {stats.daily && stats.daily.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <Card 
            title={
              isTotalVsDevoluciones
                ? 'Evolución Diaria: Total Pedidos vs Devoluciones'
                : `Evolución Diaria: ${cards.find((c) => c.dataKey === selectedMetric)?.title}`
            }
            style={{ background: '#141428', border: '1px solid rgba(255,255,255,0.06)' }}
            styles={{ header: { borderBottom: '1px solid rgba(255,255,255,0.06)' } }}
          >
            <Line
              key={isTotalVsDevoluciones ? 'evolucion-vs-devoluciones' : selectedMetric}
              height={380}
              data={ordersLineData}
              xField="date"
              yField={isTotalVsDevoluciones ? 'value' : (selectedMetric as string)}
              colorField="series"
              {...(isTotalVsDevoluciones
                ? {
                    scale: {
                      y: { nice: true },
                      color: {
                        domain: ['Total Pedidos', 'Devoluciones'],
                        range: ['#1890ff', '#ff4d4f'],
                      },
                    },
                  }
                : {
                    color: ordersLineColor,
                    scale: { y: { nice: true } },
                  })}
              axis={ordersLineAxis}
              legend={isTotalVsDevoluciones ? lineLegendBottom : lineLegend}
              line={{
                style: {
                  lineWidth: 2.5,
                },
              }}
              {...(isTotalVsDevoluciones
                ? {}
                : {
                    area: {
                      style: {
                        fill: `l(270) 0:${ordersLineColor} 1:transparent`,
                        fillOpacity: 0.22,
                      },
                    },
                  })}
              smooth
              point={{ size: 5, shape: 'circle', style: { lineWidth: 1, stroke: '#0d0d1a' } }}
              tooltip={
                isTotalVsDevoluciones
                  ? {
                      title: (d: { date?: string }) =>
                        d?.date && dayjs(d.date, 'YYYY-MM-DD', true).isValid()
                          ? dayjs(d.date).format('DD/MM/YYYY')
                          : String(d?.date ?? ''),
                    }
                  : {
                      title: (d: { date?: string }) =>
                        d?.date && dayjs(d.date, 'YYYY-MM-DD', true).isValid()
                          ? dayjs(d.date).format('DD/MM/YYYY')
                          : String(d?.date ?? ''),
                      items: [
                        {
                          channel: 'y',
                          name: activeLineCard?.title ?? 'Valor',
                          valueFormatter: (v: unknown) => {
                            const n = Number(v);
                            if (Number.isNaN(n)) return String(v ?? '');
                            return activeLineCard?.isMoney ? `$${n.toLocaleString()}` : n.toLocaleString();
                          },
                        },
                      ],
                    }
              }
            />
          </Card>
        </div>
      )}

      {cpaStats?.dailyCpa && cpaStats.dailyCpa.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <Card 
            title="Evolución Diaria: CPA" 
            style={{ background: '#141428', border: '1px solid rgba(255,255,255,0.06)' }}
            styles={{ header: { borderBottom: '1px solid rgba(255,255,255,0.06)' } }}
          >
            <Line
              height={360}
              data={cpaLineData}
              xField="date"
              yField="cpa"
              colorField="series"
              color="#eb2f96"
              scale={{ y: { nice: true } }}
              axis={cpaLineAxis}
              legend={lineLegend}
              line={{
                style: {
                  lineWidth: 2.5,
                },
              }}
              area={{
                style: {
                  fill: 'l(270) 0:#eb2f96 1:transparent',
                  fillOpacity: 0.22,
                },
              }}
              smooth
              point={{ size: 5, shape: 'circle', style: { lineWidth: 1, stroke: '#0d0d1a' } }}
              tooltip={{
                title: (d: { date?: string }) =>
                  d?.date && dayjs(d.date, 'YYYY-MM-DD', true).isValid()
                    ? dayjs(d.date).format('DD/MM/YYYY')
                    : String(d?.date ?? ''),
                items: [
                  {
                    channel: 'y',
                    name: 'CPA',
                    valueFormatter: (v: unknown) => {
                      const n = Number(v);
                      if (Number.isNaN(n)) return String(v ?? '');
                      return `$${n.toLocaleString()}`;
                    },
                  },
                ],
              }}
            />
          </Card>
        </div>
      )}

      <Divider style={{ borderColor: 'rgba(255,255,255,0.06)' }} />

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card 
            title="Distribución de Estados" 
            style={{ background: '#141428', border: '1px solid rgba(255,255,255,0.06)' }}
            styles={{ header: { borderBottom: '1px solid rgba(255,255,255,0.06)' } }}
          >
            <Pie
              data={[
                { type: 'Entregados', value: stats.entregados },
                { type: 'Devoluciones', value: stats.devoluciones },
                { type: 'En Proceso', value: stats.enProceso },
                { type: 'Sin Mapear', value: stats.sinMapear },
              ]}
              angleField="value"
              colorField="type"
              color={['#52c41a', '#ff4d4f', '#faad14', '#13c2c2']}
              radius={0.8}
              innerRadius={0.6}
              label={{
                text: 'value',
                style: {
                  fill: '#fff',
                  fontWeight: 'bold',
                },
              }}
              legend={{
                color: {
                  position: 'bottom',
                  layout: 'horizontal',
                }
              }}
            />
          </Card>
        </Col>
        
        <Col xs={24} md={12}>
          <Card 
            title="Resumen Financiero" 
            style={{ background: '#141428', border: '1px solid rgba(255,255,255,0.06)' }}
            styles={{ header: { borderBottom: '1px solid rgba(255,255,255,0.06)' } }}
          >
            <Column
              data={[
                { name: 'Ventas', value: stats.totalVentas },
                { name: 'Ganancia (Proyección)', value: stats.totalGanancia },
                { name: 'Cartera (Real)', value: stats.totalCartera },
              ]}
              xField="name"
              yField="value"
              colorField="name"
              color={['#13c2c2', '#722ed1', '#52c41a']}
              label={{
                text: (d: any) => `$${Number(d.value).toLocaleString()}`,
                position: 'top',
                style: {
                  fill: '#fff',
                  opacity: 0.8,
                },
              }}
              legend={false}
              tooltip={{
                name: 'Monto',
                valueFormatter: (v) => `$${Number(v).toLocaleString()}`,
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
