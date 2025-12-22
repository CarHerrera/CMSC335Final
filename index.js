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
// const API_KEY_SPOON = process.env.API_KEY_SPOON;
const COCKTAIL_DB = 'https://www.thecocktaildb.com/api/json/v1/1/';
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
app.get('//', async (req,res) =>{
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
            inventory:[]},
        favorites: [],
    };
    let guestId;
    try {
        
        // req.session.user = app.user;
        // req.session.favorites = app.favorites;
        // req.session.drinkInventory = app.drinkProfile.inventory;
        // req.session.save();
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
            req.session.favorites = app.favorites;
            req.session.drinkInventory = app.drinkProfile.inventory;
            req.session.userId = r.insertedId;
            req.session.save();
        }
    } catch (e){
        console.log(e)
    } finally{
        await client.close();
    }  
    
    
    return res.render('home',{user: req.session.user});
})

app.get('/account', (req,res) => {
    if(req.session.user == null){
        req.session.user = 'guest';
        req.session.favorites = [];
        req.session.drinkInventory = [];
        req.session.save();
    }
    return res.render('account', {user:req.session.user, error:""});
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
        req.session.favorites = r.drinkProfile.favorites;
        req.session.drinkInventory = r.drinkProfile.inventory;
        req.session.save();
        // console.log(req.session.favorites);
        return res.render('home', {user: req.session.user})
    } else {
        return res.render('account',{user:req.session.user, error:"Password/Username was not correct"});
    }
})
app.post('/signup', async (req,res) => {
    let {username, pword, age, allergies} = req.body;
    let app = {_id:username, user: username, pword:pword, age:age, allergies: allergies, 
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
    
    return res.render('home', {user: username, entries:""});
})

app.get('/foodRecipes', async (req,res) => {
    if(req.session.user == null){
        req.session.user = 'guest';
        req.session.favorites = [];
        req.session.drinkInventory = [];
        req.session.save();
    return res.render('error', {user: req.session.user});
    }
    // res.render('food', {user: req.session.user, entries:"", categories:"", favorites: "", inventory: ""});
    return res.render('underConstruction', {user: req.session.user});
});
app.post('/processMealFilter', (req,res) =>{
    if(req.session.user == null){
        req.session.user = 'guest';
        req.session.favorites = [];
        req.session.drinkInventory = [];
        req.session.save();
        return res.render('error', {user: req.session.user});
    }
    fetch(`https://api.spoonacular.com/recipes/complexSearch?apiKey=${API_KEY_SPOON}&`).then(
        r => {
            r.json();
        }).then(r =>{
            console.log(r);
        })
    
})
app.get('/drinkRecipes',async (req,res) =>{

    // Redundancy Check to see if use "exists"
    if(req.session.user == null){
        req.session.user = 'guest';
        req.session.favorites = [];
        req.session.drinkInventory = [];
        req.session.save();
        return res.render('error', {user: req.session.user});
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
    req.session.favorites.forEach(r => {
        promiseList.push(fetch(`https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${r}`).then(t => t.json()));
    })
    Promise.all([...promiseList])
        .then(results => {
            let page = generatePage(results, req.session.drinkInventory);
            return res.render('drinks', {user: req.session.user, entries:page.table, categories:page.categories, favorites: page.userFavorites, inventory: page.userInventory, cnt: req.session.drinkInventory.length});
    })    
});
app.post('/remove', async (req,res) =>{
    if(req.session.user == null){
    req.session.user = 'guest';
    req.session.favorites = [];        
    req.session.drinkInventory = [];
    req.session.save();
    return res.render('error', {user: req.session.user});
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
    req.session.favorites.forEach(r => {
        promiseList.push(fetch(`https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${r}`).then(t => t.json()));
    })
    Promise.all([...promiseList])
        .then(results => {
            let page = generatePage(results, req.session.drinkInventory);
            return res.render('drinks', {user: req.session.user, entries:page.table, categories:page.categories, favorites: page.userFavorites, inventory: page.userInventory, cnt: req.session.drinkInventory.length});
    })    
})
app.post('/processFilters', (req,res)=>{
    if(req.session.user == null){
        req.session.user = 'guest';
        req.session.favorites = [];
        req.session.drinkInventory = [];
        req.session.save();
        return res.render('error', {user: req.session.user});
    }
    // Favorite look ups
    let filter = "filter.php?c=";
    let promiseList = [];
    req.session.favorites.forEach(r => {
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
            res.render('drinks', {user: req.session.user, entries:page.table, categories:page.categories, favorites: page.userFavorites, inventory: page.userInventory, cnt: req.session.drinkInventory.length});
        }
    )


})
app.post('/processInventory', (req, res) => {
    if(req.session.user == null){
        req.session.user = 'guest';
        req.session.favorites = [];
        req.session.drinkInventory = [];
        req.session.save();
        return res.render('error', {user: req.session.user});
    }
    // Favorite look ups
    let filter = "filter.php?i=";
    let promiseList = [];
    req.session.drinkInventory.forEach( i => {
        i = i.replace(/ /g, "_");
        promiseList.push(fetch(`${COCKTAIL_DB}${filter}${i}`).then(r => r.json()));
        console.log(`${COCKTAIL_DB}${filter}${i}`);
    })
    req.session.favorites.forEach(r => {
        promiseList.push(fetch(`${COCKTAIL_DB}lookup.php?i=${r}`).then(t => t.json()));
    })
    Promise.all([...promiseList]).then(
        results => {
            let favs = [];
            for(let i =0 ; i<req.session.favorites.length;i++){
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
            return  res.render('drinks', {user: req.session.user, entries:page.table, categories:page.categories, favorites: page.userFavorites, inventory: page.userInventory, cnt: req.session.drinkInventory.length});
        }
    )

})
app.post('/addDrink', async (req,res) => {
    if(req.session.user == null){
        req.session.user = 'guest';
        req.session.favorites = [];
        req.session.drinkInventory = [];
        req.session.save();
        return res.render('error', {user: req.session.user});
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
    req.session.favorites.forEach(r => {
        promiseList.push(fetch(`https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${r}`).then(t => t.json()));
    })
    Promise.all([...promiseList])
        .then(results => {
            let page = generatePage(results, req.session.drinkInventory);
            res.render('drinks', {user: req.session.user, entries:page.table, categories:page.categories, favorites: page.userFavorites, inventory: page.userInventory, cnt: req.session.drinkInventory.length});
    })    
})
app.get('/error', (req,res)=>{
    return res.render('error', {user: req.session.user});
})
app.get('/drinks/:id', async (req,res) =>{
    if(req.session.user == null){
        req.session.user = 'guest';
        req.session.favorites = [];
        req.session.drinkInventory = [];
        req.session.save();
    return res.render('error', {user: req.session.user});
    }
    let id = req.params;
    try {
        await client.connect();
        let query = {_id: req.session.userId }
        let recent = {$push: {'drinkProfile.recents': id.id}}
        r = await client.db(MONGO_DB_NAME).collection('guests').updateOne(query,recent);
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
        if(req.session.favorites.includes(id.id)){
            fav = true;
        }
        return res.render('customDrink',{user: req.session.user, id:id.id, drinkName: name, image:img, instructions:instrList, ingredients:ingList ,fav:fav} );  
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
        return res.render('error', {user: req.session.user});
    }
    let promiseList = [];
    req.session.favorites.forEach(r => {
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
            return res.render('profile', {user: req.session.user, favorites:favs})
            res.render('drinks', {user: req.session.user, entries:page.table, categories:page.categories, favorites: page.userFavorites, inventory: page.userInventory, cnt: req.session.drinkInventory.length});
    })   
    
    // return res.render('underConstruction', {user: req.session.user});
})
app.post('/removeDrinkItems/:items', async (req,res)=> {
    if(req.session.user == null){
        req.session.user = 'guest';
        req.session.favorites = [];
        req.session.drinkInventory = [];
        req.session.save();
        return res.render('error', {user: req.session.user});
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
        req.session.user = 'guest';
        req.session.favorites = [];
        req.session.drinkInventory = [];
        req.session.save();
        return res.render('error', {user: req.session.user});
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
        req.session.user = 'guest';
        req.session.favorites = [];
        req.session.drinkInventory = [];
        req.session.save();
        return res.render('error', {user: req.session.user});
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
                req.session.favorites = req.session.favorites.filter((x) => {return x != id});                
                added = false;
            } else {
                r = await client.db(MONGO_DB_NAME).collection('guests').updateOne(query,newFav);
                req.session.favorites.push(id);

                
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
        req.session.user = 'guest';
        req.session.favorites = [];
        req.session.drinkInventory = [];
        req.session.save();
        return res.render('error', {user: req.session.user});
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
    req.session.favorites = [];
    req.session.drinkInventory = [];
    req.session.save();
    return res.render('home',{user: req.session.user});
})
app.listen(port);
console.log(`Listening on Port ${port}`);
