var strava = require('strava-v3');
var q = require('q');
var statistics = require('../resources/statistics.js');

var segmentDetailController = (function () {

    var effortTimesSeconds = [];
    var effortTimeMinutes = [];
    var athleteBestEffort = {};
    var pageLimit = 5;
    var binSize = 10;
    var segmentId = 610040;
    var segmentName = "";
    var athlete_id = 14906240;

    // Returns an ordered list of segment attempts 
    var getSegmentEfforts = function (segmentId) {
        console.log("Loading segment " + segmentId);

        return getEfforts(1, segmentId).then(function (effortsArray) {
            // Combine results of strava calls
            for (var i = 0; i < effortsArray.length; i++) {
                effortTimesSeconds = effortTimesSeconds.concat(effortsArray[i]);
            }
            // return sorted list
            return effortTimesSeconds.sort(function (a, b) {
                return a - b;
            });
        });
    }

    // Todo build this out, needs seg efforts to be called firsts
    var getSegmentName = function (segmentId) {
        if (segmentName) {
            return segmentName;
        }
        return "Not yet loaded name";
    }

    // Async get all the efforts
    function getEfforts(page, segmentId) {
        var promiseList = [];
        for (var i = 0; i < pageLimit; i++) {
            promiseList.push(getStravaEfforts(i, 200, segmentId));
        }
        return q.all(promiseList);
    }

    function getStravaEfforts(page, per_page, segmentId) {
        var deferred = q.defer();
        var efforts = [];

        console.log("attempting page..." + page);

        strava.segments.listEfforts({
            id: segmentId,
            per_page: per_page,
            page: page
        }, function (err, payload) {
            if (!err) {
                console.log("Got page " + page);
                if (payload !== [] && page + 1 < pageLimit) {

                    // Record the segment times
                    segmentName = payload[0].name;
                    for (var k = 0; k < payload.length; k++) {
                        efforts.push(payload[k].moving_time);
                    }
                    deferred.resolve(efforts);
                } else {
                    console.error("Finished getting all efforts");
                    deferred.resolve([]);
                }
            } else {
                console.log(err);
                deferred.reject(err);
            }
        });

        return deferred.promise;
    }

    function getAthleteBestEffort(athlete_id) {
        var bestEffortTime = 1000000000000000;
        var bestEffort = {};
        var deferred = q.defer();

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
                deferred.resolve(bestEffort);
            }
        });
        return deferred.promise;
    }

    function getSegmentResults(segmentId, athlete_id) {
        var segmentEfforts;
        var athleteBestEffort;
        return getSegmentEfforts(segmentId).then(function (efforts) {
            segmentEfforts = efforts;
            return getAthleteBestEffort(athlete_id);
        }).then(function (athBestEff) {            
            athleteBestEffort = athBestEff;
            return parseResults(segmentId, athlete_id, segmentEfforts, athleteBestEffort);
        });
    }

    function parseResults(segmentId, athlete_id, efforts, athleteBestEffort) {
        console.log("doing statss");

        var segmentData = {};
        // Caclulate the Distribution data
        statistics.setDataSeries(efforts);

        segmentData.distributionCurve = statistics.getDistributionCurve();
        segmentData.histogram = statistics.getHistogram(binSize);

        segmentData.athleteBestEffort = athleteBestEffort;
        segmentData.athleteBestEffort.faster_than = Math.round((1 - statistics.getCdf(athleteBestEffort.elapsed_time)) * 10000) / 100;

        segmentData.totalAttempts = efforts.length;
        segmentData.segmentInfo = {
            id: segmentId,
            name: getSegmentName(segmentId)
        };

        console.log("Finished analysis");
        return segmentData;
    }

    return {
        getSegmentResults: getSegmentResults,
    };
} ());

module.exports = segmentDetailController;