async function toggle(x){
    // x.classList.toggle('checked');
    console.log(x);
    const resp = await fetch(`/addFavoriteDrink/${x}`, {
        method: "POST",
        headers: {
            'Content-Type' : 'application/json'
        }
    })
    const data = await resp.json();
    console.log(data);
    if(data.isFavorited){
        document.getElementById("star").className = "fa fa-star checked";
    } else {
        document.getElementById("star").className = "fa fa-star";
    }
}

async function toggleRecipe(id, name){    
    
    const resp = await fetch(`/addFavoriteRecipe/${id}.${decodeURI(name)}`, {
        method: "POST",
        headers: {
            'Content-Type' : 'application/json'
        }
    })
    const data = await resp.json();
    console.log(id);
    console.log(name);
    console.log(data);
    if(data.isFavorited){
        document.getElementById("star").className = "fa fa-star checked";
    } else {
        document.getElementById("star").className = "fa fa-star";
    }
}