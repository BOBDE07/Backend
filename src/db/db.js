import mongoose from 'mongoose' ; 
import { DB_NAME } from '../constants.js';

const connectDB = async () => {
    try {
        const db = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(db);
        console.log('MongoDB is Connected successfully');
        
    } catch (error) {
        console.log('MongoDB Disconnected: ', error) ; 
        process.exit(1) ;
    }
    
}

export default connectDB ;