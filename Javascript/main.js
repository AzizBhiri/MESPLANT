let list = [];

function getOeeDataBaseByDate(workstation, startDate, endDate) {
  const Http = new XMLHttpRequest();
  const url =
    "http://212.200.168.71/productionmanagement/api/oeedata?workstationId=" +
    workstation + '' +
    "&&from=" +
    startDate + '' +
    "&&to=" +
    endDate+ '';
    
  Http.open("GET", url);

  return new Promise((resolve, reject) => {
    Http.onreadystatechange = function () {
      if (Http.readyState == 4) {
        if (Http.status == 200) {
          resolve(Http.responseText);
        } else {
          reject();
        }
      }
    };
    Http.send(null);
  });
}

async function foo() {
  try {
    let response = await getOeeDataBaseByDate(1, "2022-07-20", "2022-07-21");
    list.push(response);
    return;
  } catch (error) {
    console.log(error);
  }
}

function getData() {
  foo();
}
