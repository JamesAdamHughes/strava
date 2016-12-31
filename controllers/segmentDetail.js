var strava = require('strava-v3');
var q = require('q');
var statistics = require('../resources/statistics.js');

var segmentDetailController = (function () {

    var pageLimit = 2;
    var binSize = 10;
    var segmentId = 610040;
    var segmentName = "";
    var athlete_id = 14906240;

    // Returns an ordered list of segment attempts 
    var getSegmentEfforts = function (segmentId) {
        console.log("Loading segment " + segmentId);
        var effortTimesSeconds = [];

        return getEfforts(segmentId).then(function (effortsArray) {
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
    function getEfforts(segmentId) {
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

    function getAthleteBestEffort(athlete_id, segmentId) {
        var bestEffortTime = 1000000000000000;
        var bestEffort = {};
        var deferred = q.defer();

        strava.segments.listEfforts({
            id: segmentId,
            athlete_id: athlete_id
        }, function (err, payload) {
            if (!err) {
                // If no attempts made, return error
                if (payload.length === 0) {
                    deferred.resolve({ message: "No attempts made yet" });
                } else {
                    for (var i = 0; i < payload.length; i++) {
                        var effort = payload[i];
                        if (effort.elapsed_time < bestEffortTime) {
                            bestEffortTime = effort.elapsed_time;
                            bestEffort = effort;
                        }
                    }
                    deferred.resolve(bestEffort);
                }
            }
        });
        return deferred.promise;
    }

    function getSegmentStatistics(segmentEfforts) {
        var distribution = statistics.calculateGaussDistribution(segmentEfforts);
        var distributionCurve = statistics.getDistributionCurve(segmentEfforts, distribution);
        var histogram = statistics.getHistogram(binSize, segmentEfforts);

        var stats = {
            distributionCurve: distributionCurve,
            histogram: histogram,
            distribution: distribution
        };
        return stats;
    }

    function getSegmentResults(segmentId, athlete_id) {
        var segmentEfforts;
        var athleteBestEffort;
        return getSegmentEfforts(segmentId).then(function (efforts) {
            segmentEfforts = efforts;
            return getAthleteBestEffort(athlete_id, segmentId);
        }).then(function (athleteBestEffort) {
            // Caclulate the Distribution data

            var segmentData = {};
            var stats = getSegmentStatistics(segmentEfforts);

            // Return info on segment
            segmentData = {
                id: segmentId,
                name: getSegmentName(segmentId),
                totalAttempts: segmentEfforts.length,
                distributionCurve: stats.distributionCurve,
                histogram: stats.histogram
            };

            // Check if athlete has attempted, otherwise log no attempts
            if (athleteBestEffort.message === undefined) {
                segmentData.athleteBestEffort = athleteBestEffort;
                segmentData.faster_than = Math.round((1 - statistics.getCdf(athleteBestEffort.elapsed_time, stats.distribution)) * 10000) / 100;
                segmentData.athleteAttempted = true;
            } else {
                segmentData.athleteAttempted = false;
            }

            console.log("Finished analysis");
            return segmentData;
        });
    }

    return {
        getSegmentResults: getSegmentResults,
    };
} ());

module.exports = segmentDetailController;