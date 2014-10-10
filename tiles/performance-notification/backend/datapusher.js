/*
 * Copyright 2013 Jive Software
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

var jive = require("jive-sdk"),
    store = jive.service.persistence(),
    lib = require("../../lib"),
    ABORT = new Error("not a failure"),
    STORE = 'performanceNotificationCount';

function processTileInstance(instance) {
  var actualCount;
  lib.getPerformance()
    .then(function(body) {
      if (lib.getRangeIndex([0, 2000], body) !== 0) {
        throw ABORT;
      }
      // count failures only
      return store.find(STORE, { 'key':'count' });
    })
    .then(function(counts) {
      if (!counts) {
        return;
      }
      var count = counts.length > 0 ? counts[0].count : 0;
      actualCount = count + 1;
      return store.save(STORE, 'count', {
          'key': 'count',
          'count': actualCount
      })
    })
    .then(function() {
      if (!actualCount) {
        return;
      }
      var data = getFormattedData(actualCount, instance);
      jive.extstreams.pushActivity(instance, data);
    })
    .fail(function(error) {
      if (!error || error.message === ABORT.message) {
        return;
      }
      jive.logger.error(error);
    });
}

function getFormattedData(count, instance) {
  return {
    "activity": {
      "action": {
        "name": "posted",
        "description": "Total number of failures " + count
      },
      "actor": {
        "name": "Performance Monitoring Service",
        "email": "perfserv@email.com"
      },
      "object": {
        "type": "website",
        "url": "http://www.monitoring-service.com/failures/" + encodeURI(instance.jiveCommunity),
        "image": "http://placehold.it/102x102",
        "title": "Total number of failures " + count,
        "description":
        	"For detailed information about these failures, click 'Go to item'."
      },
      "externalID": '' + Date.now()
    }
  };
}

function pushData() {
  jive.extstreams.findByDefinitionName('performance-notification').then(function(instances) {
    if (instances) {
      instances.forEach(function(instance) {
        processTileInstance(instance);
      });
    }
  });
};

exports.task = [
    {
        'interval' : 10000,
        'handler' : pushData
    }
];
