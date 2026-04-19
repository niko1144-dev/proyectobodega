const Product = require('../models/Product');
const ProductModel = require('../models/ProductModel');
const DispatchGuide = require('../models/DispatchGuide');
const InventoryFacade = require('./inventoryFacade');
const { ProductFactory } = require('./productFactory');
const { getProductState } = require('./productState');

function createServiceError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function findByIdOrThrow(Model, id, notFoundMessage) {
  const document = await Model.findById(id);
  if (!document) {
    throw createServiceError(404, notFoundMessage);
  }
  return document;
}

// Service: encapsula reglas de negocio y acceso a persistencia para crear productos.
async function createProduct(payload, userId) {
  const { productModelId, type, serialNumber, inventoryNumber, rentalId, dispatchGuideId } = payload;

  const productModel = await findByIdOrThrow(ProductModel, productModelId, 'Modelo de producto no encontrado.');

  if (!ProductFactory.isSupportedType(type)) {
    throw createServiceError(400, 'Tipo de producto inválido.');
  }

  const dispatchGuide = await findByIdOrThrow(DispatchGuide, dispatchGuideId, 'Guía de despacho no encontrada.');

  if (type === 'PURCHASED' && !inventoryNumber) {
    // Regla informativa: se permite continuar sin inventario para compra.
    console.warn('Producto de compra sin número de inventario, se almacenará vacío.');
  }

  const productData = ProductFactory.create({
    productModel,
    type,
    serialNumber,
    inventoryNumber,
    rentalId,
    dispatchGuideId: dispatchGuide._id,
    createdBy: userId,
  });

  const product = await Product.create(productData);
  return product.populate('productModel');
}

// Service: maneja ciclo de asignación de producto y reglas de estado.
async function assignProduct(productId, payload, userId) {
  const product = await findByIdOrThrow(Product, productId, 'Producto no encontrado.');

  const state = getProductState(product);
  if (!state.canAssign() || product.currentAssignment) {
    throw createServiceError(400, 'Debes liberar el producto antes de asignarlo a otra persona.');
  }

  return InventoryFacade.assignProduct({
    product,
    assignedTo: payload.assignedTo,
    assignedEmail: payload.assignedEmail,
    location: payload.location,
    assignmentDate: payload.assignmentDate,
    notes: payload.notes,
    performedBy: userId,
  });
}

module.exports = {
  createProduct,
  assignProduct,
};
