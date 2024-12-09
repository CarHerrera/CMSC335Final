const {MongoClient, ServerApiVersion} = require('mongodb');
const express = require('express');
const path = require("path");
const bodyParser = require('body-parser');
// require("dotenv").config({path: path.resolve(__dirname, '.env')});
const app = express();
const fs = require('fs');
let port = 8000;

app.set("views", path.resolve(__dirname, "templates")); 
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:false})); 
app.use(express.static(path.resolve(__dirname, "static")));
app.get('/', (req,res) =>{
    res.render('home');
})

app.listen(port);
console.log(`Listening on Port ${port}`);