const express = require('express');
const authRoute = require('./auth.route');
const userRoute = require('./user.route');
const docsRoute = require('./docs.route');
const paymentRoute = require('./payment.route');
const payinRoute = require('./payin.route');
const transactionRoute = require('./transaction.route');
const bankRoute = require('./bank.route');
const topupRoute = require('./topup.route');
const kycRoute = require('./kyc.route');
const ticketRoute = require('./ticket.route');
const excelRoute = require('./export.excel.route');
const qrCodeRoute = require('./qr-code.route');
const config = require('../../config/config');
const apiAccessKeyRoute = require('./api-access-key.route');
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
    path: '/payment',
    route: paymentRoute,
  },
  {
    path: '/payin',
    route: payinRoute,
  },
  {
    path: '/transactions',
    route: transactionRoute,
  },
  {
    path: '/banks',
    route: bankRoute,
  },
  {
    path: '/topup',
    route: topupRoute,
  },
  {
    path: '/kyc',
    route: kycRoute,
  },
  {
    path: '/tickets',
    route: ticketRoute,
  },
  {
    path: '/exports',
    route: excelRoute,
  },
  {
    path: '/access-key',
    route: apiAccessKeyRoute,
  },
  {
    path: '/qr-code',
    route: qrCodeRoute,
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
if (config.env === 'development') { //NOTE - docs is visible in development/production mode
  devRoutes.forEach((route) => {
    router.use(route.path, route.route);
  });
}

module.exports = router;
