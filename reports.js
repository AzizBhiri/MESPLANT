function getOptions() {
    var options = [];
    var period = document.getElementById('Time Period').value;
    var all = document.getElementById('one').checked;
    var workstation1 = document.getElementById('two').checked;
    var workstation2 = document.getElementById('three').checked;
    var type = document.getElementById('Report').value;
    options.push(period);
    options.push(all);
    options.push(workstation1);
    options.push(workstation2);
    options.push(type);
    console.log(options);
}