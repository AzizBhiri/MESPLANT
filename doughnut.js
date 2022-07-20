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
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < 10; i++ ) {
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
    } else if (list[i].DowntimeTypeName === "Unknown") {
        red += list[i].getBlockLength();
    } else if  (list[i].DowntimeTypeName === "Out Of Service") {
        grey += list[i].getBlockLength();
    } else {
        yellow += list[i].getBlockLength();
    }
}

const data = {
    labels: [
      'Running',
      'Unknown',
      'Out Of Service',
      'Micro Stop'
    ],
    datasets: [{
      label: 'My First Dataset',
      data: [green, red, grey, yellow],
      backgroundColor: [
        'green',
        'red',
        'grey',
        'yellow'
      ],
      hoverOffset: 4
    }]
};

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

const config = {
    type: 'doughnut',
    data: data,
    options: {
        elements: {
            center: {
                text: 'OEE',
                color: '#FF6384', // Default is #000000
                fontStyle: 'Arial', // Default is Arial
                sidePadding: 20, // Default is 20 (as a percentage)
                minFontSize: 20, // Default is 20 (in px), set to false and text will not wrap.
                lineHeight: 25 // Default is 25 (in px), used for when text wraps
            }
        },
        plugins: plugin
    }

};


const ctx = document.getElementById('myChart');
var doughnutChart = new Chart (ctx, config);