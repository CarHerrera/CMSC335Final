let ingr = [{"strIngredient1":"Light rum"},{"strIngredient1":"Bourbon"},{"strIngredient1":"Vodka"},{"strIngredient1":"Gin"},{"strIngredient1":"Blended whiskey"},{"strIngredient1":"Tequila"},{"strIngredient1":"Sweet Vermouth"},{"strIngredient1":"Apricot brandy"},{"strIngredient1":"Triple sec"},{"strIngredient1":"Southern Comfort"},{"strIngredient1":"Orange bitters"},{"strIngredient1":"Brandy"},{"strIngredient1":"Lemon vodka"},{"strIngredient1":"Dry Vermouth"},{"strIngredient1":"Dark rum"},{"strIngredient1":"Amaretto"},{"strIngredient1":"Tea"},{"strIngredient1":"Applejack"},{"strIngredient1":"Champagne"},{"strIngredient1":"Scotch"},{"strIngredient1":"Coffee liqueur"},{"strIngredient1":"A\u00f1ejo rum"},{"strIngredient1":"Bitters"},{"strIngredient1":"Sugar"},{"strIngredient1":"Kahlua"},{"strIngredient1":"Dubonnet Rouge"},{"strIngredient1":"Lime juice"},{"strIngredient1":"Irish whiskey"},{"strIngredient1":"Apple brandy"},{"strIngredient1":"Carbonated water"},{"strIngredient1":"Cherry brandy"},{"strIngredient1":"Creme de Cacao"},{"strIngredient1":"Grenadine"},{"strIngredient1":"Port"},{"strIngredient1":"Coffee brandy"},{"strIngredient1":"Red wine"},{"strIngredient1":"Rum"},{"strIngredient1":"Grapefruit juice"},{"strIngredient1":"Ricard"},{"strIngredient1":"Sherry"},{"strIngredient1":"Cognac"},{"strIngredient1":"Sloe gin"},{"strIngredient1":"Strawberry schnapps"},{"strIngredient1":"Apple juice"},{"strIngredient1":"Pineapple juice"},{"strIngredient1":"Lemon juice"},{"strIngredient1":"Sugar syrup"},{"strIngredient1":"Milk"},{"strIngredient1":"Strawberries"},{"strIngredient1":"Chocolate syrup"},{"strIngredient1":"Yoghurt"},{"strIngredient1":"Mango"},{"strIngredient1":"Ginger"},{"strIngredient1":"Lime"},{"strIngredient1":"Cantaloupe"},{"strIngredient1":"Berries"},{"strIngredient1":"Grapes"},{"strIngredient1":"Kiwi"},{"strIngredient1":"Tomato juice"},{"strIngredient1":"Cocoa powder"},{"strIngredient1":"Chocolate"},{"strIngredient1":"Heavy cream"},{"strIngredient1":"Galliano"},{"strIngredient1":"Peach Vodka"},{"strIngredient1":"Ouzo"},{"strIngredient1":"Coffee"},{"strIngredient1":"Spiced rum"},{"strIngredient1":"Water"},{"strIngredient1":"Espresso"},{"strIngredient1":"Angelica root"},{"strIngredient1":"Orange"},{"strIngredient1":"Cranberries"},{"strIngredient1":"Johnnie Walker"},{"strIngredient1":"Apple cider"},{"strIngredient1":"Everclear"},{"strIngredient1":"Cranberry juice"},{"strIngredient1":"Egg yolk"},{"strIngredient1":"Egg"},{"strIngredient1":"Grape juice"},{"strIngredient1":"Peach nectar"},{"strIngredient1":"Lemon"},{"strIngredient1":"Firewater"},{"strIngredient1":"Lemonade"},{"strIngredient1":"Lager"},{"strIngredient1":"Whiskey"},{"strIngredient1":"Absolut Citron"},{"strIngredient1":"Pisco"},{"strIngredient1":"Irish cream"},{"strIngredient1":"Ale"},{"strIngredient1":"Chocolate liqueur"},{"strIngredient1":"Midori melon liqueur"},{"strIngredient1":"Sambuca"},{"strIngredient1":"Cider"},{"strIngredient1":"Sprite"},{"strIngredient1":"7-Up"},{"strIngredient1":"Blackberry brandy"},{"strIngredient1":"Peppermint schnapps"},{"strIngredient1":"Creme de Cassis"},{"strIngredient1":"Jack Daniels"},{"strIngredient1":"Baileys irish cream"}];
ingr = ingr.map((item) => item.strIngredient1);
async function selectAction(action, cnt){
    // Remove Action
    if(action === 1 ){
        // Remove the default add and remove buttons
        document.getElementById("addInven").style.visibility = 'hidden';
        document.getElementById("rmInven").style.visibility = 'hidden';
        // Display Checkboxes
        Array.from(document.getElementsByClassName("hiddenCheckBox")).forEach(box => 
            box.setAttribute('class', 'drinkInvCBox')
        );
        // Show the new buttons
        document.getElementById("backBtn2").classList.toggle('hidden');
        document.getElementById("rmInven2").classList.toggle('hidden');
    // Add action
    } else if (action === 0){
        // Remove the default add and remove buttons
        document.getElementById("addInven").style.visibility = 'hidden';
        document.getElementById("rmInven").style.visibility = 'hidden';
        // Showcase the input bar and submit button
        document.getElementById("myInput").classList.toggle('hidden');
        document.getElementById("backBtn").classList.toggle('hidden');
        document.getElementById("submitItem").classList.toggle('hidden');
    // Back to default from Add 
    } else if (action === 2){
        document.getElementById("addInven").style.visibility = 'visible';
        document.getElementById("rmInven").style.visibility = 'visible';
        document.getElementById("myInput").classList.toggle('hidden');
        document.getElementById("backBtn").classList.toggle('hidden');
        document.getElementById("submitItem").classList.toggle('hidden');
        // Back to default from remove
    } else if (action == 3) {
        Array.from(document.getElementsByClassName("drinkInvCBox")).forEach(box => 
            box.setAttribute('class', 'hiddenCheckBox')
        );
        document.getElementById("addInven").style.visibility = 'visible';
        document.getElementById("rmInven").style.visibility = 'visible';
        document.getElementById("backBtn2").classList.toggle('hidden');
        document.getElementById("rmInven2").classList.toggle('hidden');
    // This is adding items when the add button is clicked
    } else if (action == 4){
        let x = document.getElementById("myInput").value;
        if (ingr.includes(x)) {
            const resp = await fetch(`/addDrinkItem/${x}`, {
                method: "POST",
                headers: {
                    'Content-Type' : 'application/json'
                }
            })
            const data = await resp.json();
            if(data.success == 200){
                const node = document.getElementById("drinkInventoryBox");
                node.innerHTML = data.data;    
            } else if (data.success == -1){
                document.getElementById("drinkAlert").classList.toggle('hidden');
                document.getElementById("drinkAlert").innerHTML = `<span class="absolute right-3" onclick="this.parentElement.style.display='none';">&times;</span>
                                    ${x} was already found in your inventory. No duplicates are allowed.`;
            }
        } else {
            // Checks to see if the error alert is visible already. if it is vis alreay then do nothing 
            if(!document.getElementById("drinkAlert").classList.contains('hidden')){
                
            } else {
                document.getElementById("drinkAlert").classList.toggle('hidden');
                document.getElementById("drinkAlert").innerHTML = `<span class="absolute right-3" onclick="this.parentElement.style.display='none';">&times;</span>
                                    ${x} was not found or is not a valid item. Please enter something else `;
            }
            
            // setTimeout(()=>document.getElementById("drinkAlert").classList.toggle('hidden'), 7000)
        }
        
    // Removing items from the inventory
    } else if (action == 5){
        let inventory = document.querySelectorAll('.drinkInvCBox');
        let toRemove = [];
        inventory.forEach((item) => {
            if(item.checked){
                console.log(item);
                toRemove.push(item.name)
            }
        })
        const json = JSON.stringify(toRemove);
        const resp = await fetch(`/removeDrinkItems/${json}`, {
                method: "POST",
                headers: {
                    'Content-Type' : 'application/json'
            }
        })
        const data = await resp.json();
        const node = document.getElementById("drinkInventoryBox");
        node.innerHTML = data;
        selectAction(3,cnt-toRemove.length);
    }

    
}

async function selectFoodAction(action, cnt){
    // Remove Action
    if(action === 1 ){
        // Remove the default add and remove buttons
        document.getElementById("addInven").style.visibility = 'hidden';
        document.getElementById("rmInven").style.visibility = 'hidden';
        // Display Checkboxes
        Array.from(document.getElementsByClassName("hiddenCheckBox")).forEach(box => 
            box.setAttribute('class', 'drinkInvCBox')
        );
        // Show the new buttons
        document.getElementById("backBtn2").classList.toggle('hidden');
        document.getElementById("rmInven2").classList.toggle('hidden');
    // Add action
    } else if (action === 0){
        // Remove the default add and remove buttons
        document.getElementById("addInven").style.visibility = 'hidden';
        document.getElementById("rmInven").style.visibility = 'hidden';
        // Showcase the input bar and submit button
        document.getElementById("myInput").classList.toggle('hidden');
        document.getElementById("backBtn").classList.toggle('hidden');
        document.getElementById("submitItem").classList.toggle('hidden');
    // Back to default from Add 
    } else if (action === 2){
        document.getElementById("addInven").style.visibility = 'visible';
        document.getElementById("rmInven").style.visibility = 'visible';
        document.getElementById("myInput").classList.toggle('hidden');
        document.getElementById("backBtn").classList.toggle('hidden');
        document.getElementById("submitItem").classList.toggle('hidden');
        // Back to default from remove
    } else if (action == 3) {
        Array.from(document.getElementsByClassName("drinkInvCBox")).forEach(box => 
            box.setAttribute('class', 'hiddenCheckBox')
        );
        document.getElementById("addInven").style.visibility = 'visible';
        document.getElementById("rmInven").style.visibility = 'visible';
        document.getElementById("backBtn2").classList.toggle('hidden');
        document.getElementById("rmInven2").classList.toggle('hidden');
    // This is adding items when the add button is clicked
    } else if (action == 4){
        let x = document.getElementById("myInput").value;
        if (ingr.includes(x)) {
            const resp = await fetch(`/addDrinkItem/${x}`, {
                method: "POST",
                headers: {
                    'Content-Type' : 'application/json'
                }
            })
            const data = await resp.json();
            if(data.success == 200){
                const node = document.getElementById("drinkInventoryBox");
                node.innerHTML = data.data;    
            } else if (data.success == -1){
                document.getElementById("drinkAlert").classList.toggle('hidden');
                document.getElementById("drinkAlert").innerHTML = `<span class="absolute right-3" onclick="this.parentElement.style.display='none';">&times;</span>
                                    ${x} was already found in your inventory. No duplicates are allowed.`;
            }
        } else {
            // Checks to see if the error alert is visible already. if it is vis alreay then do nothing 
            if(!document.getElementById("drinkAlert").classList.contains('hidden')){
                
            } else {
                document.getElementById("drinkAlert").classList.toggle('hidden');
                document.getElementById("drinkAlert").innerHTML = `<span class="absolute right-3" onclick="this.parentElement.style.display='none';">&times;</span>
                                    ${x} was not found or is not a valid item. Please enter something else `;
            }
            
            // setTimeout(()=>document.getElementById("drinkAlert").classList.toggle('hidden'), 7000)
        }
        
    // Removing items from the inventory
    } else if (action == 5){
        let inventory = document.querySelectorAll('.drinkInvCBox');
        let toRemove = [];
        inventory.forEach((item) => {
            if(item.checked){
                console.log(item);
                toRemove.push(item.name)
            }
        })
        const json = JSON.stringify(toRemove);
        const resp = await fetch(`/removeDrinkItems/${json}`, {
                method: "POST",
                headers: {
                    'Content-Type' : 'application/json'
            }
        })
        const data = await resp.json();
        const node = document.getElementById("drinkInventoryBox");
        node.innerHTML = data;
        selectAction(3,cnt-toRemove.length);
    }

    
}