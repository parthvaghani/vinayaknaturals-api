const express = require('express');
const authRoute = require('./auth.route');
const userRoute = require('./user.route');
const docsRoute = require('./docs.route');
const config = require('../../config/config');
const productCategoryRoute = require('./productCategory.routes');
const productRoute = require('./product.routes');
const suggestedProductRoute = require('./suggestedProduct.routes');
const testimonialRoute = require('./testimonial.routes');
const leadRoute = require('./lead.routes');
const cartRoute = require('./cart.route');
const addressRoute = require('./address.routes');
const orderRoute = require('./order.routes');
const reviewRoute = require('./review.routes');
const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/users',
    route: userRoute,
  },
  {
    path: '/categories',
    route: productCategoryRoute,
  },
  {
    path: '/products',
    route: productRoute,
  },
  {
    path: '/products',
    route: suggestedProductRoute,
  },
  {
    path: '/testimonials',
    route: testimonialRoute,
  },
  {
    path: '/leads',
    route: leadRoute,
  },
  {
    path: '/cart',
    route: cartRoute,
  },
  {
    path: '/addresses',
    route: addressRoute,
  },
  {
    path: '/orders',
    route: orderRoute,
  },
  {
    path: '/reviews',
    route: reviewRoute,
  },
];

const devRoutes = [
  // routes available only in development mode
  {
    path: '/docs',
    route: docsRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

/* istanbul ignore next */
if (config.env === 'development') {
  //NOTE - docs is visible in development/production mode
  devRoutes.forEach((route) => {
    router.use(route.path, route.route);
  });
}

module.exports = router;
