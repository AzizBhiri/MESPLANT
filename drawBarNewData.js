//import {OeeDataBase, ProductData, list} from './dummyData.js';

class OeeDataBase {
    constructor(IsRunning, StartedAt, FinishedAt, DowntimeTypeName, ArrayProductData) {
        this.IsRunning = IsRunning;
        this.StartedAt = StartedAt;
        this.FinishedAt = FinishedAt;
        this.DowntimeTypeName = DowntimeTypeName;
        this.ArrayProductData = ArrayProductData;
    }

    getBlockLength() {
        return this.FinishedAt - this.StartedAt;
    }

}

class ProductData {
    constructor(Id, Name, Count, Scrap) {
        this.Id = Id;
        this.Name = Name;
        this.Count = Count;
        this.Scrap = Scrap;
    }
}
var list = [];


let max = 500;
let min = 100;
var arr = ['Micro Stop', 'Out Of Service', 'Unknown']
var x = Math.random() < 0.5;
var y = Math.floor(Math.random() * (max - min) + min);
var z = y + Math.floor(Math.random() * (max - min) + min);
var t = arr[Math.floor(Math.random() * arr.length)];

//Generates random name
function makeRand() {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < 10; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}

var apd = [];
for (j = 0; j < Math.floor(Math.random() * 6); j++) {
    let pd = new ProductData(Math.floor(Math.random() * Math.random() * 100), makeRand(),Math.floor(Math.random()*3), Math.floor(Math.random()*3));
    apd.push(pd);
}
var first_block = new OeeDataBase(x, y, z, t, apd);
list.push(first_block);


for (var i = 1; i < 20; i++) {
    let x = Math.random() < 0.5;
    let y = list[i-1].FinishedAt;
    let z = y + Math.floor(Math.random() * (max - min) + min);
    let t = arr[Math.floor(Math.random() * arr.length)];
    let apd = [];
    for (j = 0; j < Math.floor(Math.random() * 6); j++) {
        let pd = new ProductData(Math.floor(Math.random() * Math.random() * 100), makeRand(),Math.floor(Math.random()*3), Math.floor(Math.random()*3));
        apd.push(pd);
    }
    list.push(new OeeDataBase(x, y, z, t, apd));    
}

//console.log(list[5]);

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
    //newDiv.innerHTML = ".".repeat(list[i].FinishedAt - list[i].StartedAt);
    //console.log(newDiv.className);
    //Adjust to the new object format here :
    var dotContainer = document.createElement('div');
    dotContainer.className = 'dots';
    //dotContainer.Id = 'dots';
    //create fictional non visible dot for adjusting appearence if 
    // Count + Scrap == 0;
    if (list[i].ArrayProductData.length === 0) {
        var newProd = document.createElement('div');
        newProd.className = 'dotF';
        dotContainer.appendChild(newProd);
    }  else {
        for (let prod = 0; prod < list[i].ArrayProductData.length; prod++) {
            if (list[i].ArrayProductData[prod].Count + list[i].ArrayProductData[prod].Scrap === 0) {
                var newProd = document.createElement('div');
                newProd.className = 'dotF';
                dotContainer.appendChild(newProd);
            } else {
                for (let j = 0; j < list[i].ArrayProductData[prod].Count; j ++) {
                    var newProd = document.createElement('div');
                    newProd.className = 'dotV';
                    //newProd.onmouseover = "showMessage()";
                    //newProd.onmouseout = "hideMessage()";
                    dotContainer.appendChild(newProd);
                }
                for (let j = 0; j < list[i].ArrayProductData[prod].Scrap; j ++) {
                    var newProd = document.createElement('div');
                    newProd.className = 'dotS';
                    //newProd.onmouseover = "showMessage()";
                    //newProd.onmouseout = "hideMessage()";
                    dotContainer.appendChild(newProd);
                }
            }
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

function hide() {
    var d = document.getElementsByClassName('dots');
    for (let i = 0; i < d.length; i++) {
        d[i].style.visibility = "hidden";
    }
}

function show() {
    var d = document.getElementsByClassName('dots');
    for (let i = 0; i < d.length; i++) {
        d[i].style.visibility = "visible";
    }
}

//console.log(window.innerWidth);


//calculates the number of blocks the could fit in a row
//starting from a given block.
function nbr_blocks_row(list_of_blocks, starting_block) {
    let sum = 0;
    for (let i = starting_block; i < list_of_blocks.length; i++) {
        sum += list_of_blocks[i].FinishedAt - list_of_blocks[i].StartedAt;        
        if (sum > window.innerWidth - 10) {
            return i - starting_block;
        }
    }
}

var x = 0;
var nbr_of_blocks = [];
while (x < list.length) {
    nbr = nbr_blocks_row(list, x);
    nbr_of_blocks.push(nbr);
    x += nbr;
}
console.log(nbr_of_blocks);

//Calculates remaining space to the end of the screen
//for each row
function remainingSpace(list_of_blocks, row) {
    let x = nbr_of_blocks[row];
    let prev_blocks = 0;
    for (let i = 0; i < row; i++) {
        prev_blocks += nbr_of_blocks[i];
    }
    let block_lengths = 0;
    for (let i = prev_blocks; i < prev_blocks + x; i++) {
        block_lengths += list_of_blocks[i].getBlockLength();
    }
    var remaining_space = window.innerWidth - block_lengths;
    return remaining_space;
}

for (let i = 0; i < nbr_of_blocks.length - 1; i++) {
    console.log(remainingSpace(list, i));
}

/*********************************WORKS****************************************/

// Function to check if a block fits in the remaining space
function checkSpace(block, space) {
    return block.getBlockLength() <= space;
}

// Function to divide a block
function splitBlock(block, splitPoint) {
    block.FinishedAt = splitPoint;
    var new_block = new OeeDataBase(block.IsRunning, splitPoint, block.FinishedAt, block.DowntimeTypeName, block.ArrayProductData);
    return new_block;
}