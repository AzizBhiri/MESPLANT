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
        console.log(grey);

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

    if (localStorage.getItem('type') === 'Production') {
        oeeReport();
        bar();
        downtime();
    } else if (localStorage.getItem('type') === 'IoT') {
        var measurement = 0;
        if (localStorage.getItem('IoT-Type') === 'Engine Speed') {
            measurement = 1;
        }
        iot(measurement);
    } else if (localStorage.getItem('type') === 'Service') {
        alert('Service is not available at the moment');
    } 

}

//report selector
function reportSelector() {
    
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
function iot(measurement) {
    const jsonIot = {
            "workstationId": 1,
            "data": [
            {
            "id": 2551,
            "start": "2022-08-10T22:00:06.33",
            "end": "2022-08-10T22:01:04.477",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "22",
            "max": "198"
            },
            {
            "name": "Engine Speed",
            "min": "217.94494665795236",
            "max": "391.33514940266275"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2552,
            "start": "2022-08-10T22:02:06.643",
            "end": "2022-08-10T22:03:04.783",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "54",
            "max": "191"
            },
            {
            "name": "Engine Speed",
            "min": "202.8281726027039",
            "max": "397.2888915474009"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2553,
            "start": "2022-08-10T22:04:06.947",
            "end": "2022-08-10T22:06:05.267",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "198"
            },
            {
            "name": "Engine Speed",
            "min": "206.77816180442375",
            "max": "398.54276525258217"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2554,
            "start": "2022-08-10T22:07:07.423",
            "end": "2022-08-10T22:09:05.677",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "31",
            "max": "190"
            },
            {
            "name": "Engine Speed",
            "min": "209.97583818883442",
            "max": "399.21897674593095"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2555,
            "start": "2022-08-10T22:10:07.803",
            "end": "2022-08-10T22:11:06.6",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "26",
            "max": "185"
            },
            {
            "name": "Engine Speed",
            "min": "212.1457156688281",
            "max": "381.63974769163866"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2556,
            "start": "2022-08-10T22:12:08.737",
            "end": "2022-08-10T22:13:06.877",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "198"
            },
            {
            "name": "Engine Speed",
            "min": "206.85606220192093",
            "max": "386.3700802564109"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2557,
            "start": "2022-08-10T22:14:09.003",
            "end": "2022-08-10T22:17:07.447",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "195"
            },
            {
            "name": "Engine Speed",
            "min": "202.5702250324796",
            "max": "388.7924670176732"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2558,
            "start": "2022-08-10T22:18:09.597",
            "end": "2022-08-10T22:21:08.16",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "25",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "201.16803066471965",
            "max": "400.27773698255317"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2559,
            "start": "2022-08-10T22:22:10.317",
            "end": "2022-08-10T22:26:08.88",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "195"
            },
            {
            "name": "Engine Speed",
            "min": "204.8102252187255",
            "max": "399.6446438916608"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2560,
            "start": "2022-08-10T22:27:11.017",
            "end": "2022-08-10T22:31:09.613",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "208.13783204735157",
            "max": "398.07736009590207"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2561,
            "start": "2022-08-10T22:32:11.75",
            "end": "2022-08-10T22:36:10.21",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "193"
            },
            {
            "name": "Engine Speed",
            "min": "205.34336430401697",
            "max": "399.0223233077593"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2562,
            "start": "2022-08-10T22:37:12.357",
            "end": "2022-08-10T22:39:10.66",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "196"
            },
            {
            "name": "Engine Speed",
            "min": "216.12729968197985",
            "max": "399.50163756630457"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2563,
            "start": "2022-08-10T22:40:12.83",
            "end": "2022-08-10T22:41:10.973",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "35",
            "max": "187"
            },
            {
            "name": "Engine Speed",
            "min": "201.63531311146698",
            "max": "380.49362453740724"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2564,
            "start": "2022-08-10T22:42:13.717",
            "end": "2022-08-10T22:45:12.193",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "196"
            },
            {
            "name": "Engine Speed",
            "min": "211.29456553156234",
            "max": "399.3806592746734"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2565,
            "start": "2022-08-10T22:46:14.35",
            "end": "2022-08-10T22:50:12.88",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "26",
            "max": "193"
            },
            {
            "name": "Engine Speed",
            "min": "200.93577125116056",
            "max": "395.0793404590894"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2566,
            "start": "2022-08-10T22:51:15.007",
            "end": "2022-08-10T22:53:13.237",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "195"
            },
            {
            "name": "Engine Speed",
            "min": "200.58164068280797",
            "max": "397.3606133056808"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2567,
            "start": "2022-08-10T22:54:15.363",
            "end": "2022-08-10T22:55:13.487",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "195"
            },
            {
            "name": "Engine Speed",
            "min": "203.05161221575534",
            "max": "396.18671646953874"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2568,
            "start": "2022-08-10T22:56:15.613",
            "end": "2022-08-10T23:00:14.227",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "23",
            "max": "197"
            },
            {
            "name": "Engine Speed",
            "min": "201.18998916226906",
            "max": "399.48233348392057"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2569,
            "start": "2022-08-10T23:01:16.427",
            "end": "2022-08-10T23:04:14.83",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "201.72200269488712",
            "max": "399.7167451587863"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2570,
            "start": "2022-08-10T23:05:16.957",
            "end": "2022-08-10T23:09:15.473",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "197"
            },
            {
            "name": "Engine Speed",
            "min": "204.78048314969078",
            "max": "399.31180604697755"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2571,
            "start": "2022-08-10T23:10:18.127",
            "end": "2022-08-10T23:13:16.52",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "196"
            },
            {
            "name": "Engine Speed",
            "min": "200.23563324648683",
            "max": "395.4961659634189"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2572,
            "start": "2022-08-10T23:14:18.643",
            "end": "2022-08-10T23:18:18.377",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "200.88593705419729",
            "max": "398.1259036267762"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2573,
            "start": "2022-08-10T23:19:20.537",
            "end": "2022-08-10T23:20:18.66",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "22",
            "max": "197"
            },
            {
            "name": "Engine Speed",
            "min": "233.76010584622628",
            "max": "397.3785098638658"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2574,
            "start": "2022-08-10T23:21:20.787",
            "end": "2022-08-10T23:23:19.017",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "194"
            },
            {
            "name": "Engine Speed",
            "min": "203.54747207059873",
            "max": "392.7874968070851"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2575,
            "start": "2022-08-10T23:24:21.18",
            "end": "2022-08-10T23:26:19.457",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "197"
            },
            {
            "name": "Engine Speed",
            "min": "209.33004704557828",
            "max": "389.2223317216441"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2576,
            "start": "2022-08-10T23:27:21.58",
            "end": "2022-08-10T23:31:20.847",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "25",
            "max": "193"
            },
            {
            "name": "Engine Speed",
            "min": "202.1146329702412",
            "max": "393.7293881067119"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2577,
            "start": "2022-08-10T23:32:22.96",
            "end": "2022-08-10T23:35:21.453",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "197"
            },
            {
            "name": "Engine Speed",
            "min": "205.26208575510518",
            "max": "394.02792006914876"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2578,
            "start": "2022-08-10T23:36:23.567",
            "end": "2022-08-10T23:40:22.033",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "25",
            "max": "195"
            },
            {
            "name": "Engine Speed",
            "min": "200.82648829090712",
            "max": "398.6260036016004"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2579,
            "start": "2022-08-10T23:41:24.203",
            "end": "2022-08-10T23:45:22.75",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "27",
            "max": "198"
            },
            {
            "name": "Engine Speed",
            "min": "200.2910122300922",
            "max": "399.38925721277917"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2580,
            "start": "2022-08-10T23:46:24.877",
            "end": "2022-08-10T23:48:23.16",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "32",
            "max": "190"
            },
            {
            "name": "Engine Speed",
            "min": "201.35859936084535",
            "max": "390.91308124404077"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2581,
            "start": "2022-08-10T23:49:25.33",
            "end": "2022-08-10T23:50:24.19",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "24",
            "max": "178"
            },
            {
            "name": "Engine Speed",
            "min": "202.25840596693493",
            "max": "394.58261835566844"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2582,
            "start": "2022-08-10T23:51:26.347",
            "end": "2022-08-10T23:52:24.47",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "223.125704980458",
            "max": "395.41365900429605"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2583,
            "start": "2022-08-10T23:53:27.123",
            "end": "2022-08-10T23:56:25.507",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "201.95151855630405",
            "max": "397.9644709615803"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2584,
            "start": "2022-08-10T23:57:27.663",
            "end": "2022-08-10T23:58:25.82",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "22",
            "max": "194"
            },
            {
            "name": "Engine Speed",
            "min": "207.38069211273486",
            "max": "394.8422619552176"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2585,
            "start": "2022-08-10T23:59:27.977",
            "end": "2022-08-11T00:00:26.113",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "36",
            "max": "184"
            },
            {
            "name": "Engine Speed",
            "min": "205.73587436112385",
            "max": "381.3829801829825"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2586,
            "start": "2022-08-11T00:01:28.693",
            "end": "2022-08-11T00:02:26.823",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "23",
            "max": "198"
            },
            {
            "name": "Engine Speed",
            "min": "203.19622898027126",
            "max": "386.21504351931395"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2587,
            "start": "2022-08-11T00:03:28.953",
            "end": "2022-08-11T00:07:27.517",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "196"
            },
            {
            "name": "Engine Speed",
            "min": "200.55313057079593",
            "max": "397.7245185135698"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2588,
            "start": "2022-08-11T00:08:29.66",
            "end": "2022-08-11T00:11:28.033",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "23",
            "max": "197"
            },
            {
            "name": "Engine Speed",
            "min": "200.1972761586482",
            "max": "397.1345879736052"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2589,
            "start": "2022-08-11T00:12:30.173",
            "end": "2022-08-11T00:15:28.587",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "22",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "200.9816976083916",
            "max": "386.1586926159815"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2590,
            "start": "2022-08-11T00:16:30.753",
            "end": "2022-08-11T00:19:29.643",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "204.76513553569333",
            "max": "400.0115745298805"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2591,
            "start": "2022-08-11T00:20:31.783",
            "end": "2022-08-11T00:23:30.177",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "197"
            },
            {
            "name": "Engine Speed",
            "min": "213.1778917121598",
            "max": "396.2343523899812"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2592,
            "start": "2022-08-11T00:24:32.347",
            "end": "2022-08-11T00:26:30.587",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "23",
            "max": "198"
            },
            {
            "name": "Engine Speed",
            "min": "201.45913439019543",
            "max": "387.7795673355924"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2593,
            "start": "2022-08-11T00:27:32.753",
            "end": "2022-08-11T00:28:31.11",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "31",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "205.9824825878546",
            "max": "369.87077311705366"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2594,
            "start": "2022-08-11T00:29:33.253",
            "end": "2022-08-11T00:32:31.677",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "216.14852977642255",
            "max": "394.41607650830224"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2595,
            "start": "2022-08-11T00:33:33.847",
            "end": "2022-08-11T00:37:32.283",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "201.49006240103864",
            "max": "399.99795019965524"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2596,
            "start": "2022-08-11T00:38:34.397",
            "end": "2022-08-11T00:40:32.63",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "23",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "200.35356781370638",
            "max": "397.4871630783785"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2597,
            "start": "2022-08-11T00:41:34.8",
            "end": "2022-08-11T00:44:33.893",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "202.73677565353773",
            "max": "392.91095758685424"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2598,
            "start": "2022-08-11T00:45:36.05",
            "end": "2022-08-11T00:47:34.327",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "38",
            "max": "198"
            },
            {
            "name": "Engine Speed",
            "min": "213.33069078445934",
            "max": "399.7808797269412"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2599,
            "start": "2022-08-11T00:48:36.47",
            "end": "2022-08-11T00:51:35.47",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "201.30178653196515",
            "max": "399.5365721675831"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2600,
            "start": "2022-08-11T00:52:37.637",
            "end": "2022-08-11T00:53:35.757",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "194"
            },
            {
            "name": "Engine Speed",
            "min": "202.99177544993898",
            "max": "366.14851143698604"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2601,
            "start": "2022-08-11T00:54:38.083",
            "end": "2022-08-11T00:58:36.597",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "27",
            "max": "198"
            },
            {
            "name": "Engine Speed",
            "min": "200.925416987932",
            "max": "398.8781053728788"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2602,
            "start": "2022-08-11T00:59:38.723",
            "end": "2022-08-11T01:01:37.007",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "193"
            },
            {
            "name": "Engine Speed",
            "min": "201.3353080088158",
            "max": "398.79982686659315"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2603,
            "start": "2022-08-11T01:02:39.143",
            "end": "2022-08-11T01:03:37.293",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "61",
            "max": "191"
            },
            {
            "name": "Engine Speed",
            "min": "251.83812190167518",
            "max": "386.5351710844669"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2604,
            "start": "2022-08-11T01:04:39.457",
            "end": "2022-08-11T01:08:37.953",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "22",
            "max": "195"
            },
            {
            "name": "Engine Speed",
            "min": "203.48217349486526",
            "max": "399.2605074834919"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2605,
            "start": "2022-08-11T01:09:40.08",
            "end": "2022-08-11T01:13:38.583",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "198"
            },
            {
            "name": "Engine Speed",
            "min": "202.23624679451635",
            "max": "393.64656865481595"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2606,
            "start": "2022-08-11T01:14:40.737",
            "end": "2022-08-11T01:15:38.833",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "27",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "204.0157255037016",
            "max": "398.66694603511456"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2607,
            "start": "2022-08-11T01:16:41.04",
            "end": "2022-08-11T01:18:39.313",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "198"
            },
            {
            "name": "Engine Speed",
            "min": "210.6132701504106",
            "max": "399.68547040043654"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2608,
            "start": "2022-08-11T01:19:41.487",
            "end": "2022-08-11T01:21:39.783",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "41",
            "max": "187"
            },
            {
            "name": "Engine Speed",
            "min": "201.4770126542994",
            "max": "391.4235202681383"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2609,
            "start": "2022-08-11T01:22:41.91",
            "end": "2022-08-11T01:23:40.067",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "34",
            "max": "195"
            },
            {
            "name": "Engine Speed",
            "min": "207.2387191229494",
            "max": "394.13613907924673"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2610,
            "start": "2022-08-11T01:24:42.24",
            "end": "2022-08-11T01:26:40.517",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "28",
            "max": "193"
            },
            {
            "name": "Engine Speed",
            "min": "216.98371356773364",
            "max": "399.06582719263895"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2611,
            "start": "2022-08-11T01:27:43.157",
            "end": "2022-08-11T01:29:41.393",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "22",
            "max": "195"
            },
            {
            "name": "Engine Speed",
            "min": "205.004956751673",
            "max": "393.04922443848534"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2612,
            "start": "2022-08-11T01:30:43.52",
            "end": "2022-08-11T01:34:42.157",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "25",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "201.19061713460397",
            "max": "396.352759896532"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2613,
            "start": "2022-08-11T01:35:44.27",
            "end": "2022-08-11T01:38:42.66",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "22",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "201.03310042947209",
            "max": "400.4745498405744"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2614,
            "start": "2022-08-11T01:39:44.85",
            "end": "2022-08-11T01:42:43.207",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "196"
            },
            {
            "name": "Engine Speed",
            "min": "205.3444037998395",
            "max": "395.3053558040901"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2615,
            "start": "2022-08-11T01:43:45.363",
            "end": "2022-08-11T01:45:43.69",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "191"
            },
            {
            "name": "Engine Speed",
            "min": "201.2587889077788",
            "max": "397.8660636458667"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2616,
            "start": "2022-08-11T01:46:45.83",
            "end": "2022-08-11T01:49:44.253",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "22",
            "max": "196"
            },
            {
            "name": "Engine Speed",
            "min": "200.66336771671817",
            "max": "397.6169976653424"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2617,
            "start": "2022-08-11T01:50:46.377",
            "end": "2022-08-11T01:53:45.753",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "202.91042353802845",
            "max": "398.11382290631246"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2618,
            "start": "2022-08-11T01:54:47.91",
            "end": "2022-08-11T01:55:46.033",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "187"
            },
            {
            "name": "Engine Speed",
            "min": "201.58487240971294",
            "max": "393.40218259891594"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2619,
            "start": "2022-08-11T01:56:48.177",
            "end": "2022-08-11T01:57:46.32",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "31",
            "max": "184"
            },
            {
            "name": "Engine Speed",
            "min": "209.798623518552",
            "max": "381.52340834962365"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2620,
            "start": "2022-08-11T01:58:48.44",
            "end": "2022-08-11T02:01:46.803",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "192"
            },
            {
            "name": "Engine Speed",
            "min": "200.26574203717792",
            "max": "399.86554100078786"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2621,
            "start": "2022-08-11T02:02:48.947",
            "end": "2022-08-11T02:06:47.457",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "201.35212745630747",
            "max": "400.4963539584802"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2622,
            "start": "2022-08-11T02:07:49.567",
            "end": "2022-08-11T02:09:47.773",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "23",
            "max": "197"
            },
            {
            "name": "Engine Speed",
            "min": "200.89057199031606",
            "max": "388.5628213242827"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2623,
            "start": "2022-08-11T02:10:49.927",
            "end": "2022-08-11T02:14:48.897",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "200.91047585721617",
            "max": "400.44197414904926"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2624,
            "start": "2022-08-11T02:15:51.063",
            "end": "2022-08-11T02:18:49.817",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "198"
            },
            {
            "name": "Engine Speed",
            "min": "202.25387500839955",
            "max": "388.21668984289124"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2625,
            "start": "2022-08-11T02:19:51.933",
            "end": "2022-08-11T02:23:50.83",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "197"
            },
            {
            "name": "Engine Speed",
            "min": "203.12309353754068",
            "max": "400.1980101637347"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2626,
            "start": "2022-08-11T02:24:52.957",
            "end": "2022-08-11T02:27:52.267",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "197"
            },
            {
            "name": "Engine Speed",
            "min": "202.93495935425858",
            "max": "382.1542037599321"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2627,
            "start": "2022-08-11T02:28:54.427",
            "end": "2022-08-11T02:30:52.723",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "27",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "200.33842647480705",
            "max": "398.7564698943852"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2628,
            "start": "2022-08-11T02:31:54.897",
            "end": "2022-08-11T02:35:53.443",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "198"
            },
            {
            "name": "Engine Speed",
            "min": "202.87654028639037",
            "max": "399.70314724297407"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2629,
            "start": "2022-08-11T02:36:55.58",
            "end": "2022-08-11T02:37:53.723",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "35",
            "max": "186"
            },
            {
            "name": "Engine Speed",
            "min": "224.51571670358803",
            "max": "400.2646229265186"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2630,
            "start": "2022-08-11T02:38:56.72",
            "end": "2022-08-11T02:41:55.22",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "198"
            },
            {
            "name": "Engine Speed",
            "min": "202.13056748822825",
            "max": "399.3594763154906"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2631,
            "start": "2022-08-11T02:42:57.313",
            "end": "2022-08-11T02:45:55.613",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "198"
            },
            {
            "name": "Engine Speed",
            "min": "200.30437960314768",
            "max": "388.93831293909733"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2632,
            "start": "2022-08-11T02:46:57.767",
            "end": "2022-08-11T02:50:56.333",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "25",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "203.99416807587917",
            "max": "400.2044886952101"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2633,
            "start": "2022-08-11T02:51:58.487",
            "end": "2022-08-11T02:55:57.91",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "204.03684770040067",
            "max": "398.42854625056896"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2634,
            "start": "2022-08-11T02:57:00.067",
            "end": "2022-08-11T02:58:58.283",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "25",
            "max": "194"
            },
            {
            "name": "Engine Speed",
            "min": "200.41654434786017",
            "max": "377.1202571183258"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2635,
            "start": "2022-08-11T03:00:00.423",
            "end": "2022-08-11T03:02:58.783",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "24",
            "max": "198"
            },
            {
            "name": "Engine Speed",
            "min": "203.23189207799356",
            "max": "400.29802549184205"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2636,
            "start": "2022-08-11T03:04:00.94",
            "end": "2022-08-11T03:06:59.3",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "198"
            },
            {
            "name": "Engine Speed",
            "min": "202.52451092392417",
            "max": "399.31168340196444"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2637,
            "start": "2022-08-11T03:08:01.41",
            "end": "2022-08-11T03:09:59.817",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "197"
            },
            {
            "name": "Engine Speed",
            "min": "200.94253278087012",
            "max": "394.32773056384536"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2638,
            "start": "2022-08-11T03:11:01.973",
            "end": "2022-08-11T03:14:00.36",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "22",
            "max": "180"
            },
            {
            "name": "Engine Speed",
            "min": "210.80792505355922",
            "max": "399.82934233450766"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2639,
            "start": "2022-08-11T03:15:02.5",
            "end": "2022-08-11T03:17:01.863",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "182"
            },
            {
            "name": "Engine Speed",
            "min": "210.7199500309303",
            "max": "397.66100883762397"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2640,
            "start": "2022-08-11T03:18:04.033",
            "end": "2022-08-11T03:20:02.317",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "24",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "202.22748504971503",
            "max": "400.1642141823304"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2641,
            "start": "2022-08-11T03:21:04.47",
            "end": "2022-08-11T03:22:02.61",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "31",
            "max": "195"
            },
            {
            "name": "Engine Speed",
            "min": "205.65833825851715",
            "max": "388.5899810344307"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2642,
            "start": "2022-08-11T03:23:04.767",
            "end": "2022-08-11T03:24:02.863",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "27",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "214.423813558977",
            "max": "380.05331363311655"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2643,
            "start": "2022-08-11T03:25:05.05",
            "end": "2022-08-11T03:28:03.397",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "22",
            "max": "198"
            },
            {
            "name": "Engine Speed",
            "min": "204.42375939534222",
            "max": "387.3089183112369"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2644,
            "start": "2022-08-11T03:29:05.57",
            "end": "2022-08-11T03:32:04.033",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "194"
            },
            {
            "name": "Engine Speed",
            "min": "201.6453812029983",
            "max": "400.064479892377"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2645,
            "start": "2022-08-11T03:33:06.13",
            "end": "2022-08-11T03:37:04.737",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "22",
            "max": "197"
            },
            {
            "name": "Engine Speed",
            "min": "200.5064234483179",
            "max": "398.35748102579146"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2646,
            "start": "2022-08-11T03:38:06.923",
            "end": "2022-08-11T03:41:05.673",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "198"
            },
            {
            "name": "Engine Speed",
            "min": "208.82090830129613",
            "max": "394.63399168220997"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2647,
            "start": "2022-08-11T03:42:07.82",
            "end": "2022-08-11T03:43:05.96",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "26",
            "max": "197"
            },
            {
            "name": "Engine Speed",
            "min": "204.7622196831751",
            "max": "391.31156105182674"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2648,
            "start": "2022-08-11T03:44:08.127",
            "end": "2022-08-11T03:45:06.677",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "23",
            "max": "194"
            },
            {
            "name": "Engine Speed",
            "min": "204.90033047509397",
            "max": "388.077062508984"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2649,
            "start": "2022-08-11T03:46:08.82",
            "end": "2022-08-11T03:50:07.367",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "200.34626614191862",
            "max": "396.09429495849383"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2650,
            "start": "2022-08-11T03:51:09.533",
            "end": "2022-08-11T03:53:07.75",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "194"
            },
            {
            "name": "Engine Speed",
            "min": "211.47669664280335",
            "max": "399.99639370936734"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2651,
            "start": "2022-08-11T03:54:10.627",
            "end": "2022-08-11T03:55:08.763",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "25",
            "max": "187"
            },
            {
            "name": "Engine Speed",
            "min": "207.16179213857362",
            "max": "399.77564687304925"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2652,
            "start": "2022-08-11T03:56:11.643",
            "end": "2022-08-11T04:00:10.237",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "22",
            "max": "196"
            },
            {
            "name": "Engine Speed",
            "min": "207.03391035143002",
            "max": "400.29063328302027"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2653,
            "start": "2022-08-11T04:01:12.36",
            "end": "2022-08-11T04:03:10.627",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "22",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "201.0699235212756",
            "max": "384.3919738416895"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2654,
            "start": "2022-08-11T04:04:12.757",
            "end": "2022-08-11T04:05:10.91",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "170"
            },
            {
            "name": "Engine Speed",
            "min": "204.3035293876303",
            "max": "359.93804135854265"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2655,
            "start": "2022-08-11T04:06:13.067",
            "end": "2022-08-11T04:09:12.097",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "27",
            "max": "198"
            },
            {
            "name": "Engine Speed",
            "min": "206.83414215927672",
            "max": "396.93483574210427"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2656,
            "start": "2022-08-11T04:10:14.253",
            "end": "2022-08-11T04:11:12.677",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "33",
            "max": "194"
            },
            {
            "name": "Engine Speed",
            "min": "206.06206585413872",
            "max": "379.2074775530619"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2657,
            "start": "2022-08-11T04:12:14.83",
            "end": "2022-08-11T04:13:13.003",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "25",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "218.66146794562297",
            "max": "395.0944724642739"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2658,
            "start": "2022-08-11T04:14:15.157",
            "end": "2022-08-11T04:15:13.27",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "194"
            },
            {
            "name": "Engine Speed",
            "min": "216.01707326982967",
            "max": "396.21488338085584"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2659,
            "start": "2022-08-11T04:16:15.377",
            "end": "2022-08-11T04:18:13.597",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "22",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "210.02601045294946",
            "max": "398.5644698730877"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2660,
            "start": "2022-08-11T04:19:15.753",
            "end": "2022-08-11T04:22:14.177",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "28",
            "max": "197"
            },
            {
            "name": "Engine Speed",
            "min": "200.46235646042152",
            "max": "399.5175479099702"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2661,
            "start": "2022-08-11T04:23:16.317",
            "end": "2022-08-11T04:24:14.487",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "22",
            "max": "189"
            },
            {
            "name": "Engine Speed",
            "min": "200.9292256102754",
            "max": "393.6057743473564"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2662,
            "start": "2022-08-11T04:25:16.61",
            "end": "2022-08-11T04:29:15.16",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "198"
            },
            {
            "name": "Engine Speed",
            "min": "200.87082175636237",
            "max": "396.0631363115567"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2663,
            "start": "2022-08-11T04:30:17.283",
            "end": "2022-08-11T04:32:15.567",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "23",
            "max": "196"
            },
            {
            "name": "Engine Speed",
            "min": "201.56613227038",
            "max": "396.7648063521855"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2664,
            "start": "2022-08-11T04:33:17.72",
            "end": "2022-08-11T04:34:16.677",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "22",
            "max": "195"
            },
            {
            "name": "Engine Speed",
            "min": "220.86939468753963",
            "max": "394.3208406955566"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2665,
            "start": "2022-08-11T04:35:18.817",
            "end": "2022-08-11T04:36:16.977",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "23",
            "max": "197"
            },
            {
            "name": "Engine Speed",
            "min": "212.14719926280304",
            "max": "397.08944639511844"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2666,
            "start": "2022-08-11T04:37:19.11",
            "end": "2022-08-11T04:40:17.94",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "23",
            "max": "198"
            },
            {
            "name": "Engine Speed",
            "min": "200.8883754872011",
            "max": "400.35905454639305"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2667,
            "start": "2022-08-11T04:41:20.113",
            "end": "2022-08-11T04:44:18.707",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "25",
            "max": "198"
            },
            {
            "name": "Engine Speed",
            "min": "201.00314919188764",
            "max": "399.0494988852225"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2668,
            "start": "2022-08-11T04:45:20.877",
            "end": "2022-08-11T04:49:19.597",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "22",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "200.34747663139714",
            "max": "399.29601480151337"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2669,
            "start": "2022-08-11T04:50:21.74",
            "end": "2022-08-11T04:51:19.893",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "23",
            "max": "197"
            },
            {
            "name": "Engine Speed",
            "min": "202.7393786399343",
            "max": "388.51892374331084"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2670,
            "start": "2022-08-11T04:52:22.097",
            "end": "2022-08-11T04:53:20.253",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "26",
            "max": "185"
            },
            {
            "name": "Engine Speed",
            "min": "200.50872635578213",
            "max": "399.9552390271775"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2671,
            "start": "2022-08-11T04:54:22.393",
            "end": "2022-08-11T04:57:20.817",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "198"
            },
            {
            "name": "Engine Speed",
            "min": "203.02251407970792",
            "max": "399.4698754947027"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2672,
            "start": "2022-08-11T04:58:22.94",
            "end": "2022-08-11T05:02:21.487",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "209.26621591649308",
            "max": "398.11811109492464"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2673,
            "start": "2022-08-11T05:03:23.627",
            "end": "2022-08-11T05:04:21.757",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "25",
            "max": "197"
            },
            {
            "name": "Engine Speed",
            "min": "213.34749184453278",
            "max": "399.74130878948665"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2674,
            "start": "2022-08-11T05:05:23.923",
            "end": "2022-08-11T05:07:22.253",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "23",
            "max": "196"
            },
            {
            "name": "Engine Speed",
            "min": "204.7755121998375",
            "max": "393.3452176304838"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2675,
            "start": "2022-08-11T05:08:24.37",
            "end": "2022-08-11T05:09:22.503",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "28",
            "max": "180"
            },
            {
            "name": "Engine Speed",
            "min": "210.33592796076832",
            "max": "393.10723916982636"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2676,
            "start": "2022-08-11T05:10:24.66",
            "end": "2022-08-11T05:14:23.597",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "196"
            },
            {
            "name": "Engine Speed",
            "min": "205.8433415404909",
            "max": "398.14168208505106"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2677,
            "start": "2022-08-11T05:15:25.753",
            "end": "2022-08-11T05:18:24.173",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "23",
            "max": "196"
            },
            {
            "name": "Engine Speed",
            "min": "200.5673016700369",
            "max": "392.9452038266627"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2678,
            "start": "2022-08-11T05:19:26.347",
            "end": "2022-08-11T05:21:24.583",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "26",
            "max": "195"
            },
            {
            "name": "Engine Speed",
            "min": "201.1844307484033",
            "max": "397.81470684000044"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2679,
            "start": "2022-08-11T05:22:27.097",
            "end": "2022-08-11T05:23:25.237",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "30",
            "max": "198"
            },
            {
            "name": "Engine Speed",
            "min": "200.430233174055",
            "max": "399.61102478415285"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2680,
            "start": "2022-08-11T05:24:27.397",
            "end": "2022-08-11T05:27:25.877",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "208.92597176907861",
            "max": "396.3002104285826"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2681,
            "start": "2022-08-11T05:28:28.023",
            "end": "2022-08-11T05:30:26.317",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "198"
            },
            {
            "name": "Engine Speed",
            "min": "203.34816179049582",
            "max": "398.49379078409345"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2682,
            "start": "2022-08-11T05:31:28.47",
            "end": "2022-08-11T05:32:26.58",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "25",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "214.453564588378",
            "max": "390.56574207328526"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2683,
            "start": "2022-08-11T05:33:28.697",
            "end": "2022-08-11T05:37:28.037",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "23",
            "max": "198"
            },
            {
            "name": "Engine Speed",
            "min": "201.3510108640003",
            "max": "397.73954122095347"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2684,
            "start": "2022-08-11T05:38:30.22",
            "end": "2022-08-11T05:42:28.753",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "204.60574555399165",
            "max": "395.08307207828534"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2685,
            "start": "2022-08-11T05:43:30.88",
            "end": "2022-08-11T05:46:29.317",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "24",
            "max": "193"
            },
            {
            "name": "Engine Speed",
            "min": "201.68675532082412",
            "max": "399.0600690372754"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2686,
            "start": "2022-08-11T05:47:31.47",
            "end": "2022-08-11T05:51:30.097",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "203.6166507649313",
            "max": "400.28238190574683"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2687,
            "start": "2022-08-11T05:52:32.253",
            "end": "2022-08-11T05:53:30.38",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "194"
            },
            {
            "name": "Engine Speed",
            "min": "209.9084086326642",
            "max": "400.0271482997887"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2688,
            "start": "2022-08-11T05:54:33.16",
            "end": "2022-08-11T05:55:31.61",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "33",
            "max": "191"
            },
            {
            "name": "Engine Speed",
            "min": "206.18064696778575",
            "max": "397.1557717728223"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2689,
            "start": "2022-08-11T05:56:33.753",
            "end": "2022-08-11T05:58:31.97",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "22",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "203.74305297159734",
            "max": "394.22873905091956"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2690,
            "start": "2022-08-11T05:59:34.127",
            "end": "2022-08-11T06:03:33.1",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "22",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "210.31951331648952",
            "max": "400.1466379572389"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2691,
            "start": "2022-08-11T06:04:35.253",
            "end": "2022-08-11T06:05:33.407",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "181"
            },
            {
            "name": "Engine Speed",
            "min": "201.28263514915605",
            "max": "398.32643905029"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2692,
            "start": "2022-08-11T06:06:35.533",
            "end": "2022-08-11T06:09:34.007",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "30",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "204.24289094904572",
            "max": "395.9851798184333"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2693,
            "start": "2022-08-11T06:10:36.143",
            "end": "2022-08-11T06:11:34.283",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "41",
            "max": "195"
            },
            {
            "name": "Engine Speed",
            "min": "231.05379037276552",
            "max": "385.1455995393291"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2694,
            "start": "2022-08-11T06:12:36.47",
            "end": "2022-08-11T06:16:35.02",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "193"
            },
            {
            "name": "Engine Speed",
            "min": "205.42384771376098",
            "max": "395.9462036252889"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2695,
            "start": "2022-08-11T06:17:37.173",
            "end": "2022-08-11T06:19:35.487",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "27",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "202.6499308504397",
            "max": "385.46648369540765"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2696,
            "start": "2022-08-11T06:20:37.707",
            "end": "2022-08-11T06:22:36.007",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "35",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "203.920763168801",
            "max": "400.040045346953"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2697,
            "start": "2022-08-11T06:23:38.143",
            "end": "2022-08-11T06:24:36.33",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "26",
            "max": "176"
            },
            {
            "name": "Engine Speed",
            "min": "205.39571627056029",
            "max": "397.19524871976824"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2698,
            "start": "2022-08-11T06:25:38.643",
            "end": "2022-08-11T06:27:36.893",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "198"
            },
            {
            "name": "Engine Speed",
            "min": "204.58223392629168",
            "max": "396.6690373976478"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2699,
            "start": "2022-08-11T06:28:39.047",
            "end": "2022-08-11T06:29:37.16",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "26",
            "max": "188"
            },
            {
            "name": "Engine Speed",
            "min": "205.42766632317924",
            "max": "399.42261628299144"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2700,
            "start": "2022-08-11T06:30:39.3",
            "end": "2022-08-11T06:31:37.467",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "36",
            "max": "187"
            },
            {
            "name": "Engine Speed",
            "min": "200.38618196013672",
            "max": "395.10982129165427"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2701,
            "start": "2022-08-11T06:32:39.613",
            "end": "2022-08-11T06:35:38.847",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "197"
            },
            {
            "name": "Engine Speed",
            "min": "203.67743527615323",
            "max": "397.03550228349656"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2702,
            "start": "2022-08-11T06:36:40.987",
            "end": "2022-08-11T06:38:39.317",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "197"
            },
            {
            "name": "Engine Speed",
            "min": "208.8637015171273",
            "max": "400.37792750448824"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2703,
            "start": "2022-08-11T06:39:41.47",
            "end": "2022-08-11T06:40:39.627",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "23",
            "max": "197"
            },
            {
            "name": "Engine Speed",
            "min": "209.79227295230714",
            "max": "383.7238424519467"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2704,
            "start": "2022-08-11T06:41:41.767",
            "end": "2022-08-11T06:42:39.877",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "22",
            "max": "173"
            },
            {
            "name": "Engine Speed",
            "min": "201.46872440885227",
            "max": "383.6293334555763"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2705,
            "start": "2022-08-11T06:43:42.02",
            "end": "2022-08-11T06:44:40.173",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "37",
            "max": "195"
            },
            {
            "name": "Engine Speed",
            "min": "215.9383283578131",
            "max": "400.36747551726523"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2706,
            "start": "2022-08-11T06:45:42.3",
            "end": "2022-08-11T06:48:40.65",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "197"
            },
            {
            "name": "Engine Speed",
            "min": "200.97681859562957",
            "max": "398.3780344259078"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2707,
            "start": "2022-08-11T06:49:42.787",
            "end": "2022-08-11T06:50:40.893",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "25",
            "max": "189"
            },
            {
            "name": "Engine Speed",
            "min": "226.63310687817312",
            "max": "398.395486605929"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2708,
            "start": "2022-08-11T06:51:43.067",
            "end": "2022-08-11T06:52:42.11",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "48",
            "max": "186"
            },
            {
            "name": "Engine Speed",
            "min": "203.0780631235978",
            "max": "395.61717010944017"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2709,
            "start": "2022-08-11T06:53:46.6",
            "end": "2022-08-11T06:57:47.487",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "200.49659177978364",
            "max": "400.1402166414355"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2710,
            "start": "2022-08-11T06:58:49.627",
            "end": "2022-08-11T07:02:48.203",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "27",
            "max": "197"
            },
            {
            "name": "Engine Speed",
            "min": "208.93899416803336",
            "max": "400.03403910144885"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2711,
            "start": "2022-08-11T07:03:50.697",
            "end": "2022-08-11T07:04:48.817",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "28",
            "max": "194"
            },
            {
            "name": "Engine Speed",
            "min": "206.82049673485594",
            "max": "395.9949420441291"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2712,
            "start": "2022-08-11T07:05:50.963",
            "end": "2022-08-11T07:06:49.08",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "26",
            "max": "186"
            },
            {
            "name": "Engine Speed",
            "min": "221.6656400872514",
            "max": "388.86459609926897"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2713,
            "start": "2022-08-11T07:07:51.227",
            "end": "2022-08-11T07:09:49.487",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "197"
            },
            {
            "name": "Engine Speed",
            "min": "213.0910681899316",
            "max": "393.15812098294407"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2714,
            "start": "2022-08-11T07:10:51.683",
            "end": "2022-08-11T07:11:49.86",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "27",
            "max": "182"
            },
            {
            "name": "Engine Speed",
            "min": "214.0095869342096",
            "max": "392.17622491479676"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2715,
            "start": "2022-08-11T07:12:51.987",
            "end": "2022-08-11T07:16:50.517",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "22",
            "max": "195"
            },
            {
            "name": "Engine Speed",
            "min": "204.6082356957757",
            "max": "400.37420997920174"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2716,
            "start": "2022-08-11T07:17:52.663",
            "end": "2022-08-11T07:20:51.923",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "194"
            },
            {
            "name": "Engine Speed",
            "min": "200.5094505587171",
            "max": "396.8249982658517"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2717,
            "start": "2022-08-11T07:21:54.05",
            "end": "2022-08-11T07:22:52.207",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "51",
            "max": "195"
            },
            {
            "name": "Engine Speed",
            "min": "218.26562388557272",
            "max": "399.0542795206301"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2718,
            "start": "2022-08-11T07:23:54.37",
            "end": "2022-08-11T07:27:52.977",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "24",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "200.4703854152702",
            "max": "397.5309823494828"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2719,
            "start": "2022-08-11T07:28:55.127",
            "end": "2022-08-11T07:29:05.127",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "31",
            "max": "128"
            },
            {
            "name": "Engine Speed",
            "min": "205.87830134279946",
            "max": "245.3936773395695"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "0"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2720,
            "start": "2022-08-11T09:34:22.533",
            "end": "2022-08-11T09:39:21.503",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "200.15587693312946",
            "max": "399.9119672717862"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2721,
            "start": "2022-08-11T09:39:21.503",
            "end": "2022-08-11T09:44:19.363",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "200.24567305686216",
            "max": "398.3317283731567"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2722,
            "start": "2022-08-11T09:44:19.363",
            "end": "2022-08-11T09:49:17.393",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "197"
            },
            {
            "name": "Engine Speed",
            "min": "200.388989074877",
            "max": "397.036737227308"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2723,
            "start": "2022-08-11T09:49:17.393",
            "end": "2022-08-11T09:54:17.22",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "197"
            },
            {
            "name": "Engine Speed",
            "min": "201.41531269232524",
            "max": "399.6060845422214"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2724,
            "start": "2022-08-11T09:54:17.22",
            "end": "2022-08-11T09:59:17.16",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "202.99666584983314",
            "max": "399.2329764781673"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2725,
            "start": "2022-08-11T09:59:17.16",
            "end": "2022-08-11T10:04:17.01",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "22",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "202.1342370382204",
            "max": "398.7913490533975"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2726,
            "start": "2022-08-11T10:04:17.01",
            "end": "2022-08-11T10:09:16.907",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "198"
            },
            {
            "name": "Engine Speed",
            "min": "201.49853722744552",
            "max": "399.05027489027486"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2727,
            "start": "2022-08-11T10:09:16.907",
            "end": "2022-08-11T10:14:15.723",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "198"
            },
            {
            "name": "Engine Speed",
            "min": "200.22095551320396",
            "max": "400.20802001288536"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2728,
            "start": "2022-08-11T10:14:15.723",
            "end": "2022-08-11T10:19:12.923",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "198"
            },
            {
            "name": "Engine Speed",
            "min": "200.30510445944273",
            "max": "398.9379454988325"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2729,
            "start": "2022-08-11T10:19:12.923",
            "end": "2022-08-11T10:22:15.957",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "22",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "206.27090464371764",
            "max": "400.20159179013297"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2730,
            "start": "2022-08-11T10:28:18.92",
            "end": "2022-08-11T10:33:17.597",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "22",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "200.6959398614317",
            "max": "400.39403833634873"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2731,
            "start": "2022-08-11T10:33:17.597",
            "end": "2022-08-11T10:38:15.317",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "203.94974668683008",
            "max": "397.831998293452"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2732,
            "start": "2022-08-11T10:38:15.317",
            "end": "2022-08-11T10:43:13.5",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "200.70399569737913",
            "max": "396.94872020296225"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2733,
            "start": "2022-08-11T10:43:13.5",
            "end": "2022-08-11T10:48:11.533",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "197"
            },
            {
            "name": "Engine Speed",
            "min": "204.25449621007522",
            "max": "400.0737826192909"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2734,
            "start": "2022-08-11T10:48:11.533",
            "end": "2022-08-11T10:53:09.83",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "202.91164896145074",
            "max": "398.8862400787167"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2735,
            "start": "2022-08-11T10:53:09.83",
            "end": "2022-08-11T10:58:07.55",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "204.36269748611502",
            "max": "396.1723393752111"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2736,
            "start": "2022-08-11T10:58:07.55",
            "end": "2022-08-11T11:03:05.41",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "197"
            },
            {
            "name": "Engine Speed",
            "min": "202.19325458388462",
            "max": "399.5604954121078"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2737,
            "start": "2022-08-11T11:03:05.41",
            "end": "2022-08-11T11:08:03.503",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "24",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "200.81631398170083",
            "max": "398.99940306423207"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2738,
            "start": "2022-08-11T11:08:03.503",
            "end": "2022-08-11T11:13:01.36",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "196"
            },
            {
            "name": "Engine Speed",
            "min": "201.03923137340658",
            "max": "398.33304228019574"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2739,
            "start": "2022-08-11T11:13:01.36",
            "end": "2022-08-11T11:17:59.237",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "202.48213016495208",
            "max": "400.22514485952684"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2740,
            "start": "2022-08-11T11:17:59.237",
            "end": "2022-08-11T11:22:56.953",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "201.11941199744092",
            "max": "400.40307654578385"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2741,
            "start": "2022-08-11T11:22:56.953",
            "end": "2022-08-11T11:27:18.643",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "206.48203850044032",
            "max": "400.14905128254975"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2742,
            "start": "2022-08-11T11:28:20.75",
            "end": "2022-08-11T11:33:19.847",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "194"
            },
            {
            "name": "Engine Speed",
            "min": "201.7933042493245",
            "max": "400.0284759273885"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2743,
            "start": "2022-08-11T11:33:19.847",
            "end": "2022-08-11T11:38:17.783",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "209.50525935401453",
            "max": "397.2516251041422"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2744,
            "start": "2022-08-11T11:38:17.783",
            "end": "2022-08-11T11:43:15.813",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "200.25424271381192",
            "max": "399.85210026473374"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2745,
            "start": "2022-08-11T11:43:15.813",
            "end": "2022-08-11T11:48:14.08",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "198"
            },
            {
            "name": "Engine Speed",
            "min": "200.1526781757142",
            "max": "391.5391707819976"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2746,
            "start": "2022-08-11T11:48:14.08",
            "end": "2022-08-11T11:53:12.033",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "22",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "201.9946442390581",
            "max": "399.226356540912"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2747,
            "start": "2022-08-11T11:53:12.033",
            "end": "2022-08-11T11:58:09.893",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "196"
            },
            {
            "name": "Engine Speed",
            "min": "202.6160908139013",
            "max": "398.64907617135395"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2748,
            "start": "2022-08-11T11:58:09.893",
            "end": "2022-08-11T12:03:07.767",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "200.8270744481995",
            "max": "399.56506454553687"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2749,
            "start": "2022-08-11T12:03:07.767",
            "end": "2022-08-11T12:08:06.55",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "26",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "205.8427952381609",
            "max": "400.0385341251821"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2750,
            "start": "2022-08-11T12:08:06.55",
            "end": "2022-08-11T12:13:04.517",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "197"
            },
            {
            "name": "Engine Speed",
            "min": "202.0880989923366",
            "max": "397.7022568569622"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2751,
            "start": "2022-08-11T12:13:04.517",
            "end": "2022-08-11T12:18:02.327",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "200.41640676890333",
            "max": "398.5902750745371"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2752,
            "start": "2022-08-11T12:18:02.327",
            "end": "2022-08-11T12:22:18.77",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "22",
            "max": "195"
            },
            {
            "name": "Engine Speed",
            "min": "202.47544087819543",
            "max": "399.54437561988107"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2753,
            "start": "2022-08-11T12:23:20.967",
            "end": "2022-08-11T12:28:20.003",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "200.90810061346187",
            "max": "400.4238116733282"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2754,
            "start": "2022-08-11T12:28:20.003",
            "end": "2022-08-11T12:33:17.907",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "198"
            },
            {
            "name": "Engine Speed",
            "min": "203.73127709026042",
            "max": "399.11136078714924"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2755,
            "start": "2022-08-11T12:33:17.907",
            "end": "2022-08-11T12:38:16.643",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "203.67805475480765",
            "max": "399.95700132587785"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2756,
            "start": "2022-08-11T12:38:16.643",
            "end": "2022-08-11T12:43:14.517",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "197"
            },
            {
            "name": "Engine Speed",
            "min": "200.53513320849052",
            "max": "400.012438645201"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2757,
            "start": "2022-08-11T12:43:14.517",
            "end": "2022-08-11T12:48:12.533",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "22",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "202.03081331746225",
            "max": "400.4835722760314"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2758,
            "start": "2022-08-11T12:48:12.533",
            "end": "2022-08-11T12:53:10.45",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "22",
            "max": "195"
            },
            {
            "name": "Engine Speed",
            "min": "202.38965610509257",
            "max": "399.1623680453945"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2759,
            "start": "2022-08-11T12:53:10.45",
            "end": "2022-08-11T12:58:08.267",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "22",
            "max": "198"
            },
            {
            "name": "Engine Speed",
            "min": "202.70390800341215",
            "max": "399.78541367226535"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2760,
            "start": "2022-08-11T12:58:08.267",
            "end": "2022-08-11T13:03:06.753",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "22",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "200.78749819052754",
            "max": "399.9774832297384"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2761,
            "start": "2022-08-11T13:03:06.753",
            "end": "2022-08-11T13:08:04.72",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "197"
            },
            {
            "name": "Engine Speed",
            "min": "202.9024400383711",
            "max": "399.9759802216366"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2762,
            "start": "2022-08-11T13:08:04.72",
            "end": "2022-08-11T13:13:02.533",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "197"
            },
            {
            "name": "Engine Speed",
            "min": "202.67693599426977",
            "max": "399.9656161580075"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2763,
            "start": "2022-08-11T13:13:02.533",
            "end": "2022-08-11T13:18:00.657",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "203.16584456498077",
            "max": "399.091295260308"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2764,
            "start": "2022-08-11T13:18:00.657",
            "end": "2022-08-11T13:22:59.697",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "198"
            },
            {
            "name": "Engine Speed",
            "min": "202.64210070371726",
            "max": "400.53228325374994"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2765,
            "start": "2022-08-11T13:22:59.697",
            "end": "2022-08-11T13:27:58.55",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "22",
            "max": "196"
            },
            {
            "name": "Engine Speed",
            "min": "204.48100064173389",
            "max": "399.54412734306607"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2766,
            "start": "2022-08-11T13:27:58.55",
            "end": "2022-08-11T13:32:55.847",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "24",
            "max": "193"
            },
            {
            "name": "Engine Speed",
            "min": "202.0226490237483",
            "max": "399.81246231120656"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2767,
            "start": "2022-08-11T13:32:55.847",
            "end": "2022-08-11T13:34:20.207",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "23",
            "max": "187"
            },
            {
            "name": "Engine Speed",
            "min": "200.6861930363654",
            "max": "400.26742126756693"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2768,
            "start": "2022-08-11T13:43:23.567",
            "end": "2022-08-11T13:48:20.69",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "24",
            "max": "197"
            },
            {
            "name": "Engine Speed",
            "min": "200.65755075895115",
            "max": "396.9656091866296"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2769,
            "start": "2022-08-11T13:48:20.69",
            "end": "2022-08-11T13:53:18.62",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "198"
            },
            {
            "name": "Engine Speed",
            "min": "201.59739097474022",
            "max": "398.74513624445774"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine Overheating"
            }
            ]
            },
            {
            "id": 2770,
            "start": "2022-08-11T13:53:18.62",
            "end": "2022-08-11T13:58:16.377",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "23",
            "max": "198"
            },
            {
            "name": "Engine Speed",
            "min": "200.65070065228767",
            "max": "399.7804409490062"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2771,
            "start": "2022-08-11T13:58:16.377",
            "end": "2022-08-11T14:03:15.753",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "21",
            "max": "199"
            },
            {
            "name": "Engine Speed",
            "min": "202.77835613979883",
            "max": "396.8555803692227"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Service engine soon light",
            "max": "Engine won't start"
            }
            ]
            },
            {
            "id": 2772,
            "start": "2022-08-11T14:03:15.753",
            "end": "2022-08-11T14:08:13.89",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "20",
            "max": "198"
            },
            {
            "name": "Engine Speed",
            "min": "200.38650201321883",
            "max": "393.6270665110029"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine won't start",
            "max": "Service engine soon light"
            }
            ]
            },
            {
            "id": 2773,
            "start": "2022-08-11T14:08:13.89",
            "end": "2022-08-11T14:09:08.807",
            "parameters": [
            {
            "name": "Engine Temperature",
            "min": "32",
            "max": "197"
            },
            {
            "name": "Engine Speed",
            "min": "211.21851162287336",
            "max": "372.95248826823774"
            },
            {
            "name": "Engine On/Off",
            "min": "0",
            "max": "1"
            },
            {
            "name": "Engine Error",
            "min": "Engine Overheating",
            "max": "Engine won't start"
            }
            ]
            }
            ]
        }
    function middleTimePoint(start, end) {
        return Math.floor((end - start) / 2);
    }

    var arr = JSON.parse(JSON.stringify(jsonIot));
    var list_of_IoT = [];
    for (let i = 0; i < arr.data.length; i++) {
        var newIotObject = new IoTObj(dateToMilliseconds(arr.data[i].start), dateToMilliseconds(arr.data[i].end), arr.data[i].parameters);
        list_of_IoT.push(newIotObject);
    }

    //console.log(list_of_IoT[0].start);
    var x_axis = [];
    var min_data = [];
    var max_data = [];
    for (let i = 0; i < list_of_IoT.length; i++) {
        x_axis.push(millisecondsToDate(list_of_IoT[i].start));
        min_data.push(list_of_IoT[i].parameters[measurement].min);
        max_data.push(list_of_IoT[i].parameters[measurement].max);
    }

    const data_IoT = {
        labels: x_axis,
        datasets: [{
            label: 'Min',
            data: min_data,
            fill: false,
            borderColor: 'blue',
            tension: 0.4,
            backgroundColor : 'rgb(0, 0, 0, 0.1)',
            pointBackgroundColor : 'rgb(0, 0, 0, 1)',
            pointBorderColor : 'rgb(0, 0, 0, 1)',
            pointRadius : 40/x_axis.length,
            pointHoverRadius : 6
        }, 
        {
            label: 'Max',
            data: max_data,
            fill: '-1',
            borderColor: 'red',
            tension: 0.4,
            backgroundColor : 'rgb(0, 0, 0, 0.1)',
            pointBackgroundColor : 'rgb(0, 0, 0, 1)',
            pointBorderColor : 'rgb(0, 0, 0, 1)',
            pointRadius : 40/x_axis.length,
            pointHoverRadius : 6
            }]
    };
        
    const config_IoT = {
        type: 'line',
        data: data_IoT,
        options: {
            scales: {
                yAxes:[{
                    ticks : {
                    min : Math.floor(Math.min(...min_data) * 0.15),
                    max : Math.floor(Math.max(...max_data) * 1.15)
                    }
                }]
            }
        }
    };
        
    const ctx_IoT = document.getElementById('myChart1');
    var lineChart_IoT = new Chart(ctx_IoT, config_IoT);        
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
    startDate = millisecondsToDate(localToUtc(Date.now()) - (new Date().getTimezoneOffset() * 60 *1000) - timePeriod);
    //console.log(timePeriod, startDate);
    endDate = '';
} else {
    startDate = millisecondsToDate(dateToMilliseconds(localStorage.getItem('timePeriod1')) + (new Date().getTimezoneOffset() * 60 *1000));
    endDate = millisecondsToDate(dateToMilliseconds(localStorage.getItem('timePeriod2')) + (new Date().getTimezoneOffset() * 60 *1000));
    console.log(startDate);
    console.log(endDate);

}


var workStation = localStorage.getItem('wrk');
//console.log(workStation);

var req = createRequest(
        createOeeUrl(workStation, startDate, endDate),
        'GET'
    );

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

let data;
//get data and use it 
async function oeeData() {
    try {
        data = await getDataFromAPI();
        //after data is filled you process it
        appearence();
        doAll(data, dateToMilliseconds(startDate), dateToMilliseconds(endDate));
    } catch (error) {
        throw error;
    }
}

oeeData();