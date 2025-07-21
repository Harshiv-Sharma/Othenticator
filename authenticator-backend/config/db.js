const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/authenticator';
    await mongoose.connect(mongoURI, {
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.error('Please ensure that your MongoDB instance is running and that the connection string is correct in .env (MONGO_URI).');
    process.exit(1);
  }
};

module.exports = connectDB;
