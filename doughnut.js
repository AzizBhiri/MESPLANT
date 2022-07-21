class OeeDataBase {
    constructor(IsRunning, StartedAt, FinishedAt, DowntimeTypeName, Product_ID, Product_name, Valid, Scrap) {
        this.IsRunning = IsRunning;
        this.StartedAt = StartedAt;
        this.FinishedAt = FinishedAt;
        this.DowntimeTypeName = DowntimeTypeName;
        // this.ArrayProductData = ArrayProductData;
        this.Product_ID = Product_ID;
        this.Product_name = Product_name;
        this.Valid = Valid;
        this.Scrap = Scrap;
    }

    getBlockLength() {
        return this.FinishedAt - this.StartedAt;
    }

}

// class ProductData {
//     constructor(Id, Name, Count, Scrap) {
//         this.Id = Id;
//         this.Name = Name;
//         this.Count = Count;
//         this.Scrap = Scrap;
//     }
// }
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
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var charactersLength = characters.length;
    for ( var i = 0; i < 1; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}

var first_block = new OeeDataBase(x, y, z, t, Math.floor(Math.random() * Math.random() * 100), makeRand(),Math.floor(Math.random()*3), Math.floor(Math.random()*3));
list.push(first_block);


for (var i = 1; i < 50; i++) {
    let x = Math.random() < 0.5;
    let y = list[i-1].FinishedAt;
    let z = y + Math.floor(Math.random() * (max - min) + min);
    let t = arr[Math.floor(Math.random() * arr.length)];
    // let apd = [];
    // for (j = 0; j < Math.floor(Math.random() * 6); j++) {
    //     let pd = new ProductData(Math.floor(Math.random() * Math.random() * 100), makeRand(),Math.floor(Math.random()*3), Math.floor(Math.random()*3));
    //     apd.push(pd);
    // }
    list.push(new OeeDataBase(x, y, z, t, Math.floor(Math.random() * Math.random() * 100), makeRand(),Math.floor(Math.random()*3), Math.floor(Math.random()*3)));    
}

//console.log(list);

//Percentage Calaculator
var green = 0;
var red = 0;
var yellow = 0;
var grey = 0;
for (let i = 0; i < list.length; i++) {
    if (list[i].IsRunning) {
        green += list[i].getBlockLength();
    } else if (list[i].DowntimeTypeName === "Micro Stop") {
        yellow += list[i].getBlockLength();
    } else if  (list[i].DowntimeTypeName === "Out Of Service") {
        grey += list[i].getBlockLength();
    } else {
        red += list[i].getBlockLength();
    }
}

//product Calculator
var valid = 0;
var scrap = 0;
for (let i = 0; i < list.length; i++) {
    valid += list[i].Valid;
    scrap += list[i].Scrap;
}

var oee = (Math.random() * 100).toFixed(1).toString() + "%";

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

// 1st Doughnut
const data_state = {
    labels: [
      'Running',
      'Unknown',
      'Out Of Service',
      'Micro Stop'
    ],
    datasets: [{
      label: 'State',
      data: [green, red, grey, yellow],
      backgroundColor: [
        'green',
        'red',
        'grey',
        'yellow'
      ],
      hoverBorderWidth: 2,
      hoverBorderColor: 'black'
    }]
};

const config_state = {
    type: 'doughnut',
    data: data_state,
    options: {
        elements: {
            center: {
                text: oee,
                color: '#000', // Default is #000000
                fontStyle: 'Georgia', // Default is Arial
                sidePadding: 20, // Default is 20 (as a percentage)
                minFontSize: 15, // Default is 20 (in px), set to false and text will not wrap.
                lineHeight: 15 // Default is 25 (in px), used for when text wraps
            }
        }
    }

};

const ctx_state = document.getElementById('myChart_state');
var doughnutChart_state = new Chart(ctx_state, config_state);


// 2nd doughnut
const data_product = {
    labels: [
      'Valid',
      'Scrap',
    ],
    datasets: [{
      label: 'Products',
      data: [valid, scrap],
      backgroundColor: [
        '#add8e6',
        'orange',
      ],
      hoverBorderWidth: 2,
      hoverBorderColor: 'black'
    }]
};

const config_product = {
    type: 'doughnut',
    data: data_product,
    options: {
        elements: {
            center: {
                text: valid + scrap,
                color: '#000', // Default is #000000
                fontStyle: 'Georgia', // Default is Arial
                sidePadding: 20, // Default is 20 (as a percentage)
                minFontSize: 15, // Default is 20 (in px), set to false and text will not wrap.
                lineHeight: 15 // Default is 25 (in px), used for when text wraps
            }
        }
        
    }
};

const ctx_product = document.getElementById('myChart_product');
var doughnutChart_product = new Chart(ctx_product, config_product);


//Bar
var product_names = [];
for (let i = 0; i < list.length; i++) {
    product_names.push(list[i].Product_name);
}
var unique_product_names = [...new Set(product_names)];

var product_count = [];
for (let i = 0; i < unique_product_names.length; i++) {
    product_count.push(0);
}

var product_count_valid = [];
for (let i = 0; i < unique_product_names.length; i++) {
    product_count_valid.push(0);
}

var product_count_scrap = [];
for (let i = 0; i < unique_product_names.length; i++) {
    product_count_scrap.push(0);
}

for(let i = 0; i < list.length; i++) {
    product_count[unique_product_names.indexOf(list[i].Product_name)] += list[i].Valid + list[i].Scrap;
}

for(let i = 0; i < list.length; i++) {
    product_count_valid[unique_product_names.indexOf(list[i].Product_name)] += list[i].Valid;
}

for(let i = 0; i < list.length; i++) {
    product_count_scrap[unique_product_names.indexOf(list[i].Product_name)] += list[i].Scrap;
}

var colors1 = []; 
for (let i = 0; i < unique_product_names.length; i++) {
    //var random_color = "#" + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0').toUpperCase();
    colors1.push('green');
}

var colors2 = []; 
for (let i = 0; i < unique_product_names.length; i++) {
    //var random_color = "#" + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0').toUpperCase();
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

const ctx_bar = document.getElementById('myBar_product');
var barChart_product = new Chart(ctx_bar, config_bar);

//downtime
function randomIntFromInterval(min, max) { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min);
}

var downtime_names = [];
for (let i = 0; i < 10; i++) {
    downtime_names.push(arr[randomIntFromInterval(0, 2)]);
}

var unique_downtime_names = [...new Set(downtime_names)];


var downtime_periods = [];
for (let i = 0; i < unique_downtime_names.length; i++) {
    downtime_periods.push(0);
}

for (let i = 0; i < list.length; i++) {
    downtime_periods[unique_downtime_names.indexOf(list[i].DowntimeTypeName)] += list[i].getBlockLength(); 
}

var colors3 = []; 
for (let i = 0; i < unique_downtime_names.length; i++) {
    var random_color = "#" + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0').toUpperCase();
    colors3.push(random_color);
}

const data_downtime = {
    labels: unique_downtime_names,
      datasets: [{
        label: 'Downtime Name',
        data: downtime_periods,
        backgroundColor: colors3,
        borderSkipped: 20,
        hoverBorderWidth: 2,
        hoverBorderColor: 'black'
      }]
};

const config_downtime = {
    type: 'bar',
    data: data_downtime
}

const ctx_downtime = document.getElementById('myBar_downtime');
var barChart_downtime = new Chart(ctx_downtime, config_downtime);

//Unknown
var unknown = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10'];
var unknown_periods = []
for (let i = 0; i < unknown.length; i++) {
    unknown_periods.push(0);
}

for (let i = 0; i < unknown.length; i++) {
    unknown_periods[i] = randomIntFromInterval(0, 100); //change this when  getting real data
}

var colors4 = []; 
for (let i = 0; i < unknown.length; i++) {
    var random_color = "#" + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0').toUpperCase();
    colors4.push(random_color);
}


const data_unknown = {
    labels: unknown,
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

const ctx_unknown = document.getElementById('myChart_unknown');
var doughnutChart_unknown = new Chart(ctx_unknown, config_unknown);
