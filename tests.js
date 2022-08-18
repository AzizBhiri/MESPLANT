function doAll(json) {
    var array_of_jsons = JSON.stringify(json);
    document.write(array_of_jsons);
}

//API
/**
 * Methods for creating requests.
 * @param {*} url 
 * @param {*} method
 * @param {*} headers
 * @param {*} body  
 * @returns 
 */
 function createRequest(url, method, headers, body) {
    return new Request(url, {
        method: method,
        headers : headers,
        body : body
    });
}

/**
 * 
 * @param {*} startDate 
 * @param {*} endDate 
 * @returns 
 */
 function createOeeUrl(startDate, endDate) {
    return `http://212.200.168.71/productionmanagement/api/oeedata/oee?from=${startDate}&&to=${endDate}`;
}

var msg = [1, 2];
var startDate = '2022-08-18T06:00:00';
var endDate = '';

var oeeReq = createRequest(
    createOeeUrl(startDate, endDate),
    'POST',
    {'Content-Type' : 'application/json'},
    JSON.stringify(msg)
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