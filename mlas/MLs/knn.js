// ------- implement k nearest neighbors algorithm ---------------

var ss = require('simple-statistics');
var KNN = require('ml-knn');
var knn = new KNN();

var moment = require('moment');
var apiMethods = require('../../worker/index.js');
var PreProcess = require('../preprocess.js');
var mean = [], std = [];

var predictors = [
  'movement_lag2',
  'std5_lag2',
  'gap_ema5_lag2',
  'percentBB5_lag2',
  'std20_lag2',
  'gap_ema20_lag2',
  'percentBB20_lag2',
  'movement_lag3',
  'std5_lag3',
  'gap_ema5_lag3',
  'percentBB5_lag3',
  'std20_lag3',
  'gap_ema20_lag3',
  'percentBB20_lag3',
  'movement_lag4',
  'std5_lag4',
  'gap_ema5_lag4',
  'percentBB5_lag4',
  'std20_lag4',
  'gap_ema20_lag4',
  'percentBB20_lag4'
];

var Neighbors = function(startDate, endDate, tickerSymbol) {
  this.startDate = moment(new Date(startDate)).format().slice(0, 10);
  this.endDate = moment(new Date(endDate)).format().slice(0, 10);
  this.tickerSymbol = tickerSymbol;
  this.trainingData = [];
  this.testData = [];

  var startTrain = moment(this.startDate).subtract(12, 'months'); //<-- use the previous half year for training
  // var endTrain = moment(startDate).subtract(2, 'days');
  if(startTrain.day() === 0) {
    startTrain = startTrain.add(1, 'days');
  };
  if(startTrain.day() === 6) {
    startTrain = startTrain.subtract(1, 'days');
  };
  this.startTrain = startTrain.format().slice(0, 10);
};

Neighbors.prototype.preProcess = function() {
  var that = this;
  return apiMethods.yahoo.historical(this.tickerSymbol, this.startTrain, this.endDate)
    .then(function(data) {  // <------- preprocess all data, including training data and test data
      var predictors = new PreProcess(data);
      predictors.index();
      predictors.movement();
      predictors.ema(5); //<------ use 5 day and 20 day moving average as predictors
      predictors.std(5);
      predictors.maGap(5);
      predictors.BB(5);
      predictors.percentBB(5);
      predictors.lags(4, 5); //<----- use lags 2 to 4
      predictors.ema(20);
      predictors.std(20);
      predictors.maGap(20);
      predictors.BB(20);
      predictors.percentBB(20);
      predictors.lags(4, 20);
      return predictors.data;
    })
    .then(function(data) {
      that.trainingData = data;
    })
    .then(function() {
      var startDate = moment(that.startDate).subtract(1, 'days');
      if(startDate.day() === 0) { //<----- if landing on Sunday, go to previous friday
        startDate = startDate.subtract(2, 'days');
      };

      startDate = startDate.format().slice(0, 10);
      return apiMethods.yahoo.historical(that.tickerSymbol, startDate, that.endDate)
    })
    .then(function(data) {
      for(var i = data.length - 1; i >=0; i--) {
        that.testData.push(that.trainingData.pop());
      }
      that.testData.reverse();
      that.trainingData.pop();
    });
};

Neighbors.prototype.predictTomorrow = function() {
  var that = this;
  var start = moment().subtract(25, 'days');
  if(start.day() === 0) { //<----- if landing on Sunday, go to previous friday
    start = start.subtract(2, 'days');
  } else if(start.day() === 6) {
    start = start.subtract(1, 'days');
  };
  var endDate = moment();
  if(endDate.day() === 0) {
    endDate = endDate.subtract(2, 'days');
  } else if(endDate.day() === 6) {
    endDate = endDate.subtract(1, 'days');
  };
  start = start.format().slice(0, 10);
  endDate = endDate.format().slice(0, 10);
  return apiMethods.yahoo.historical(this.tickerSymbol, start, endDate)
    .then(function(data) {
      var predictors = new PreProcess(data);
      predictors.index();
      predictors.movement();
      predictors.ema(5); //<------ use 5 day and 20 day moving average as predictors
      predictors.std(5);
      predictors.maGap(5);
      predictors.BB(5);
      predictors.percentBB(5);
      predictors.lags(3, 5); //<----- use lags 1 to 3
      predictors.ema(20);
      predictors.std(20);
      predictors.maGap(20);
      predictors.BB(20);
      predictors.percentBB(20);
      predictors.lags(3, 20);
      return predictors.data;
    })
    .then(function(data) {
      var predictors_tomorrow = [
        'movement_lag1',
        'std5_lag1',
        'gap_ema5_lag1',
        'percentBB5_lag1',
        'std20_lag1',
        'gap_ema20_lag1',
        'percentBB20_lag1',
        'movement_lag2',
        'std5_lag2',
        'gap_ema5_lag2',
        'percentBB5_lag2',
        'std20_lag2',
        'gap_ema20_lag2',
        'percentBB20_lag2',
        'movement_lag3',
        'std5_lag3',
        'gap_ema5_lag3',
        'percentBB5_lag3',
        'std20_lag3',
        'gap_ema20_lag3',
        'percentBB20_lag3'
      ];
      var testFeatures = data.slice(-1).map(item => {
        var features = [];
        predictors_tomorrow.forEach(predictor => {
          features.push(item[predictor]);
        });
        return features;
      });
      for(var i = 0; i < testFeatures[0].length; i++) {
        testFeatures.forEach(item => {
          item[i] = (item[i] - mean[i]) / std[i];
        })
      };
      return testFeatures;
    })
    .then(function(testData) {
      that.tomorrow = knn.predict(testData)[0];
      return that.tomorrow;
    })

};

Neighbors.prototype.predict = function() {
  var testFeatures = this.testData.map(item => {
    var features = [];
    predictors.forEach(predictor => {
      features.push(item[predictor]);
    })
    return features;
  });

  for(var i = 0; i < testFeatures[0].length; i++) {
    testFeatures.forEach(item => {
      item[i] = (item[i] - mean[i]) / std[i];
    })
  };

  this.predictions = knn.predict(testFeatures).slice(1);
  console.log('predictions: ', this.predictions);
};

Neighbors.prototype.train = function(callback) {
  var that = this;
  var trainingOutcomes = this.trainingData.map(item => {
    return item.movement;
  });
  var trainingFeatures = this.trainingData.map(item => {
    var features = [];
    predictors.forEach(predictor => {
      features.push(item[predictor]);
    })
    return features;
  });
  var checkForMissingData = function(array) {
    for(var i = 0; i < array.length; i++) {
      if(array[i] === undefined || array[i] === NaN) return true;
    }
    return false;
  };

  while(checkForMissingData(trainingFeatures[0])) {
    trainingFeatures = trainingFeatures.slice(1);
    trainingOutcomes = trainingOutcomes.slice(1);
  }

  for(var i = 0; i < trainingFeatures[0].length; i++) {
    var vector = trainingFeatures.map(item => item[i]);
    // console.log('vector:', vector);
    std[i] = ss.sampleStandardDeviation(vector);
    mean[i] = ss.mean(vector);
    // console.log('std and mean:', std, mean);
    trainingFeatures.forEach(item => {
      item[i] = (item[i] - mean[i]) / std[i];
    })
  };

  knn.train(trainingFeatures, trainingOutcomes);
};

module.exports = Neighbors;