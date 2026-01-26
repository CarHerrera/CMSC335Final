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
const API_KEY_SPOON = process.env.SPOON_API;
const COCKTAIL_DB = 'https://www.thecocktaildb.com/api/json/v1/1/';
const SPOON_URL = `https://api.spoonacular.com/`;
let categories = {
  "drinks": [
    {
      "strCategory": "Beer"
    },
    {
      "strCategory": "Cocktail"
    },
    {
      "strCategory": "Cocoa"
    },
    {
      "strCategory": "Coffee / Tea"
    },
    {
      "strCategory": "Homemade Liqueur"
    },
    {
      "strCategory": "Ordinary Drink"
    },
    {
      "strCategory": "Other / Unknown"
    },
    {
      "strCategory": "Punch / Party Drink"
    },
    {
      "strCategory": "Shake"
    },
    {
      "strCategory": "Shot"
    },
    {
      "strCategory": "Soft Drink"
    }
  ]
};
const COCK_CAT = categories.drinks.map(x => x.strCategory);

// FINAL TODO: ADd more filters for the search. Should be multi ingredient and inventory search. 

const uri = `mongodb+srv://${MONGO_DB_USER}:${MONGO_DB_PW}@cluster0.ivirx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
function generatePage(favorites, userInv, entries="", cat=""){
    let options = "";
    COCK_CAT.forEach(e => {
        if (e == cat){
            options+=`<option value="${e}" selected>${e}</option>`
        } else {
            options+=`<option value="${e}">${e}</option>`;
        }
    })  
    let favs = "";
    favorites.forEach(drink => {
        let drinks = drink.drinks[0];
        favs += `<tr><td>${drinks.strDrink}</td><td><a href="/drinks/${drinks.idDrink}">More Info</a></td></tr>`
    })
    let inventory = "";
    userInv.forEach(ing => {
        inventory+=`<div class="drinkInvBox">
                        <label class="drinkItem" for="${ing}">${ing}</label>
                        <input type="checkbox" name="${ing}" class="hiddenCheckBox">
                    </div><br/>`
    })

    return {
        table:entries,
        categories: options,
        userFavorites: favs,
        userInventory: inventory
    }
}
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



let port = 3100;


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

const newUser = async function(req, res, next){
   let app = {
        _id:"",
        user: "", 
        pword:"", 
        age:"", 
        allergies: "", 
        drinkProfile:
            { 
                favorites:[], 
                recents:[], 
                inventory:[]
            }, 
        foodProfile:{
            favorites:[], 
            recents:[], 
            inventory:[]
        },
    }; 
    try {
        if(req.session.user == null){
            await client.connect();
            let db = await client.db(MONGO_DB_NAME).collection('guests');
            let count = await db.countDocuments();
            app._id = `${count}`;
            app.user = `guest ${count}`;
            let r = await db.insertOne(app);
            console.log(`${count}`);
            console.log(`Application entry created with id ${r.insertedId}`);
            req.session.user = app.user;
            req.session.drinkFavorites = app.drinkProfile.favorites;
            req.session.foodFavorites = app.foodProfile.favorites;
            req.session.drinkInventory = app.drinkProfile.inventory;
            req.session.foodInventory = app.foodProfile.inventory;
            req.session.userId = r.insertedId;
            req.session.lastMeal = null;
            req.session.save();
        }
    } catch (e){
        console.log(e)
    } finally{
        await client.close();
    }  
    next();
};

// const cacheMeal = async function (req, res, next){
//     console.log("In the cachE");
//     console.log(req.session.lastMeal);
//     if(req.session.lastMeal != null){
//         try{
//             const meal  =  req.session.lastMeal;
//             await client.connect();
//             let db = await client.db(MONGO_DB_NAME).collection('CachedMeals'); 
//             let found = db.findOne({"_id": meal._id});
//             if(found == null){
//                 let r = db.insertOne(meal);
//                 console.log(`Application entry created with id ${r.insertedId}`);
//             }
//         } catch (e){
//             console.log(e)
//         } finally{
//             await client.close();
//         } 
//     }
//     req.session.lastMeal = null;
//     next();
// }
app.use(newUser);
// app.use(cacheMeal);
/* Site pages */
app.get('//', (req,res) =>{
    req.newUser
    
    const userURI = encodeURI(req.session.user);
    return res.render('home',{userURI: userURI, user: req.session.user});
})

app.get('/account', (req,res) => {
    if(req.session.user == null){
        req.newUser
        const userURI = encodeURI(req.session.user);
        return res.render('error', {userURI: userURI, user: req.session.user});
    }
    const userURI = encodeURI(req.session.user);
    return res.render('account', {userURI: userURI, user:req.session.user, error:""});
})

app.post('/login', async (req,res) => {
    let {username, pword} = req.body;
    let r;
    try {
        await client.connect();
        r = await client.db(MONGO_DB_NAME).collection('guests').findOne({_id: username, pword:pword});
    } catch (e){
        console.log(e)
    } finally{
        await client.close();
    }
    if(r){
        req.session.user = r.user;
        req.session.drinkFavorites = r.drinkProfile.favorites;
        req.session.drinkInventory = r.drinkProfile.inventory;
        req.session.save();
        // console.log(req.session.drinkFavorites);
        const userURI = encodeURI(req.session.user);
        return res.render('home', {userURI: userURI, user: req.session.user})
    } else {
        const userURI = encodeURI(req.session.user);
        return res.render('account',{userURI: userURI, user:req.session.user, error:"Password/Username was not correct"});
    }
})
app.post('/signup', async (req,res) => {
    let {username, pword, age, allergies} = req.body;
    // const userURI = encodeURI(req.session.user);
    let app = {_id:username, userURI: userURI, user: username, pword:pword, age:age, allergies: allergies, 
        drinkProfile:{ favorites:[], recents:[], inventory:[]}, 
        foodProfile:{favorites:[], recents:[], inventory:[]},};
    try {
        await client.connect();
        let r = await client.db(MONGO_DB_NAME).collection('guests').insertOne(app);
        console.log(`Application entry created with id ${r.insertedId}`);
        req.session.user = app.user;
        req.session.save();
    } catch(e) {
        console.log(e);
    } finally {
        await client.close();
    }
    
    const userURI = encodeURI(req.session.user);
    return res.render('home', {userURI: userURI, user: username, entries:""});
})

app.get('/foodRecipes', async (req,res) => {
    if(req.session.user == null){
        req.newUser
        const userURI = encodeURI(req.session.user);
        return res.render('error', {userURI: userURI, user: req.session.user});
    }
    const userURI = encodeURI(req.session.user);
    let favorites = "";
    req.session.foodFavorites.forEach((meal) => {
        favorites+= `<tr><td>${meal.name}</td><td><a href="/meals/${meal.id}">More Info</a></td></tr>`;
    })
    return res.render('food', {userURI: userURI, user: req.session.user, entries:"", categories:"", favorites: favorites, inventory: "", cnt: req.session.foodInventory.length});

    // return res.render('underConstruction', {userURI: userURI, user: req.session.user});
});
app.post('/processMealFilter', (req,res) =>{
    if(req.session.user == null){
        req.newUser
        const userURI = encodeURI(req.session.user);
        return res.render('error', {userURI: userURI, user: req.session.user});
    }
    const {category, maxCal, maxSer, maxSug, allergies} = req.body;
    let query = ""
    if(category != ""){
        query = query.concat(`&category=${category}`)
    }
    if(maxCal != ""){
        query =  query.concat(`&maxCalories=${maxCal}`)
    }
    if(maxSer != ""){
        query = query.concat(`&maxServings=${maxSer}`)
    } 
    if(maxSug != ""){
        query = query.concat(`&maxSugar=${maxSug}`)
    } 
    if(allergies != "None"){
        if (Array.isArray(allergies)){
            query = query.concat(`&intolerances=${allergies.join(",")}`);
        } else {
            query = query.concat(`&intolerances=${allergies}`);
        }
    }
    let favorites = "";
    req.session.foodFavorites.forEach((meal) => {
        favorites+= `<tr><td>${meal.name}</td><td><a href="/meals/${meal.id}">More Info</a></td></tr>`;
    })
    fetch(`https://api.spoonacular.com/recipes/complexSearch?apiKey=${API_KEY_SPOON}${query}&number=50`).then(
        r => {
           return r.json();
        }).then(r =>{
            // console.log(r);
            let meals = r.results;
            let entries = "";
            meals.forEach(meal => {
                entries += `<tr><td>${meal.title}</td> <td><a href="/meals/${meal.id}">Info Link</a></td></tr>`;        
            })
            const userURI = encodeURI(req.session.user);
            
            return res.render('food', {userURI: userURI, user: req.session.user, entries:entries, categories:"", favorites: favorites, inventory: "", cnt: req.session.foodInventory.length});
        })
        // console.log(req.body);
        // console.log(query);
})
app.get('/meals/:id',  async (req,res) => {
    if(req.session.user == null){
        req.newUser
        return res.render('error', {userURI: userURI, user: req.session.user});
    }
    const userURI = encodeURI(req.session.user);
    let {id} = req.params;
    let fav = false;        
    req.session.foodFavorites.forEach((x) => {
            if (x.id == id){
                fav = true;
            } 
    })
    try{
            await client.connect();
            let found = await client.db(MONGO_DB_NAME).collection('CachedMeals').findOne({"_id": id});
            
            if(found == null){
                console.log('Spoonacular');    
                fetch(`${SPOON_URL}recipes/${id}/information?apiKey=${API_KEY_SPOON}`).then(
                    r => {return r.json();}
                ).then( async r=> {
                    let name = r.title;
                    let image = r.image;
                    let instructions = r.instructions;
                    let extendedIngredients = r.extendedIngredients;
                    const encode = encodeURI(name);
                    let ingredients = "<ol>";
                    extendedIngredients.forEach((item) => {
                        ingredients+= `<li>${item.original}</li>`
                    })
                    ingredients+= "</ol>";
                    
                    const cachedMeal = {
                        _id: id,
                        title: name,
                        instr: instructions,
                        ingr: ingredients,
                        img: image
                    };
                    
                    await client.connect();
                    let cache = await client.db(MONGO_DB_NAME).collection('CachedMeals').insertOne(cachedMeal);
                    console.log(`Application entry created with id ${cache.insertedId}`);    
                    await client.close();
                    return res.render('customRecipe',{userURI: userURI, user: req.session.user, id:id, 
                        recipeName:name, recipeEncode:encode, image:image, instructions:instructions, 
                        ingredients:ingredients ,fav:fav} );  
                })
            } else {
                console.log('pinged db');
                const id = found._id;
                const name = found.title;
                const ingredients = found.ingr;
                const instructions = found.instr;
                const image = found.img;
                const encode = encodeURI(name);
                return res.render('customRecipe',{userURI: userURI, user: req.session.user, id:id, recipeName:name, 
                    recipeEncode:encode, image:image, instructions:instructions, 
                    ingredients:ingredients ,fav:fav} );  
            }
    } catch (e){
        console.log(e)
    } finally{
        await client.close();
    } 
    
    
});

app.post('/addFavoriteRecipe/:id.:name', async (req,res) => {
    if(req.session.user == null){
        req.newUser
        const userURI = encodeURI(req.session.user);
        return res.render('error', {userURI: userURI, user: req.session.user});
    } 
    let {id, name} = req.params;
    // console.log();
    // console.log(id);
    // console.log(name);
    let added = true;
    try {
        await client.connect();
        const query = {_id: req.session.userId };
        let newFav = {$push: {'foodProfile.favorites': {id:id, name:name}}};
        let removeFav = {$pull: {'foodProfile.favorites': {id:id, name:name}}};
        // r = await client.db(MONGO_DB_NAME).collection('guests').updateOne(query,newFav);
        r = await client.db(MONGO_DB_NAME).collection('guests').findOne(query);
        if (r){
            // console.log(r.foodProfile.favorites);
            let find = false;
            r.foodProfile.favorites.forEach((x) => {
                if (x.id == id){
                    find = true;
                } 
            })
            if(find){
                r = await client.db(MONGO_DB_NAME).collection('guests').updateOne(query,removeFav);
                req.session.foodFavorites = req.session.foodFavorites.filter((x) => {return x.id != id});                
                added = false;
            } else {
                r = await client.db(MONGO_DB_NAME).collection('guests').updateOne(query,newFav);
                req.session.foodFavorites.push({id:id, name:name});
            }
        }
        // console.log(`Application entry created with id ${r.id}`);
    } catch (e){
        console.log(e)
    } finally{
        await client.close();
    }

    return res.json({isFavorited: added})
})

app.get('/drinkRecipes',async (req,res) =>{

    // Redundancy Check to see if use "exists"
    if(req.session.user == null){
        req.newUser
        const userURI = encodeURI(req.session.user);
        return res.render('error', {userURI: userURI, user: req.session.user});
    }
    let r;
    // Connect to DB and look up user 
    try {
        await client.connect();
        r = await client.db(MONGO_DB_NAME).collection('guests').findOne({_id: req.session.user});
    } catch (e){
        console.log(e)
    } finally{
        await client.close();
    }
    // Using the favorites from the user, look them up with an API Call and add them to a list to be dealt with later
    let promiseList = [];
    req.session.drinkFavorites.forEach(r => {
        promiseList.push(fetch(`https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${r}`).then(t => t.json()));
    })
    Promise.all([...promiseList])
        .then(results => {
            let page = generatePage(results, req.session.drinkInventory);
            const userURI = encodeURI(req.session.user);
            return res.render('drinks', {userURI: userURI, user: req.session.user, entries:page.table, categories:page.categories, favorites: page.userFavorites, inventory: page.userInventory, cnt: req.session.drinkInventory.length});
    })    
});
app.post('/remove', async (req,res) =>{
    if(req.session.user == null){
    req.newUser
    const userURI = encodeURI(req.session.user);
    return res.render('error', {userURI: userURI, user: req.session.user});
    }
    // Inventory Item to remove 
    let result = Object.setPrototypeOf(req.body, Object.prototype);
    try {
        await client.connect();
        let query = {_id: req.session.user}
        let add = {$pull: {'drinkProfile.inventory': {$in: Object.keys(result)}}}
        r = await client.db(MONGO_DB_NAME).collection('guests').updateOne(query,add);
        req.session.drinkInventory = req.session.drinkInventory.filter(r=> !Object.keys(result).includes(r));
        console.log(`Application entry created with id ${r.id}`);
    } catch (e){
        console.log(e)
    } finally{
        await client.close();
    }
    let temp = "";
    let promiseList = [];
    req.session.drinkFavorites.forEach(r => {
        promiseList.push(fetch(`https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${r}`).then(t => t.json()));
    })
    Promise.all([...promiseList])
        .then(results => {
            let page = generatePage(results, req.session.drinkInventory);
            const userURI = encodeURI(req.session.user);
            return res.render('drinks', {userURI: userURI, user: req.session.user, entries:page.table, categories:page.categories, favorites: page.userFavorites, inventory: page.userInventory, cnt: req.session.drinkInventory.length});
    })    
})
app.post('/processFilters', (req,res)=>{
    if(req.session.user == null){
        req.newUser
        const userURI = encodeURI(req.session.user);
        return res.render('error', {userURI: userURI, user: req.session.user});
    }
    // Favorite look ups
    let filter = "filter.php?c=";
    let promiseList = [];
    req.session.drinkFavorites.forEach(r => {
        promiseList.push(fetch(`${COCKTAIL_DB}lookup.php?i=${r}`).then(t => t.json()));
    })
    // Category selected by the user
    let category = Object.setPrototypeOf(req.body, Object.prototype);
    promiseList.push(fetch(`${COCKTAIL_DB}${filter}${category.category}`).then(r => r.json()));
    Promise.all([...promiseList]).then(
        results => {
            let queryResults = results.pop().drinks;
            let entries ="";
            let i = 0;
            queryResults.forEach(r => {
                // if (i %2 == 0){
                //     entries += `<tr class="bg-teal-600"><td>${r.strDrink}</td> <td><a href="/drinks/${r.idDrink}">Info Link</a></td></tr>`;
                // } else {
                //     entries += `<tr class="bg-violet-600"><td>${r.strDrink}</td> <td><a href="/drinks/${r.idDrink}">Info Link</a></td></tr>`;
                // }
                // i++;
                entries += `<tr><td>${r.strDrink}</td> <td><a href="/drinks/${r.idDrink}">Info Link</a></td></tr>`;
            })
            
            let page = generatePage(results, req.session.drinkInventory, entries, category.category);
            const userURI = encodeURI(req.session.user);
            return res.render('drinks', {userURI: userURI, user: req.session.user, entries:page.table, categories:page.categories, favorites: page.userFavorites, inventory: page.userInventory, cnt: req.session.drinkInventory.length});
        }
    )


})
app.post('/processInventory', (req, res) => {
    if(req.session.user == null){
        req.newUser
        const userURI = encodeURI(req.session.user);
        return res.render('error', {userURI: userURI, user: req.session.user});
    }
    // Favorite look ups
    let filter = "filter.php?i=";
    let promiseList = [];
    req.session.drinkInventory.forEach( i => {
        i = i.replace(/ /g, "_");
        promiseList.push(fetch(`${COCKTAIL_DB}${filter}${i}`).then(r => r.json()));
        console.log(`${COCKTAIL_DB}${filter}${i}`);
    })
    req.session.drinkFavorites.forEach(r => {
        promiseList.push(fetch(`${COCKTAIL_DB}lookup.php?i=${r}`).then(t => t.json()));
    })
    Promise.all([...promiseList]).then(
        results => {
            let favs = [];
            for(let i =0 ; i<req.session.drinkFavorites.length;i++){
                favs.push(results.pop());
            }
            let entries ="";
            i = 0;
            results.forEach(r =>{
                let drinkResults = r.drinks;
                drinkResults.forEach(e =>{
                    // if (i %2 == 0){
                    //     entries += `<tr class="bg-teal-600"><td>${e.strDrink}</td> <td><a href="/drinks/${e.idDrink}">Info Link</a></td></tr>`;
                    // } else {
                    //     entries += `<tr class="bg-violet-600"><td>${e.strDrink}</td> <td><a href="/drinks/${e.idDrink}">Info Link</a></td></tr>`;
                    // }
                    // i++;
                    entries += `<tr><td>${e.strDrink}</td> <td><a href="/drinks/${e.idDrink}">Info Link</a></td></tr>`;
                })
            })
            let page = generatePage(favs, req.session.drinkInventory, entries=entries);
            const userURI = encodeURI(req.session.user);
            return  res.render('drinks', {userURI: userURI, user: req.session.user, entries:page.table, categories:page.categories, favorites: page.userFavorites, inventory: page.userInventory, cnt: req.session.drinkInventory.length});
        }
    )

})
app.post('/addDrink', async (req,res) => {
    if(req.session.user == null){
        req.newUser
        const userURI = encodeURI(req.session.user);
        return res.render('error', {userURI: userURI, user: req.session.user});
    }
    let item = Object.setPrototypeOf(req.body, Object.prototype);
    try {
        await client.connect();
        let query = {_id: req.session.userId }
        let add = {$push: {'drinkProfile.inventory': item.ingredient}}
        r = await client.db(MONGO_DB_NAME).collection('guests').updateOne(query,add);
        req.session.drinkInventory.push(item.ingredient);
        console.log(`Application entry created with id ${r.id}`);
    } catch (e){
        console.log(e)
    } finally{
        await client.close();
    }
    let promiseList = [];
    req.session.drinkFavorites.forEach(r => {
        promiseList.push(fetch(`https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${r}`).then(t => t.json()));
    })
    Promise.all([...promiseList])
        .then(results => {
            let page = generatePage(results, req.session.drinkInventory);
            const userURI = encodeURI(req.session.user);
            return res.render('drinks', {userURI: userURI, user: req.session.user, entries:page.table, categories:page.categories, favorites: page.userFavorites, inventory: page.userInventory, cnt: req.session.drinkInventory.length});
    })    
})
app.get('/error', (req,res)=>{
    const userURI = encodeURI(req.session.user);
    return res.render('error', {userURI: userURI, user: req.session.user});
})
app.get('/drinks/:id', async (req,res) =>{
    if(req.session.user == null){
        req.newUser
    const userURI = encodeURI(req.session.user);
        return res.render('error', {userURI: userURI, user: req.session.user});
    }
    let id = req.params;
    fetch(`https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${id.id}`)
    .then( r => {
            if (r.ok){
                return r.json();
            }
        }   
    ).then(d => {
        let drink = d.drinks[0];
        const pattern = /([0-9]+\.?| )? ?([\(\)\":A-Za-z0-9\'’]+(\.| |, ?)?)+/g;
        // patternTest = /([0-9]+\.?| )? ?([\(\)\":A-Za-z0-9\'’]+(\.| |, ?)?)+/g;
        // console.log(drink);
        // let instr = `<span>${drink.strInstructions}</span>`;
        let instr = drink.strInstructions.match(pattern);

        instr.forEach((line, index, arr)=>{
            let tmp = line.trim();
            let numCheck = tmp.match(/[0-9]+\.(?! )/);
            // console.log(line);
            // console.log(numCheck);
            if ( numCheck != null){
                tmp = tmp.replace(numCheck[0], `${numCheck[0]} `);
            }
            arr[index] = tmp;
        })
        // console.log();
        let img = drink.strDrinkThumb;
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
        let instrList = '<ol>';

        for(i = 0; i<instr.length; i++){
            instrList += `<li>${instr[i]}\n</li>`;
        }
        instrList+="</ol>";
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
        let fav = false;        
        if(req.session.drinkFavorites.includes(id.id)){
            fav = true;
        }
        const userURI = encodeURI(req.session.user);
        return res.render('customDrink',{userURI: userURI, user: req.session.user, id:id.id, drinkName: name, image:img, instructions:instrList, ingredients:ingList ,fav:fav} );  
    }).catch(e => {
        console.log(e);
    })
})
app.get('/profile/:id', (req,res) => {
    if(req.session.user == null){
        req.newUser
        const userURI = encodeURI(req.session.user);
        return res.render('error', {userURI: userURI, user: req.session.user});
    }
    let promiseList = [];
    req.session.drinkFavorites.forEach(r => {
        promiseList.push(fetch(`https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${r}`).then(t => t.json()));
    })
    Promise.all([...promiseList])
        .then(results => {
            let favs = "";
            results.forEach(drink => {
                let d = drink.drinks[0];
                console.log(d);
                favs += `<div>${d.strDrink} <a class="fa fa-star checked" id="star" onclick=toggle(${d.idDrink})></a></div>`
            })
            const userURI = encodeURI(req.session.user);
            return res.render('profile', {userURI: userURI, user: req.session.user, favorites:favs})
            // const userURI = encodeURI(req.session.user);
            // res.render('drinks', {userURI: userURI, user: req.session.user, entries:page.table, categories:page.categories, favorites: page.userFavorites, inventory: page.userInventory, cnt: req.session.drinkInventory.length});
    })   
    
    const userURI = encodeURI(req.session.user);
    // return res.render('underConstruction', {userURI: userURI, user: req.session.user});
})
app.post('/removeDrinkItems/:items', async (req,res)=> {
    if(req.session.user == null){
        req.newUser
        const userURI = encodeURI(req.session.user);
        return res.render('error', {userURI: userURI, user: req.session.user});
    }
    let {items} = req.params;
    let list = JSON.parse(items);
    try {
        await client.connect();
        let query = {_id: req.session.userId }
        let add = {$pull: {'drinkProfile.inventory': {$in :list}}}
        r = await client.db(MONGO_DB_NAME).collection('guests').updateOne(query,add);
        req.session.drinkInventory = req.session.drinkInventory.filter(x => !list.includes(x));
        console.log(`Removed items ${list} from ${r}`);
    } catch (e){
        console.log(e)
    } finally{
        await client.close();
    }
    let inventory = "";
    req.session.drinkInventory.forEach(ing => {
        inventory+=`<div class="drinkInvBox">
                        <label class="drinkItem" for="${ing}">${ing}</label>
                        <input type="checkbox" name="${ing}" class="hiddenCheckBox">
                    </div><br/>`
    })
    return res.json(inventory);
})
app.post('/addDrinkItem/:item', async (req,res)=> {
    if(req.session.user == null){
        req.newUser
        const userURI = encodeURI(req.session.user);
        return res.render('error', {userURI: userURI, user: req.session.user});
    }
    let {item} = req.params;
    if (!req.session.drinkInventory.includes(item)){
        try {
            await client.connect();
            let query = {_id: req.session.userId}
            let add = {$push: {'drinkProfile.inventory': item}}
            r = await client.db(MONGO_DB_NAME).collection('guests').updateOne(query,add);
            req.session.drinkInventory.push(item);
            console.log(`Application entry created with id ${r.id}`);
        } catch (e){
            console.log(e)
        } finally{
            await client.close();
        }   
    } else {
        return res.json({
            success : -1,
            data: ""
        });
    }

    let inventory = "";
    req.session.drinkInventory.forEach(ing => {
        inventory+=`<div class="drinkInvBox">
                        <label class="drinkItem" for="${ing}">${ing}</label>
                        <input type="checkbox" name="${ing}" class="hiddenCheckBox">
                    </div><br/>`
    })
    return res.json({
        success : 200,
        data: inventory
    });
})
app.post('/addFavoriteDrink/:id', async (req,res) => {
    if(req.session.user == null){
        req.newUser
        const userURI = encodeURI(req.session.user);
        return res.render('error', {userURI: userURI, user: req.session.user});
    } 
    let {id} = req.params;
    // console.log();
    let added = true;
    try {
        await client.connect();
        const query = {_id: req.session.userId };
        let newFav = {$push: {'drinkProfile.favorites': id}};
        let removeFav = {$pull: {'drinkProfile.favorites': id}};
        // r = await client.db(MONGO_DB_NAME).collection('guests').updateOne(query,newFav);
        r = await client.db(MONGO_DB_NAME).collection('guests').findOne(query);
        if (r){
            if(r.drinkProfile.favorites.includes(id)){
                r = await client.db(MONGO_DB_NAME).collection('guests').updateOne(query,removeFav);
                req.session.drinkFavorites = req.session.drinkFavorites.filter((x) => {return x != id});                
                added = false;
            } else {
                r = await client.db(MONGO_DB_NAME).collection('guests').updateOne(query,newFav);
                req.session.drinkFavorites.push(id);

                
            }
        }
        // console.log(`Application entry created with id ${r.id}`);
    } catch (e){
        console.log(e)
    } finally{
        await client.close();
    }

    return res.json({isFavorited: added})
})
app.post('/changeName/:name', async (req, res) => {
    if(req.session.user == null){
        req.newUser
        const userURI = encodeURI(req.session.user);
        return res.render('error', {userURI: userURI, user: req.session.user});
    }
    let id = req.params['name'];
    console.log(id);
    let added = true;
    try {
        await client.connect();
        const query = {_id: req.session.userId };
        let newName = {$set: {'user': id}};
        // r = await client.db(MONGO_DB_NAME).collection('guests').updateOne(query,newFav);
        r = await client.db(MONGO_DB_NAME).collection('guests').updateOne(query,newName);
        req.session.user = id;
        // console.log(`Application entry created with id ${r.id}`);
    } catch (e){
        console.log(e)
    } finally{
        await client.close();
    }

    return res.json({nameAdded: true})
})
app.get('/logout', (req,res)=>{
    req.session.user='guest';
    req.session.drinkFavorites = [];
    req.session.drinkInventory = [];
    req.session.save();
    const userURI = encodeURI(req.session.user);
    return res.render('home',{userURI: userURI, user: req.session.user});
})
app.listen(port);
console.log(`Listening on Port ${port}`);
