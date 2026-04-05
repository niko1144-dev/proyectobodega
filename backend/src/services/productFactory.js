const PRODUCT_TYPES = {
  PURCHASED: 'PURCHASED',
  RENTAL: 'RENTAL',
};

class ProductFactory {
  static create({ productModel, type, serialNumber, inventoryNumber, rentalId, dispatchGuideId, createdBy }) {
    const baseData = {
      productModel: productModel._id,
      name: productModel.name,
      description: productModel.description,
      partNumber: productModel.partNumber,
      type,
      serialNumber,
      dispatchGuide: dispatchGuideId,
      createdBy,
    };

    if (type === PRODUCT_TYPES.PURCHASED) {
      return {
        ...baseData,
        inventoryNumber: inventoryNumber || null,
      };
    }

    if (type === PRODUCT_TYPES.RENTAL) {
      return {
        ...baseData,
        rentalId,
      };
    }

    throw new Error(`Tipo de producto no soportado: ${type}`);
  }
}

module.exports = {
  ProductFactory,
  PRODUCT_TYPES,
};
