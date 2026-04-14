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

  canAssign() {
    return false;
  }

  canUnassign() {
    return false;
  }

  canDecommission() {
    return false;
  }
}

class AvailableState extends ProductState {
  canAssign() {
    return true;
  }

  canDecommission() {
    return true;
  }

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
  canUnassign() {
    return true;
  }

  canDecommission() {
    return true;
  }

  unassign(product) {
    product.currentAssignment = undefined;
    product.status = 'AVAILABLE';
  }
}

class DecommissionedState extends ProductState {}

const stateRegistry = {
  AVAILABLE: AvailableState,
  ASSIGNED: AssignedState,
  DECOMMISSIONED: DecommissionedState,
};

function getProductState(product) {
  const StateClass = stateRegistry[product.status];

  if (!StateClass) {
    throw new Error(`Estado de producto desconocido: ${product.status}`);
  }

  return new StateClass();
}

module.exports = {
  getProductState,
  AvailableState,
  AssignedState,
  DecommissionedState,
};
