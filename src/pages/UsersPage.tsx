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
import { ReloadOutlined, UserAddOutlined, DeleteOutlined, ApartmentOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api, {
  assignEmpresaToUser,
  getEmpresas,
  getUserEmpresaAssignments,
  isMasterAdminEmail,
  removeUserEmpresa,
  type Empresa,
  type UserEmpresaAssignment,
} from '../api';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;
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
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignUser, setAssignUser] = useState<User | null>(null);
  const [assignments, setAssignments] = useState<UserEmpresaAssignment[]>([]);
  const [empresasPick, setEmpresasPick] = useState<Empresa[]>([]);
  const [assignEmpresaId, setAssignEmpresaId] = useState<number | undefined>();
  const [assignLoading, setAssignLoading] = useState(false);
  const masterUi = isMasterAdminEmail(currentUser?.email);

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

  const loadAssignData = async (userId: number) => {
    setAssignLoading(true);
    try {
      const [rows, emps] = await Promise.all([getUserEmpresaAssignments(userId), getEmpresas()]);
      setAssignments(rows);
      setEmpresasPick(emps.filter((e) => e.is_active));
      const available = emps.filter(
        (e) => e.is_active && !rows.some((r) => r.empresa_id === e.id && r.is_active),
      );
      setAssignEmpresaId(available[0]?.id);
    } catch {
      message.error('No fue posible cargar empresas del usuario');
    }
    setAssignLoading(false);
  };

  const openAssignModal = (u: User) => {
    setAssignUser(u);
    setAssignOpen(true);
    void loadAssignData(u.id);
  };

  const closeAssignModal = () => {
    setAssignOpen(false);
    setAssignUser(null);
    setAssignments([]);
    setEmpresasPick([]);
    setAssignEmpresaId(undefined);
  };

  const handleAddEmpresa = async () => {
    if (!assignUser || !assignEmpresaId) return;
    try {
      await assignEmpresaToUser(assignUser.id, assignEmpresaId);
      message.success('Empresa asignada');
      await loadAssignData(assignUser.id);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message;
      message.error(Array.isArray(msg) ? String(msg[0]) : msg || 'No fue posible asignar la empresa');
    }
  };

  const handleRemoveEmpresa = async (empresaId: number) => {
    if (!assignUser) return;
    try {
      await removeUserEmpresa(assignUser.id, empresaId);
      message.success('Empresa desvinculada');
      await loadAssignData(assignUser.id);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message;
      message.error(Array.isArray(msg) ? String(msg[0]) : msg || 'No fue posible quitar la empresa');
    }
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
      message.success(
        masterUi
          ? 'Usuario creado. Asígnale al menos una empresa para que pueda iniciar sesión.'
          : 'Usuario creado. El administrador principal debe asignarle empresas para que pueda iniciar sesión.',
      );
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
            {masterUi && (
              <Button size="small" icon={<ApartmentOutlined />} onClick={() => openAssignModal(record)}>
                Empresas
              </Button>
            )}
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
      {currentUser?.role === 'ADMIN' && !masterUi && (
        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          La asignación de empresas a cada usuario la realiza únicamente el administrador principal (correo
          configurado en el sistema).
        </Text>
      )}
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

      <Modal
        title={assignUser ? `Empresas — ${assignUser.username}` : 'Empresas'}
        open={assignOpen}
        onCancel={closeAssignModal}
        footer={null}
        width={560}
        destroyOnClose
      >
        <Table<UserEmpresaAssignment>
          size="small"
          loading={assignLoading}
          rowKey="empresa_id"
          pagination={false}
          dataSource={assignments}
          columns={[
            { title: 'Empresa', dataIndex: 'nombre' },
            {
              title: 'Estado',
              width: 110,
              dataIndex: 'is_active',
              render: (v: boolean) => (
                <Tag color={v ? 'green' : 'default'}>{v ? 'Activa' : 'Inactiva'}</Tag>
              ),
            },
            {
              title: '',
              width: 100,
              render: (_, row) =>
                row.is_active ? (
                  <Popconfirm
                    title="¿Quitar esta empresa al usuario?"
                    okText="Quitar"
                    cancelText="Cancelar"
                    onConfirm={() => handleRemoveEmpresa(row.empresa_id)}
                  >
                    <Button size="small" danger type="link">
                      Quitar
                    </Button>
                  </Popconfirm>
                ) : null,
            },
          ]}
        />
        <Space style={{ marginTop: 16 }} wrap>
          <Select
            placeholder="Empresa a asignar"
            style={{ minWidth: 220 }}
            value={assignEmpresaId}
            onChange={setAssignEmpresaId}
            options={empresasPick
              .filter((e) => !assignments.some((a) => a.empresa_id === e.id && a.is_active))
              .map((e) => ({ label: e.nombre, value: e.id }))}
          />
          <Button type="primary" onClick={handleAddEmpresa} disabled={!assignEmpresaId}>
            Agregar
          </Button>
        </Space>
      </Modal>
    </div>
  );
}
