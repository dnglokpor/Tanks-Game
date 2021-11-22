
var express = require('express');
var app = express();
const request = require('request');
//const Hapi = require( "hapi" );
//const routes = require( "./routes" );

// Game items to remember
var tanks = new Map();
var shots = new Map();
var DEBUG = 1;

// helper
/**
 * converts a Map object to a string for sending through an io socket.
 * @param {Map} map the original map object.
 * @returns the serialized string form of the map.
 */
const serialize = (map) => {
  return JSON.stringify(Array.from(map.entries()))
}

// Set up the server
// process.env.PORT is related to deploying on AWS
var server = app.listen(process.env.PORT || 3000, listen);
module.exports = server;

// This call back just tells us that the server has started
function listen() {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Tank Battle listening at http://' + host + ':' + port);
}
// Set the folder for public items
path = require('path'),
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
publicDir = path.join(__dirname,'public');
app.use(express.static(publicDir))
app.set('views', __dirname);
app.use(express.urlencoded())

// Create a socket and open the connection (io)
var socket = require('socket.io');
var io = socket(server);

// Handle starting screen submission
// and the Reset Command
app.post('/GetEm', (req, res) => {
  const playerName = req.body.PlayerName;
  // Check for an actual player name
  if(!playerName || playerName == '')
    res.render('public/index.html');
  else
    res.render('public/tanks.html', { PlayerName: playerName });
});

// WebSocket Portion
// WebSockets work with the HTTP server
var io = require('socket.io')(server);

// Register a callback function to run when we have an individual connection
// This is run for each individual user that connects
io.sockets.on('connection',
  // We are given a websocket object in our function
  function (socket) {
 
    // Always print this
    console.log("New Tank: " + socket.id);

    // Initial Add of New Client
    socket.on('ClientNewJoin',
      function(data) {
        // data is a string that is the unique id of the new client socket
        console.log('New Client Join: ' + data);
      
        // sending all the tanks to the new joiner
        io.to(socket.id).emit('ServerReadyAddNew', serialize(tanks));

        // Send to all clients but sender socket
        //socket.broadcast.emit('NewTank', data);
        
        // This is a way to send to everyone including sender
        // io.sockets.emit('message', "this goes to everyone");
      }
    );
    
    // Connected client adding New Tank
    socket.on('ClientNewTank',
      function(data) {

        // data is json with tank information in it
        console.log('New Tank: ' + JSON.stringify(data));

        // Add new tank to Map
        // what we do add is actually a json with the new tank info
        if(!tanks.has(data.tankid))
          tanks.set(data.tankid, 
            { 
              on: true, // connection status of the client
              x: Number(data.x), y: Number(data.y), 
              heading: Number(data.heading), tankColor: data.tankColor, 
              tankid: data.tankid, playername: data.playername
            }
          );

        if(DEBUG && DEBUG==1)
          console.log(tanks);

        // Send the tank update after giving a quick delay for initialization
        const timeoutObj = setTimeout(() => {
          io.sockets.emit('ServerNewTankAdd', serialize(tanks));
        }, 1500);
      }
    );

    // Connected client moving Tank
    socket.on('ClientMoveTank',
      function(data) {

        // Data comes in as whatever was sent, including objects
        if(DEBUG && DEBUG==1)
          console.log('Move Tank: ' + JSON.stringify(data));

        // Change the local tank table
        let tankid = data.tankid
        if (tanks.has(tankid)){
          tanks.get(tankid).x = Number(data.x);
          tanks.get(tankid).y = Number(data.y);
          tanks.get(tankid).heading = data.heading;
        }

        // Send the move out to all clients but sender s  ocket
        socket.broadcast.emit('ServerMoveTank', data);
      }
    );

    // disconnection event from a tank object
    socket.on('disconnect', function() {
      console.log("Client has disconnected: " + socket.id);

      if(DEBUG && DEBUG==1)
        console.log(tanks);

      // instead we AFK the user
      tanks.get(socket.id).on = false;
      // Tell everyone else its gone too
      io.sockets.emit('ServerTankDisconnect', socket.id);
    });

    // New Shot Object
    socket.on('ClientNewShot',
      function(data) {
        // data is a JSON containing the info of a shot
        if(DEBUG && DEBUG==1)
          console.log('New Shot: ' + JSON.stringify(data));

        // Add this shot to the end of the array
        shots.set(data.shotid, data)

        // Send the change out
        io.sockets.emit('ServerNewShot', data);
      }
    );

    // Connected client moving Shots
    socket.on('ClientMoveShot',
      function(data) {
        // data contains the id of the shot and its current positions
        if(DEBUG && DEBUG==1)
          console.log('Move Shot: ' + JSON.stringify(data));
        
        // Find the correct shot and save the index
        if(shots.has(data.shotid)) {
            shots.get(data.shotid).x = Number(data.x);
            shots.get(data.shotid).y = Number(data.y);
        }else{ // Just make sure it found one
          return;
        }

        // Look for hits with all tanks
        let shot = shots.get(data.shotid);
        tanks.forEach((tank) => {
          // As long as it's not the tank that fired the shot
          // no need to search destroyed tanks either
          if(!(shot.tankid == tank.tankid || tank.destroyed)){
            var dist = Math.sqrt(Math.pow((shot.x-tank.x), 2) + Math.pow((shot.y-tank.y), 2) );
            if(dist < 20.0) {
              if(DEBUG && DEBUG==1) {
                console.log('HIT ------------------------');
                console.log('shotid: ' + shot.shotid);
                console.log('Shot-tankid: ' + shot.tankid);
                console.log('ShotX: ' + shot.x);
                console.log('ShotY: ' + shot.y);
                console.log('Tank-tankid: ' + tank.tankid);
                console.log('TankX: ' + tank.x);
                console.log('TankY: ' + tank.y);
              }
              // It was a hit, remove the tank and shot
              // and tell everyone else its gone too
              io.sockets.emit('ServerTankRemove', tank.tankid);
              tanks.get(tank.tankid).destroyed = true; // mark as hit
              shots.delete(shot.shotid); // delete bullet
              // just return for now to keep from unknown errors
              return;
            }
          }
        });
      }
    );

    // Connected client moving Shots
    socket.on('ClientResetAll',
      function(data) {
        // no data sent over
        console.log('Reset Server ');
        // Remove all the tanks
        tanks.forEach((tank) => {
          // Tell everyone else this tank is gone
          io.sockets.emit('ServerTankRemove', tank.tankid);
        });
        // reset variables
        shots = new Map();
        tanks = new Map();

        // Finally, reset the clients
        io.sockets.emit('ServerResetAll', data);
      }
    );
});
