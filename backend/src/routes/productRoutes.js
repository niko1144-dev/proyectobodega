const express = require('express');
const productController = require('../controllers/productController');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.post(
  '/',
  authenticate,
  authorizeRoles('ADMIN', 'MANAGER'),
  productController.createProduct
);

router.get('/', authenticate, productController.listProducts);
router.get('/stock', authenticate, productController.getStockSummary);
router.get('/:id', authenticate, productController.getProduct);

router.put(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'MANAGER'),
  productController.updateProduct
);

router.post(
  '/:id/assign',
  authenticate,
  authorizeRoles('ADMIN', 'MANAGER'),
  productController.assignProduct
);

router.post(
  '/:id/unassign',
  authenticate,
  authorizeRoles('ADMIN', 'MANAGER'),
  productController.unassignProduct
);

router.get(
  '/:id/assignments',
  authenticate,
  productController.getAssignmentHistory
);

router.post(
  '/:id/decommission',
  authenticate,
  authorizeRoles('ADMIN', 'MANAGER'),
  productController.decommissionProduct
);

router.delete(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'MANAGER'),
  productController.deleteProduct
);

module.exports = router;
