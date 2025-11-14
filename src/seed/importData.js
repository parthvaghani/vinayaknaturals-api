const mongoose = require('mongoose');
const ProductCategory = require('../models/productCategory.model');
const Product = require('../models/product.model');
const data = require('./data.json');

const MONGO_URI = `${envVars.MONGODB_URL}drizzlebites-development`;

const importData = async () => {
  try {
    await mongoose.connect(MONGO_URI);

    for (const cat of data.categories) {
      // Find existing category by name
      let categoryDoc = await ProductCategory.findOne({ name: cat.name });

      if (!categoryDoc) {
        categoryDoc = await ProductCategory.create({
          category: cat.category,
          name: cat.name,
          description: cat.description,
          heroImage: cat.heroImage,
          pricingEnabled: cat.pricingEnabled,
        });
      }

      for (const sub of cat.subCategories) {
        // Check if product already exists under same category
        const existingProduct = await Product.findOne({
          name: sub.name,
          category: categoryDoc._id,
        });

        if (!existingProduct) {
          await Product.create({
            category: categoryDoc._id,
            name: sub.name,
            description: sub.description,
            images: sub.images || [],
            ingredients: sub.ingredients || [],
            benefits: sub.benefits || [],
            isPremium: sub.isPremium || false,
            isPopular: sub.isPopular || false,
            variants: {
              gm: sub.variants?.gm ? Object.entries(sub.variants.gm).map(([weight, val]) => ({
                weight,
                price: val.price,
                discount: val.discount || 0,
              })) : [],
              kg: sub.variants?.kg ? Object.entries(sub.variants.kg).map(([weight, val]) => ({
                weight,
                price: val.price,
                discount: val.discount || 0,
              })) : [],
            },
          });
        }
      }
    }

    // console.log('Data import/update completed');
    mongoose.connection.close();
  } catch (err) {
    // console.error(err);
    mongoose.connection.close();
    return err;
  }
};

importData();
