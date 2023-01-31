const mongoose = require('mongoose');
const dotenv = require('dotenv');

//Handle uncaught exceptions in code, synchronous
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  //server.close() is not used because as it is synchronous code there cannot be more code executing at the same time or in the background
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace('<password>', process.env.DATABASE_PASSWORD);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then(() => console.log('DB connection successful!'));

//Start server
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

//Handle uncaught errors in promises (asynchronous functions)
process.on('unhandledRejectit54353on', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  //If process.exit(1) is used directly, the application will exit immediately, aborting any operation that is being executed.
  //So we use server.close() to close the server and then process.exit(1) to close the application.
  server.close(() => {
    process.exit(1);
  });
});
