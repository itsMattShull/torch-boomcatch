const MongoClient = require('mongodb').MongoClient; // eslint-disable-line

const url = 'mongodb://localhost:27017';
const dbName = 'torch';

function jsonify(obj) {
  obj = JSON.parse(obj);
  const data = obj.data;
  // iterate over the property names
  Object.keys(data).forEach(function(k) {
    // slip the property value based on `.`
    var prop = k.split('.');
    // get the last value fom array
    var last = prop.pop();
    // iterate over the remaining array value 
    // and define the object if not already defined
    prop.reduce(function(o, key) {
      // define the object if not defined and return
      return o[key] = o[key] || {};
      // set initial value as object
      // and set the property value
    }, data)[last] = data[k];
    // delete the original property from object
    delete data[k];
  });

  data['referer'] = obj['referrer'];
  data['userAgent'] = obj['userAgent'];
  data['browser'] = obj['browser'];

  return data;
}

exports.initialise = function () {
  return function (data, type, separator, callback) {
    try {
      const beaconData = jsonify(data);
      const bodyPid = beaconData.pid;

      MongoClient.connect(url, { useNewUrlParser: true } , (connectError, client) => {
        if (connectError) throw connectError;

        const db = client.db(dbName);
        const collection = db.collection('beacons');

        // Look for a beacon with the same page ID
        collection.findOne({ pid: bodyPid }, (queryError, queryResult) => {
          if (queryError) throw queryError;

          if (queryResult) {
            // Update the existing beacon with new data
            collection.updateOne({ pid: bodyPid }, { $set: beaconData }, {}, (updateError) => {
              if (updateError) throw updateError;
              client.close();
              console.log('updated existing beacon');
              return beaconData;
            });
          } else {
            // Insert the new beacon
            collection.insertOne(beaconData, {}, (insertErr) => {
              if (insertErr) throw insertErr;
              client.close();
              console.log('inserted new beacon');
              return beaconData;
            });
          }
        });
      });
    } catch (e) {
      console.log('found an error');
      console.log(e);
      return beaconData;
    }
  };
};