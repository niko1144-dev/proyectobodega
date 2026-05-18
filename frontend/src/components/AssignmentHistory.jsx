function AssignmentHistory({ history, loading }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3>Historial de asignaciones</h3>
      </div>
      <div className="table-responsive">
        <table className="data-table compact">
          <thead>
            <tr>
              <th>Acción</th>
              <th>Usuario asignado</th>
              <th>Correo electrónico</th>
              <th>Ubicación</th>
              <th>Fecha</th>
              <th>Registrado por</th>
              <th>Notas</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="muted">
                  Cargando movimientos...
                </td>
              </tr>
            )}
            {!loading && history.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">
                  No hay movimientos registrados.
                </td>
              </tr>
            )}
            {history.map((item) => (
              <tr key={item._id}>
                <td data-label="Acción">
                  <span className={item.action === 'ASSIGN' ? 'status info' : 'status warning'}>
                    {item.action === 'ASSIGN' ? 'Asignación' : 'Liberación'}
                  </span>
                </td>
                <td data-label="Usuario asignado">{item.assignedTo}</td>
                <td data-label="Correo electrónico">{item.assignedEmail || '—'}</td>
                <td data-label="Ubicación">{item.location}</td>
                <td data-label="Fecha">{new Date(item.assignmentDate).toLocaleString('es-CL')}</td>
                <td data-label="Registrado por">{item.performedBy?.name || '—'}</td>
                <td data-label="Notas">{item.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

AssignmentHistory.defaultProps = {
  history: [],
  loading: false,
};

export default AssignmentHistory;
