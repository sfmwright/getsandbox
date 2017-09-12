//Utility functions
function pad(d) {
    return (d < 10) ? '0' + d.toString() : d.toString();
}

exports.uuidv4 = function () {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

exports.txnToken = function () {
  return 'xxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 10 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });


//  return 'xxxxxxxxx'.replace(/[xy]/g, function(c) {
//    return Math.random() * 10 | 0;
//  });
};

exports.getCurrentDate = function () {
    // Example format '8/14/2017 2:44:11 PM'
    var d = new Date();
    var dateStr = "".concat(d.getMonth(),'/',d.getDay(),'/',d.getFullYear(),' ', d.getHours()%12, ':', pad(d.getMinutes()), ':', pad(d.getSeconds()), ' ');
    if(d.getHours()>11) {
        dateStr = dateStr.concat("PM");
    } else {
        dateStr = dateStr.concat("AM");
    }
    //return dateStr;
    return dateStr.toString();
};

exports.getDiscount = function (amount) {
    return (amount * Sandbox.config.discountPC / 100).toFixed(2);
};

exports.getLoyaltyAmount = function (amount) {
    return (amount * Sandbox.config.loyaltyPC / 100).toFixed(2);
};