const {MongoClient, ServerApiVersion} = require('mongodb');
const express = require('express');
const path = require("path");
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const app = express();
const fs = require('fs');
require("dotenv").config({path: path.resolve(__dirname, '.env')});
const MONGO_DB_USER = process.env.MONGO_DB_USER;
const MONGO_DB_PW = process.env.MONGO_DB_PW;
const MONGO_DB_NAME = process.env.MONGO_DB_DB;
const API_KEY_SPOON = process.env.API_KEY_SPOON;

const uri = `mongodb+srv://${MONGO_DB_USER}:${MONGO_DB_PW}@cluster0.ivirx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);



let port = 8000;


app.set("views", path.resolve(__dirname, "templates")); 
app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({extended:false})); 
app.use(cookieParser());
app.use(express.static(path.resolve(__dirname, "static")));


/* Site pages */
app.get('/', (req,res) =>{
    if(req.cookies.user == null){
        res.cookie('user', 'guest', {httpOnly:true});
    }
    // console.log(req.cookies.user);
    res.render('home',{user:req.cookies.user});
})

app.get('/account', (req,res) => {
    res.render('account', {user:req.cookies.user});
})

app.post('/login', (req,res) => {
    res.send('NICE!');
})

app.post('/signup', async (req,res) => {
    let {name, email, pword, age, allergies} = req.body;
    let app = {name:name, email:email, pword:pword, age:age, allergies: allergies};
    try {
        await client.connect();
        let r = await client.db(MONGO_DB_NAME).collection('users').insertOne(app);
        console.log(`Application entry created with id ${r.insertedId}`);
    } catch(e) {
        console.log(e);
    } finally {
        await client.close();
    }
    
    res.render('home', {user: name});
})
app.listen(port);
console.log(`Listening on Port ${port}`);