const express = require('express');
const tourController = require('./../controllers/tourController');
const authController = require('./../controllers/authController');
const reviewRouter = require('./../routes/reviewRoutes');

//ROUTES Using mounting routers

//Router middleware
const router = express.Router();

//It works but it's a bad practice because it duplicates code and is confusing. to solve this use mergeParams
/*
router
  .route('/:id/reviews')
  .post(authController.protect, authController.restrictTo('user'), reviewController.createReview);
*/
//ROUTES Using mounting routers
router.use('/:id/reviews', reviewRouter);

// /ruta de nuestra subaplciacion
router.route('/top-5-cheap').get(tourController.aliasTopTours, tourController.getAllTours);

router.route('/tour-stats').get(tourController.getTourStats);
router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan
  );

router.route('/tours-within/:distance/center/:latlng/unit/:unit').get(tourController.getToursWithin);

router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

router
  .route('/')
  .get(tourController.getAllTours)
  .post(authController.protect, authController.restrictTo('admin', 'lead-guide'), tourController.createTour);

router
  .route('/:id')
  //middleware that is executed for specific routes
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour
  )
  .delete(authController.protect, authController.restrictTo('admin', 'lead-guide'), tourController.deleteTour);

module.exports = router;
