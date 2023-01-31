const express = require('express');
const reviewController = require('./../controllers/reviewController');
const authController = require('./../controllers/authController');

//ROUTES Using mounting routers, Allows to use the parameters of the parent route
// /tours/:tourId/reviews
// /reviews
//These two routes will lead to the same controller
const router = express.Router({ mergeParams: true });

router.use(authController.protect);

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(authController.restrictTo('user'), reviewController.setTourUserIds, reviewController.createReview);

router
  .route('/:id')
  .patch(authController.restrictTo('user', 'admin'), reviewController.updateReview)
  .delete(authController.restrictTo('user', 'admin'), reviewController.deleteReview)
  .get(reviewController.getReview);

module.exports = router;
