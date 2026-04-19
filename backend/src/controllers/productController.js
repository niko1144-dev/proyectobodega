const mongoose = require('mongoose');
const Product = require('../models/Product');
const Assignment = require('../models/Assignment');
const DispatchGuide = require('../models/DispatchGuide');
const ProductModel = require('../models/ProductModel');
const InventoryFacade = require('../services/inventoryFacade');
const { getProductState } = require('../services/productState');
const productService = require('../services/productService');
const { validateCreateProductInput, validateAssignProductInput } = require('../validators/productValidator');

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
    // Controlador: solo coordina validator + service y devuelve respuesta HTTP.
    const validatedPayload = validateCreateProductInput(req.body);
    const product = await productService.createProduct(validatedPayload, req.user._id);
    res.status(201).json(product);
  } catch (error) {
    console.error('createProduct error', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
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
    // Controlador: delega validación y reglas de negocio para mantener baja complejidad.
    const validatedPayload = validateAssignProductInput(req.params.id, req.body);
    const result = await productService.assignProduct(req.params.id, validatedPayload, req.user._id);
    res.json(result);
  } catch (error) {
    console.error('assignProduct error', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
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

    const state = getProductState(product);

    if (!state.canUnassign() || !product.currentAssignment) {
      return res.status(400).json({ message: 'El producto no tiene una asignación activa.' });
    }

    const effectiveAssignmentDate = assignmentDate ? new Date(assignmentDate) : new Date();

    const result = await InventoryFacade.unassignProduct({
      product,
      location: sanitizedLocation,
      assignmentDate: effectiveAssignmentDate,
      notes,
      performedBy: req.user._id,
    });

    res.json(result);
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

    const state = getProductState(product);

    if (!state.canDecommission()) {
      return res.status(400).json({ message: 'El producto ya se encuentra dado de baja.' });
    }

    if (product.currentAssignment) {
      return res
        .status(400)
        .json({ message: 'Debes liberar la asignación antes de dar de baja el producto.' });
    }

    const populated = await InventoryFacade.decommissionProduct({
      product,
      reason: reason.trim(),
      userId: req.user._id,
    });

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
