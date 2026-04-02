import { useEffect, useLayoutEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Empty,
  Flex,
  Input,
  Space,
  Spin,
  Table,
  Typography,
} from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { TablePaginationConfig } from 'antd';
import type { SorterResult } from 'antd/es/table/interface';
import type { Dayjs } from 'dayjs';
import type { AxiosError } from 'axios';
import {
  getRentabilidadPorProducto,
  isRequestCanceled,
  type RentabilidadProductoRow,
} from '../api';
import { useDashboardNav } from '../contexts/DashboardNavContext';

const { RangePicker } = DatePicker;
const { Text, Title } = Typography;

export type RentabilidadSortBy =
  | 'producto'
  | 'entr'
  | 'tran'
  | 'dev'
  | 'pctEfectividad'
  | 'pctTransito'
  | 'pctDevolucion'
  | 'ventas'
  | 'pauta'
  | 'utilidad';

const cardSurface = {
  background: '#141428',
  border: '1px solid rgba(255,255,255,0.06)',
} as const;

function formatCop(n: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n);
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

export default function RentabilidadProductoPage() {
  const { setPage: goToMenuPage } = useDashboardNav();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<RentabilidadProductoRow[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(20);
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<RentabilidadSortBy>('utilidad');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const rangeKey =
    range?.[0] && range?.[1]
      ? `${range[0].valueOf()}-${range[1].valueOf()}`
      : 'all';

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useLayoutEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, rangeKey, sortBy, sortOrder]);

  useEffect(() => {
    const ac = new AbortController();
    let active = true;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const desde = range?.[0]?.startOf('day').toISOString();
        const hasta = range?.[1]?.endOf('day').toISOString();
        const res = await getRentabilidadPorProducto(
          {
            ...(desde && hasta ? { desde, hasta } : {}),
            page: currentPage,
            limit,
            sortBy,
            order: sortOrder,
            search: debouncedSearch || undefined,
          },
          { signal: ac.signal },
        );
        if (!active || ac.signal.aborted) return;
        setRows(res.data);
        setTotal(res.total);
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
  }, [currentPage, rangeKey, debouncedSearch, sortBy, sortOrder, limit, range]);

  const sortOrderForCol = (key: RentabilidadSortBy) =>
    sortBy === key ? (sortOrder === 'asc' ? ('ascend' as const) : ('descend' as const)) : undefined;

  const handleTableChange = (
    pagination: TablePaginationConfig,
    _filters: unknown,
    sorter: SorterResult<RentabilidadProductoRow> | SorterResult<RentabilidadProductoRow>[],
  ) => {
    if (pagination.current && pagination.current !== currentPage) {
      setCurrentPage(pagination.current);
    }
    if (!Array.isArray(sorter) && sorter.columnKey && sorter.order) {
      setSortBy(String(sorter.columnKey) as RentabilidadSortBy);
      setSortOrder(sorter.order === 'ascend' ? 'asc' : 'desc');
    }
  };

  const columns: ColumnsType<RentabilidadProductoRow> = [
    {
      title: 'PRODUCTO',
      dataIndex: 'producto',
      key: 'producto',
      ellipsis: true,
      sorter: true,
      sortOrder: sortOrderForCol('producto'),
      render: (v: string) => <Text strong>{v}</Text>,
      onHeaderCell: () => ({ style: { textAlign: 'left' } }),
      onCell: () => ({ style: { textAlign: 'left' } }),
    },
    {
      title: 'ENTR',
      dataIndex: 'entr',
      key: 'entr',
      sorter: true,
      sortOrder: sortOrderForCol('entr'),
      onHeaderCell: () => ({ style: { textAlign: 'right' } }),
      onCell: () => ({ style: { textAlign: 'right' } }),
    },
    {
      title: '% EFEC.',
      dataIndex: 'pctEfectividad',
      key: 'pctEfectividad',
      sorter: true,
      sortOrder: sortOrderForCol('pctEfectividad'),
      render: (v: number) => <Text style={{ color: '#10B981' }}>{v}%</Text>,
      onHeaderCell: () => ({ style: { textAlign: 'right' } }),
      onCell: () => ({ style: { textAlign: 'right' } }),
    },
    {
      title: 'TRÁN',
      dataIndex: 'tran',
      key: 'tran',
      sorter: true,
      sortOrder: sortOrderForCol('tran'),
      onHeaderCell: () => ({ style: { textAlign: 'right' } }),
      onCell: () => ({ style: { textAlign: 'right' } }),
    },
    {
      title: '% TRÁN.',
      dataIndex: 'pctTransito',
      key: 'pctTransito',
      sorter: true,
      sortOrder: sortOrderForCol('pctTransito'),
      render: (v: number) => <Text style={{ color: '#3B82F6' }}>{v}%</Text>,
      onHeaderCell: () => ({ style: { textAlign: 'right' } }),
      onCell: () => ({ style: { textAlign: 'right' } }),
    },
    {
      title: 'DEV',
      dataIndex: 'dev',
      key: 'dev',
      sorter: true,
      sortOrder: sortOrderForCol('dev'),
      onHeaderCell: () => ({ style: { textAlign: 'right' } }),
      onCell: () => ({ style: { textAlign: 'right' } }),
    },
    {
      title: '% DEV.',
      dataIndex: 'pctDevolucion',
      key: 'pctDevolucion',
      sorter: true,
      sortOrder: sortOrderForCol('pctDevolucion'),
      render: (v: number) => <Text style={{ color: '#EF4444' }}>{v}%</Text>,
      onHeaderCell: () => ({ style: { textAlign: 'right' } }),
      onCell: () => ({ style: { textAlign: 'right' } }),
    },
    {
      title: 'VENTAS',
      dataIndex: 'ventas',
      key: 'ventas',
      sorter: true,
      sortOrder: sortOrderForCol('ventas'),
      render: (v: number) => formatCop(v),
      onHeaderCell: () => ({ style: { textAlign: 'right' } }),
      onCell: () => ({ style: { textAlign: 'right' } }),
    },
    {
      title: 'PAUTA',
      dataIndex: 'pauta',
      key: 'pauta',
      sorter: true,
      sortOrder: sortOrderForCol('pauta'),
      render: (v: number) => (v > 0 ? formatCop(v) : '—'),
      onHeaderCell: () => ({ style: { textAlign: 'right' } }),
      onCell: () => ({ style: { textAlign: 'right' } }),
    },
    {
      title: 'UTILIDAD',
      dataIndex: 'utilidad',
      key: 'utilidad',
      sorter: true,
      sortOrder: sortOrderForCol('utilidad'),
      render: (v: number) => (
        <Text strong style={{ color: '#10B981' }}>
          {formatCop(v)}
        </Text>
      ),
      onHeaderCell: () => ({ style: { textAlign: 'right' } }),
      onCell: () => ({ style: { textAlign: 'right' } }),
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Title level={4} style={{ margin: 0 }}>
          <AppstoreOutlined style={{ marginRight: 8 }} />
          Rentabilidad por producto
        </Title>
        <Text type="secondary">Filtrado y ordenación vía API; pauta enlazada a CPA.</Text>
      </div>

      <Card size="small" style={cardSurface} styles={{ body: { padding: '12px 16px' } }}>
        <Space wrap align="center">
          <Text type="secondary">Rango de fechas (opcional):</Text>
          <RangePicker
            value={range}
            onChange={(v) => {
              setRange(v as [Dayjs | null, Dayjs | null] | null);
            }}
            allowEmpty={[true, true]}
            format="DD/MM/YYYY"
          />
          <Input.Search
            allowClear
            placeholder="Buscar producto"
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ width: 260 }}
          />
        </Space>
      </Card>

      {error && <Alert type="error" message={error} showIcon />}

      <Spin spinning={loading}>
        <Card
          style={cardSurface}
          styles={{ header: { borderBottom: '1px solid rgba(255,255,255,0.06)' } }}
          title={
            <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
              <Space>
                <AppstoreOutlined />
                <span>Rentabilidad por Producto</span>
              </Space>
              <Button
                type="default"
                size="small"
                onClick={() => goToMenuPage('cpa')}
                style={{
                  background: 'rgba(249, 115, 22, 0.15)',
                  borderColor: 'rgba(249, 115, 22, 0.45)',
                  color: '#fdba74',
                }}
              >
                DA CLIC PARA AÑADIR TU GASTO EN PAUTA
              </Button>
            </Flex>
          }
        >
          <Table<RentabilidadProductoRow>
            rowKey={(r) => `${r.producto}-${currentPage}-${r.utilidad}`}
            columns={columns}
            dataSource={rows}
            pagination={{
              current: currentPage,
              pageSize: limit,
              total,
              showSizeChanger: false,
            }}
            onChange={handleTableChange}
            size="middle"
            scroll={{ x: true }}
            showSorterTooltip
            locale={{
              emptyText: loading ? (
                <span />
              ) : (
                <Empty
                  description={
                    debouncedSearch
                      ? 'Sin resultados para la búsqueda'
                      : range?.[0] && range?.[1]
                        ? 'No hay productos con datos en este rango de fechas'
                        : 'No hay datos de productos para mostrar'
                  }
                />
              ),
            }}
          />
        </Card>
      </Spin>
    </Space>
  );
}
