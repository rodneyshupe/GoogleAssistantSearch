'use strict';
var http = require("http");
var request = require("request");

exports.handler = (event, context, callback) => {
  try {
    if (event && event.body && event.body.result) {
      var detailsSearch = false;
      var parameters = event.body.result.parameters;
      if (parameters) {
        console.log(event.intent);
        if (event.intent == "home details") {
          detailsSearch = true;
          parameters = event.body.result.contexts[0].parameters;
          console.log(parameters);
        }
        var searchType = 'single_family';
        switch (parameters['search-type']) {
          case 'single family homes':
            searchType = 'single_family';
            break;
          case 'condos':
            searchType = 'condo';
            break;
          case 'mobile homes':
            searchType = 'mobile';
            break;
          case 'farms':
            searchType = 'farm';
            break;
          case 'land only listings':
            searchType = 'land';
            break;
          case 'multi-family homes':
            searchType = 'multiple_family';
            break;
        }
        var searchStatus = "for_sale";
        switch (parameters['search-status']) {
          case 'for sale':
            searchStatus = "for_sale";
            break;
          case 'for rent':
            searchStatus = "for_rent";
            break;
          case 'off market':
            searchStatus = "off_market";
            break;
        }
        var searchPlace = parameters['search-place'].city;
        var searchRooms = "any";
        switch (parameters['search-rooms']) {
          case 'one or more bedroom':
            searchRooms = "1";
            break;
          case 'two or more bedroom':
            searchRooms = "2";
            break;
          case 'three or more bedroom':
            searchRooms = "3";
            break;
          case 'four or more bedroom':
            searchRooms = "4";
            break;
          case 'five or more bedroom':
            searchRooms = "5";
            break;
        }
        var query = {};
        //Call rezone on searchPlace
        var rezoneURL = "http://parser-external.geo.moveaws.com/suggest?client_id=dev&input=";
        console.log(rezoneURL + encodeURIComponent(searchPlace));
        var zoneRequest = http.get(rezoneURL + encodeURIComponent(searchPlace), function(zoneResponse) {
          var zoneBuffer = "";
          zoneResponse.on("data", function(chunk) {
            zoneBuffer += chunk;
          });

          zoneResponse.on("end", function(err) {
            // finished transferring zone data
            var zoneData = JSON.parse(zoneBuffer);
            // use first result
            var zone = zoneData.autocomplete[0];
            query.city = zone.city;
            query.state_code = zone.state_code;
            query.status = [searchStatus];
            query.beds = {
              "min": searchRooms
            };
            query.type = [searchType];
            //query.sub_type = [];
            // Call for rentals?
            if (searchType == "for_rent") {
              var rentalURL = 'http://api.rentals.move.com:80/v3/properties/search?client_id=dev&type=' + searchType + '%2C%20' +
                query.sub_type + '&prop_type=' + searchType + '%2C%20' + query.sub_type + '&city=' + query.city + '&state_code=' + query.state_code + '&beds_min=' + searchRooms;
              console.log(rentalURL);
              request(rentalURL, function(error, response, body) {
                var results = {
                  "totalResults": body.properties.length,
                  "results": body.properties.slice(0, 5)
                };
                callback(null, results);
              });
            }
            // call FEPS
            else {
              var fepsPost = {
                "query": query,
                "client_id": "dev"
              };
              console.log(fepsPost);
              request({
                url: 'http://fe-property-services.rdc-dev.moveaws.com/api/v1/properties?client_id=dev&include_turbo=false&debug=true&include_quick_to_sell=false',
                method: 'POST',
                json: true,
                body: fepsPost
              }, function(error, response, body) {
                if (!error && response.statusCode == 200) {
                  console.log(body);
                  //var results = { "totalResults" : body.total, "results" : body.results.slice(0, 5) };
                  var returnJson = {
                    "speech": "",
                    "displayText": "",
                    "data": {},
                    "contextOut": [],
                    "source": "Realtor.com",
                    "followupEvent": {}
                  };
                  if (detailsSearch) {
                    var detailsSpeech = speech(body.results[parameters['home-index']], true, true);
                    returnJson.speech = detailsSpeech;
                    returnJson.displayText = detailsSpeech;
                    callback(null, returnJson);
                  } else {
                    var listSpeech = list(body.results.slice(0, 5));
                    returnJson.speech = listSpeech;
                    returnJson.displayText = listSpeech;
                    returnJson.contextOut = [{
                      "name": "search-params",
                      "lifespan": 5,
                      "parameters": parameters
                    }];
                    callback(null, returnJson);
                  }
                }
              });
            }
          });
        });
      }
    }
  } catch (error) {
    callback(error);
  }
};


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
      bathtext = bathtext + "s";
    }

    var subresult = {};
    if (!isEmpty(result.prop_common)) {
      subresult = result.prop_common;
    } else {
      subresult = result.listing;
    }

    var size = 0;
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
      sizetext = " is " + size + " square feet and";
    }

    var description = "";
    if (!isEmpty(subresult.description)) {
      description = subresult.description;
    }

    text = "This home is located at " + address + pricetext + ".";
    if (includeSize) {
      text += " It" + sizetext + " has " + bedtext + " and " + bathtext + ".";
    }
    if (includeDescription) {
      text += "\n" + description;
    }
  } catch (err) {
    console.log(err);
    text = new RandomFailText() + " Would you like to search again?";
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
    text = new RandomFailText() + " Would you like to search again?";
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

  var msgnum = Math.floor(Math.random() * messages.length);
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
  var text = "Hmmm.  I couldn't find any properties that meet your criteria.";
  try {
    if (results.length > 0) {
      var count = results.length;
      if (count > 5) {
        count = 5;
      }
      text = "I found " + count + " properties that you might like.\n";
      if (results.length == 1) {
        text += speech(results[0], true, true) + "  Would you like to contact the agent?";
      } else {
        var desc = speech(results[0], false, false);
        text += "The first " + desc.substr(5) + "\n";
        desc = speech(results[1], false, false);
        text += "The second " + desc.substr(5) + "\n";
        if (results.length > 2) {
          desc = speech(results[2], false, false);
          text += "The third " + desc.substr(5) + "\n";

          if (results.length > 3) {
            desc = speech(results[3], false, false);
            text += "The Fourth " + desc.substr(5) + "\n";

            if (results.length > 4) {
              desc = speech(results[4], false, false);
              text += "The Fifth " + desc.substr(5) + "\n";
            }
          }
        }
        text += "Which one of these would you like more details on?  Or say \"New Search\" to start again.";
      }
    }
  } catch (err) {
    //console.log(err);
    text = new RandomFailText() + " Would you like to search again?";
  }
  return text;
}
