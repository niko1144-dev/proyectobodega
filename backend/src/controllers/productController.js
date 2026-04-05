const mongoose = require('mongoose');
const Product = require('../models/Product');
const Assignment = require('../models/Assignment');
const DispatchGuide = require('../models/DispatchGuide');
const ProductModel = require('../models/ProductModel');

const ALLOWED_STATUSES = ['AVAILABLE', 'ASSIGNED', 'DECOMMISSIONED'];

function buildSearchQuery({ type, status, search }) {
  const query = {};

  if (type && ['PURCHASED', 'RENTAL'].includes(type)) {
    query.type = type;
  }

  if (status) {
    const statusValues = status
      .split(',')
      .map((value) => value.trim().toUpperCase())
      .filter((value) => ALLOWED_STATUSES.includes(value));

    if (statusValues.length === 1) {
      query.status = statusValues[0];
    } else if (statusValues.length > 1) {
      query.status = { $in: statusValues };
    }
  }

  if (search) {
    const regex = new RegExp(search, 'i');
    query.$or = [
      { name: regex },
      { serialNumber: regex },
      { partNumber: regex },
      { inventoryNumber: regex },
      { rentalId: regex },
    ];
  }

  return query;
}

exports.createProduct = async (req, res) => {
  try {
    const { productModelId, type, serialNumber, inventoryNumber, rentalId, dispatchGuideId } = req.body;

    if (!productModelId || !type || !serialNumber) {
      return res.status(400).json({ message: 'Modelo de producto, tipo y número de serie son obligatorios.' });
    }

    if (!mongoose.Types.ObjectId.isValid(productModelId)) {
      return res.status(400).json({ message: 'Identificador de modelo de producto inválido.' });
    }

    const productModel = await ProductModel.findById(productModelId);
    if (!productModel) {
      return res.status(404).json({ message: 'Modelo de producto no encontrado.' });
    }

    if (!['PURCHASED', 'RENTAL'].includes(type)) {
      return res.status(400).json({ message: 'Tipo de producto inválido.' });
    }

    if (type === 'RENTAL' && !rentalId) {
      return res.status(400).json({ message: 'Los productos de arriendo requieren un ID de arriendo.' });
    }

    if (!dispatchGuideId) {
      return res.status(400).json({ message: 'Debes asociar el producto a una guía de despacho.' });
    }

    if (type === 'PURCHASED' && !inventoryNumber) {
      // El inventario es opcional, pero avisamos si falta.
      console.warn('Producto de compra sin número de inventario, se almacenará vacío.');
    }

    if (!mongoose.Types.ObjectId.isValid(dispatchGuideId)) {
      return res.status(400).json({ message: 'Identificador de guía de despacho inválido.' });
    }

    const dispatchGuide = await DispatchGuide.findById(dispatchGuideId);
    if (!dispatchGuide) {
      return res.status(404).json({ message: 'Guía de despacho no encontrada.' });
    }

    const product = await Product.create({
      productModel: productModel._id,
      name: productModel.name,
      description: productModel.description,
      type,
      serialNumber,
      partNumber: productModel.partNumber,
      inventoryNumber: type === 'PURCHASED' ? inventoryNumber || null : undefined,
      rentalId: type === 'RENTAL' ? rentalId : undefined,
      dispatchGuide: dispatchGuide._id,
      createdBy: req.user._id,
    });

    const populated = await product.populate('productModel');

    res.status(201).json(populated);
  } catch (error) {
    console.error('createProduct error', error);
    res.status(500).json({ message: 'No se pudo crear el producto.' });
  }
};

exports.listProducts = async (req, res) => {
  try {
    const query = buildSearchQuery(req.query);
    const products = await Product.find(query)
      .populate('dispatchGuide')
      .populate('productModel')
      .populate('decommissionedBy', 'name email role')
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    console.error('listProducts error', error);
    res.status(500).json({ message: 'No se pudieron obtener los productos.' });
  }
};

exports.getProduct = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Identificador inválido.' });
    }

    const product = await Product.findById(req.params.id)
      .populate('dispatchGuide')
      .populate('productModel')
      .populate('decommissionedBy', 'name email role');
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    res.json(product);
  } catch (error) {
    console.error('getProduct error', error);
    res.status(500).json({ message: 'No se pudo obtener el producto.' });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Identificador inválido.' });
    }

    const allowedUpdates = [
      'description',
      'serialNumber',
      'inventoryNumber',
      'rentalId',
      'dispatchGuideId',
      'productModelId',
    ];

    const updates = Object.keys(req.body).filter((key) => allowedUpdates.includes(key));

    if (!updates.length) {
      return res.status(400).json({ message: 'No hay campos válidos para actualizar.' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    for (const key of updates) {
      if (key === 'dispatchGuideId') {
        const dispatchGuideId = req.body.dispatchGuideId;
        if (!dispatchGuideId) {
          return res.status(400).json({ message: 'Los productos deben permanecer asociados a una guía de despacho.' });
        }
        if (!mongoose.Types.ObjectId.isValid(dispatchGuideId)) {
          return res.status(400).json({ message: 'Identificador de guía de despacho inválido.' });
        }
        const dispatchGuide = await DispatchGuide.findById(dispatchGuideId);
        if (!dispatchGuide) {
          return res.status(404).json({ message: 'Guía de despacho no encontrada.' });
        }
        product.dispatchGuide = dispatchGuide._id;
      } else if (key === 'productModelId') {
        const productModelId = req.body.productModelId;
        if (!productModelId || !mongoose.Types.ObjectId.isValid(productModelId)) {
          return res.status(400).json({ message: 'Identificador de modelo de producto inválido.' });
        }
        const productModel = await ProductModel.findById(productModelId);
        if (!productModel) {
          return res.status(404).json({ message: 'Modelo de producto no encontrado.' });
        }
        product.productModel = productModel._id;
        product.name = productModel.name;
        product.partNumber = productModel.partNumber;
        product.description = productModel.description;
      } else {
        product[key] = req.body[key];
      }
    }

    await product.save();

    const populated = await product.populate('productModel');

    res.json(populated);
  } catch (error) {
    console.error('updateProduct error', error);
    res.status(500).json({ message: 'No se pudo actualizar el producto.' });
  }
};

exports.assignProduct = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Identificador inválido.' });
    }

    const { assignedTo, assignedEmail, location, assignmentDate, notes } = req.body;

    const sanitizedAssignedTo = typeof assignedTo === 'string' ? assignedTo.trim() : '';
    const sanitizedAssignedEmail = typeof assignedEmail === 'string' ? assignedEmail.trim() : '';
    const sanitizedLocation = typeof location === 'string' ? location.trim() : '';

    if (!sanitizedAssignedTo || !sanitizedAssignedEmail || !sanitizedLocation) {
      return res
        .status(400)
        .json({ message: 'Usuario, correo electrónico y ubicación son obligatorios.' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    if (product.status === 'DECOMMISSIONED') {
      return res.status(400).json({ message: 'El producto está dado de baja y no puede asignarse.' });
    }

    const effectiveAssignmentDate = assignmentDate ? new Date(assignmentDate) : new Date();

    if (product.status !== 'AVAILABLE' || product.currentAssignment) {
      return res.status(400).json({
        message: 'Debes liberar el producto antes de asignarlo a otra persona.',
      });
    }

    const assignment = await Assignment.create({
      product: product._id,
      action: 'ASSIGN',
      assignedTo: sanitizedAssignedTo,
      assignedEmail: sanitizedAssignedEmail,
      location: sanitizedLocation,
      assignmentDate: effectiveAssignmentDate,
      performedBy: req.user._id,
      notes,
    });

    await assignment.populate('performedBy', 'name email role');

    product.currentAssignment = {
      assignedTo: sanitizedAssignedTo,
      assignedEmail: sanitizedAssignedEmail,
      location: sanitizedLocation,
      assignmentDate: effectiveAssignmentDate,
    };

    product.status = 'ASSIGNED';
    product.decommissionReason = undefined;
    product.decommissionedAt = undefined;
    product.decommissionedBy = undefined;

    await product.save();

    const updatedProduct = await product.populate([
      { path: 'dispatchGuide' },
      { path: 'productModel' },
    ]);

    res.json({ product: updatedProduct, assignment });
  } catch (error) {
    console.error('assignProduct error', error);
    res.status(500).json({ message: 'No se pudo asignar el producto.' });
  }
};

exports.unassignProduct = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Identificador inválido.' });
    }

    const { location, assignmentDate, notes } = req.body;
    const sanitizedLocation = typeof location === 'string' ? location.trim() : '';

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    if (product.status === 'DECOMMISSIONED') {
      return res.status(400).json({ message: 'El producto se encuentra dado de baja.' });
    }

    if (!product.currentAssignment) {
      return res.status(400).json({ message: 'El producto no tiene una asignación activa.' });
    }

    const effectiveAssignmentDate = assignmentDate ? new Date(assignmentDate) : new Date();

    const assignment = await Assignment.create({
      product: product._id,
      action: 'UNASSIGN',
      assignedTo: product.currentAssignment.assignedTo,
      assignedEmail: product.currentAssignment.assignedEmail,
      location: sanitizedLocation || product.currentAssignment.location,
      assignmentDate: effectiveAssignmentDate,
      performedBy: req.user._id,
      notes,
    });

    await assignment.populate('performedBy', 'name email role');

    product.currentAssignment = undefined;
    product.status = 'AVAILABLE';
    await product.save();

    const updatedProduct = await product.populate([
      { path: 'dispatchGuide' },
      { path: 'productModel' },
    ]);

    res.json({ product: updatedProduct, assignment });
  } catch (error) {
    console.error('unassignProduct error', error);
    res.status(500).json({ message: 'No se pudo desasignar el producto.' });
  }
};

exports.decommissionProduct = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Identificador inválido.' });
    }

    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'Debes indicar el motivo de la baja.' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    if (product.status === 'DECOMMISSIONED') {
      return res.status(400).json({ message: 'El producto ya se encuentra dado de baja.' });
    }

    if (product.currentAssignment) {
      return res
        .status(400)
        .json({ message: 'Debes liberar la asignación antes de dar de baja el producto.' });
    }

    product.currentAssignment = undefined;
    product.status = 'DECOMMISSIONED';
    product.decommissionReason = reason.trim();
    product.decommissionedAt = new Date();
    product.decommissionedBy = req.user._id;

    await product.save();

    const populated = await product.populate([
      { path: 'dispatchGuide' },
      { path: 'decommissionedBy', select: 'name email role' },
    ]);

    res.json(populated);
  } catch (error) {
    console.error('decommissionProduct error', error);
    res.status(500).json({ message: 'No se pudo dar de baja el producto.' });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Identificador inválido.' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    if (product.currentAssignment || product.status === 'ASSIGNED') {
      return res.status(400).json({ message: 'Debes liberar el producto antes de eliminarlo.' });
    }

    await Assignment.deleteMany({ product: product._id });
    await product.deleteOne();

    res.status(204).send();
  } catch (error) {
    console.error('deleteProduct error', error);
    res.status(500).json({ message: 'No se pudo eliminar el producto.' });
  }
};

exports.getAssignmentHistory = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Identificador inválido.' });
    }

    const assignments = await Assignment.find({ product: req.params.id })
      .populate('performedBy', 'name email role')
      .sort({ assignmentDate: -1 });

    res.json(assignments);
  } catch (error) {
    console.error('getAssignmentHistory error', error);
    res.status(500).json({ message: 'No se pudo obtener el historial de asignaciones.' });
  }
};

exports.getStockSummary = async (req, res) => {
  try {
    const summary = await Product.aggregate([
      {
        $group: {
          _id: {
            productModel: '$productModel',
            name: '$name',
            partNumber: '$partNumber',
          },
          description: { $first: '$description' },
          total: { $sum: 1 },
          available: {
            $sum: { $cond: [{ $eq: ['$status', 'AVAILABLE'] }, 1, 0] },
          },
          assigned: {
            $sum: { $cond: [{ $eq: ['$status', 'ASSIGNED'] }, 1, 0] },
          },
          decommissioned: {
            $sum: { $cond: [{ $eq: ['$status', 'DECOMMISSIONED'] }, 1, 0] },
          },
          purchased: {
            $sum: { $cond: [{ $eq: ['$type', 'PURCHASED'] }, 1, 0] },
          },
          rental: {
            $sum: { $cond: [{ $eq: ['$type', 'RENTAL'] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: 'productmodels',
          localField: '_id.productModel',
          foreignField: '_id',
          as: 'productModel',
        },
      },
      {
        $unwind: {
          path: '$productModel',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          productModelId: { $ifNull: ['$productModel._id', '$_id.productModel'] },
          name: { $ifNull: ['$productModel.name', '$_id.name'] },
          partNumber: { $ifNull: ['$productModel.partNumber', '$_id.partNumber'] },
          description: { $ifNull: ['$productModel.description', '$description'] },
          totals: {
            total: '$total',
            available: '$available',
            assigned: '$assigned',
            decommissioned: '$decommissioned',
          },
          typeBreakdown: {
            purchased: '$purchased',
            rental: '$rental',
          },
        },
      },
      {
        $sort: { name: 1, partNumber: 1 },
      },
    ]);

    res.json(summary);
  } catch (error) {
    console.error('getStockSummary error', error);
    res.status(500).json({ message: 'No se pudo obtener el resumen de stock.' });
  }
};
