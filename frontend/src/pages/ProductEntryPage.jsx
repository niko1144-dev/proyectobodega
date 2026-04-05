import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductForm from '../components/ProductForm';
import { useAuth } from '../hooks/useAuth';

function ProductEntryPage() {
  const { request, hasRole } = useAuth();
  const [dispatchGuides, setDispatchGuides] = useState([]);
  const [loadingGuides, setLoadingGuides] = useState(false);
  const [guidesError, setGuidesError] = useState('');
  const [productModels, setProductModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState('');
  const [creatingProduct, setCreatingProduct] = useState(false);

  const canManage = hasRole('ADMIN', 'MANAGER');

  const loadDispatchGuides = useCallback(async () => {
    setLoadingGuides(true);
    setGuidesError('');
    try {
      const guides = await request('/dispatch-guides');
      setDispatchGuides(guides);
    } catch (error) {
      setGuidesError(error.message || 'No se pudieron obtener las guías de despacho.');
      setDispatchGuides([]);
    } finally {
      setLoadingGuides(false);
    }
  }, [request]);

  const loadProductModels = useCallback(async () => {
    setLoadingModels(true);
    setModelsError('');
    try {
      const models = await request('/product-models');
      setProductModels(models);
    } catch (error) {
      setModelsError(error.message || 'No se pudieron obtener los modelos de producto.');
      setProductModels([]);
    } finally {
      setLoadingModels(false);
    }
  }, [request]);

  useEffect(() => {
    if (canManage) {
      loadDispatchGuides();
      loadProductModels();
    }
  }, [loadDispatchGuides, loadProductModels, canManage]);

  const handleCreateProduct = useCallback(
    async (payload) => {
      setCreatingProduct(true);
      try {
        await request('/products', {
          method: 'POST',
          data: payload,
        });
        window.alert('Producto registrado correctamente.');
        window.location.reload();
      } catch (error) {
        throw error;
      } finally {
        setCreatingProduct(false);
      }
    },
    [request]
  );

  if (!canManage) {
    return (
      <section className="dashboard-section">
        <div className="card">
          <h2>Ingresar producto</h2>
          <p className="muted">
            Solo los administradores o encargados pueden registrar nuevos productos.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-section">
      <div className="section-header">
        <div>
          <h2>Ingresar producto</h2>
          <p className="muted">
            Registra equipos nuevos y asócialos a la guía de despacho correspondiente.
          </p>
        </div>
        <div className="section-actions">
          <button
            type="button"
            className="secondary"
            onClick={loadDispatchGuides}
            disabled={loadingGuides}
          >
            {loadingGuides ? 'Actualizando...' : 'Actualizar guías'}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={loadProductModels}
            disabled={loadingModels}
          >
            {loadingModels ? 'Actualizando...' : 'Actualizar modelos'}
          </button>
        </div>
      </div>

      {guidesError && (
        <div className="card">
          <strong>Error:</strong> {guidesError}
        </div>
      )}

      {modelsError && (
        <div className="card">
          <strong>Error:</strong> {modelsError}
        </div>
      )}

      {productModels.length === 0 && !loadingModels && (
        <div className="card">
          <strong>Atención:</strong> Aún no hay modelos registrados. Visita el{' '}
          <Link to="/productos/catalogo">catálogo de productos</Link> para crear uno antes de continuar.
        </div>
      )}

      <ProductForm
        onSubmit={handleCreateProduct}
        dispatchGuides={dispatchGuides}
        isSubmitting={creatingProduct}
        productModels={productModels}
      />
    </section>
  );
}

export default ProductEntryPage;
