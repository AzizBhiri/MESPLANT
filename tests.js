// //create the OeeDataBase object
// class OeeDataBase {
//     constructor(isRunning, startedAt, finishedAt, downtimeTypeName, product_ID, product_name, valid, scrap) {
//         this.isRunning = isRunning;
//         this.startedAt = startedAt;
//         this.finishedAt = finishedAt;
//         this.downtimeTypeName = downtimeTypeName;
//         // this.ArrayProductData = ArrayProductData;
//         this.product_ID = product_ID;
//         this.product_name = product_name;
//         this.valid = valid;
//         this.scrap = scrap;
//     }
// }

// function decomposeTolistOfblocks(list_of_json) {
//     var list_of_blocks = [];
//     for (let i = 0; i < list_of_json.data.length; i++) {
//         var obj = list_of_json.data[i];
//         var newBlock = new OeeDataBase(obj.isRunning, obj.startedAt, obj.finishedAt, obj.downtimeTypeName, obj.productId, obj.productName, obj.valid, obj.scrap);
//         list_of_blocks.push(newBlock);
//     }
//     return list_of_blocks;
// }

function doAll(json) {
    //var array_of_jsons = JSON.parse(JSON.stringify(json));
    // var list_of_blocks = decomposeTolistOfblocks(array_of_jsons);
    // console.log(list_of_blocks);
    //document.write(array_of_jsons);
    document.write(json);
}

//API
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

var workStation = 1;
var startDate = '2022-08-16T22:00:00';
var endDate = '';

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
    } catch (error) {
        throw error;
    }
}

oeeData();