import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card,
  DatePicker,
  Space,
  Typography,
  Table,
  Spin,
  message,
  Select,
  Tooltip,
  Row,
  Col,
  Empty,
  Statistic,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { TableOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import {
  getCpaResumenDiario,
  getCpaDistinctProductos,
  type CpaResumenNode,
  type CpaResumenDiarioResponse,
} from '../api';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

function fmtMoney(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });
}

function fmtNum(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

type TreeRow = Omit<CpaResumenNode, 'children'> & {
  tableKey: string;
  children?: TreeRow[];
};

function withKeys(nodes: CpaResumenNode[], prefix = ''): TreeRow[] {
  return nodes.map((n, i) => {
    const tableKey = `${prefix}/${n.tipo}/${n.key}/${i}`;
    return {
      tipo: n.tipo,
      key: n.key,
      label: n.label,
      metrics: n.metrics,
      tableKey,
      children: n.children?.length ? withKeys(n.children, tableKey) : undefined,
    };
  });
}

const TIPO_LABEL: Record<string, string> = {
  mes: 'Mes',
  semana: 'Semana',
  dia: 'Día',
  cuenta: 'Cuenta',
  producto: 'Producto',
};

/** Valor interno del Select para “sin filtro de producto” (no coincide con nombres reales). */
const PRODUCTO_TODOS = '__ALL_PRODUCTOS__';

function colTitle(label: string, tip: string) {
  return (
    <span>
      {label}{' '}
      <Tooltip title={tip}>
        <QuestionCircleOutlined style={{ opacity: 0.5, fontSize: 12 }} />
      </Tooltip>
    </span>
  );
}

export default function CpaResumenDiarioPage() {
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  const [producto, setProducto] = useState<string>(PRODUCTO_TODOS);
  const [productos, setProductos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CpaResumenDiarioResponse | null>(null);

  useEffect(() => {
    getCpaDistinctProductos()
      .then((list) => {
        if (Array.isArray(list)) setProductos(list);
      })
      .catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    if (!dateRange[0] || !dateRange[1]) {
      message.warning('Seleccione un rango de fechas');
      return;
    }
    setLoading(true);
    try {
      const res = await getCpaResumenDiario({
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
        producto:
          producto === PRODUCTO_TODOS || !producto.trim()
            ? undefined
            : producto.trim(),
      });
      setData(res);
    } catch {
      message.error('No se pudo cargar el resumen CPA');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [dateRange, producto]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const treeData = useMemo(() => (data?.nodes?.length ? withKeys(data.nodes) : []), [data]);

  const columns: ColumnsType<TreeRow> = useMemo(
    () => [
      {
        title: 'Nivel',
        dataIndex: 'label',
        key: 'label',
        width: 300,
        fixed: 'left',
        render: (_: unknown, row) => (
          <span>
            <Text type="secondary" style={{ fontSize: 11, marginRight: 6 }}>
              {TIPO_LABEL[row.tipo] ?? row.tipo}
            </Text>
            <Text strong={row.tipo === 'mes' || row.tipo === 'semana'}>{row.label}</Text>
          </span>
        ),
      },
      {
        title: colTitle('Gasto pub.', 'Suma de gasto publicidad en el nodo y subniveles.'),
        key: 'gasto',
        align: 'right',
        width: 128,
        render: (_, r) => fmtMoney(r.metrics.sumGasto),
      },
      {
        title: colTitle('Conv.', 'Suma de conversaciones.'),
        key: 'conv',
        align: 'right',
        width: 88,
        render: (_, r) => fmtNum(r.metrics.sumConversaciones),
      },
      {
        title: colTitle('Ventas', 'Suma de ventas (unidades).'),
        key: 'ventas',
        align: 'right',
        width: 88,
        render: (_, r) => fmtNum(r.metrics.sumVentas),
      },
      {
        title: colTitle('Gan. (prom.)', 'Promedio de ganancia promedio por fila en el nodo.'),
        key: 'gan',
        align: 'right',
        width: 120,
        render: (_, r) => fmtMoney(r.metrics.avgGananciaPromedio),
      },
      {
        title: colTitle('CPA pond.', 'Σ gasto ÷ Σ ventas en el nodo.'),
        key: 'cpaP',
        align: 'right',
        width: 120,
        render: (_, r) => fmtMoney(r.metrics.cpaPonderado),
      },
      {
        title: colTitle('CPA prom.', 'Promedio del campo CPA por fila (similar a Excel pivot).'),
        key: 'cpaA',
        align: 'right',
        width: 120,
        render: (_, r) => fmtMoney(r.metrics.avgCpa),
      },
      {
        title: colTitle('Utilidad aprox.', 'Suma de utilidad aproximada.'),
        key: 'util',
        align: 'right',
        width: 128,
        render: (_, r) => fmtMoney(r.metrics.sumUtilidad),
      },
    ],
    [],
  );

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 16,
          alignItems: 'center',
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          <TableOutlined style={{ marginRight: 8 }} />
          CPA — Resumen diario
        </Title>
        <Space wrap>
          <RangePicker
            value={dateRange as [Dayjs, Dayjs]}
            onChange={(d) => {
              if (d) setDateRange(d as [Dayjs, Dayjs]);
            }}
            format="DD/MM/YYYY"
            allowClear={false}
          />
          <Select
            showSearch
            allowClear
            placeholder="Filtrar por producto"
            style={{ minWidth: 260 }}
            value={producto}
            onChange={(v) => setProducto(v ?? PRODUCTO_TODOS)}
            options={[
              { label: 'Todos los productos', value: PRODUCTO_TODOS },
              ...productos.map((p) => ({ label: p, value: p })),
            ]}
            filterOption={(input, opt) =>
              String(opt?.label ?? '')
                .toLowerCase()
                .includes(input.toLowerCase())
            }
          />
        </Space>
      </div>

      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Vista jerárquica Mes → Semana → Día → Cuenta → Producto. Expandir filas para ver el detalle.
      </Text>

      {loading && !data ? (
        <Spin size="large" style={{ display: 'block', margin: '48px auto' }} />
      ) : data ? (
        <>
          <Card
            style={{
              background: '#141428',
              border: '1px solid rgba(255,255,255,0.06)',
              marginBottom: 16,
            }}
            styles={{ body: { padding: '16px 24px' } }}
          >
            <Text strong style={{ display: 'block', marginBottom: 12 }}>
              Total del período
            </Text>
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={8} md={6}>
                <Statistic
                  title="Gasto publicidad"
                  value={data.total.sumGasto}
                  formatter={(v) => fmtMoney(Number(v))}
                  valueStyle={{ fontSize: 16 }}
                />
              </Col>
              <Col xs={12} sm={8} md={6}>
                <Statistic title="Ventas" value={data.total.sumVentas} valueStyle={{ fontSize: 16 }} />
              </Col>
              <Col xs={12} sm={8} md={6}>
                <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                  CPA ponderado
                </Text>
                <Text strong style={{ fontSize: 16 }}>
                  {data.total.cpaPonderado != null ? fmtMoney(data.total.cpaPonderado) : '—'}
                </Text>
              </Col>
              <Col xs={12} sm={8} md={6}>
                <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                  CPA promedio
                </Text>
                <Text strong style={{ fontSize: 16 }}>
                  {data.total.avgCpa != null ? fmtMoney(data.total.avgCpa) : '—'}
                </Text>
              </Col>
            </Row>
          </Card>

          <Card
            style={{ background: '#141428', border: '1px solid rgba(255,255,255,0.06)' }}
            styles={{ body: { padding: 0 } }}
          >
            {treeData.length === 0 ? (
              <Empty
                description="Sin datos CPA en el rango seleccionado"
                style={{ padding: 48 }}
              />
            ) : (
              <Table<TreeRow>
                rowKey="tableKey"
                columns={columns}
                dataSource={treeData}
                pagination={false}
                loading={loading}
                scroll={{ x: 1280 }}
                size="small"
                expandable={{ defaultExpandAllRows: false }}
              />
            )}
          </Card>
        </>
      ) : (
        <Empty description="Sin datos" />
      )}
    </div>
  );
}
