var gaussian = require('gaussian');

var statisticsModule = (function () {

    var statistics = {};

    statistics.calculateGaussDistribution = function (dataSeries) {
        var mean = 0.0;
        var variance = 0.0;
        var distributionCurve = [];
        var differenceTotal = 0.0;
        var count = dataSeries.length;

        // mean
        for (var i = 0; i < count; i++) {
            mean += dataSeries[i];
        }
        mean = mean / count;

        // variance
        for (var i = 0; i < count; i++) {
            var difference = dataSeries[i] - mean;
            differenceTotal += (difference * difference);
        }
        variance = differenceTotal / (count - 1);

        console.log("Mean " + mean);
        console.log("Variance " + variance);

        // Return new distribution
        return gaussian(mean, variance);
    }

    statistics.getDistributionCurve = function (dataSeries, distribution) {

        var distributionCurve = []
        var total = 0;

        // Calculate pdf at each point in the distribution up to last data point
        for (var i = dataSeries[0]; i < dataSeries[dataSeries.length - 1]; i += 2) {
            var sample = distribution.pdf(i);
            distributionCurve.push([i, sample]);
            total = total + sample;
        }

        console.log("Generated curve from "
            + distributionCurve[0][0]
            + " to "
            + distributionCurve[distributionCurve.length - 1][0]
        );
        return distributionCurve;
    }

    statistics.getHistogram = function (binSize, dataSeries) {
        var startDataPoint = dataSeries[0];
        var currentBinStart = startDataPoint;
        var currentBin = 0;
        var dataBins = [];

        var bins = [{
            start: currentBinStart,
            end: currentBinStart + binSize,
            count: 1
        }];

        for (var i = 1; i < dataSeries.length; i++) {

            if (dataSeries[i] <= currentBinStart + binSize) {
                bins[currentBin].count += 1;
            } else {
                currentBinStart = dataSeries[i];
                currentBin += 1;
                bins.push({
                    start: currentBinStart,
                    end: currentBinStart + binSize,
                    count: 1
                });
            }
        }

        for (var i = 0; i < bins.length; i++) {
            binAvg = (bins[i].start + bins[i].end) / 2;
            dataBins.push([binAvg, bins[i].count]);
        }

        console.log("Created bins");

        return dataBins;
    }

    statistics.getCdf = function (xVal, distribution) {        
        return distribution.cdf(xVal);
    }

    return statistics;
} ());

module.exports = statisticsModule;