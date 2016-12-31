var strava = require('strava-v3');
var util = require('util');
var fs = require('fs');
var express = require('express');
var q = require('q');
var segmentDetailController = require('./controllers/segmentDetail.js')
var statistics = require('./resources/statistics.js');

var app = express();
app.use(express.static('public'));

app.get('/', function (req, res) {
    res.sendFile('index.html');
});

app.get('/segmentDetail/:segId/athlete/:athId', function (req, res) {
    console.log(req.params);

    segmentDetailController.getSegmentResults(req.params.segId, req.params.athId).then(function (segmentData) {
        res.send(segmentData);
    });
});

app.listen(3000, function () {
    console.log('Example app listening on port 3000!')
});

