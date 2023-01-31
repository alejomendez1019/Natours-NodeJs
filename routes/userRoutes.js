const express = require('express');
const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');

//ROUTES Using mounting routers
//Middleware de router usado para esta ruta
const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

//Protect all routes after this middleware
router.use(authController.protect);

router.get('/me', userController.getMe, userController.getUser);
router.patch('/updateMyPassword', authController.updatePassword);
router.patch('/updateMe', userController.uploadUserPhoto, userController.resizeUserPhoto, userController.updateMe);
router.delete('/deleteMe', userController.deleteMe);

router.use(authController.protect, authController.restrictTo('admin'));

router.route('/').get(userController.getAllUsers).post(userController.createUser);

router
  .route('/:id')
  //middleware that is executed for specific routes
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
