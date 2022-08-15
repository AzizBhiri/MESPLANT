//create the OeeDataBase object
class OeeDataBase {
    constructor(isRunning, startedAt, finishedAt, downtimeTypeName,product_ID, product_name, valid, scrap) {
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

 // IoTObj class
class IoTObj {
    constructor(start, end, parameters) {
        this.start = start;
        this.end = end;
        this.parameters = parameters;
    }
}

function millisecondsToDate(ms) {
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

function dayStartMilli(ms) {
    var x = 0;
    var off = new Date().getTimezoneOffset() * 60000;
    var res = ms - (ms % 86400000);
    if (Math.floor(res/86400000) < Math.floor(Date.now()/86400000)) {
        x = 86400000;
    }
    return res + x + off;
}

function doAll(json, sd, fd) {
    function decomposeTolistOfblocks(list_of_json) {
        var list_of_blocks = [];
        for (let i = 0; i < list_of_json.data.length; i++) {
            var obj = list_of_json.data[i];
            var newBlock = new OeeDataBase(obj.isRunning, dateToMilliseconds(obj.startedAt), dateToMilliseconds(obj.finishedAt), obj.downtimeTypeName, obj.productId, obj.productName, obj.valid, obj.scrap);
            list_of_blocks.push(newBlock);
        }
        return list_of_blocks;
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
        return localToUtc(dayStartMilli(ms) + new Date().getTimezoneOffset() * 1000 * 60);
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
        if ((list_of_blocks[0].startedAt - sd) > 0) {
            var emptyBlock = new OeeDataBase(false, sd, list_of_blocks[0].startedAt, "No data", null, null, null, null);
            list_of_blocks.unshift(emptyBlock);
        }
        var off = new Date().getTimezoneOffset() * 60 * 1000;
        if (list_of_blocks[list_of_blocks.length - 1].finishedAt < fd + off) {
            var emptyBlock = new OeeDataBase(false, list_of_blocks[list_of_blocks.length - 1].finishedAt, fd + off, "No data", null, null, null, null);
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
    
    function fixJsonOee(json) {
        var array_of_jsons = JSON.parse(JSON.stringify(json));
        var list_of_blocks = decomposeTolistOfblocks(array_of_jsons);
        list_of_blocks = blockCorrector(list_of_blocks);
        list_of_blocks = gapCorrector(list_of_blocks);
        for (let i = 0; i < list_of_blocks.length; i++) {
            if (check(list_of_blocks[i])) {
                let x = splitBlock(list_of_blocks[i], nextHourMilli(list_of_blocks[i].startedAt));
                list_of_blocks.splice(i + 1, 0, x);
            }
            if (list_of_blocks[i].product_name === undefined || list_of_blocks[i].product_name === '' || list_of_blocks[i].product_name === null) {
                list_of_blocks[i].product_name = 'Unknown Product'
            }
        }
        return list_of_blocks;
    }

    var list_of_blocks = fixJsonOee(json);
    //console.log(list_of_blocks[2]);

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

    function  exactPrecision(number, precision = 3) {
        // return number.toPrecision(precision).replace(new RegExp("((\\d\\.*){"+precision+"}).*"), '$1');
        return number.toPrecision(precision);
    }
    var oee = oeeCalc(json.oee.availability , json.oee.quality , json.oee.performance);

    //Charts.js plugin
    const plugin = {
        beforeDraw: function(chart) {
          if (chart.config.options.elements.center) {
            // Get ctx from string
            var ctx = chart.chart.ctx;
      
            // Get options from the center object in options
            var centerConfig = chart.config.options.elements.center;
            var fontStyle = centerConfig.fontStyle || 'Arial';
            var txt = centerConfig.text;
            var color = centerConfig.color || '#000';
            var maxFontSize = centerConfig.maxFontSize || 75;
            var sidePadding = centerConfig.sidePadding || 20;
            var sidePaddingCalculated = (sidePadding / 100) * (chart.innerRadius * 2)
            // Start with a base font of 30px
            ctx.font = "30px " + fontStyle;
      
            // Get the width of the string and also the width of the element minus 10 to give it 5px side padding
            var stringWidth = ctx.measureText(txt).width;
            var elementWidth = (chart.innerRadius * 2) - sidePaddingCalculated;
      
            // Find out how much the font can grow in width.
            var widthRatio = elementWidth / stringWidth;
            var newFontSize = Math.floor(30 * widthRatio);
            var elementHeight = (chart.innerRadius * 2);
      
            // Pick a new font size so it will not be larger than the height of label.
            var fontSizeToUse = Math.min(newFontSize, elementHeight, maxFontSize);
            var minFontSize = centerConfig.minFontSize;
            var lineHeight = centerConfig.lineHeight || 25;
            var wrapText = false;
      
            if (minFontSize === undefined) {
              minFontSize = 20;
            }
      
            if (minFontSize && fontSizeToUse < minFontSize) {
              fontSizeToUse = minFontSize;
              wrapText = true;
            }
      
            // Set font settings to draw it correctly.
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            var centerX = ((chart.chartArea.left + chart.chartArea.right) / 2);
            var centerY = ((chart.chartArea.top + chart.chartArea.bottom) / 2);
            ctx.font = fontSizeToUse + "px " + fontStyle;
            ctx.fillStyle = color;
      
            if (!wrapText) {
              ctx.fillText(txt, centerX, centerY);
              return;
            }
      
            var words = txt.split(' ');
            var line = '';
            var lines = [];
      
            // Break words up into multiple lines if necessary
            for (var n = 0; n < words.length; n++) {
              var testLine = line + words[n] + ' ';
              var metrics = ctx.measureText(testLine);
              var testWidth = metrics.width;
              if (testWidth > elementWidth && n > 0) {
                lines.push(line);
                line = words[n] + ' ';
              } else {
                line = testLine;
              }
            }
      
            // Move the center up depending on line height and number of lines
            centerY -= (lines.length / 2) * lineHeight;
      
            for (var n = 0; n < lines.length; n++) {
              ctx.fillText(lines[n], centerX, centerY);
              centerY += lineHeight;
            }
            //Draw text in center
            ctx.fillText(line, centerX, centerY);
          }
        }
    };
    
    Chart.pluginService.register(plugin);

    //myChart_state doughnut
    function oeeReport() {
        //Prepare data for myChart_state doughnut
        var green = 0;
        var red = 0;
        var burgundy = 0;
        var grey = 0;
        var yellow = 0;
        var valid = 0;
        var scrap = 0;
        for (let i = 0; i < list_of_blocks.length; i++) {
            valid += list_of_blocks[i].valid;
            scrap += list_of_blocks[i].scrap;
            if (list_of_blocks[i].isRunning) {
                green += list_of_blocks[i].getBlockLength();
            } else if (list_of_blocks[i].downtimeTypeName === "No data") {
                grey += list_of_blocks[i].getBlockLength();
            } else if (list_of_blocks[i].downtimeTypeName === "Micro stop") {
                yellow += list_of_blocks[i].getBlockLength();
            } else if (list_of_blocks[i].downtimeTypeName === "Unknown"){
                red += list_of_blocks[i].getBlockLength();
            } else {
                burgundy += list_of_blocks[i].getBlockLength();
            }
        }
        
        green = exactPrecision(green/3600000);
        red = exactPrecision(red/3600000);
        burgundy = exactPrecision(burgundy/3600000);
        grey = exactPrecision(grey/3600000);
        yellow = exactPrecision(yellow/3600000);

        //Create myChart_state doughnut
        const data_state = {
            labels: [
            'Running',
            'Unknown',
            'Known stop',
            'Out of service',
            'Micro stop'
            ],
            datasets: [{
            label: 'State',
            data: [green, red, burgundy, grey, yellow],
            backgroundColor: [
                'green',
                'red',
                'maroon',
                'grey',
                'yellow'
            ],
            hoverBorderWidth: 2,
            hoverBorderColor: 'black',
            }]
        };
        
        function chooseFontSize() {
            if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
                return 20;
               } else { 
                    return 60 * (window.innerWidth / 960);
               }
        }

        function chooseLineHeight() {
            if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
                return 50;
               } else { 
                    return 70 * (window.innerWidth / 960);
               }
        }

        const config_state = {
            type: 'doughnut',
            data: data_state,
            options: {
                elements: {
                    center: {
                        text: '    ' + exactPrecision((exactPrecision(oee, 4) * 100), 3).toString() + '%   V:' + valid.toString() + '   S:' + scrap.toString() 
                        ,
                        color: '#000', // Default is #000000
                        fontStyle: 'Trebuchet MS', // Default is Arial
                        sidePadding: 20, // Default is 20 (as a percentage)
                        minFontSize: chooseFontSize(), // Default is 20 (in px), set to false and text will not wrap.
                        lineHeight: chooseLineHeight() // Default is 25 (in px), used for when text wraps
                    }
                }
            }
        };
        
        const ctx_state = document.getElementById('myChart1');
        var doughnutChart_state = new Chart(ctx_state, config_state);
    }

    //myBar_product
    function bar() {

        // //replace null, undefined, ""
        // function replaceIndex(array, item, replace = "Unknown Product") {
        //     var index = array.indexOf(item);
        //     if (index !== -1) {
        //         array[index] = replace;
        //     }
        // }
        // replaceIndex(product_names, null);
        // replaceIndex(product_names, "undefined");
        // replaceIndex(product_names, "");

        var product_names = [];
        for (let i = 0; i < list_of_blocks.length; i++) {
            product_names.push(list_of_blocks[i].product_name);
        }
            
        var unique_product_names = [...new Set(product_names)];



        // var product_count = [];
        // for (let i = 0; i < unique_product_names.length; i++) {
        //     product_count.push(0);
        // }

        var product_count_valid = [];
        for (let i = 0; i < unique_product_names.length; i++) {
            product_count_valid.push(0);
        }

        var product_count_scrap = [];
        for (let i = 0; i < unique_product_names.length; i++) {
            product_count_scrap.push(0);
        }

        // for(let i = 0; i < list_of_blocks.length; i++) {
        //     product_count[unique_product_names.indexOf(list_of_blocks[i].product_name)] += list_of_blocks[i].valid + list_of_blocks[i].scrap;
        // }

        for(let i = 0; i < list_of_blocks.length; i++) {
            product_count_valid[unique_product_names.indexOf(list_of_blocks[i].product_name)] += list_of_blocks[i].valid;
        }

        for(let i = 0; i < list_of_blocks.length; i++) {
            product_count_scrap[unique_product_names.indexOf(list_of_blocks[i].product_name)] += list_of_blocks[i].scrap;
        }
        
        // console.log(unique_product_names);
        // console.log(product_count_valid);

        var colors1 = []; 
        for (let i = 0; i < unique_product_names.length; i++) {
            colors1.push('green');
        }

        var colors2 = []; 
        for (let i = 0; i < unique_product_names.length; i++) {
            colors2.push('red');
        }


        const data_bar = {
            labels: unique_product_names,
            datasets: [{
                label: 'Valid',
                data: product_count_valid,
                backgroundColor: colors1,
                borderSkipped: 20,
                hoverBorderWidth: 2,
                hoverBorderColor: 'black'
            },
            {
                label: 'Scrap',
                data: product_count_scrap,
                backgroundColor: colors2,
                borderSkipped: 20,
                hoverBorderWidth: 2,
                hoverBorderColor: 'black'
            }
            ]
        };

        const config_bar = {
            type: 'bar',
            data: data_bar,
            options: {
                scales: {
                    xAxes: [{
                        stacked: true
                    }],
                    yAxes: [{
                        stacked: true
                    }]
                }
            }

        }

        const ctx_bar = document.getElementById('myChart2');
        var barChart_product = new Chart(ctx_bar, config_bar);
    }

    //DownTime
    function downtime() {
        //get red stop names
        var unknown = [];
        for (let i = 0; i < list_of_blocks.length; i++) {
            var x = list_of_blocks[i].downtimeTypeName;
            if (x != "" && x != "Micro stop" && x != "No data") {
                unknown.push(x);
            }    
        }

        var unique_unknown = [...new Set(unknown)];

        var unknown_periods = []
        for (let i = 0; i < unique_unknown.length + 1; i++) {
            unknown_periods.push(0);
        }
        
        for (let i = 0; i < list_of_blocks.length; i++) {
            var x = list_of_blocks[i].downtimeTypeName;
            unknown_periods[unique_unknown.indexOf(x)] += list_of_blocks[i].getBlockLength();
        }
        
        unknown_periods.pop();
        for (let i = 0; i < unknown_periods.length; i++) {
            unknown_periods[i] = exactPrecision(unknown_periods[i]/3600000);
        }

        var colors4 = []; 
        for (let i = 0; i < unique_unknown.length; i++) {
            var random_color = "#" + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0').toUpperCase();
            colors4.push(random_color);
        }

        const data_unknown = {
            labels: unique_unknown,
            datasets: [{
              label: 'Unknown',
              data: unknown_periods,
              backgroundColor: colors4,
              hoverBorderWidth: 2,
              hoverBorderColor: 'black'
            }]
        };
        
        const config_unknown = {
            type: 'doughnut',
            data: data_unknown
        };
        
        const ctx_unknown = document.getElementById('myChart3');
        var doughnutChart_unknown = new Chart(ctx_unknown, config_unknown);        
    }

    oeeReport();
    bar();
    downtime();
}

//report selector
function reportSelector() {
    if (localStorage.getItem('type') === 'Production') {
        doAll(data, dateToMilliseconds(startDate), dateToMilliseconds(endDate));
    } else if (localStorage.getItem('type') === 'IoT') {
        // var measurement = 0;
        // if (localStorage.getItem('IoT-Type') === 'Engine Speed') {
        //     measurement = 1;
        // }
        iot(data, dateToMilliseconds(startDate), dateToMilliseconds(endDate));
    } else if (localStorage.getItem('type') === 'Service') {
        alert('Service is not available at the moment');
    } 
}

//appearence
function appearence() {
    document.getElementById('wrk').innerHTML = 'Worksation ' + localStorage.getItem('wrk');
    if (localStorage.getItem('timePeriod') == 28800000) {
        document.getElementById('period').innerHTML = 'Last 8 Hours';
    } else if (localStorage.getItem('timePeriod') == 86400000) {
        document.getElementById('period').innerHTML = 'Last Day';
    } else if (localStorage.getItem('timePeriod') == 604800000) {
        document.getElementById('period').innerHTML = 'Last Week';
    } else if (localStorage.getItem('timePeriod') == 2592000000) {
        document.getElementById('period').innerHTML = 'Last Month';
    } else {
        document.getElementById('period').innerHTML = 'From ' + localStorage.getItem('timePeriod1').replace(/T/g, ' ') + ' To ' + localStorage.getItem('timePeriod2').replace(/T/g, ' ');
    }
}
//IoT Report
function iot(jsonIot, sd, fd) {
    var arr = JSON.parse(JSON.stringify(jsonIot));
    var list_of_IoT = [];
    for (let i = 0; i < arr.data.length; i++) {
        var newIotObject = new IoTObj(dateToMilliseconds(arr.data[i].start), dateToMilliseconds(arr.data[i].end), arr.data[i].parameters);
        list_of_IoT.push(newIotObject);
    }
    for( let k = 0; k < arr.data[0].parameters.length; k++) {
        var x_axis = [];
        var min_data = [];
        var max_data = [];
        if ((list_of_IoT[0].start) > sd) {
            x_axis.push(sd);
            min_data.push(null);
            max_data.push(null);
        }
        for (let i = 0; i < list_of_IoT.length; i++) {
            x_axis.push(millisecondsToDate(utcToLocal(list_of_IoT[i].start)));
            min_data.push(list_of_IoT[i].parameters[k].min);
            max_data.push(list_of_IoT[i].parameters[k].max);
        }
        if ((list_of_IoT[0].end) < fd) {
            x_axis.push(millisecondsToDate(fd));
            min_data.push(null);
            max_data.push(null);
        }

        //Add gaps in the middle
        // let i = 0; ; 
        // while (i < x_axis.length - 1) {
        //     if ((dateToMilliseconds(x_axis[i + 1]) - dateToMilliseconds(x_axis[i])) > 5*60*1000) {
        //         x_axis.splice(i + 1, 0, millisecondsToDate(utcToLocal(dateToMilliseconds(x_axis[i]) + 5*60*1000)));
        //         min_data.splice(i + 1, 0, null);
        //         max_data.splice(i + 1, 0, null);
        //     }
        //     i++;
        // }

        let stepped = false;
        if (arr.data[0].parameters[k].name === "Engine On/Off") {
            stepped = true;
        }

        var data_IoT = {
            labels: x_axis,
            datasets: [{
                label: 'Min',
                data: min_data,
                fill: false,
                steppedLine : stepped,
                borderColor: 'blue',
                tension: 0.4,
                backgroundColor : 'rgb(0, 0, 0, 0.1)',
                pointBackgroundColor : 'rgb(0, 0, 0, 1)',
                pointBorderColor : 'rgb(0, 0, 0, 1)',
                pointRadius : (window.innerWidth * 0.1)/x_axis.length,
                pointHoverRadius : (window.innerWidth * 0.2)/x_axis.length
            }, 
            {
                label: 'Max',
                data: max_data,
                fill: '-1',
                steppedLine : stepped,
                borderColor: 'red',
                tension: 0.4,
                backgroundColor : 'rgb(0, 0, 0, 0.1)',
                pointBackgroundColor : 'rgb(0, 0, 0, 1)',
                pointBorderColor : 'rgb(0, 0, 0, 1)',
                pointRadius : (window.innerWidth * 0.1)/x_axis.length,
                pointHoverRadius : (window.innerWidth * 0.2)/x_axis.length
                }]
        };

        var timeUnit = 'hour';
        if (dateToMilliseconds(x_axis[x_axis.length - 1]) - dateToMilliseconds(x_axis[0]) > 172800000) {
            timeUnit = 'day';
        }
            
        var config_IoT = {
            type: 'line',
            data: data_IoT,
            options: {
                scales: {
                    xAxes:[{
                        type : 'time',
                        time: {
                            unit: timeUnit,
                            unitStepSize: 1,
                            tooltipFormat : 'MMM D h:mm:ss a'
                        }
                    }],
                    yAxes:[{
                        ticks : {
                        min : Math.floor(Math.min(...min_data) * 0.15),
                        max : Math.floor(Math.max(...max_data) * 1.15)
                        }
                    }]
                },
                title: {
                    display: true,
                    text: arr.data[0].parameters[k].name
                }
            }
        };
        
        var newInput = document.createElement('input');
        newInput.setAttribute("type", "checkbox");
        newInput.setAttribute("value", arr.data[0].parameters[k].name);
        newInput.setAttribute("id", arr.data[0].parameters[k].name.replace(/\s+/g, '-'));
        newInput.setAttribute("name", arr.data[0].parameters[k].name.replace(/\s+/g, '-'));
        newInput.setAttribute("checked", true);

        var newLabel = document.createElement('label');
        newLabel.setAttribute("for", arr.data[0].parameters[k].name.replace(/\s+/g, '-'));
        newLabel.innerText = arr.data[0].parameters[k].name;
        var checkboxContainer = document.getElementById("form");

        var newBr = document.createElement('br');

        checkboxContainer.appendChild(newInput);
        checkboxContainer.appendChild(newLabel);
        checkboxContainer.appendChild(newBr);

        var newDiv = document.createElement('canvas');
        newDiv.setAttribute("id", "myLine" + k.toString());
        var lineContainer = document.getElementById("lineContainer");
        lineContainer.appendChild(newDiv);

        var ctx_IoT = document.getElementById('myLine' + k.toString());
        var lineChart_IoT = new Chart(ctx_IoT, config_IoT);
    }

    //Toggle
    for (let k = 0; k < arr.data[0].parameters.length; k++) {
        var elt = document.getElementById(arr.data[0].parameters[k].name.replace(/\s+/g, '-'));
        elt.onchange = function () {
            document.getElementById('myLine' + k.toString()).style.display = "block";
            if (this.checked == false) {
                document.getElementById('myLine' + k.toString()).style.display = "none";
            }
          }
    }
    

}


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

function createIotUrl(workStation, startDate, endDate) {
    return `http://212.200.168.71/iot/api/iotdata?workstationId=${workStation}&&from=${startDate}&&to=${endDate}`;
}


var currentDayStart = millisecondsToDate(localToUtc(dayStartMilli(Date.now())) - new Date().getTimezoneOffset() * 60 *1000);

// create oee request
var startDate;
var endDate;
var timePeriod;

timePeriod = localStorage.getItem('timePeriod');
if (timePeriod != 1) {
    startDate = millisecondsToDate(localToUtc(Date.now()) + (new Date().getTimezoneOffset() * 60 *1000) - timePeriod);
    //console.log(timePeriod, startDate);
    endDate = '';
} else {
    startDate = millisecondsToDate(dateToMilliseconds(localStorage.getItem('timePeriod1')) + (new Date().getTimezoneOffset() * 60 *1000));
    endDate = millisecondsToDate(dateToMilliseconds(localStorage.getItem('timePeriod2')) + (new Date().getTimezoneOffset() * 60 *1000));
    console.log(startDate);
    console.log(endDate);

}


var workStation = localStorage.getItem('wrk');

var req;
    if (localStorage.getItem('type') === 'Production') { 
        req = createRequest(
        createOeeUrl(workStation, startDate, endDate),
        'GET'
    );} else if (localStorage.getItem('type') === 'IoT'){ 
        req = createRequest(
        createIotUrl(workStation, startDate, endDate),
        'GET'
    );}

// get prommise with req
function getDataFromAPI() {
    return fetch(req).then(data =>{
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

var data;
//get data and use it 
async function oeeData() {
    try {
        data = await getDataFromAPI();
        //after data is filled you process it
        appearence();
        // doAll(data, dateToMilliseconds(startDate), dateToMilliseconds(endDate));
        reportSelector();
    } catch (error) {
        throw error;
    }
}

oeeData();