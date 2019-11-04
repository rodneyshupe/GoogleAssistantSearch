module.exports = {
  clientAPI: function (propID, listingID) {
    var data = sample();
    return data;
  }
};

function sample() {
  var data = require("./sample.json");
  //var data = require("./samplerentals.json");
  return data;
}
