const {MongoClient, ServerApiVersion} = require('mongodb');
const express = require('express');
const path = require("path");
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const app = express();
const fs = require('fs');
require("dotenv").config({path: path.resolve(__dirname, '.env')});
const MONGO_DB_USER = process.env.MONGO_DB_USER;
const MONGO_DB_PW = process.env.MONGO_DB_PW;
const MONGO_DB_NAME = process.env.MONGO_DB_DB;
const API_KEY_SPOON = process.env.API_KEY_SPOON;
const COCKTAIL_DB = 'https://www.thecocktaildb.com/api/json/v1/1/';
const COCK_CAT = new Set();


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
app.use(
    session({
        resave:true, saveUninitialized: false, secret: process.env.SECRET, sameSite: true,
    })
);

/* Site pages */
app.get('/', (req,res) =>{
    if(req.session.user == null){
        req.session.user = 'guest';
        req.session.save();
    }
    // console.log(req.session.user);
    res.render('home',{user: req.session.user});
})

app.get('/account', (req,res) => {
    res.render('account', {user:req.session.user, error:""});
})

app.post('/login', async (req,res) => {
    let {username, pword} = req.body;
    let r;
    try {
        await client.connect();
        r = await client.db(MONGO_DB_NAME).collection('users').findOne({_id: username, pword:pword});
    } catch (e){
        console.log(e)
    } finally{
        await client.close();
    }
    if(r){
        req.session.user = r.user;
        req.session.save();
        res.render('home', {user: req.session.user})
    } else {
        res.render('account',{user:req.session.user, error:"Password/Username was not correct"});
    }
})

app.post('/signup', async (req,res) => {
    let {username, pword, age, allergies} = req.body;
    let app = {_id:username, user: username, pword:pword, age:age, allergies: allergies};
    try {
        await client.connect();
        let r = await client.db(MONGO_DB_NAME).collection('users').insertOne(app);
        console.log(`Application entry created with id ${r.insertedId}`);
        req.session.user = app.user;
        req.session.save();
    } catch(e) {
        console.log(e);
    } finally {
        await client.close();
    }
    
    res.render('home', {user: username, entries:""});
})
app.get('/foodRecipes', async (req,res) => {
    res.send('Nice!');
});
app.get('/drinkRecipes', (req,res) =>{
    let categories = "";
    fetch(`${COCKTAIL_DB}list.php?c=list`)
        .then(r => {
            if (r.ok){
                return r.json();
            } 
        })
        .then( d =>{
            d.drinks.forEach(e => {
                categories+=`<option value="${e.strCategory}">${e.strCategory}</option>`
                COCK_CAT.add(e.strCategory);
            });
            res.render('drinks', {user: req.session.user, entries:"", categories:categories});
        }) 
        .catch(e => {
            console.log(e);
        })
        
    
});
app.post('/processFilters', (req,res)=>{
    let filter = "filter.php?c=";
    // let {category} = req.body.category;
    let category = Object.setPrototypeOf(req.body, Object.prototype);
    console.log(category);
    let entries = "";
    fetch(`${COCKTAIL_DB}${filter}${category.category}`)
        .then(r => {
            if (r.ok){
                return r.json();
            } 
        })
        .then( d =>{
            
            let categories = "";
            d.drinks.forEach(r =>{ entries += `<tr><td>${r.strDrink}</td> <td>N/A</td><td>N/A</td><td>N/A</td></tr>`; console.log(r)})
            COCK_CAT.forEach(e => {categories+=`<option value="${e}">${e}</option>`;});
            console.log(categories);
            res.render('drinks', {user: req.session.user, entries:entries, categories:categories});
        }) 
        .catch(e => {
            console.log(e);
        })
    
})
app.get('/logout', (req,res)=>{
    req.session.user='guest';
    req.session.save();
    res.render('home',{user: req.session.user});
})
app.listen(port);
console.log(`Listening on Port ${port}`);