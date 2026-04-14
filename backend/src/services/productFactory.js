const PRODUCT_TYPES = {
  PURCHASED: 'PURCHASED',
  RENTAL: 'RENTAL',
};

class BaseProductCreator {
  constructor({ productModel, serialNumber, dispatchGuideId, createdBy }) {
    this.productModel = productModel;
    this.serialNumber = serialNumber;
    this.dispatchGuideId = dispatchGuideId;
    this.createdBy = createdBy;
  }

  buildBaseData(type) {
    return {
      productModel: this.productModel._id,
      name: this.productModel.name,
      description: this.productModel.description,
      partNumber: this.productModel.partNumber,
      type,
      serialNumber: this.serialNumber,
      dispatchGuide: this.dispatchGuideId,
      createdBy: this.createdBy,
    };
  }

  create() {
    throw new Error('El creador concreto debe implementar create().');
  }
}

class PurchasedProductCreator extends BaseProductCreator {
  constructor(params) {
    super(params);
    this.inventoryNumber = params.inventoryNumber;
  }

  create() {
    return {
      ...this.buildBaseData(PRODUCT_TYPES.PURCHASED),
      inventoryNumber: this.inventoryNumber || null,
    };
  }
}

class RentalProductCreator extends BaseProductCreator {
  constructor(params) {
    super(params);
    this.rentalId = params.rentalId;
  }

  create() {
    if (!this.rentalId) {
      throw new Error('Los productos de arriendo requieren un ID de arriendo.');
    }

    return {
      ...this.buildBaseData(PRODUCT_TYPES.RENTAL),
      rentalId: this.rentalId,
    };
  }
}

class ProductFactory {
  static creators = {
    [PRODUCT_TYPES.PURCHASED]: PurchasedProductCreator,
    [PRODUCT_TYPES.RENTAL]: RentalProductCreator,
  };

  static isSupportedType(type) {
    return Boolean(ProductFactory.creators[type]);
  }

  static create(params) {
    const Creator = ProductFactory.creators[params.type];

    if (!Creator) {
      throw new Error(`Tipo de producto no soportado: ${params.type}`);
    }

    return new Creator(params).create();
  }
}

module.exports = {
  ProductFactory,
  PRODUCT_TYPES,
};
