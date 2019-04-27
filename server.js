'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
const Chance = require('chance');

const dns = require('dns');

require('dotenv').config();

var cors = require('cors');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

const dbUrl = process.env.MONGOLAB_URI;

mongoose.connect(dbUrl,function(err){
  // Log an error if one occurs
  if(err){
    console.log('Unable to connect to MongoDB');
  }
});

//Get the default connection
const dbConnection = mongoose.connection;

dbConnection.on('connecting', function () {
    console.log('Connecting to Database...');
});

//Bind connection to error event (to get notification of connection errors)
dbConnection.on('error', function (err) {
    console.log('Could not connect to the database. Exiting now...');
    console.log(err);
    process.exit();
});

dbConnection.once('open', function () {
    console.log('Connection open');
});

dbConnection.on('connected', function () {
    console.log('Connected to Database...');
});

dbConnection.on('disconnected', function () {
    console.log('Database connection is disconnected');
});

dbConnection.on('reconnected', function () {
    console.log('Connection reconnected!');
});

app.use(cors());

var urlSchema = new mongoose.Schema({
    id: {
      type: String
    },
    url: String
});

const Url = mongoose.model('Url',urlSchema);

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyParser.urlencoded({extended:true}));

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

  
// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});

app.get("/api/shorturl/:shortUrl", function (req, res) {
  const shortUrl = req.params.shortUrl;
  console.log('shortUrl',shortUrl);
  Url.findOne(
        {'id': shortUrl},
        function(err,doc){
        if(err){
          console.log('error');
           return res.status(500).json({ message: 'error' });
        }
        console.log('doc',doc);
        res.redirect(doc.url);
      })
});

// post url
app.post("/api/shorturl/new", function (req, res) {
  
  const originalUrl = req.body.url;
  const REPLACE_REGEX = /^https?:\/\//i
  
  let invalidUrl = false;
 
  const lookuphost = originalUrl.replace(REPLACE_REGEX, '');
  
  dns.lookup(lookuphost, function onLookup(err, address, family) {
    if (err == null) {
      console.log ('No Errors: ' + err + ' - ' + address + ' - ' + family);
      invalidUrl = false;
    } else {
      console.log ('Errors: ' + err + ' -- ' + address + ' -- ' + family)
      invalidUrl = true;
    }
    
    let shortUrl = 1;
    if(invalidUrl){
        return res.json({"error":"invalid URL"});
    }
    else {
      // insert into db
      console.log ('inserting');
      const chance = new Chance(Date.now());
      const randomStr = chance.string({
          length: 6,
          pool: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
      });
      //console.log('randomStr',randomStr);
      
      Url.update(
        {'url':originalUrl},
        {
          'id':randomStr,
          'url':originalUrl
        },
        {
          upsert:true
        },
        function(err,doc){
        if(err){
           console.log('error',err);
           return res.status(500).json({ message: 'error' });
        }
        //console.log('doc',doc);
        res.json({"original_url":originalUrl,"short_url":randomStr});
      })
    }
   });
});


app.listen(port, function () {
  console.log('Node.js listening ...');
});