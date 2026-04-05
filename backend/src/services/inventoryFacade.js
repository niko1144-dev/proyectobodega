const Assignment = require('../models/Assignment');
const { getProductState } = require('./productState');

class InventoryFacade {
  static async assignProduct({ product, assignedTo, assignedEmail, location, assignmentDate, notes, performedBy }) {
    const assignment = await Assignment.create({
      product: product._id,
      action: 'ASSIGN',
      assignedTo,
      assignedEmail,
      location,
      assignmentDate,
      performedBy,
      notes,
    });

    await assignment.populate('performedBy', 'name email role');

    const state = getProductState(product);
    state.assign(product, {
      assignedTo,
      assignedEmail,
      location,
      assignmentDate,
    });

    await product.save();

    const updatedProduct = await product.populate([{ path: 'dispatchGuide' }, { path: 'productModel' }]);

    return { product: updatedProduct, assignment };
  }

  static async unassignProduct({ product, location, assignmentDate, notes, performedBy }) {
    const assignment = await Assignment.create({
      product: product._id,
      action: 'UNASSIGN',
      assignedTo: product.currentAssignment.assignedTo,
      assignedEmail: product.currentAssignment.assignedEmail,
      location: location || product.currentAssignment.location,
      assignmentDate,
      performedBy,
      notes,
    });

    await assignment.populate('performedBy', 'name email role');

    const state = getProductState(product);
    state.unassign(product);
    await product.save();

    const updatedProduct = await product.populate([{ path: 'dispatchGuide' }, { path: 'productModel' }]);

    return { product: updatedProduct, assignment };
  }

  static async decommissionProduct({ product, reason, userId }) {
    const state = getProductState(product);
    state.decommission(product, { reason, userId });
    await product.save();

    return product.populate([
      { path: 'dispatchGuide' },
      { path: 'decommissionedBy', select: 'name email role' },
    ]);
  }
}

module.exports = InventoryFacade;
