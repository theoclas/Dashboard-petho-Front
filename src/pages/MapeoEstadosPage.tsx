import { useState, useEffect } from 'react';
import {
  Table, Button, Modal, Form, Input, Space, Typography, message, Popconfirm, Tag, Upload
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { getMapeoEstados, createMapeoEstado, updateMapeoEstado, deleteMapeoEstado, importFile } from '../api';

const { Title } = Typography;

interface MapeoEstado {
  id: number;
  transportadora: string;
  estatus_original: string;
  ultimo_movimiento: string;
  estado_unificado: string;
}

export default function MapeoEstadosPage() {
  const [data, setData] = useState<MapeoEstado[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MapeoEstado | null>(null);
  const [form] = Form.useForm();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await getMapeoEstados();
      setData(Array.isArray(result) ? result : []);
    } catch {
      message.error('Error cargando mapeo de estados');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(data.length / pageSize) || 1);
    if (page > totalPages) setPage(totalPages);
  }, [data.length, pageSize, page]);

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (record: MapeoEstado) => {
    setEditingRecord(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMapeoEstado(id);
      message.success('Mapeo eliminado');
      fetchData();
    } catch {
      message.error('Error eliminando mapeo');
    }
  };

  const handleUpload = async (file: File) => {
    setLoading(true);
    try {
      const result = await importFile('mapeo-estados', file);
      message.success(`${result.imported} mapeos importados correctamente`);
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error al importar archivo');
    }
    setLoading(false);
    return false; // Prevent default upload
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingRecord) {
        await updateMapeoEstado(editingRecord.id, values);
        message.success('Mapeo actualizado');
      } else {
        await createMapeoEstado(values);
        message.success('Mapeo creado');
      }
      setModalOpen(false);
      fetchData();
    } catch {
      /* validation error */
    }
  };

  const columns = [
    {
      title: 'Transportadora',
      dataIndex: 'transportadora',
      width: 180,
    },
    {
      title: 'Estatus Original',
      dataIndex: 'estatus_original',
      width: 200,
    },
    {
      title: 'Último Movimiento',
      dataIndex: 'ultimo_movimiento',
      width: 200,
    },
    {
      title: 'Estado Unificado',
      dataIndex: 'estado_unificado',
      width: 150,
      render: (v: string) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: 'Acciones',
      width: 120,
      render: (_: unknown, record: MapeoEstado) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="¿Eliminar?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>🔧 Mapeo de Estados</Title>
        <Space>
          <Upload accept=".xlsx,.xls" showUploadList={false} beforeUpload={handleUpload}>
            <Button icon={<UploadOutlined />} loading={loading}>
              Importar Excel
            </Button>
          </Upload>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Agregar Mapeo
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        size="small"
        scroll={{ x: 'max-content' }}
        pagination={{
          current: page,
          pageSize,
          total: data.length,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100, 200, 800],
          showTotal: (t) => `Total: ${t.toLocaleString()}`,
        }}
        onChange={(pagination, _filters, _sorter, extra) => {
          if (extra?.action === 'paginate') {
            setPage(pagination.current ?? 1);
            setPageSize(pagination.pageSize ?? 50);
          }
        }}
      />

      <Modal
        title={editingRecord ? 'Editar Mapeo' : 'Nuevo Mapeo'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="transportadora" label="Transportadora">
            <Input placeholder="Ej: INTERRAPIDISIMO" />
          </Form.Item>
          <Form.Item name="estatus_original" label="Estatus Original" rules={[{ required: true }]}>
            <Input placeholder="Ej: admitida" />
          </Form.Item>
          <Form.Item name="ultimo_movimiento" label="Último Movimiento">
            <Input placeholder="(Opcional)" />
          </Form.Item>
          <Form.Item name="estado_unificado" label="Estado Unificado" rules={[{ required: true }]}>
            <Input placeholder="Ej: ENTREGADO, DEVOLUCION, OFICINA..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
