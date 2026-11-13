import 'dotenv/config'  ;
import express from 'express' ; 
const app = express() ; 
const PORT = process.env.PORT || 5000

app.get('/', (req , res ) =>{
    res.send('Backend is running.') ;
}) ; 

app.get('/login' , (req , res) => {
    res.send('this is Login page.')
})

app.listen(PORT, () =>{
    console.log(`Server is running on port: ${PORT}`) ;
}) ; 