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
    if(req.session.user == null){
        req.session.user = 'guest';
        req.session.favorites = [];
        req.session.drinkInventory = [];
        req.session.save();
    }
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
        req.session.favorites = r.drinkProfile.favorites;
        req.session.drinkInventory = r.drinkProfile.inventory;
        req.session.save();
        // console.log(req.session.favorites);
        res.render('home', {user: req.session.user})
    } else {
        res.render('account',{user:req.session.user, error:"Password/Username was not correct"});
    }
})
app.post('/signup', async (req,res) => {
    let {username, pword, age, allergies} = req.body;
    let app = {_id:username, user: username, pword:pword, age:age, allergies: allergies, 
        drinkProfile:{ favorites:[], recents:[], inventory:[]}, 
        foodProfile:{favorites:[], recents:[], inventory:[]},};
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
    if(req.session.user == null){
        req.session.user = 'guest';
        req.session.favorites = [];
        req.session.drinkInventory = [];
        req.session.save();
        res.render('error', {user: req.session.user})
    }
    res.send('Nice!');
});
app.get('/drinkRecipes',async (req,res) =>{
    if(req.session.user == null){
        req.session.user = 'guest';
        req.session.favorites = [];
        req.session.drinkInventory = [];
        req.session.save();
        res.render('error', {user: req.session.user})
    }
    let r;
    try {
        await client.connect();
        r = await client.db(MONGO_DB_NAME).collection('users').findOne({_id: req.session.user});
    } catch (e){
        console.log(e)
    } finally{
        await client.close();
    }
    let temp = "";
    let promiseList = [];
    req.session.favorites.forEach(r => {
        promiseList.push(fetch(`https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${r}`).then(t => t.json()));
    })
    promiseList.push((fetch (`${COCKTAIL_DB}list.php?c=list`).then(t => t.json())));
    Promise.all([...promiseList])
        .then(results => {
            let categories = results.pop().drinks;
            let options = "";
            categories.forEach(e => {options+=`<option value="${e.strCategory}">${e.strCategory}</option>`;})   
            let favs = "";
            results.forEach(drink => {
                favs += "<tr>"
                let drinks = drink.drinks[0];
                favs += `<td>${drinks.strDrink}</td><td><a href="/drinks/${drinks.idDrink}">More Info</a></td>`;
                COCK_CAT.add(drinks.strDrink);
                favs += "</tr>";
            })
            let entries = "";
            let inventory = "";
            req.session.drinkInventory.forEach((ing) => {
                inventory+=`<label class="drinkItem" for="${ing}">${ing}</label>
                            <input type="checkbox" name="${ing}" class="remove">
                            <br>`
            })
            // results.forEach(i => console.log(i));
            res.render('drinks', {user: req.session.user, entries:entries, categories:options, favorites: favs, inventory: inventory});
    })    
});
app.post('/remove', async (req,res) =>{
    if(req.session.user == null){
    req.session.user = 'guest';
    req.session.favorites = [];        
    req.session.drinkInventory = [];
    req.session.save();
    res.render('error', {user: req.session.user})
    }
    let result = Object.setPrototypeOf(req.body, Object.prototype);
    try {
        await client.connect();
        let query = {_id: req.session.user}
        let add = {$pull: {'drinkProfile.inventory': {$in: Object.keys(result)}}}
        r = await client.db(MONGO_DB_NAME).collection('users').updateOne(query,add);
        req.session.drinkInventory = req.session.drinkInventory.filter(r=> !Object.keys(result).includes(r));
        console.log(`Application entry created with id ${r.id}`);
    } catch (e){
        console.log(e)
    } finally{
        await client.close();
    }
    let temp = "";
    let promiseList = [];
    req.session.favorites.forEach(r => {
        promiseList.push(fetch(`https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${r}`).then(t => t.json()));
    })
    promiseList.push((fetch (`${COCKTAIL_DB}list.php?c=list`).then(t => t.json())));
    Promise.all([...promiseList])
        .then(results => {
            let categories = results.pop().drinks;
            let options = "";
            categories.forEach(e => {options+=`<option value="${e.strCategory}">${e.strCategory}</option>`;})   
            let favs = "";
            results.forEach(drink => {
                favs += "<tr>"
                let drinks = drink.drinks[0];
                favs += `<td>${drinks.strDrink}</td><td><a href="/drinks/${drinks.idDrink}">More Info</a></td>`;
                COCK_CAT.add(drinks.strDrink);
                favs += "</tr>";
            })
            let entries = "";
            let inventory = "";
            req.session.drinkInventory.forEach((ing) => {
                inventory+=`<label class="drinkItem" for="${ing}">${ing}</label>
                            <input type="checkbox" name="${ing}" class="remove">
                            <br>`
            })
            // results.forEach(i => console.log(i));
            res.render('drinks', {user: req.session.user, entries:entries, categories:options, favorites: favs, inventory: inventory});
    })    
})
app.post('/processFilters', (req,res)=>{
    if(req.session.user == null){
        req.session.user = 'guest';
        req.session.favorites = [];
        req.session.drinkInventory = [];
        req.session.save();
        res.render('error', {user: req.session.user})
    }
    let filter = "filter.php?c=";
    let promiseList = [];
    req.session.favorites.forEach(r => {
        promiseList.push(fetch(`https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${r}`).then(t => t.json()));
    })
    let category = Object.setPrototypeOf(req.body, Object.prototype);
    let entries = "";
    promiseList.push(fetch(`${COCKTAIL_DB}${filter}${category.category}`).then(r => r.json()));
    Promise.all([...promiseList]).then(
        results => {
            let categories = "";
            let entries = "";
            let queryResults = results.pop().drinks;
            queryResults.forEach(r => {
                entries += `<tr><td>${r.strDrink}</td> <td><a href="/drinks/${r.idDrink}">Info Link</a></td></tr>`;
            })
            
            COCK_CAT.forEach(e => {categories+=`<option value="${e}">${e}</option>`;});
            let favorites = ""
            results.forEach(r => {
                drink = r.drinks[0];
                favorites +=  `<tr><td>${drink.strDrink}</td><td><a href="/drinks/${drink.idDrink}">More Info</a></td></tr>`;
            })
            let inventory = "";
            req.session.drinkInventory.forEach((ing) => {
                inventory+=`<label class="drinkItem" for="${ing}">${ing}</label>
                            <input type="checkbox" name="${ing}" class="remove">
                            <br>`
            })
            res.render('drinks', {user: req.session.user, entries:entries, categories:categories, favorites: favorites, inventory:inventory});
        }
    )


})
app.post('/addItem', async (req,res) => {
    let item = Object.setPrototypeOf(req.body, Object.prototype);
    try {
        await client.connect();
        let query = {_id: req.session.user}
        let add = {$push: {'drinkProfile.inventory': item.ingredient}}
        r = await client.db(MONGO_DB_NAME).collection('users').updateOne(query,add);
        req.session.drinkInventory.push(item.ingredient);
        console.log(`Application entry created with id ${r.id}`);
    } catch (e){
        console.log(e)
    } finally{
        await client.close();
    }
    
    res.render('profile', {user: req.session.user})
})
app.get('/error', (req,res)=>{
    res.render('error', {user: req.session.user})
})
app.get('/drinks/:id', async (req,res) =>{
    if(req.session.user == null){
        req.session.user = 'guest';
        req.session.favorites = [];
        req.session.drinkInventory = [];
        req.session.save();
        res.render('error', {user: req.session.user})
    }
    let id = req.params;
    try {
        await client.connect();
        let query = {_id: req.session.user}
        let recent = {$push: {'drinkProfile.recents': id.id}}
        r = await client.db(MONGO_DB_NAME).collection('users').updateOne(query,recent);
        console.log(`Application entry created with id ${r.id}`);
    } catch (e){
        console.log(e)
    } finally{
        await client.close();
    }
    fetch(`https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${id.id}`)
    .then( r => {
            if (r.ok){
                return r.json();
            }
        }   
    ).then(d => {
        
        let drink = d.drinks[0];
        // console.log(drink);
        let instr = `<span>${drink.strInstructions}</span>`;
        let img = drink.strDrinkThumb;
        let imgUrl = `<img src=${img} class='drinkImage'>`
        let name = drink.strDrink;
        let ing = [drink.strIngredient1,drink.strIngredient2,drink.strIngredient3,
            drink.strIngredient4,drink.strIngredient5,drink.strIngredient6,
            drink.strIngredient7,drink.strIngredient8,drink.strIngredient9,
            drink.strIngredient10,drink.strIngredient11,drink.strIngredient12,
            drink.strIngredient13,drink.strIngredient14,drink.strIngredient15,
        ];
        let meas = [drink.strMeasure1,drink.strMeasure2,drink.strMeasure3,
            drink.strMeasure4,drink.strMeasure5,drink.strMeasure6,
            drink.strMeasure7,drink.strMeasure8,drink.strMeasure9,
            drink.strMeasure10,drink.strMeasure11,drink.strMeasure12,
            drink.strMeasure13,drink.strMeasure14,drink.strMeasure15,
        ];
        let ingList = '<ol>';

        for(i = 0; i<=14; i++){
            if (meas[i] != null &&  ing[i] != null){
                if(meas[i] != ''){
                    ingList+= `<li>${meas[i]} of ${ing[i]} </li>`
                }
                
            }
            
        }
        ingList+= `</ol>`;
        // console.log(measureList);
        // let ls = instr.split(".");
        // console.log(instr);
        res.render('customDrink',{user: req.session.user, id:id.id, drinkName: name, image:imgUrl, instructions:instr, ingredients:ingList} );  
    }).catch(e => {
        console.log(e);
    })
})
app.get('/profile/:id', (req,res) => {
    if(req.session.user == null){
        req.session.user = 'guest';
        req.session.favorites = [];
        req.session.drinkInventory = [];
        req.session.save();
        res.render('error', {user: req.session.user})
    }
    res.render('profile', {user: req.session.user})
})
app.get('/addFavoriteDrink/:id', async (req,res) => {
    if(req.session.user == null){
        req.session.user = 'guest';
        req.session.favorites = [];
        req.session.drinkInventory = [];
        req.session.save();
        res.render('error', {user: req.session.user})
    }
    let {id} = req.params;
    // console.log(req.params);
    req.session.favorites.push(id);
    try {
        await client.connect();
        let query = {_id: req.session.user}
        let newFav = {$push: {'drinkProfile.favorites': id}}
        r = await client.db(MONGO_DB_NAME).collection('users').updateOne(query,newFav);
        console.log(`Application entry created with id ${r.id}`);
    } catch (e){
        console.log(e)
    } finally{
        await client.close();
    }
    let promiseList = [];
    req.session.favorites.forEach(r => {
        promiseList.push(fetch(`https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${r}`).then(t => t.json()));
    })
    Promise.all([...promiseList]).then(data =>{
        let favorites = ""
        data.forEach(r => {
            drink = r.drinks[0];
            favorites +=  `<tr><td>${drink.strDrink}</td><td><a href="/drinks/${drink.idDrink}">More Info</a></td></tr>`;
        })
        let categories ="";
        COCK_CAT.forEach(e => {categories+=`<option value="${e}">${e}</option>`;});
        let inventory = "";
        req.session.drinkInventory.forEach((ing) => {
            inventory+=`<label class="drinkItem" for="${ing}">${ing}</label>
                        <input type="checkbox" name="${ing}" class="remove">
                        <br>`
        })
        res.render('drinks', {user:req.session.user, favorites: favorites, categories:categories, entries:""});
    })
})
app.get('/logout', (req,res)=>{
    req.session.user='guest';
    req.session.favorites = [];
    req.session.drinkInventory = [];
    req.session.save();
    res.render('home',{user: req.session.user});
})
app.listen(port);
console.log(`Listening on Port ${port}`);