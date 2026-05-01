import { useEffect, useState } from 'react';
import { Button, Form, Input, Modal, Popconfirm, Space, Switch, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  assignAllDataToEmpresa,
  createEmpresa,
  deleteEmpresa,
  getEmpresas,
  isMasterAdminEmail,
  type Empresa,
  updateEmpresa,
} from '../api';
import { useAuth } from '../contexts/AuthContext';

const { Title } = Typography;

export default function EmpresasPage() {
  const { user } = useAuth();
  const masterUi = isMasterAdminEmail(user?.email);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Empresa | null>(null);
  const [form] = Form.useForm();

  const fetchEmpresas = async () => {
    setLoading(true);
    try {
      const data = await getEmpresas();
      setEmpresas(data);
    } catch {
      message.error('No fue posible cargar las empresas');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEmpresas();
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue({ is_active: true });
    setOpen(true);
  };

  const openEdit = (empresa: Empresa) => {
    setEditing(empresa);
    form.setFieldsValue(empresa);
    setOpen(true);
  };

  const save = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (editing) {
        await updateEmpresa(editing.id, values);
        message.success('Empresa actualizada');
      } else {
        await createEmpresa(values);
        message.success('Empresa creada');
      }
      setOpen(false);
      form.resetFields();
      fetchEmpresas();
    } catch (err: unknown) {
      const e = err as { errorFields?: unknown; response?: { data?: { message?: string | string[] } } };
      if (!e.errorFields) {
        const msg = e.response?.data?.message;
        message.error(Array.isArray(msg) ? String(msg[0]) : msg || 'No fue posible guardar la empresa');
      }
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<Empresa> = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: 'Nombre', dataIndex: 'nombre' },
    { title: 'Slug', dataIndex: 'slug', width: 220 },
    {
      title: 'Estado',
      dataIndex: 'is_active',
      width: 130,
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'ACTIVA' : 'INACTIVA'}</Tag>,
    },
    {
      title: 'Acciones',
      width: 360,
      render: (_, row) => (
        <Space>
          <Button size="small" onClick={() => openEdit(row)}>
            Editar
          </Button>
          {masterUi ? (
            <Popconfirm
              title="¿Asignar toda la data actual a esta empresa?"
              description="Esto moverá toda la data histórica a la empresa seleccionada."
              okText="Sí, asignar"
              cancelText="Cancelar"
              onConfirm={async () => {
                await assignAllDataToEmpresa(row.id);
                message.success('La data fue asignada a la empresa seleccionada');
                fetchEmpresas();
              }}
            >
              <Button size="small" type="default">
                Asignar data existente
              </Button>
            </Popconfirm>
          ) : null}
          <Popconfirm
            title="¿Eliminar empresa?"
            okText="Eliminar"
            okButtonProps={{ danger: true }}
            cancelText="Cancelar"
            onConfirm={async () => {
              await deleteEmpresa(row.id);
              message.success('Empresa eliminada');
              fetchEmpresas();
            }}
          >
            <Button size="small" danger>
              Eliminar
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Empresas</Title>
        <Button type="primary" onClick={openCreate}>
          Nueva empresa
        </Button>
      </div>

      <Table columns={columns} dataSource={empresas} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />

      <Modal
        title={editing ? 'Editar empresa' : 'Crear empresa'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={save}
        confirmLoading={saving}
        okText={editing ? 'Guardar' : 'Crear'}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true, message: 'Ingresa el nombre' }]}>
            <Input placeholder="Nombre de la empresa" />
          </Form.Item>
          <Form.Item name="slug" label="Slug" rules={[{ required: true, message: 'Ingresa el slug' }]}>
            <Input placeholder="jyd-tiendas-online" />
          </Form.Item>
          <Form.Item name="is_active" label="Activa" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
