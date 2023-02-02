const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const cors = require('cors');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const bookingController = require('./controllers/bookingController');
const viewRouter = require('./routes/viewRoutes');

const app = express();

//to be able to read the value of proxy headers heroku
app.enable('trust proxy');

//Motor de plantillas, view engine
//Templates are the views in the MVC model.
app.set('view engine', 'pug');
// If ./ is used, it is relative to the folder where the Node application is started.
app.set('views', path.join(__dirname, 'views'));

//1) GLOBAL Middlewares
//Implement CORS
//Its possible to use cors() for a specific route
app.use(cors());
//Access-Control-Allow-Origin *        Default, available for all origins
//app.use(cors({ origin: 'https://www.natours.com' })); avaliable for a specific origin

//Routes that can receive complex requests (PATCH, PUT, DELETE)
app.options('*', cors());
//app.options('/api/v1/tours/:id', cors());

//Serving static files
//ap.use(express.static(`${__dirname}/public`));
app.use(express.static(path.join(__dirname, 'public')));

//Its a standard in express applications, it must always be used, it must be the first in the middleware stack.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        'worker-src': ['blob:'],
        'child-src': ['blob:', 'https://js.stripe.com/'],
        'img-src': ["'self'", 'data: image/webp'],
        'script-src': [
          "'self'",
          'https://api.mapbox.com',
          'https://cdnjs.cloudflare.com',
          'https://js.stripe.com/v3/',
          "'unsafe-inline'",
        ],
        'connect-src': [
          "'self'",
          'ws://localhost:*',
          'ws://127.0.0.1:*',
          'http://127.0.0.1:*',
          'http://localhost:*',
          'https://*.tiles.mapbox.com',
          'https://api.mapbox.com',
          'https://events.mapbox.com',
        ],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

//Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

//Limit request from same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!',
});
app.use('/api', limiter);

//Its necessary receive the data in raw format, because stripe needs it in this format
app.post('/webhook-checkout', express.raw({type: 'application/json'}), bookingController.webhookCheckout);

//Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' })); //Middleware allows the server to understand the data that comes in JSON format
app.use(express.urlencoded({ extended: true, limit: '10kb' })); //Middleware allows the server to understand the data that comes in urlencoded format (Data from a form)
app.use(cookieParser());

//Data sanitization against NoSQL query injection
//search body, query, params and remove $ and . symbols, because these are mongo reserved words
//It is not necessary to pass more protection options to the default ones because mongoose already contains protection against this type of attack
app.use(mongoSanitize());

//Protection against XSS attacks, prevents html code from being injected or html with attached javascript replacing special characters
//Data sanitization against XSS(Cross‑Site Scripting)
app.use(xss());

//Prevent parameter pollution, If there are duplicate parameters in the url, only the last one is taken
app.use(
  hpp({
    //List of parameters that are allowed to be duplicated
    whitelist: ['duration', 'ratingsQuantity', 'ratingsAverage', 'maxGroupSize', 'difficulty', 'price'],
  })
);

app.use(compression());

//In each middleware function you can access the request, response and next function
//all middleware before the route declaration is applied on every request to the server
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

//Routes
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

app.all('*', (req, res, next) => {
  /*
  Using Express's error class
  const err = new Error(`Can't find ${req.originalUrl} on this server!`);
  err.status = 'fail';
  err.statusCode = 404;
  next(err);
  */

  //Using the custom error class
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

//Express recognizes that it is an error middleware because it has 4 parameters.
app.use(globalErrorHandler);

module.exports = app;
