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

// function randomDate(start, end) {
//     return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
// }
// randomDate(new Date(2012, 0, 1), new Date())

var arr = ['Break', 'Out of Service', 'Loading']
var x = Math.random() < 0.5;
var y = Math.floor(Math.random() * 100);
var z = y + Math.floor(Math.random() * 100);
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

// var pd = new ProductData(Math.floor(Math.random() * Math.random() * 100), makeRand(), Math.floor(Math.random()), Math.floor(Math.random()));
var first_block = new OeeDataBase(x, y, z, t, Math.floor(Math.random() * Math.random() * 100), makeRand(), Math.floor(Math.random() * 10), Math.floor(Math.random() * 10));
list.push(first_block);


for (var i = 1; i < 10; i++) {
    let x = Math.random() < 0.5;
    let y = list[i-1].FinishedAt;
    let z = y + Math.floor(Math.random() * 100);
    let t = arr[Math.floor(Math.random() * arr.length)];
    let apd = [];
    // for (j = 0; j < Math.floor(Math.random() * 10); j++) {
    //     let pd = new ProductData(Math.floor(Math.random() * Math.random() * 100), makeRand(),Math.floor(Math.random()*10), Math.floor(Math.random()*10));
    //     apd.push(pd);
    // }
    list.push(new OeeDataBase(x, y, z, t, Math.floor(Math.random() * Math.random() * 100), makeRand(), Math.floor(Math.random() * 10), Math.floor(Math.random() * 10)));    
}

console.log(list);
