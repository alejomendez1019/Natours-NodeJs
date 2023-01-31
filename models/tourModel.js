const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');
const User = require('./userModel');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxLength: [40, 'A tour name must have less or equal then 40 characters'],
      minLength: [10, 'A tour name must have more or equal then 10 characters'],
      // validate: [validator.isAlpha, 'Tour name must only contain characters']
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      //Only for strings
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either: easy, medium, difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      //Tambien funciona para fechas
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) should be below regular price',
      },
    },
    summary: {
      type: String,
      trim: true, //Corta los espacios en blanco al comienzo y al final del string
      required: [true, 'A tour must have a summary'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String], //Declara un array de strings
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false, //No se incluye en las consultas
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      //GeoJSON
      //Este tipo de datos debe de contoner como minimo de parametros el tipo y un array de coordenadas
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      //Primero longitud y luego latitud, Normalmente en otras plataformas se usa primero latitud y luego longitud
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
  },
  //Segundo objecto donde se setean las opciones
  {
    //Esto se pudo haber hecho en modulo del controlador pero no es lo correcto, ya que siempre hay que intentar tener separado la logica empresarial de la logica de la aplicacion
    //Cuando se genere el JSON, se incluiran los virtuals
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
//1: Ascendente, -1: Descendente
//Existen otros tipos de datos index para otros tipos de datos
//tourSchema.index({ price: 1 });
//INDEX COMPOUND
tourSchema.index({ price: 1, ratingsAverage: -1 });
//La mayoria de veces el 1 o -1 no importa
tourSchema.index({ slug: 1 });

//INDEX GEO SPATIAL. se pueden crear index para otros tipos de datos para geo spatial
tourSchema.index({ startLocation: '2dsphere' });

//Virtuals
//Debe ser una funcion normal para poder usar el this
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

//Virtual populate
tourSchema.virtual('reviews', {
  ref: 'Review',
  //Nombre del campo en el modelo de Review
  foreignField: 'tour',
  //Nombre del campo en el modelo de Tour
  localField: '_id',
});

//DOCUMENT MIDDLEWARE: just runs before .save() and .create()
tourSchema.pre('save', function (next) {
  //this apunta al documento actual, por eso el nombre del tipo del middleware
  this.slug = slugify(this.name, { lower: true });
  next();
});

// QUERY MIDDLEWARE
//tourSchema.pre('find', function (next) {
//Expresion regular de todo lo que empieza por "find"
//Middle para hacer el get de todos los tours excluyendo a los secret tours
tourSchema.pre(/^find/, function (next) {
  //this apunta al query actual, por eso el nombre del tipo del middleware
  //this es un objeto regular de javascript
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
  next();
});

// tourSchema.post(/^find/, function (docs, next) {
//   console.log(`Query took ${Date.now() - this.start} milliseconds!`);
//   next();
// });

//AGGREGATION MIDDLEWARE
//unshift: Agrega un elemento al inicio del array
//Middleware para excluir los secret tours en las agregaciones
// tourSchema.pre('aggregate', function (next) {
//   //this contiene el objeto de agregacion
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   next();
// });

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
