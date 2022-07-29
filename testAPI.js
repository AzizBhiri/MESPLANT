function getOeeDataBaseByDate(workstation, startDate, endDate, callback) {
    const Http = new XMLHttpRequest();
    const url='http://212.200.168.71/productionmanagement/api/oeedata?workstationId=' + workstation.toString() + '&&from=' + startDate.toString() + '&&to=' + endDate.toString();
    Http.open("GET", url);

    // //normal
    // // Http.onreadystatechange = (e) => {
    // //     //return Http.responseText;
    // //     document.write(Http.responseText);
    // // }
    // // Http.send();

    //callback
    Http.onreadystatechange = function() {     
        if (Http.readyState == 4) {
            if (Http.status == 200) {

                // pass the response to the callback function
                callback(null, Http.responseText);

            } else {
                // pass the error to the callback function
                callback(Http.statusText);
            }
        }
    }
    Http.send(null);
}

//promise
// function getOeeDataBaseByDate(workstation, startDate, endDate, data) {
//     const Http = new XMLHttpRequest();
//     const url='http://212.200.168.71/productionmanagement/api/oeedata?workstationId=' + workstation.toString() + '&&from=' + startDate.toString() + '&&to=' + endDate.toString();
//     Http.open("GET", url);
    
//     return new Promise((resolve, reject) => {
//         Http.onreadystatechange = function() {     
//             if (Http.readyState == 4) {
//                 if (Http.status == 200) {
//                     resolve(Http.responseText);
//                     //data.push(Http.responseText);
//                 } else {
//                     console.warn('request_error');
//                 }
//             }
//         }
//         Http.send(null);
//     });
// }
 
function millisecondToDate(ms) {
    var date = new Date(ms).toLocaleString('sv');
    return date;
}

function dateToMilliseconds(date) {
    var ms = new Date(date).getTime();
    return ms;
}

//utc to local time in milliseconds since 1970
function utcToLocal(time) {
    var offset_in_ms = new Date().getTimezoneOffset() * 1000 * 60; 
    return time - offset_in_ms;
}

//local time in milliseconds since 1970 to utc
function localToUtc(time) {
    var offset_in_ms = new Date().getTimezoneOffset() * 1000 * 60; 
    return time + offset_in_ms;
}

//console.log(millisecondToDate(utcToLocal(1658574513555)));
//console.log(millisecondToDate(1658574513555));

//

// const myJSON = {
//     "squadName": "Super hero squad",
//     "homeTown": "Metro City",
//     "formed": 2016,
//     "secretBase": "Super tower",
//     "active": true,
//     "members": [
//       {
//         "name": "Molecule Man",
//         "age": 29,
//         "secretIdentity": "Dan Jukes",
//         "powers": [
//           "Radiation resistance",
//           "Turning tiny",
//           "Radiation blast"
//         ]
//       },
//       {
//         "name": "Madame Uppercut",
//         "age": 39,
//         "secretIdentity": "Jane Wilson",
//         "powers": [
//           "Million tonne punch",
//           "Damage resistance",
//           "Superhuman reflexes"
//         ]
//       },
//       {
//         "name": "Eternal Flame",
//         "age": 1000000,
//         "secretIdentity": "Unknown",
//         "powers": [
//           "Immortality",
//           "Heat Immunity",
//           "Inferno",
//           "Teleportation",
//           "Interdimensional travel"
//         ]
//       }
//     ]
//   };

// var myObj = JSON.parse(JSON.stringify(myJSON));
// console.log(myObj.members);

//create the OeeDataBase object
class OeeDataBase {
    constructor(isRunning, startedAt, finishedAt, downtimeTypeName, product_ID, product_name, valid, scrap) {
        this.isRunning = isRunning;
        this.startedAt = startedAt;
        this.finishedAt = finishedAt;
        this.downtimeTypeName = downtimeTypeName;
        // this.ArrayProductData = ArrayProductData;
        this.product_ID = product_ID;
        this.product_name = product_name;
        this.valid = valid;
        this.scrap = scrap;
    }

    getBlockLength() {
        return this.finishedAt - this.startedAt;
    }

}

function decomposeTolistOfblocks(list_of_json) {
    var list_of_blocks = [];
    for (let i = 0; i < list_of_json.data.length; i++) {
        var obj = list_of_json.data[i];
        var newBlock = new OeeDataBase(obj.isRunning, dateToMilliseconds(obj.startedAt), dateToMilliseconds(obj.finishedAt), obj.downtimeTypeName, obj.productId, obj.productName, obj.valid, obj.scrap);
        list_of_blocks.push(newBlock);
    }
    return list_of_blocks;
}

function dayStartMilli(ms) {
    return (ms - (ms % 86400000));
}

function twoHoursStartMilli(ms) {
    return (ms - (ms % 7200000));
}


function nextHourMilli(ms) {
    //let nearest_hour = new Date(Math.ceil(ms / 3600000) * 3600000);
    return Math.ceil(ms / 7200000) * 7200000;
    //return nearest_hour;    
}
function prevHourMilli(ms) {
    //let nearest_hour = new Date(Math.ceil(ms / 3600000) * 3600000);
    return Math.floor(ms / 7200000) * 7200000;
    //return nearest_hour;    
}

function timeCorrector(ms) {
    // return localToUtc(twoHoursStartMilli(ms) + 7200000);
    return localToUtc(dayStartMilli(ms));
}

//Adds empty block at beginning of list_of_blocks if call doesn't start from beginning of day
function blockCorrector(list_of_blocks) {
    if ((list_of_blocks.length === 0) || (list_of_blocks[0].startedAt - timeCorrector(list_of_blocks[0].startedAt)) > 0) {
        var emptyBlock = new OeeDataBase(null, timeCorrector(list_of_blocks[0].startedAt), list_of_blocks[0].startedAt, "No data", null, null, null, null);
        list_of_blocks.unshift(emptyBlock);
    }

    return list_of_blocks;
}

function gapCorrector(list_of_blocks) {
    for (let i = 0; i < list_of_blocks.length - 1; i++) {
        if (list_of_blocks[i+1].startedAt > list_of_blocks[i].finishedAt) {
            var emptyBlock = new OeeDataBase(null, list_of_blocks[i].finishedAt, list_of_blocks[i+1].startedAt, "No data", null, null, null, null);
            list_of_blocks.splice(i + 1, 0, emptyBlock);
        }
    }
    return list_of_blocks;
}

// function callback(err, res) {
//     if (err) alert(err);
//     if (res) console.log(res);
// }
// getOeeDataBaseByDate(1, '2022-07-22 00:00:00', '2022-07-22 04:00:00', callback);

function check(block) {
    if (Math.floor(block.startedAt / 7200000 ) < Math.floor(block.finishedAt / 7200000 )) {
        return true;
    }
    return false;
}


// Function to divide a block
function splitBlock(block, splitPoint) {
    let temp = block.finishedAt;
    block.finishedAt = splitPoint;
    var new_block = new OeeDataBase(block.isRunning, splitPoint + 1, temp, block.downtimeTypeName, block.productId, block.productName, Math.floor(block.valid * ((temp - splitPoint)) / (temp - block.startedAt)), Math.floor(block.scrap * ((temp - splitPoint)) /  (temp - block.startedAt)));
    block.valid = block.valid - new_block.valid;
    block.scrap = block.scrap - new_block.scrap;
    return new_block;
}

// function splitBlock(block, splitPoint) {
//     if (!check(block)) {
//         return block;
//     } else {
//         let temp = block.finishedAt;
//         block.finishedAt = splitPoint;
//         var new_block = new OeeDataBase(block.isRunning, splitPoint, temp, block.downtimeTypeName, block.productId, block.productName, Math.floor(block.valid * ((temp - splitPoint)) / (temp - block.startedAt)), Math.floor(block.scrap * ((temp - splitPoint)) /  (temp - block.startedAt)));
//         block.valid = block.valid - new_block.valid;
//         block.scrap = block.scrap - new_block.scrap;
//         return splitBlock(new_block, nextHourMilli(new_block.startedAt));
//     }

// }

const json = {"workstationId":1,"data":[{"id":130,"isRunning":true,"downtimeTypeId":null,"startedAt":"2022-07-22T04:25:00","finishedAt":"2022-07-22T06:55:00","productId":null,"valid":9,"scrap":4,"downtimeTypeName":"","productName":""},{"id":131,"isRunning":false,"downtimeTypeId":"2","startedAt":"2022-07-22T08:35:00","finishedAt":"2022-07-22T11:55:00","productId":null,"valid":0,"scrap":0,"downtimeTypeName":"Micro stop","productName":""},{"id":132,"isRunning":false,"downtimeTypeId":"2","startedAt":"2022-07-22T12:25:00","finishedAt":"2022-07-22T13:45:00","productId":null,"valid":0,"scrap":0,"downtimeTypeName":"Micro stop","productName":""},{"id":133,"isRunning":false,"downtimeTypeId":"2","startedAt":"2022-07-22T13:45:00","finishedAt":"2022-07-22T14:55:00","productId":null,"valid":0,"scrap":0,"downtimeTypeName":"","productName":""}]}

// function checkLength(list_of_blocks) {
//     for(let i = 0; i < list_of_blocks.length; i++) {
//         if (list_of_blocks[i].getBlockLength() >= 7200000) return false;
//     }
//     return true;
// }

function fixJson(json) {
    var array_of_jsons = JSON.parse(JSON.stringify(json));
    var list_of_blocks = decomposeTolistOfblocks(array_of_jsons);
    list_of_blocks = blockCorrector(list_of_blocks);
    list_of_blocks = gapCorrector(list_of_blocks);
    console.log(list_of_blocks);
    for (let i = 0; i  < list_of_blocks.length; i++) {
        if (check(list_of_blocks[i])) {
            let x = splitBlock(list_of_blocks[i], nextHourMilli(list_of_blocks[i].startedAt));
            list_of_blocks.splice(i + 1, 0, x);
        }
    }
    return list_of_blocks;
}

var list_of_blocks = fixJson(json);

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

//Blocks width is dependent on time : 2H (7 200 000 ms) === 60vw - 40px
function drawBarDay(list_of_blocks) {
    for (let i = 0; i < list_of_blocks.length; i++) {
        if (list_of_blocks[i].isRunning) {
        color_set(i, 'green');
        } else {
            /*if (list_of_blocks[i].downtimeTypeName === "Unknown") {
                color_set(i, 'red');
            } else */if (list_of_blocks[i].downtimeTypeName === "No data") {
                color_set(i, 'DimGray');
            } else if (list_of_blocks[i].downtimeTypeName === "Micro stop") {
                color_set(i, 'Yellow');
            } else {
                color_set(i, 'Red');
            }
        }
    
        var width = list_of_blocks[i].getBlockLength() / 7200000;
        let w = "calc(" + width.toString() + "*(60vw - 17px))"; 
        width_set(i, w);
    }

}

//create divs in loop new OeeDataBAse format
var container = document.getElementById("bars");
for (let i = 0; i < list_of_blocks.length; i++) {
    //var newBr = document.createElement('br');
    //container.appendChild(newBr);
    var newDiv = document.createElement('div');
    newDiv.className = 'bar';
    newDiv.setAttribute("id", "bar" + i.toString());
    //newDiv.innerHTML = ".".repeat(list_of_blocks[i].finishedAt - list_of_blocks[i].startedAt);
    //console.log(newDiv.className);
    //Adjust to the new object format here :
    var dotContainer = document.createElement('div');
    dotContainer.className = 'dots';
    //dotContainer.Id = 'dots';
    //create fictional non visible dot for adjusting appearence if 
    // Count + scrap == 0;
    if (list_of_blocks[i].valid + list_of_blocks[i].scrap === 0) {
        var newProd = document.createElement('div');
        newProd.className = 'dotF';
        dotContainer.appendChild(newProd);
    } else {
        for (let j = 0; j < list_of_blocks[i].valid; j++) {
            var newProd = document.createElement('div');
            newProd.className = 'dotV';
            //newProd.onmouseover = "showMessage()";
            //newProd.onmouseout = "hideMessage()";
            dotContainer.appendChild(newProd);
        }
        for (let j = 0; j < list_of_blocks[i].scrap; j ++) {
            var newProd = document.createElement('div');
            newProd.className = 'dotS';
            //newProd.onmouseover = "showMessage()";
            //newProd.onmouseout = "hideMessage()";
            dotContainer.appendChild(newProd);
        }
    }
        
    newDiv.appendChild(dotContainer);
    container.appendChild(newDiv);
}

//create css classes in loop
for (let i = 0; i < list_of_blocks.length; i++) {
    //document.getElementsByClassName('bar'+i.toString()).classlist_of_blocks.add('bar'+i.toString());
    elt = document.getElementById('bar'+i.toString());
    elt.style.height = "50px";    
    elt.style.width = "var(--wid" + i.toString() + ")";    
    elt.style.backgroundColor = "var(--col" + i.toString() + ")";
    drawBarDay(list_of_blocks);
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

function scrollDown() {
    document.getElementById("barsContainer").scrollTop = document.getElementById("barsContainer").scrollHeight;
}


//reload page
// setTimeout(function(){
//     window.location.reload(1);
// }, 1000);

scrollDown();






