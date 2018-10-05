const Promise = require('bluebird');
const reptileServer = require('../util/reptiles-server');
const inspect = require('../util/inspect');
const express = require('express');

const PORT = 3003;

class Logic {

  inspect() {
    return inspect(this);
  }

  trip() {
    return {
      miles: _inputᐅmiles => _inputᐅmiles || 220,
      hours: Promise.resolve(2.3),
      minutes: hours => hours * 60,
      mph: (miles, hours) => miles/hours,
      mpm: (miles, minutes) => miles/minutes
    };
  }

  cabinet() {
    return {
      drawer: async function() {
        await Promise.delay(100);
        return {
          items : [
            'A','B','C',Promise.delay(200).then(function() { return 'D';})
          ]
        };
      },
      fourthItem : ['drawer.items.3',String]
    };
  }

  writeToRes(res, tripᐅmph) {
    res.end(`Writing directly to res: mph = ${tripᐅmph}`);
  }
}


express()
  .use('/api', reptileServer(Logic, {debug: true}))
  .listen(PORT, () => console.log(`Listening to port ${PORT}`));