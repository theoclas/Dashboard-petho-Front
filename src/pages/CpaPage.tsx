import { useState, useEffect, useCallback } from 'react';
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
  AutoComplete,
  Select,
  Progress,
  Tooltip,
} from 'antd';
import type { TableProps } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { getCpas, createCpa, updateCpa, deleteCpa, importFile, getUniqueProductNames, getCpaDistinctProductos } from '../api';
import dayjs from 'dayjs';

const { Title, Paragraph } = Typography;

interface CpaRecord {
  id: number;
  semana: string;
  fecha: string;
  producto: string;
  cuenta_publicitaria: string;
  gasto_publicidad: number;
  conversaciones: number;
  total_facturado: number;
  ganancia_promedio: number;
  ventas: number;
  ticket_promedio_producto: number;
  cpa: number;
  conversion_rate: number;
  costo_publicitario: number;
  rentabilidad: number;
  utilidad_aproximada: number;
}

export default function CpaPage() {
  const [data, setData] = useState<CpaRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CpaRecord | null>(null);
  const [uniqueProducts, setUniqueProducts] = useState<{ value: string }[]>([]);
  const [cpaProductos, setCpaProductos] = useState<string[]>([]);
  const [productoFilter, setProductoFilter] = useState('');
  const [sortField, setSortField] = useState<string>('fecha');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [form] = Form.useForm();
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [errorsModalOpen, setErrorsModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { sortField, sortOrder };
      if (productoFilter.trim()) params.producto = productoFilter.trim();
      const result = await getCpas(params);
      setData(Array.isArray(result) ? result : []);
    } catch {
      message.error('Error cargando datos de CPA');
    }
    setLoading(false);
  }, [productoFilter, sortField, sortOrder]);

  const fetchProducts = async () => {
    try {
      const result = await getUniqueProductNames();
      if (Array.isArray(result)) {
        setUniqueProducts(result.map((name: string) => ({ value: name })));
      }
    } catch {
      // Ignorar error de productos por ahora
    }
  };

  const fetchCpaProductos = async () => {
    try {
      const list = await getCpaDistinctProductos();
      if (Array.isArray(list)) setCpaProductos(list);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchProducts();
    fetchCpaProductos();
  }, []);

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (record: CpaRecord) => {
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
      fecha: record.fecha ? dayjs(record.fecha) : null,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteCpa(id);
      message.success('Registro eliminado');
      await fetchData();
      await fetchCpaProductos();
    } catch {
      message.error('Error eliminando registro');
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        fecha: values.fecha ? values.fecha.toISOString() : null,
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
      await fetchCpaProductos();
    } catch {
      /* validation error */
    }
  };

  const sortOrderFor = (field: string) =>
    sortField === field ? (sortOrder === 'ASC' ? ('ascend' as const) : ('descend' as const)) : undefined;

  const columns: TableProps<CpaRecord>['columns'] = [
    {
      title: 'Semana',
      dataIndex: 'semana',
      key: 'semana',
      width: 100,
      sorter: true,
      sortOrder: sortOrderFor('semana'),
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 120,
      sorter: true,
      sortOrder: sortOrderFor('fecha'),
      render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Producto',
      dataIndex: 'producto',
      key: 'producto',
      width: 200,
      ellipsis: true,
      sorter: true,
      sortOrder: sortOrderFor('producto'),
    },
    {
      title: 'Cuenta',
      dataIndex: 'cuenta_publicitaria',
      key: 'cuenta_publicitaria',
      width: 150,
      ellipsis: true,
      sorter: true,
      sortOrder: sortOrderFor('cuenta_publicitaria'),
    },
    {
      title: 'Gasto Pub.',
      dataIndex: 'gasto_publicidad',
      key: 'gasto_publicidad',
      width: 120,
      sorter: true,
      sortOrder: sortOrderFor('gasto_publicidad'),
      render: (v: number) => v?.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }),
    },
    {
      title: 'Ventas',
      dataIndex: 'ventas',
      key: 'ventas',
      width: 80,
      sorter: true,
      sortOrder: sortOrderFor('ventas'),
    },
    {
      title: 'CPA',
      dataIndex: 'cpa',
      key: 'cpa',
      width: 100,
      sorter: true,
      sortOrder: sortOrderFor('cpa'),
      render: (v: number) => v?.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }),
    },
    {
      title: 'Utilidad Aprox.',
      dataIndex: 'utilidad_aproximada',
      key: 'utilidad_aproximada',
      width: 130,
      sorter: true,
      sortOrder: sortOrderFor('utilidad_aproximada'),
      render: (v: number) => (
        <span style={{ color: v >= 0 ? 'green' : 'red', fontWeight: 'bold' }}>
          {v?.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
        </span>
      ),
    },
    {
      title: 'Acciones',
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
      await fetchCpaProductos();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } }; message?: string };
      message.error(ax.response?.data?.message ?? ax.message ?? 'Error al importar');
    } finally {
      setImporting(false);
      setImportProgress(0);
    }
    return false;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>📊 Gestión de CPA</Title>
        <Space wrap align="center">
          <Select
            showSearch
            allowClear
            placeholder="Filtrar por producto"
            style={{ minWidth: 260 }}
            value={productoFilter || undefined}
            onChange={(v) => setProductoFilter(v ?? '')}
            options={cpaProductos.map((p) => ({ label: p, value: p }))}
            filterOption={(input, opt) =>
              String(opt?.label ?? '')
                .toLowerCase()
                .includes(input.toLowerCase())
            }
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
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Nuevo Registro
          </Button>
        </Space>
      </div>

      <Table<CpaRecord>
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        size="small"
        scroll={{ x: 1200 }}
        pagination={{ pageSize: 20, showSizeChanger: true }}
        onChange={(_pagination, _filters, sorter) => {
          if (Array.isArray(sorter)) return;
          const colKey = (sorter.columnKey ?? sorter.field) as string | undefined;
          if (colKey && sorter.order) {
            setSortField(colKey);
            setSortOrder(sorter.order === 'ascend' ? 'ASC' : 'DESC');
          } else {
            setSortField('fecha');
            setSortOrder('DESC');
          }
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
              <Form.Item name="producto" label="Producto" rules={[{ required: true }]}>
                <AutoComplete
                  options={uniqueProducts}
                  placeholder="Nombre del producto"
                  filterOption={(inputValue, option) =>
                    option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                  }
                />
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
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="ticket_promedio_producto" label="Ticket Promedio Producto">
                <InputNumber style={{ width: '100%' }} formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
              </Form.Item>
              <Form.Item name="cpa" label="CPA">
                <InputNumber style={{ width: '100%' }} formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
              </Form.Item>
              <Form.Item name="conversion_rate" label="Conversion Rate">
                <InputNumber style={{ width: '100%' }} step={0.01} precision={4} />
              </Form.Item>
              <Form.Item name="costo_publicitario" label="Costo Publicitario">
                <InputNumber style={{ width: '100%' }} formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
              </Form.Item>
              <Form.Item name="rentabilidad" label="Rentabilidad">
                <InputNumber style={{ width: '100%' }} step={0.1} precision={2} />
              </Form.Item>
              <Form.Item name="utilidad_aproximada" label="Utilidad Aproximada">
                <InputNumber style={{ width: '100%' }} formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
              </Form.Item>
            </div>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
