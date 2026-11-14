import 'dotenv/config'  ;
// import express from 'express' ; 
import connectDB from './db/db.js';
// const app = express() ; 
const PORT = process.env.PORT || 5000
import app from './app.js';

// connectDB() ;

connectDB() 
.then(() => {
    app.listen(PORT , () =>{
        console.log(`Server is running on port: ${PORT}`);
        
    })
}) 
.catch((err)=>{
    console.log('MongoDB connection failed: ', err);
    
})

// app.get('/', (req , res ) =>{
//     res.send('Backend is running.') ;
// }) ; 

// app.get('/login' , (req , res) => {
//     res.send('this is Login page.')
// })

// app.listen(PORT, () =>{
//     console.log(`Server is running on port: ${PORT}`) ;
// }) ; 