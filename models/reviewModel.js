const mongoose = require('mongoose');
const validator = require('validator');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty!'],
      maxLength: [150, 'The review must have less or equal then 150 characters'],
      minLength: [10, 'The review must have more or equal then 10 characters'],
    },
    rating: {
      type: Number,
      required: [true, 'A review must have a rating'],
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour.'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user.'],
    },
  },
  {
    //Esto se pudo haber hecho en modulo del controlador pero no es lo correcto, ya que siempre hay que intentar tener separado la logica empresarial de la logica de la aplicacion
    //Cuando se genere el JSON, se incluiran los virtuals, los virtuals son propiedades que no se guardan en la base de datos, pero se calculan en tiempo de ejecucion a partir de otros datos
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});

reviewSchema.statics.calcAverageRatings = async function (tourId) {
  stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: { _id: '$tour', nRating: { $sum: 1 }, avgRating: { $avg: '$rating' } },
    },
  ]);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

//Evitar que un usuario pueda hacer mas de una review por tour
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

//Middleware de post no tiene la funcion next
reviewSchema.post('save', function () {
  //this points to current review
  this.constructor.calcAverageRatings(this.tour);
});

reviewSchema.pre(/^findOneAnd/, async function (next) {
  //Para acceder al documento actual, se debe ejecutar la consulta y esto nos devolvera el docuemtno actual. ya que this apunta al query no al documento
  //Se agrega el documento actual a la instancia del modelo, no al documento en si, para poder ser usado en el post
  this.r = await this.findOne();
  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  //await this.findOne(); Does not work here, query has already executed
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
