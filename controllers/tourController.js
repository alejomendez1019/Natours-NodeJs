const multer = require('multer');
const sharp = require('sharp');
const Tour = require('./../models/tourModel');
const catchAsync = require('./../utils/catchAsync');
//const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

//Especificamos donde se guardaran las imagenes que subamos
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

//En caso de que solo hubiera un campo en la collection con una imagen
//upload.single('image'); req.file
//En caso de que solo hubiera un campo en la collection con muchas imagenes
//upload.array('images', 5); req.files

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();

  // 1) Cover image
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);
  // 2) Images
  req.body.images = [];
  //Se esperan que se reciban todas las promesas del map para continuar con el siguiente middleware
  await Promise.all(
    //El map crea un nuevo array con los resultados de la llamada a la función indicada aplicados a cada uno de sus elementos.
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;
      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);

      req.body.images.push(filename);
    })
  );

  next();
});

//Middleware
exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

//Cuando hay un error en una promesa significa que la promesa fue rechazada

//Route Handlers
exports.getAllTours = factory.getAll(Tour);

exports.getTour = factory.getOne(Tour, { path: 'reviews' });

exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);

//AGGREGATION PIPELINE
//An aggregation pipeline consists of one or more stages that process documents:
//The data is passed stage by stage, and each stage can modify the data.

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    //MATCH sirve para seleccionar los documentos que se van a procesar en la etapa
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        //_id: el campo que queremos usar para agrupar
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
    // {
    //   $match: { _id: { $ne: 'EASY' } },
    // },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1; // 2021

  const plan = await Tour.aggregate([
    //Separar los documentos de un array en documentos individuales. Se crea un documento para cada elemento del array.
    {
      $unwind: '$startDates',
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    {
      $addFields: { month: '$_id' },
    },
    {
      //Eliminar el campo _id: 0= false, 1=true
      $project: {
        _id: 0,
      },
    },
    {
      $sort: { numTourStarts: -1 },
    },
    {
      $limit: 12,
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});

// /tours-within/:distance/center/:latlng/unit/:unit
// /tours-within/233/center/-40,45/unit/mi

exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  //Convertir a radianes, Unidad especial para definir distancias en la Tierra.
  //Distancia / radio de la Tierra en millas - radio de la tierra en kilometros
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    next(new AppError('Please provide latitude and longitude in the format lat,lng.', 400));
  }

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

// /distances/:latlng/unit/:unit
// /distances/40.7484405,-73.98566440000002/unit/mi

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  if (!lat || !lng) {
    next(new AppError('Please provide latitude and longitude in the format lat,lng.', 400));
  }

  //Un Geospatial aggregations pipeline siempre debe ser el primer estado en la pipeline
  const distances = await Tour.aggregate([
    {
      $geoNear: {
        //Requiere que alguno de los campos de la colección tenga un índice de geoespacial
        //Si solo hay un campo de geoespacial, no es necesario especificar el campo
        //near es el punto desde donde se empesara a calcular las distancias
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        //distanceField es el campo donde se guardara la distancia
        distanceField: 'distance',
        //distanceMultiplier es el factor de conversión
        distanceMultiplier: unit === 'mi' ? 0.000621371 : 0.001,
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances,
    },
  });
});
