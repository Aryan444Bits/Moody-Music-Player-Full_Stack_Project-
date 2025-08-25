const mongoose = require("mongoose");


function connectDB(){

    mongoose.connect(process.env.MONGODB_URL)
    .then(()=>{
        console.log("Conneted to DataBase");
    })
    .catch((err)=>{
        console.log("Error to Connecting to MongoDB: ",err);
    });
}

module.exports = connectDB;