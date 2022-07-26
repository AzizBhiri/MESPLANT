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

var data = [];
function callback(err, res) {
        if (err) alert(err);
        if (res) {
            setTimeout(data.push(res), 5000);
            console.log(data);
        }
}

getOeeDataBaseByDate(1, '2022-07-22 00:00:00', '2022-07-22 02:00:00', callback);

