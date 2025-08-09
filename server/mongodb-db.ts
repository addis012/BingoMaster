import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://addisumelke01:a1e2y3t4h5@cluster0.yjzywln.mongodb.net/bingomaster?retryWrites=true&w=majority&appName=Cluster0';

export async function connectMongoDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🍃 Connected to MongoDB successfully');
    return mongoose.connection;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

export { mongoose };