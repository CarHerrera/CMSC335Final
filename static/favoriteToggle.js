async function toggle(id){
    // id.classList.toggle('checked');
    console.log(id);
    const resp = await fetch(`/addFavoriteDrink/${id}`, {
        method: "POST",
        headers: {
            'Content-Type' : 'application/json'
        }
    })
    const data = await resp.json();
    console.log(data);
    if(data.isFavorited){
        document.getElementById(id).className = "fa fa-star checked";
    } else {
        document.getElementById(id).className = "fa fa-star";
    }
}

async function toggleRecipe(id, name){    
    console.log(name);
    const resp = await fetch(`/addFavoriteRecipe/${id}.${decodeURI(name)}`, {
        method: "POST",
        headers: {
            'Content-Type' : 'application/json'
        }
    })
    const data = await resp.json();
    if(data.isFavorited){
        document.getElementById(id).className = "fa fa-star checked";
    } else {
        document.getElementById(id).className = "fa fa-star";
    }
}