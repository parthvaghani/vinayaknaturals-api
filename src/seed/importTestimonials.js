const mongoose = require('mongoose');
const Testimonial = require('../models/testimonial.model');
const data = require('./testimonials.json');

const MONGO_URI = 'mongodb+srv://aavkarmukhwas:w3J3gJfAHU5F5FeE@aavkarmukhwas.5if6yz2.mongodb.net/aavkar-development';

const importTestimonials = async () => {
  try {
    await mongoose.connect(MONGO_URI);

    const testimonialsBlock = data.testimonials || { visible: true, data: [] };
    const defaultVisible = Boolean(testimonialsBlock.visible);

    for (const t of testimonialsBlock.data) {
      const filter = { name: t.name, location: t.location };
      const update = {
        name: t.name,
        body: t.body,
        img: t.img,
        location: t.location,
        visible: typeof t.visible === 'boolean' ? t.visible : defaultVisible,
      };

      await Testimonial.findOneAndUpdate(filter, update, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      });
    }

    mongoose.connection.close();
  } catch (err) {
    return err;
    mongoose.connection.close();
  }
};

importTestimonials();

