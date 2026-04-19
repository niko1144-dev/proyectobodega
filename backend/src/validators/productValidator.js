const mongoose = require('mongoose');

// Validator: se encarga solo de validar y sanitizar datos de entrada HTTP.
function createValidationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function sanitizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validateCreateProductInput(body = {}) {
  const productModelId = sanitizeString(body.productModelId);
  const type = sanitizeString(body.type);
  const serialNumber = sanitizeString(body.serialNumber);
  const inventoryNumber = sanitizeString(body.inventoryNumber);
  const rentalId = sanitizeString(body.rentalId);
  const dispatchGuideId = sanitizeString(body.dispatchGuideId);

  if (!productModelId || !type || !serialNumber) {
    throw createValidationError('Modelo de producto, tipo y número de serie son obligatorios.');
  }

  if (!mongoose.Types.ObjectId.isValid(productModelId)) {
    throw createValidationError('Identificador de modelo de producto inválido.');
  }

  if (!dispatchGuideId) {
    throw createValidationError('Debes asociar el producto a una guía de despacho.');
  }

  if (!mongoose.Types.ObjectId.isValid(dispatchGuideId)) {
    throw createValidationError('Identificador de guía de despacho inválido.');
  }

  if (type === 'RENTAL' && !rentalId) {
    throw createValidationError('Los productos de arriendo requieren un ID de arriendo.');
  }

  return {
    productModelId,
    type,
    serialNumber,
    inventoryNumber,
    rentalId,
    dispatchGuideId,
  };
}

function validateAssignProductInput(productId, body = {}) {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw createValidationError('Identificador inválido.');
  }

  const assignedTo = sanitizeString(body.assignedTo);
  const assignedEmail = sanitizeString(body.assignedEmail);
  const location = sanitizeString(body.location);
  const notes = body.notes;
  const assignmentDate = body.assignmentDate ? new Date(body.assignmentDate) : new Date();

  if (!assignedTo || !assignedEmail || !location) {
    throw createValidationError('Usuario, correo electrónico y ubicación son obligatorios.');
  }

  return {
    assignedTo,
    assignedEmail,
    location,
    assignmentDate,
    notes,
  };
}

module.exports = {
  validateCreateProductInput,
  validateAssignProductInput,
};
