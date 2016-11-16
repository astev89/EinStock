const express = require('express');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const moment = require('moment');
const port = 8080;
const database = require('../database');
const evaluation = require('../evaluator/simulate.js');
const dumbAlgo1 = require('../algorithms/dumbAlgo1.js').a1;
const dumbAlgo2 = require('../algorithms/dumbAlgo1.js').a2;
let predictions;

//-----------------middleware---------------
//------------------------------------------
app.use(bodyParser.json());

app.use((req, res, next) => {
  next();
});

app.use(express.static(path.join(__dirname + '/../client')));

app.use('/public', express.static(path.join(__dirname + '/../node_modules')));

//-----------------routes-------------------
//------------------------------------------
app.get('/', (req, res) => {
  res.status(200).sendFile(path.join(__dirname + '/../client/index.html'));
});

app.post('/api/data', (req, res) => {
  function dateFormat(dateOriginal) {
    var date = new Date(dateOriginal);
    date = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    return date;
  }

  dumbAlgo2(dateFormat(req.body.startDate), dateFormat(req.body.endDate), req.body.ticker)
    .then((result) => {
      predictions = result;
    })
    .then(() => {
      evaluation('d', dateFormat(req.body.startDate), dateFormat(req.body.endDate), req.body.ticker, predictions)
        .then((result) => {
          res.send(result);
          console.log('returned result: ', result);
        })
    })
})


//-----------------database-----------------
//------------------------------------------

database.db.sync().then(() => {
  console.log('database connected');
  app.listen(process.env.PORT || port);
  console.log('listening on port: ', port);
});

// // test evaluation function, to be deleted later
// var startDate = '2016-10-03',
//     endDate = '2016-10-14';
// // var predictions = dumbAlgo1(startDate, endDate, 'ABC');
// dumbAlgo2(startDate, endDate, 'AAPL')
//   .then(function(result) {
//     predictions = result;
//     console.log('predictions: ', predictions);
//   })
//   .then(function() {
//     evaluation('d', startDate, endDate, 'AAPL', predictions)
//       .then(function(result) {
//         console.log('result: ',result);
//       });
//   });



