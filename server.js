#!/usr/bin/env node

var sampledata = require('./sampledata.js');

var data = sampledata.clientAPI(0, 0);
//data = {};
try {
  var result = data.results[0];
  //var result = data.properties[0];
  //var result = data.meta.debug.mongoResult[0];
} catch (err) {
  console.log(err);
  console.log(RandomFailText());
  result = {};
}

//console.log("speech: " + speech(result));
//console.log("displayText: " + displayText(result));

var returnjson = {
  "speech": "",
  "displayText": "",
  "data": {},
  "contextOut": [],
  "source": "Realtor.com",
  "followupEvent": {}
};

returnjson.speech = speech(result, true, true);
returnjson.displayText = list(data.results);

console.log(returnjson);

function speech(result, includeSize, includeDescription) {
  var text = "";
  try {
    var address = "";
    var status = "";
    var price = 0;

    if (!isEmpty(result.prop_common)) {
      status = result.prop_common.status;
      address = result.address.line;
      price = result.prop_common.price;
    } else {
      status = "for_rent";
      address = result.listing.address.line;
      price = result.listing.price;
    }


    var pricetext = ".";
    if (price > 0) {
      switch (status) {
        case 'for_sale':
          pricetext = " and is listed for " + price;
          break;
        case 'ready_to_build':
          pricetext = " and is ready to build for " + price;
          break;
        case 'for_rent':
          pricetext = " and is availabile for " + price + " per month";
          break;
        case 'recently_sold':
          pricetext = " and is was recently sold for " + price;
          break;
        case 'not_for_sale':
          pricetext = " and is not for sale but last sold for " + price;
          break;
        case 'new_community':
          pricetext = " and is a new comminity and available for " + price + " per month";
          break;
        default:
          pricetext = " and is " + price;
      }
    }

    var bed = 0;
    if (!isEmpty(result.prop_common)) {
      bed = result.prop_common.bed;
    } else {
      bed = result.listing.beds;
    }

    var bedtext = bed + " bedroom";
    if (bed > 1) {
      bedtext = bedtext + "s";
    }

    var bath = 0;
    var bath_full = 0;
    var bath_half = 0;
    if (!isEmpty(result.prop_common)) {
      bath = result.prop_common.bath;
      bath_full = result.prop_common.bath_full;
      bath_half = result.prop_common.bath_half;
    } else {
      bath = result.listing.baths;
      bath_full = result.listing.baths_full;
      bath_half = result.listing.baths_half;
    }
    var bathtext = bath + " bathroom";
    if ((bath_full > 0) && (bath_half > 0)) {
      bathtext = bath_full + " full, and " + bath_half + " half bathroom";
    }
    if (bath > 0) {
      bathtext = bathtext + "s"
    }

    var subresult = {};
    if (!isEmpty(result.prop_common)) {
      subresult = result.prop_common;
    } else {
      subresult = result.listing;
    }

    var size = 0
    if (!isEmpty(subresult.size)) {
      size = subresult.size;
    } else {
      size = subresult.sqft;
    }

    var lotsize = 0;
    if (!isEmpty(subresult.lot_sqft)) {
      lotsize = subresult.lot_sqft;
    }

    var sizetext = "";
    if (size > 0) {
      sizetext = " is " + size + " square feet and"
    }

    var description = ""
    if (!isEmpty(subresult.description)) {
      description = subresult.description;
    }

    text = "This home is located at " + address + pricetext + "."
    if (includeSize) {
      text += " It" + sizetext + " has " + bedtext + " and " + bathtext + "."
    }
    if (includeDescription) {
      text += "   "+ description;
    }
  } catch (err) {
    console.log(err);
    text = RandomFailText();
  }
  return text;
}

function displayText(result) {
  // 3 beds
  // 3 baths
  // Home: 2,088 sq ft
  // Lot: 7,639 sq ft
  // Address:

  var text = "";
  try {
    var description = result.prop_common.description;
    text = description;
  } catch (err) {
    //console.log(err);
    text = RandomFailText();
  }
  return text;
}

function RandomFailText() {
  var messages = [
    "What we have here is a failure to communicate.",
    "I'm sorry Dave, I can't do that.",
    "I say we take off and nuke the entire site from orbit. Its the only way to be sure.",
    "A child of 5 could understand this, now fetch me a child of 5.",
    "It's dead, Jim.",
    "Mastery is not perfection but a journey, and the true master must be willing to try and fail and try again."
  ];

  msgnum = Math.floor(Math.random() * messages.length);
  return messages[msgnum];
}

function isEmpty(obj) {
  // null and undefined are "empty"
  if (obj == null) return true;

  // Assume if it has a length property with a non-zero value
  // that that property is correct.
  if (obj.length && obj.length > 0) return false;
  if (obj.length === 0) return true;

  // Otherwise, does it have any properties of its own?
  // Note that this doesn't handle
  // toString and toValue enumeration bugs in IE < 9
  for (var key in obj) {
    if (hasOwnProperty.call(obj, key)) return false;
  }

  return true;
}


function list(results) {
  try {
    var text = "Hmmm.  I couldn't find any properties that meet your criteria."
    if (results.length > 0) {
      var count = results.length;
      if (count > 5) {
        count = 5;
      }
      text = "I found " + count + " properties that you might like. ";
      if (results.length == 1) {
        text += speech(results[0], true, true);
      } else {
        var desc = speech(results[0],false, false);
        text += "The first " + desc.substr(5);
        desc = speech(results[1],false, false);
        text += "The second " + desc.substr(5);
        if(results.length > 2) {
          desc = speech(results[2],false, false);
          text += "The third " + desc.substr(5);

          if(results.length > 3) {
            desc = speech(results[3], false, false);
            text += "The Forth " + desc.substr(5);

            if(results.length > 4) {
              desc = speech(results[4], false, false);
              text += "The Fifth " + desc.substr(5);
            }
          }
        }
      }
    }
  } catch (err) {
    //console.log(err);
    text = RandomFailText();
  }
  return text;
}


process.on('exit', function() {
  console.log("Goodbye.");
});
