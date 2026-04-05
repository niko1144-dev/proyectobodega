import { useCallback, useEffect, useMemo, useState } from 'react';
import ProductTable from '../components/ProductTable';
import ProductAssignmentPanel from '../components/ProductAssignmentPanel';
import AssignmentHistory from '../components/AssignmentHistory';
import { useAuth } from '../hooks/useAuth';
import { filterProductsBySearch, normalizeSearchTerm } from '../utils/search';

function AssignmentsPage() {
  const { request, hasRole } = useAuth();
  const [products, setProducts] = useState([]);
  const [productsError, setProductsError] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [assignmentHistory, setAssignmentHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [assignmentProcessing, setAssignmentProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const canManage = hasRole('ADMIN', 'MANAGER');

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    setProductsError('');
    try {
      const data = await request('/products?status=AVAILABLE,ASSIGNED');
      setProducts(data);
      setSelectedProductId((current) => {
        if (!data.length) {
          return null;
        }
        if (current && data.some((item) => item._id === current)) {
          return current;
        }
        return data[0]._id;
      });
    } catch (error) {
      setProductsError(error.message || 'No se pudo obtener el inventario disponible.');
    } finally {
      setLoadingProducts(false);
    }
  }, [request]);

  const loadAssignmentHistory = useCallback(
    async (productId) => {
      if (!productId) {
        setAssignmentHistory([]);
        return;
      }
      setHistoryLoading(true);
      try {
        const history = await request(`/products/${productId}/assignments`);
        setAssignmentHistory(Array.isArray(history) ? history : []);
      } catch (error) {
        console.error('No se pudo cargar el historial de asignaciones.', error);
      } finally {
        setHistoryLoading(false);
      }
    },
    [request]
  );

  useEffect(() => {
    if (canManage) {
      loadProducts();
    }
  }, [loadProducts, canManage]);

  useEffect(() => {
    if (selectedProductId && canManage) {
      loadAssignmentHistory(selectedProductId);
    } else {
      setAssignmentHistory([]);
    }
  }, [selectedProductId, loadAssignmentHistory, canManage]);

  const normalizedSearch = useMemo(() => normalizeSearchTerm(searchTerm), [searchTerm]);

  const filteredProducts = useMemo(
    () => filterProductsBySearch(products, searchTerm),
    [products, searchTerm]
  );

  useEffect(() => {
    setSelectedProductId((current) => {
      if (!filteredProducts.length) {
        return null;
      }
      if (current && filteredProducts.some((item) => item._id === current)) {
        return current;
      }
      return filteredProducts[0]._id;
    });
  }, [filteredProducts]);

  const selectedProduct = useMemo(
    () => products.find((product) => product._id === selectedProductId) || null,
    [products, selectedProductId]
  );

  const handleSearchChange = useCallback((event) => {
    setSearchTerm(event.target.value);
  }, []);

  const handleAssignProduct = useCallback(
    async (payload) => {
      if (!selectedProductId) {
        return;
      }
      const targetId = selectedProductId;
      setAssignmentProcessing(true);
      try {
        const response = await request(`/products/${targetId}/assign`, {
          method: 'POST',
          data: payload,
        });
        const updatedProduct = response?.product;
        const newAssignment = response?.assignment;

        if (updatedProduct?._id) {
          setProducts((current) => {
            const exists = current.some((item) => item._id === updatedProduct._id);
            if (exists) {
              return current.map((item) => (item._id === updatedProduct._id ? updatedProduct : item));
            }
            return [...current, updatedProduct];
          });
          setSelectedProductId(updatedProduct._id);
        } else {
          setSelectedProductId(targetId);
        }

        if (newAssignment?._id) {
          setAssignmentHistory((current) => {
            const exists = current.some((item) => item._id === newAssignment._id);
            if (exists) {
              return current.map((item) => (item._id === newAssignment._id ? newAssignment : item));
            }
            return [newAssignment, ...current];
          });
        }

        await loadProducts();
        await loadAssignmentHistory(updatedProduct?._id || targetId);
        window.alert('Producto asignado correctamente.');
      } finally {
        setAssignmentProcessing(false);
      }
    },
    [request, selectedProductId, loadProducts, loadAssignmentHistory]
  );

  const handleUnassignProduct = useCallback(
    async (payload) => {
      if (!selectedProductId) {
        return;
      }
      const targetId = selectedProductId;
      setAssignmentProcessing(true);
      try {
        const response = await request(`/products/${targetId}/unassign`, {
          method: 'POST',
          data: payload,
        });
        const updatedProduct = response?.product;
        const newAssignment = response?.assignment;

        if (updatedProduct?._id) {
          setProducts((current) => {
            const exists = current.some((item) => item._id === updatedProduct._id);
            if (exists) {
              return current.map((item) => (item._id === updatedProduct._id ? updatedProduct : item));
            }
            return [...current, updatedProduct];
          });
          setSelectedProductId(updatedProduct._id);
        } else {
          setSelectedProductId(targetId);
        }

        if (newAssignment?._id) {
          setAssignmentHistory((current) => {
            const exists = current.some((item) => item._id === newAssignment._id);
            if (exists) {
              return current.map((item) => (item._id === newAssignment._id ? newAssignment : item));
            }
            return [newAssignment, ...current];
          });
        }

        await loadProducts();
        await loadAssignmentHistory(updatedProduct?._id || targetId);
        window.alert('Producto liberado correctamente.');
      } finally {
        setAssignmentProcessing(false);
      }
    },
    [request, selectedProductId, loadProducts, loadAssignmentHistory]
  );

  if (!canManage) {
    return (
      <section className="dashboard-section">
        <div className="card">
          <h2>Asignaciones</h2>
          <p className="muted">
            Debes tener permisos de administrador o encargado para gestionar asignaciones.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-section">
      <div className="section-header">
        <div>
          <h2>Asignaciones</h2>
          <p className="muted">Gestiona la entrega y liberación de equipos.</p>
        </div>
        <div className="section-actions">
          <label className="inline-filter">
            Buscar
            <input
              type="search"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Nombre, serie, ubicación..."
            />
          </label>
          <button
            type="button"
            className="secondary"
            onClick={loadProducts}
            disabled={loadingProducts}
          >
            {loadingProducts ? 'Actualizando...' : 'Actualizar listado'}
          </button>
        </div>
      </div>

      {productsError && (
        <div className="card">
          <strong>Error:</strong> {productsError}
        </div>
      )}

      <div className="dashboard-grid">
        <ProductTable
          products={filteredProducts}
          onSelect={setSelectedProductId}
          selectedProductId={selectedProductId}
          isFiltered={Boolean(normalizedSearch)}
        />
        <div className="stack">
          <ProductAssignmentPanel
            product={selectedProduct}
            onAssign={handleAssignProduct}
            onUnassign={handleUnassignProduct}
            isProcessing={assignmentProcessing}
            canManage={canManage}
          />
          <AssignmentHistory history={assignmentHistory} loading={historyLoading} />
        </div>
      </div>
    </section>
  );
}

export default AssignmentsPage;
