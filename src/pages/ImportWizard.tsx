import { useState } from 'react';
import {
  Upload,
  Button,
  Alert,
  Card,
  Typography,
  Row,
  Col,
  Input,
  Space,
  Modal,
  message,
} from 'antd';
import { InboxOutlined, CheckCircleOutlined, LoadingOutlined, DeleteOutlined } from '@ant-design/icons';
import { importFile, wipeImportedTables } from '../api';
import { useAuth } from '../contexts/AuthContext';
import type { AxiosError } from 'axios';

const { Dragger } = Upload;
const { Title, Text } = Typography;

interface StepResult {
  imported: number;
  errors: string[];
}

const IMPORT_STEPS = [
  {
    key: 'cartera',
    title: 'Cartera',
    endpoint: 'cartera' as const,
    description: 'Sube el archivo de cartera (HISTORIAL DE CARTERA)',
  },
  {
    key: 'productos',
    title: 'Productos',
    endpoint: 'productos' as const,
    description: 'Sube el archivo de productos exportado de Dropi',
  },
  {
    key: 'pedidos',
    title: 'Pedidos',
    endpoint: 'pedidos' as const,
    description: 'Sube el archivo de pedidos (se importa al final normalmente)',
  },
];

function wipeErrMsg(e: unknown): string {
  const ax = e as AxiosError<{ message?: string | string[] }>;
  const m = ax.response?.data?.message;
  if (m) return Array.isArray(m) ? m.join(', ') : m;
  if (e instanceof Error) return e.message;
  return 'Error desconocido';
}

export default function ImportWizard() {
  const { user } = useAuth();
  const [wipePassword, setWipePassword] = useState('');
  const [wipeLoading, setWipeLoading] = useState(false);

  const [results, setResults] = useState<Record<string, StepResult | null>>({
    cartera: null,
    productos: null,
    pedidos: null,
  });
  const [loading, setLoading] = useState<Record<string, boolean>>({
    cartera: false,
    productos: false,
    pedidos: false,
  });
  const [progress, setProgress] = useState<Record<string, number>>({
    cartera: 0,
    productos: 0,
    pedidos: 0,
  });

  const handleUpload = async (endpoint: string, file: File) => {
    setLoading((prev) => ({ ...prev, [endpoint]: true }));
    setProgress((prev) => ({ ...prev, [endpoint]: 0 }));
    setResults((prev) => ({ ...prev, [endpoint]: null }));

    try {
      const result = await importFile(endpoint as any, file, (p) => {
        setProgress((prev) => ({ ...prev, [endpoint]: p }));
      });
      setResults((prev) => ({ ...prev, [endpoint]: result }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setResults((prev) => ({ ...prev, [endpoint]: { imported: 0, errors: [msg] } }));
    } finally {
      setLoading((prev) => ({ ...prev, [endpoint]: false }));
    }

    return false; // Prevent default upload behavior
  };

  const openWipeConfirm = () => {
    const pwd = wipePassword.trim();
    if (!pwd) {
      message.warning('Escribe la contraseña de limpieza (IMPORT_WIPE_SECRET en el servidor).');
      return;
    }
    Modal.confirm({
      title: '¿Estás segurisimooo?',
      width: 480,
      content: (
        <div>
          <p style={{ marginBottom: 8 }}>
            Vas a <strong>eliminar todas las filas</strong> de:
          </p>
          <ul style={{ marginBottom: 12 }}>
            <li>
              <strong>pedidos</strong>
            </li>
            <li>
              <strong>productos_detalle</strong> (líneas de producto por pedido)
            </li>
            <li>
              <strong>cartera_movimientos</strong>
            </li>
          </ul>
          <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>
            No se borran: mapeo de estados, CPA, notas manuales ni usuarios. Esta acción no se puede
            deshacer.
          </Text>
        </div>
      ),
      okText: 'Sí, borrar todo',
      okType: 'danger',
      cancelText: 'Mejor no',
      onOk: async () => {
        setWipeLoading(true);
        try {
          const res = await wipeImportedTables(pwd);
          message.success(
            `Eliminado: ${res.deleted.pedidos} pedidos, ${res.deleted.productos_detalle} líneas de producto, ${res.deleted.cartera_movimientos} movimientos de cartera.`,
          );
          setWipePassword('');
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
      <Title level={3}>📥 Importar datos de Dropi (Modo Independiente)</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        Sube los archivos en cualquier orden. Esta versión permite cargar archivos grandes individualmente sin depender del paso anterior.
      </Text>

      <Row gutter={[16, 16]}>
        {IMPORT_STEPS.map((step) => {
          const isLoad = loading[step.endpoint];
          const currProg = progress[step.endpoint];
          const res = results[step.endpoint];

          return (
            <Col xs={24} md={8} key={step.key}>
              <Card title={step.title} style={{ height: '100%' }}>
                <Text style={{ display: 'block', marginBottom: 16 }}>
                  {step.description}
                </Text>

                {res ? (
                  <>
                    <Alert
                      type={res.errors.length > 0 ? 'warning' : 'success'}
                      icon={<CheckCircleOutlined />}
                      showIcon
                      message={`${res.imported} registros`}
                      description={
                        res.errors.length > 0
                          ? `${res.errors.length} errores detectados`
                          : 'Importación exitosa sin errores'
                      }
                      style={{ marginBottom: 16 }}
                    />
                    <Button
                      onClick={() =>
                        setResults((prev) => ({ ...prev, [step.endpoint]: null }))
                      }
                    >
                      Subir otro archivo
                    </Button>
                  </>
                ) : (
                  <Dragger
                    accept=".xlsx,.xls"
                    showUploadList={false}
                    beforeUpload={(file) => handleUpload(step.endpoint, file)}
                    disabled={isLoad}
                    style={{ padding: '20px 0' }}
                  >
                    <p className="ant-upload-drag-icon">
                      {isLoad ? <LoadingOutlined /> : <InboxOutlined />}
                    </p>
                    <p className="ant-upload-text">
                      {isLoad ? `Importando... ${currProg}%` : 'Haz clic o arrastra aquí'}
                    </p>
                    <p className="ant-upload-hint">Archivo .xlsx de Dropi</p>
                  </Dragger>
                )}
              </Card>
            </Col>
          );
        })}
      </Row>

      {user?.role === 'ADMIN' && (
        <Card
          title="Zona peligrosa"
          variant="borderless"
          style={{
            marginTop: 32,
            border: '1px solid rgba(239, 68, 68, 0.45)',
            background: 'rgba(239, 68, 68, 0.06)',
          }}
        >
          <Text type="danger" strong style={{ display: 'block', marginBottom: 12 }}>
            Limpiar tablas importadas
          </Text>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            Borra solo datos de Excel/Dropi: pedidos, detalle de productos y cartera. El servidor debe
            tener definida la variable <code>IMPORT_WIPE_SECRET</code>; aquí debes escribir{' '}
            <strong>exactamente</strong> esa misma contraseña.
          </Text>
          <Space wrap align="start" style={{ width: '100%' }}>
            <Input.Password
              placeholder="Contraseña obligatoria"
              value={wipePassword}
              onChange={(e) => setWipePassword(e.target.value)}
              style={{ maxWidth: 320 }}
              autoComplete="new-password"
            />
            <Button
              danger
              type="primary"
              icon={<DeleteOutlined />}
              loading={wipeLoading}
              disabled={!wipePassword.trim()}
              onClick={openWipeConfirm}
            >
              Borrar datos importados
            </Button>
          </Space>
        </Card>
      )}

      <div style={{ marginTop: '50px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          *Nota: El Wizard original secuencial está guardado en el código fuente para poder reactivarlo fácilmente en el futuro cuando se posea un servidor VPS propio.
        </Text>
      </div>
    </div>
  );
}

/* ==============================================================================
   CÓDIGO ORIGINAL DEL WIZARD (SECUENCIAL).
   Descomentar y exportar como default al adquirir VPS.
============================================================================== */
/*
import { Steps, Space, Result } from 'antd';
import { useCallback } from 'react';

export function ImportWizardLegacy() {
  const [currentStep, setCurrentStep] = useState(0);
  const [results, setResults] = useState<(StepResult | null)[]>(
    IMPORT_STEPS.map(() => null),
  );
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpload = useCallback(
    async (file: File) => {
      const step = IMPORT_STEPS[currentStep];
      setLoading(true);
      setProgress(0);

      try {
        const result = await importFile(step.endpoint as any, file, setProgress);
        const newResults = [...results];
        newResults[currentStep] = result;
        setResults(newResults);

        if (currentStep < IMPORT_STEPS.length - 1) {
          setTimeout(() => setCurrentStep(currentStep + 1), 1500);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        const newResults = [...results];
        newResults[currentStep] = { imported: 0, errors: [msg] };
        setResults(newResults);
      } finally {
        setLoading(false);
      }
      return false;
    },
    [currentStep, results],
  );

  const handleSkip = () => {
    setCurrentStep(currentStep + 1);
  };

  const handleReset = () => {
    setCurrentStep(0);
    setResults(IMPORT_STEPS.map(() => null));
    setLoading(false);
    setProgress(0);
  };

  const allDone = currentStep === IMPORT_STEPS.length - 1 && results[currentStep] !== null;

  return (
    <div>
      <Title level={3}>📥 Importar datos de Dropi</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        Los archivos se importan en orden: Cartera → Productos → Pedidos
      </Text>

      <Steps
        current={currentStep}
        items={IMPORT_STEPS.map((step, i) => ({
          title: step.title,
          description: results[i] ? `✅ ${results[i]!.imported} importados` : 'Requerido',
          icon: loading && i === currentStep ? <LoadingOutlined /> : undefined,
        }))}
        style={{ marginBottom: 32 }}
      />

      {allDone ? (
        <Result
          status="success"
          title="¡Importación completada!"
          extra={<Button type="primary" onClick={handleReset}>Nueva importación</Button>}
        >
          <div style={{ textAlign: 'left' }}>
            {IMPORT_STEPS.map((step, i) => (
              results[i] && (
                <div key={step.key} style={{ marginBottom: 8 }}>
                  <Text strong>{step.title}:</Text> <Text>{results[i]!.imported} registros</Text>
                  {results[i]!.errors.length > 0 && <Text type="warning"> ({results[i]!.errors.length} errores)</Text>}
                </div>
              )
            ))}
          </div>
        </Result>
      ) : (
        <Card
          title={<Space><span>{IMPORT_STEPS[currentStep].title}</span></Space>}
        >
          <Text style={{ display: 'block', marginBottom: 16 }}>{IMPORT_STEPS[currentStep].description}</Text>
          {results[currentStep] ? (
            <Alert
              type={results[currentStep]!.errors.length > 0 ? 'warning' : 'success'}
              showIcon
              message={`${results[currentStep]!.imported} importados`}
              description={results[currentStep]!.errors.length > 0 ? 'Errores encontrados' : 'Sin errores'}
              style={{ marginBottom: 16 }}
            />
          ) : (
            <Dragger accept=".xlsx,.xls" showUploadList={false} beforeUpload={handleUpload} disabled={loading} style={{ padding: '20px 0' }}>
              <p className="ant-upload-text">{loading ? `Importando... ${progress}%` : 'Haz clic o arrastra'}</p>
            </Dragger>
          )}
        </Card>
      )}
    </div>
  );
}
*/
