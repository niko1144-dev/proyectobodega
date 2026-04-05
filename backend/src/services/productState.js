class ProductState {
  assign() {
    throw new Error('Operación assign no soportada para este estado.');
  }

  unassign() {
    throw new Error('Operación unassign no soportada para este estado.');
  }

  decommission() {
    throw new Error('Operación decommission no soportada para este estado.');
  }
}

class AvailableState extends ProductState {
  assign(product, assignmentSnapshot) {
    product.currentAssignment = assignmentSnapshot;
    product.status = 'ASSIGNED';
    product.decommissionReason = undefined;
    product.decommissionedAt = undefined;
    product.decommissionedBy = undefined;
  }

  decommission(product, { reason, userId }) {
    product.currentAssignment = undefined;
    product.status = 'DECOMMISSIONED';
    product.decommissionReason = reason;
    product.decommissionedAt = new Date();
    product.decommissionedBy = userId;
  }
}

class AssignedState extends ProductState {
  unassign(product) {
    product.currentAssignment = undefined;
    product.status = 'AVAILABLE';
  }
}

class DecommissionedState extends ProductState {}

function getProductState(product) {
  switch (product.status) {
    case 'AVAILABLE':
      return new AvailableState();
    case 'ASSIGNED':
      return new AssignedState();
    case 'DECOMMISSIONED':
      return new DecommissionedState();
    default:
      throw new Error(`Estado de producto desconocido: ${product.status}`);
  }
}

module.exports = {
  getProductState,
  AvailableState,
  AssignedState,
  DecommissionedState,
};
