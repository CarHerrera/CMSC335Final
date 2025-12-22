async function changeName() {
    let input = document.querySelector('input');
    const newname = input.value;
    console.log(newname);
    const resp = await fetch(`/changeName/${newname}`, {
        method: "POST",
        headers: {
            'Content-Type' : 'application/json'
        }
    })
    const data = await resp.json();
    const leftName = document.getElementById("userName");
    const rightName = document.getElementById("userProfile");
    const middleName = document.getElementById("helloText");
    leftName.text = `${newname} Recipe Hub!`;
    rightName.text = `${newname}'s Profile`;
    middleName.innerHTML = `Hello ${newname}!`;
    // console.log(data);
}