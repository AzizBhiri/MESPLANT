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
        return this.FinishedAt - this.StartedAt;
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

function nextHourMilli(ms) {
    //let nearest_hour = new Date(Math.ceil(ms / 3600000) * 3600000);
    return Math.ceil(ms / 3600000) * 3600000;
    //return nearest_hour;    
}

function timeCorrector(ms) {
    return localToUtc(dayStartMilli(ms) + 86400000);
}

//Adds empty block at beginning of list_of_blocks if call doesn't start from beginning of day
function blockCorrector(list_of_blocks) {
    if ((list_of_blocks[0].startedAt - timeCorrector(list_of_blocks[0].startedAt)) > 0) {
        var emptyBlock = new OeeDataBase(null, timeCorrector(list_of_blocks[0].startedAt), list_of_blocks[0].startedAt, "No Data", null, null, null, null);
        list_of_blocks.unshift(emptyBlock);
    }
    return list_of_blocks;
}

// function callback(err, res) {
//     if (err) alert(err);
//     if (res) console.log(res);
// }
// getOeeDataBaseByDate(1, '2022-07-22 00:00:00', '2022-07-22 04:00:00', callback);

function check(block) {
    if (Math.floor(block.startedAt / 3600000 ) < Math.floor(block.finishedAt / 3600000 )) {
        return true;
    }
    return false;
}


// Function to divide a block
function splitBlock(block, splitPoint) {
    let temp = block.finishedAt;
    block.finishedAt = splitPoint;
    var new_block = new OeeDataBase(block.isRunning, splitPoint, temp, block.downtimeTypeName, block.productId, block.productName, Math.floor(block.valid * ((temp - splitPoint)) / block.getBlockLength()), Math.floor(block.scrap * ((temp - splitPoint)) / block.getBlockLength()));
    block.valid = block.valid - new_block.valid;
    block.scrap = block.scrap - new_block.scrap;
    return new_block;
}



const json = {"workstationId":1,"data":[{"id":130,"isRunning":true,"downtimeTypeId":null,"startedAt":"2022-07-22T00:00:00","finishedAt":"2022-07-22T00:39:07.377","productId":null,"valid":3,"scrap":1,"downtimeTypeName":"","productName":""},{"id":132,"isRunning":false,"downtimeTypeId":4,"startedAt":"2022-07-22T00:39:07.377","finishedAt":"2022-07-22T00:43:04.937","productId":null,"valid":0,"scrap":0,"downtimeTypeName":"Pause","productName":""},{"id":134,"isRunning":false,"downtimeTypeId":1,"startedAt":"2022-07-22T00:43:04.937","finishedAt":"2022-07-22T01:20:09.867","productId":null,"valid":0,"scrap":0,"downtimeTypeName":"Out of service","productName":""},{"id":133,"isRunning":true,"downtimeTypeId":null,"startedAt":"2022-07-22T01:20:09.867","finishedAt":"2022-07-22T01:39:11.753","productId":null,"valid":19,"scrap":0,"downtimeTypeName":"","productName":""},{"id":135,"isRunning":false,"downtimeTypeId":4,"startedAt":"2022-07-22T01:39:11.753","finishedAt":"2022-07-22T01:52:09.16","productId":null,"valid":0,"scrap":0,"downtimeTypeName":"Pause","productName":""},{"id":137,"isRunning":false,"downtimeTypeId":1,"startedAt":"2022-07-22T01:52:09.16","finishedAt":"2022-07-22T02:05:14.487","productId":null,"valid":0,"scrap":0,"downtimeTypeName":"Out of service","productName":""},{"id":136,"isRunning":true,"downtimeTypeId":null,"startedAt":"2022-07-22T02:05:14.487","finishedAt":"2022-07-22T02:30:16.13","productId":null,"valid":25,"scrap":0,"downtimeTypeName":"","productName":""},{"id":138,"isRunning":false,"downtimeTypeId":8,"startedAt":"2022-07-22T02:30:16.13","finishedAt":"2022-07-22T02:43:15.423","productId":null,"valid":0,"scrap":0,"downtimeTypeName":"Engine failure","productName":""},{"id":140,"isRunning":false,"downtimeTypeId":1,"startedAt":"2022-07-22T02:43:15.423","finishedAt":"2022-07-22T03:00:00","productId":null,"valid":0,"scrap":0,"downtimeTypeName":"Out of service","productName":""}]}

function fixJson(json) {
    var array_of_jsons = JSON.parse(JSON.stringify(json));
    var list_of_blocks = decomposeTolistOfblocks(array_of_jsons);
    list_of_blocks = blockCorrector(list_of_blocks);
    for (let i = 0; i < list_of_blocks.length; i++) {
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
            } else */if (list_of_blocks[i].downtimeTypeName === "Out of service") {
                color_set(i, 'DimGray');
            } else if (list_of_blocks[i].downtimeTypeName === "Micro Stop") {
                color_set(i, 'Yellow');
            } else if (list_of_blocks[i].downtimeTypeName === "No Data") {
                color_set(i, 'White');
            } else {
                color_set(i, 'Red');
            }
        }
    
        var width = (utcToLocal(list_of_blocks[i].finishedAt) - utcToLocal(list_of_blocks[i].startedAt)) / 7200000;
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
scrollDown();






