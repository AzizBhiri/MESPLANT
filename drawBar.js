//import {OeeDataBase, ProductData, list} from './dummyData.js';

class OeeDataBase {
    constructor(IsRunning, StartedAt, FinishedAt, DowntimeTypeName, ProductData) {
        this.IsRunning = IsRunning;
        this.StartedAt = StartedAt;
        this.FinishedAt = FinishedAt;
        this.DowntimeTypeName = DowntimeTypeName;
        this.ProductData = ProductData;
    }


}

class ProductData {
    constructor(Count, Scrap) {
        this.Count = Count;
        this.Scrap = Scrap;
    }
}

var list = [];

// function randomDate(start, end) {
//     return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
// }
// randomDate(new Date(2012, 0, 1), new Date())
let max = 300;
let min = 100;
var arr = ['Micro Stop', 'Out Of Service', 'Unknown']
var x = Math.random() < 0.5;
var y = Math.floor(Math.random() * (max - min) + min);
var z = y + Math.floor(Math.random() * (max - min) + min);
var t = arr[Math.floor(Math.random() * arr.length)];

var pd = new ProductData(Math.floor(Math.random()), Math.floor(Math.random()))
var first_block = new OeeDataBase(x, y, z, t, pd);
list.push(first_block);


for (var i = 1; i < 100; i++) {
    let x = Math.random() < 0.5;
    let y = list[i-1].FinishedAt;
    let z = y + Math.floor(Math.random() * (max - min) + min);
    let t = arr[Math.floor(Math.random() * arr.length)];
    let pd = new ProductData(Math.floor(Math.random()*5), Math.floor(Math.random()*5));

    list.push(new OeeDataBase(x, y, z, t, pd));    
}

//console.log(list);

var rt = document.querySelector(':root');
// Create a function for getting a variable value
function color_get() {
    // Get the styles (properties and values) for the root
    var rs = getComputedStyle(color);
    // Alert the value of the --col variable
    alert("The value of --col is: " + rs.getPropertyValue('--col'));
}
  
// Create a function for setting a variable value
function color_set(i, x) {
    // Set the value of variable --col to another value
    rt.style.setProperty('--col'+i.toString(), x);
}

//color_set('pink');

function width_set(i, x) {
    rt.style.setProperty('--wid'+i.toString(), x);
}

//width_set('200px');

function drawBar(bars) {
    for (let i = 0; i < bars.length; i++) {
        if (bars[i].IsRunning) {
        color_set(i, 'green');
        } else {
            if (bars[i].DowntimeTypeName === "Unknown") {
                color_set(i, 'red');
            } else if (bars[i].DowntimeTypeName === "Out Of Service") {
                color_set(i, 'DimGray');
            } else {
                color_set(i, 'Yellow');
            }
        }
    
        var width = bars[i].FinishedAt - bars[i].StartedAt;
        let w = width.toString() + 'px';
        width_set(i, w);
    }


}

//create divs in loop
var container = document.getElementById("bars");
for (let i = 0; i < list.length; i++) {
    //var newBr = document.createElement('br');
    //container.appendChild(newBr);
    var newDiv = document.createElement('div');
    newDiv.className = 'bar';
    newDiv.setAttribute("id", "bar" + i.toString());
    console.log(newDiv.className);
    //Adjust to the new object format here : 
    //dots
    var dotContainer = document.createElement('div');
    dotContainer.className = 'dots';
    //create fictional non visible dot for adjusting appearence if 
    // Count + Scrap == 0;
    if (list[i].ProductData.Count + list[i].ProductData.Scrap == 0) {
        var newProd = document.createElement('div');
        newProd.className = 'dotF';
        dotContainer.appendChild(newProd);
    } else /*Working Dots*/{
        // var dotContainer = document.createElement('div');
        // dotContainer.className = 'dots';
        for (let j = 0; j < list[i].ProductData.Count; j ++) {
            var newProd = document.createElement('div');
            newProd.className = 'dotV';
            dotContainer.appendChild(newProd);
        }
        for (let j = 0; j < list[i].ProductData.Scrap; j ++) {
            var newProd = document.createElement('div');
            newProd.className = 'dotS';
            dotContainer.appendChild(newProd);
        }
    }
    newDiv.appendChild(dotContainer);
    container.appendChild(newDiv);
}

//drawBar(list[0]);

//create css classes in loop
for (let i = 0; i < list.length; i++) {
    //document.getElementsByClassName('bar'+i.toString()).classList.add('bar'+i.toString());
    elt = document.getElementById('bar'+i.toString());
    elt.style.height = "50px";    
    elt.style.width = "var(--wid" + i.toString() + ")";    
    elt.style.backgroundColor = "var(--col" + i.toString() + ")";
    drawBar(list);
    //console.log(elt);    
}

// *******WORKS********





// for (let i = 0; i < list.length; i++) {
//     drawBar(list[i]);
    
// }

// //Select all elements with class .bar
// var temp = document.querySelectorAll(".bar");
// //Apply CSS property to it
// for (var i = 0; i < temp.length; i++) {
//     temp[i].style.background-color =  var(--col);
//     temp[i].style.width = var(--wid);
// }

// for (let i = 0; i < list.length; i++) {
//     drawBar(list[i]);
    
// }

// for (var i =0; i <= list.length; i++) {
//     drawBar(list[i]);
// }