async function toggle(x){
    // x.classList.toggle('checked');
    const resp = await fetch(`/addFavoriteDrink/${x}`, {
        method: "POST",
        headers: {
            'Content-Type' : 'application/json'
        }
    })
    const data = await resp.json();
    if(data.isFavorited){
        document.getElementById("star").className = "fa fa-star checked";
    } else {
        document.getElementById("star").className = "fa fa-star";
    }
}
