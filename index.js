var strava = require('strava-v3');
var util = require('util');
var fs = require('fs');
var statistics = require('./resources/statistics');

var effortTimesSeconds = [];
var effortTimeMinutes = [];
var athleteBestEffort = {};
var pageLimit = 2;
var binSize = 10;
var segmentId = 5079586;
var segmentName = "";
var athlete_id = 14906240;

function listEfforts(page) {
    console.error("attempting page..." + page);
    strava.segments.listEfforts({
        id: segmentId,
        per_page: 200,
        page: page
    }, function (err, payload) {
        if (!err) {
            console.error("Got page " + page);
            if (payload !== [] && page + 1 < pageLimit) {
                listEffortsTimes(payload);
                listEfforts(page + 1);
            } else {
                console.error("Finished getting all efforts");

                // Get specific athletes effort, return the best one
                getAthleteBestEffort(athlete_id, function () {
                    parseResults();
                });
            }
        } else {
            console.log(err);
        }
    });
}

function getAthleteBestEffort(athlete_id, cb) {
    var bestEffortTime = 1000000000000000;
    var bestEffort = {};

    strava.segments.listEfforts({
        id: segmentId,
        athlete_id: athlete_id
    }, function (err, payload) {
        if (!err) {
            for (var i = 0; i < payload.length; i++) {
                var effort = payload[i];
                if (effort.elapsed_time < bestEffortTime) {
                    bestEffortTime = effort.elapsed_time;
                    bestEffort = effort;
                }
            }
            athleteBestEffort = bestEffort;

        }
        cb();
    });
}

function listEffortsTimes(efforts) {
    segmentName = efforts[0].name;
    for (var i = 0; i < efforts.length; i++) {
        effortTimesSeconds.push(efforts[i].moving_time);
    }
}

function parseResults() {

    effortTimesSeconds.sort();

    var segmentData = {};
    // Caclulate the Distribution data
    statistics.setDataSeries(effortTimesSeconds);

    segmentData.distributionCurve = statistics.getDistributionCurve();
    segmentData.histogram = statistics.getHistogram(binSize);

    segmentData.athleteBestEffort = athleteBestEffort;
    segmentData.athleteBestEffort.fasterThan = Math.round((1 - statistics.getCdf(athleteBestEffort.elapsed_time)) * 10000) / 100;
    console.log( segmentData.athleteBestEffort.faster_than);

    segmentData.totalAttempts = effortTimesSeconds.length;
    segmentData.segmentInfo = { id: 610040, name: segmentName };

    console.log("Finished analysis, writing data to file...");
    fs.writeFileSync('./data.json', JSON.stringify(segmentData), 'utf-8');
}

listEfforts(0);