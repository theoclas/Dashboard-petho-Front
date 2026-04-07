import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Typography,
  Select,
  Tag,
  message,
  Popconfirm,
  Modal,
  Form,
  Input,
  Switch,
  Space,
} from 'antd';
import { ReloadOutlined, UserAddOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';

const { Title } = Typography;
const { Option } = Select;

interface User {
  id: number;
  email: string;
  username: string;
  role: 'ADMIN' | 'OPERADOR' | 'LECTOR';
  is_active: boolean;
  created_at: string;
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [form] = Form.useForm();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } catch {
      message.error('Error al cargar la lista de usuarios');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateUser = async (id: number, payload: { role?: string; is_active?: boolean }) => {
    try {
      await api.patch(`/users/${id}`, payload);
      message.success('Usuario actualizado');
      fetchUsers();
    } catch {
      message.error('Error al actualizar usuario');
    }
  };

  const handleDeleteUser = async (id: number) => {
    try {
      await api.delete(`/users/${id}`);
      message.success('Usuario eliminado');
      fetchUsers();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message;
      message.error(Array.isArray(msg) ? String(msg[0]) : msg || 'Error al eliminar usuario');
    }
  };

  const openCreateModal = () => {
    form.setFieldsValue({
      role: 'LECTOR',
      is_active: true,
    });
    setCreateOpen(true);
  };

  const closeCreateModal = () => {
    setCreateOpen(false);
    form.resetFields();
  };

  const handleCreateUser = async () => {
    try {
      const values = await form.validateFields();
      setCreateLoading(true);
      await api.post('/users', {
        email: values.email.trim(),
        username: values.username.trim(),
        password: values.password,
        role: values.role,
        is_active: values.is_active,
      });
      message.success('Usuario creado');
      closeCreateModal();
      fetchUsers();
    } catch (err: unknown) {
      const e = err as { errorFields?: unknown; response?: { data?: { message?: string | string[] } } };
      if (e.errorFields) return;
      const msg = e.response?.data?.message;
      message.error(Array.isArray(msg) ? String(msg[0]) : msg || 'Error al crear usuario');
    } finally {
      setCreateLoading(false);
    }
  };

  const columns: ColumnsType<User> = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: 'Usuario', dataIndex: 'username', width: 150 },
    { title: 'Email', dataIndex: 'email', width: 220 },
    {
      title: 'Fecha Registro',
      dataIndex: 'created_at',
      width: 150,
      render: (v: string) => new Date(v).toLocaleDateString(),
    },
    {
      title: 'Rol',
      dataIndex: 'role',
      width: 150,
      render: (v: string, record: User) => (
        <Select
          value={v}
          style={{ width: 120 }}
          onChange={(newRole) => handleUpdateUser(record.id, { role: newRole })}
        >
          <Option value="ADMIN">Admin</Option>
          <Option value="OPERADOR">Operador</Option>
          <Option value="LECTOR">Lector</Option>
        </Select>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'is_active',
      width: 120,
      align: 'center',
      render: (v: boolean) => (
        <Tag color={v ? 'green' : 'red'}>{v ? 'ACTIVO' : 'INACTIVO'}</Tag>
      ),
    },
    {
      title: 'Acciones',
      width: 220,
      render: (_, record: User) => {
        const isSelf = currentUser?.id === record.id;
        const adminCount = users.filter((u) => u.role === 'ADMIN').length;
        const disableDelete = isSelf || (record.role === 'ADMIN' && adminCount <= 1);
        const deleteTitle = isSelf
          ? 'No puedes eliminar tu propio usuario'
          : record.role === 'ADMIN' && adminCount <= 1
            ? 'Debe existir al menos un administrador'
            : undefined;
        return (
          <Space size="small" wrap>
            <Popconfirm
              title={`¿${record.is_active ? 'Desactivar' : 'Activar'} este usuario?`}
              onConfirm={() => handleUpdateUser(record.id, { is_active: !record.is_active })}
              okText="Sí"
              cancelText="No"
            >
              <Button
                size="small"
                danger={record.is_active}
                type={record.is_active ? 'default' : 'primary'}
              >
                {record.is_active ? 'Desactivar' : 'Activar'}
              </Button>
            </Popconfirm>
            {disableDelete ? (
              <Button size="small" danger type="default" icon={<DeleteOutlined />} disabled title={deleteTitle}>
                Eliminar
              </Button>
            ) : (
              <Popconfirm
                title="¿Eliminar este usuario?"
                description="No podrá iniciar sesión. Los datos quedan marcados como eliminados en el sistema."
                onConfirm={() => handleDeleteUser(record.id)}
                okText="Eliminar"
                okButtonProps={{ danger: true }}
                cancelText="Cancelar"
              >
                <Button size="small" danger type="default" icon={<DeleteOutlined />}>
                  Eliminar
                </Button>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>👥 Administración de Usuarios</Title>
        <Space>
          <Button type="primary" icon={<UserAddOutlined />} onClick={openCreateModal}>
            Nuevo usuario
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchUsers}>
            Recargar
          </Button>
        </Space>
      </div>
      <Table<User>
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 20 }}
      />

      <Modal
        title="Crear usuario"
        open={createOpen}
        onOk={handleCreateUser}
        onCancel={closeCreateModal}
        confirmLoading={createLoading}
        okText="Crear"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item
            name="username"
            label="Usuario"
            rules={[{ required: true, message: 'Ingresa el nombre de usuario' }]}
          >
            <Input placeholder="Nombre de usuario" autoComplete="off" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Correo"
            rules={[
              { required: true, message: 'Ingresa el correo' },
              { type: 'email', message: 'Correo inválido' },
            ]}
          >
            <Input placeholder="correo@ejemplo.com" autoComplete="off" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Contraseña"
            rules={[
              { required: true, message: 'Ingresa la contraseña' },
              { min: 6, message: 'Mínimo 6 caracteres' },
            ]}
          >
            <Input.Password placeholder="Mínimo 6 caracteres" autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="password2"
            label="Confirmar contraseña"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Confirma la contraseña' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Las contraseñas no coinciden'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Repite la contraseña" autoComplete="new-password" />
          </Form.Item>
          <Form.Item name="role" label="Rol" rules={[{ required: true }]}>
            <Select placeholder="Rol">
              <Option value="LECTOR">Lector</Option>
              <Option value="OPERADOR">Operador</Option>
              <Option value="ADMIN">Administrador</Option>
            </Select>
          </Form.Item>
          <Form.Item name="is_active" label="Cuenta activa" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
