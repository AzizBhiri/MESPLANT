function utcToLocal(time) {
    var offset_in_ms = new Date().getTimezoneOffset() * 1000 * 60;
    return time - offset_in_ms;
}

function localToUtc(time) {
    var offset_in_ms = new Date().getTimezoneOffset() * 1000 * 60;
    return time + offset_in_ms;
}

function dateToMilliseconds(date) {
    var ms = new Date(date).getTime();
    return ms;
}

function millisecondToDate(ms) {
    var date = new Date(ms).toLocaleString('sv');
    return date;
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

// console.log(dateToMilliseconds("2022-08-10 00:00:00"));
// console.log(millisecondToDate(1660082400000));
console.log(millisecondToDate(dayStartMilli(Date.now())));

var x = 9660082400000;
console.log(Number.isSafeInteger(x));