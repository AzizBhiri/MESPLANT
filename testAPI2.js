function doAll(json) {

    function millisecondToDate(ms) {
        var date = new Date(ms).toLocaleString('sv');
        return date
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
        var x = 0;
        var off = new Date().getTimezoneOffset() * 60000;
        var res = ms - (ms % 86400000);
        if (Math.floor(res/86400000) < Math.floor(Date.now()/86400000)) {
            x = 86400000;
        }
        return res + x + off;
    }

    function twoHourStartMilli(ms) {
        return (ms - (ms % 7200000));
    }

    function nextHourMilli(ms) {
        //let nearest_hour = new Date(Math.ceil(ms / 3600000) * 3600000);
        return Math.ceil(ms / 7200000) * 7200000;
        //return nearest_hour;    
    }

    function timeCorrector(ms) {
        //return localToUtc(twoHourStartMilli(ms) + 7200000);
        return localToUtc(dayStartMilli(ms) - new Date().getTimezoneOffset() * 1000 * 60);
    }


    function check(block) {
        if (Math.floor(block.startedAt / 7200000) < Math.floor(block.finishedAt / 7200000)) {
            return true;
        }
        return false;
    }


    // Function to divide a block
    function splitBlock(block, splitPoint) {
        let temp = block.finishedAt;
        block.finishedAt = splitPoint;
        var new_block = new OeeDataBase(block.isRunning, splitPoint + 1, temp, block.downtimeTypeName, block.productId, block.productName, Math.floor(block.valid * ((temp - splitPoint)) / (temp - block.startedAt)), Math.floor(block.scrap * ((temp - splitPoint)) / (temp - block.startedAt)));
        block.valid = block.valid - new_block.valid;
        block.scrap = block.scrap - new_block.scrap;
        return new_block;
    }
    //Adds empty block at beginning of list_of_blocks if call doesn't start from beginning of day
    function blockCorrector(list_of_blocks) {
        if (list_of_blocks[0].startedAt - dayStartMilli(list_of_blocks[0].startedAt) > 0) {
            console.log(millisecondToDate(list_of_blocks[0].startedAt));
            console.log(millisecondToDate(dayStartMilli(list_of_blocks[0].startedAt) - new Date().getTimezoneOffset() * 60 * 1000));
            // console.log((list_of_blocks[0].startedAt - dayStartMilli(list_of_blocks[0].startedAt)));
            var emptyBlock = new OeeDataBase(null, dayStartMilli(list_of_blocks[0].startedAt), list_of_blocks[0].startedAt, "No data", null, null, null, null);
            list_of_blocks.unshift(emptyBlock);
        }
        var off = new Date().getTimezoneOffset() * 60 * 1000;
        if (list_of_blocks[list_of_blocks.length - 1].finishedAt < Date.now() + off) {
            var emptyBlock = new OeeDataBase(null, list_of_blocks[list_of_blocks.length - 1].finishedAt, Date.now() + off, "No data", null, null, null, null);
            list_of_blocks.push(emptyBlock);
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
    

    //set millisecond precision to 000
    function removePrecision(a) {
        return parseInt(Math.floor(a/1000).toString() + "000");
    }

    function removeMillis(list_of_blocks) {
        for (let i = 0; i < list_of_blocks.length; i++) {
            list_of_blocks[i].startedAt = removePrecision(list_of_blocks[i].startedAt);
            list_of_blocks[i].finishedAt = removePrecision(list_of_blocks[i].finishedAt);
        }
        return list_of_blocks;
    }

    function fixJson(json) {
        var array_of_jsons = JSON.parse(JSON.stringify(json));
        var list_of_blocks = decomposeTolistOfblocks(array_of_jsons);
        list_of_blocks = blockCorrector(list_of_blocks);
        list_of_blocks = gapCorrector(list_of_blocks);
        //list_of_blocks = removeMillis(list_of_blocks); 
        //console.log(list_of_blocks); 
        for (let i = 0; i < list_of_blocks.length; i++) {
            if (check(list_of_blocks[i])) {
                let x = splitBlock(list_of_blocks[i], nextHourMilli(list_of_blocks[i].startedAt));
                list_of_blocks.splice(i + 1, 0, x);
            }
        }
        //console.log(list_of_blocks);
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
        rt.style.setProperty('--col' + i.toString(), x);
    }

    //color_set('pink');

    function width_set(i, x) {
        rt.style.setProperty('--wid' + i.toString(), x);
    }

    //Blocks width is dependent on time : 2H (7 200 000 ms) === 60vw - 17px
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

            var width = (utcToLocal(list_of_blocks[i].finishedAt) - utcToLocal(list_of_blocks[i].startedAt)) / 7200000;
            var w;
            if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
                w = "calc(" + width.toString() + "*(57vw - 5px))";
                document.getElementById('barsContainer').style.setProperty('--contWid', '56vw');
               } else { 
                    w = "calc(" + width.toString() + "*(60vw - 17px))";
                    document.getElementById('barsContainer').style.setProperty('--contWid', '60vw');
               }
            width_set(i, w);
        }

    }

    //create divs in loop new OeeDataBase format
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
            for (let j = 0; j < list_of_blocks[i].scrap; j++) {
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
        elt = document.getElementById('bar' + i.toString());
        elt.style.height = "50px";
        elt.style.width = "var(--wid" + i.toString() + ")";
        elt.style.backgroundColor = "var(--col" + i.toString() + ")";
        drawBarDay(list_of_blocks);
    }

    //OEE Calculation
    function oeeCalc(a, b, c) {
        var oee;
        if (a < 0.1) {
            if (b < 0.1) {
                if (c < 0.1) {
                    oee = null;
                } else {
                    oee = c;
                }
            } else {
                if (c < 0.1) {
                    oee = b;
                } else {
                    oee = b * c;
                }
            }
        } else {
            if (b < 0.1) {
                if (c < 0.1) {
                    oee = a;
                } else {
                    oee = a * c;
                }
            } else {
                if (c < 0.1) {
                    oee = a * b;
                } else {
                    oee = a * b * c;
                }
            }
        }
        return oee;
    }

    var exactPrecision = (number, precision) => number.toPrecision(precision).replace(new RegExp("((\\d\\.*){"+precision+"}).*"), '$1');

    var oee = oeeCalc(json.oee.availability , json.oee.quality , json.oee.performance);
    document.getElementById('oee').innerHTML = 'OEE = ' + exactPrecision((exactPrecision(oee, 4) * 100), 3).toString() + '% ';
    document.getElementById('ava').innerHTML = 'AVA = ' + exactPrecision((exactPrecision(json.oee.availability, 4) * 100), 3).toString() + '% ';
    document.getElementById('qua').innerHTML = 'QUA = ' + exactPrecision((exactPrecision(json.oee.quality, 4) * 100), 3).toString() + '% ';
    document.getElementById('per').innerHTML = 'PER = ' + exactPrecision((exactPrecision(json.oee.performance, 4) * 100), 3).toString() + '%';

}

//Hide products
function hide() {
    var d = document.getElementsByClassName('dots');
    for (let i = 0; i < d.length; i++) {
        d[i].style.visibility = "hidden";
    }
}

//Show products
function show() {
    var d = document.getElementsByClassName('dots');
    for (let i = 0; i < d.length; i++) {
        d[i].style.visibility = "visible";
    }
}
//Scroll down to the current bar
function scrollDown() {
    document.getElementById("barsContainer").scrollTop = document.getElementById("barsContainer").scrollHeight;
}

//call API
// function getOeeDataBaseByDate(workstation, startDate, endDate, callback) {
//     const Http = new XMLHttpRequest();
//     const url = 'http://212.200.168.71/productionmanagement/api/oeedata?workstationId=' + workstation.toString() + '&&from=' + startDate.toString() + '&&to=' + endDate.toString();
//     Http.open("GET", url);

//     // //normal
//     // // Http.onreadystatechange = (e) => {
//     // //     //return Http.responseText;
//     // //     document.write(Http.responseText);
//     // // }
//     // // Http.send();

//     //callback
//     Http.onreadystatechange = function () {
//         if (Http.readyState == 4) {
//             if (Http.status == 200) {

//                 // pass the response to the callback function
//                 callback(null, Http.responseText);

//             } else {
//                 // pass the error to the callback function
//                 callback(Http.statusText);
//             }
//         }
//     }
//     Http.send(null);
// }


// function saveTolocalStorage(name, data) {
//     localStorage.setItem(name, data);
// }

// async function callback(err, res) {
//     if (err) alert(err);
//     if (res) {
//         saveTolocalStorage('data', res);
//         //console.log(res);
//         //localStorage.setItem('data', res);
//     }
// }


///new code for API

/**
 * Methods for creating requests.
 * @param {*} url 
 * @param {*} method 
 * @returns 
 */
function createRequest(url, method) {
    return new Request(url, {
        method: method,
    });
}

/**
 * 
 * @param {*} workStation 
 * @param {*} startDate 
 * @param {*} endDate 
 * @returns 
 */
 function createOeeUrl(workStation, startDate, endDate) {
    return `http://212.200.168.71/productionmanagement/api/oeedata/oee?workstationId=${workStation}&&from=${startDate}&&to=${endDate}`;
}

//Time Correctors
function millisecondsToDate(ms) {
    var date = new Date(ms).toLocaleString('sv');
    return date
}
const currentDate = millisecondsToDate(Date.now());
console.log(currentDate);

function dayStartMilli(ms) {
    var x = 0;
    var off = new Date().getTimezoneOffset() * 60000;
    var res = ms - (ms % 86400000);
    if (Math.floor(res/86400000) < Math.floor(Date.now()/86400000)) {
        x = 86400000;
    }
    return res + x + off;
}
function utcToLocal(time) {
    var offset_in_ms = new Date().getTimezoneOffset() * 1000 * 60; 
    return time - offset_in_ms;
}

function localToUtc(time) {
    var offset_in_ms = new Date().getTimezoneOffset() * 1000 * 60;
    return time + offset_in_ms;
}
var startDate = millisecondsToDate(localToUtc(dayStartMilli(Date.now())));

// create oee request
// var startDate = '2022-07-29 00:30:00';
console.log(startDate);
var endDate = '';

//select workstation
//var workStation = document.getElementById('wrk').value;
// console.log(selection);
// localStorage.setItem('workstation', selection);
// var workStation = localStorage.getItem('workstation');
//console.log(workStation);

document.addEventListener('DOMContentLoaded', function () {
    var workStation = document.getElementById('wrk');
    if (localStorage['wrk']) { // if job is set
        workStation.value = localStorage['wrk']; // set the value
    }
    workStation.onchange = function () {
         localStorage['wrk'] = this.value; // change localStorage on change
     }
 });

var workStation = localStorage.getItem('wrk');
//console.log(workStation);

var oeeReq = createRequest(
    createOeeUrl(workStation, startDate, endDate),
    'GET'
);


// get prommise with oeeReq
function getDataFromAPI() {
    return fetch(oeeReq).then(data =>{
        try {
            return data.json();
        } catch(error) {
            handleOeeError('error');
        }
       
        }).catch(handleOeeError);
}

//handle error
const handleOeeError = (error) => {
    alert(error)
    console.log('ERROR');
    return;
}

let data;
//get data and use it 
async function oeeData() {
    try {
        data = await getDataFromAPI();
        //after data is filled you process it
        doAll(data);
        scrollDown();
    } catch (error) {
        throw error;
    }
}

oeeData();

//reload page every 1s
setTimeout(function(){
    window.location.reload(1);
}, 5000);


//getOeeDataBaseByDate(1, '2022-07-27 11:00:00', '2022-07-27 12:00:00', callback);

//var retrieved = JSON.parse(localStorage.getItem('data'));
//console.log(retrieved);
//doAll(retrieved);













