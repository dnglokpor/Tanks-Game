var express = require('express');
var app = express();
const request = require('request');

// helper
/**
 * converts a Map object to a string for sending through an io socket.
 * @param {Map} map the original map object.
 * @returns the serialized string form of the map.
 */
 const serialize = (map) => {
  return JSON.stringify(Array.from(map.entries()))
};
/**
 * return the euclidian distance between (x1, y1) and (x2, y2).
 * @param {*} x1 the x coordinate of the first point.
 * @param {*} y1 the y coordinate of the first point.
 * @param {*} x2 the x coordinate of the second point.
 * @param {*} y2 the y coordinate of the second point.
 * @returns **SQRT([(x2 - x1)^2 + (y2 - y1)^2])**
 */
const dist = (x1, y1, x2, y2) => {
  return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
};

// spatial manager
/**
 * class that implements a spatial hasher with all the required
 * logic for finding the buckets, adding elements and resetting.
 * this class is implemented for spatial hashing where the cells
 * are square.
 */
class SpatialManager2D {
  /**
   * construct the object using the following data:
   * @param {Number} s_width the width of the 2D canvas.
   * @param {Number} w_height the height of the 2D canvas.
   * @param {Number} c_size the side size of the cell.
   */
  constructor(s_width, s_height, c_size) {
    this.width = s_width;
    this.height = s_height;
    this.cell_size = c_size;
    this.buckets = (s_width * s_height) / (c_size * c_size); // number of buckets
    this.cvf = 1 / c_size;
    this.rows = s_width / c_size;
    this.cols = s_height / c_size;
    this.index = new Map();
    for(let i = 0; i < this.buckets; i++)
      this.index.set(i, []);

    // methods
    /** resets the spatial index  */
    this.resetIndex = () => {
      this.index = new Map();
      for(let i = 0; i < this.buckets; i++)
        this.index.set(i, []);
    };
    /**
     * this function returns the id of the bucket in which the passed coordinates
     * would live.
     * @param {Number} posX the x coordinate of the object to place
     * @param {Number} posY the y coordinate of the object to place
     * @returns the id of the bucket in which to place this object
     */
    this.bucketID = (posX, posY) => {
      posX = posX >= this.width ? posX - 1 : posX;
      posY = posY >= this.height ? posY - 1 : posY;
      return parseInt(posX * this.cvf) + parseInt(posY * this.cvf) * this.rows;
    };
    /**
     * adds this object in the index.
     * @param {Number} goX the x coordinate of the game object.
     * @param {Number} goY the y coordinate of the game object.
     * @param {*} gameObj the game object itself.
     */
    this.add = (goX, goY, gameObj) => {
      let bIdx = this.bucketID(goX, goY);
      this.index.get(bIdx).push(gameObj); // add the gameobject to bucket
    };
    /**
     * return the bucket in which an object at this point coordinates
     * would be stored.
     * @param {Number} goX the x coordinate of a point.
     * @param {Number} goY the y coordinate of a point.
     * @returns an Array with all the items hashed in the vicinity.
     */
    this.bucketOf = (goX, goY) => {
      return this.index.get(this.bucketID(goX, goY));
    };
  }
}

// screen settings
const WIDTH = 800;
const HEIGHT = 600;
const CELL_SIZE = 80; // experiment to find best collision rates

// Game items to remember
var tanks = new Map();
var shots = new Map();
var DEBUG = 0;

// stage ammunitions
/**
 * creates a new the specified resource at the passed position.
 * @param {Number} the id of this resource.
 * @param {string} rType the type of the resource. R, S of B.
 * @param {Number} x the x coordinate of the position.
 * @param {Number} y the y coordinate of the position.
 * @returns the JSON for of the resource.
 */
const resourceAt = (rid, rType, x, y) => {
  if(rType == 'B')
    return {"rid": rid, "type": "B", "coords": {"x": x, "y": y}, "rounds": 5};
  else if(rType == 'S')
    return {"rid": rid, "type": "S", "coords": {"x": x, "y": y}, "rounds": 21};
  else // if (rType == 'R')
    return {"rid": rid, "type": "R", "coords": {"x": x, "y": y}, "rounds": 25};
};

var resource = new Map();
resource.set(1, resourceAt(1, 'R', 200, 200));
resource.set(2, resourceAt(2, 'S', 200, 400));
resource.set(3, resourceAt(3, 'B', 400, 200));
resource.set(4, resourceAt(4, 'R', 400, 400));

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
      
        // sending all the tanks and ammo to the new joiner
        io.to(socket.id).emit('ServerReadyAddNew',
          {
            "resource": serialize(resource),
            "opponents": serialize(tanks),
            "flying": serialize(shots)
          }
        );
        
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
              tankid: data.tankid, playername: data.playername,
              ammo: data.ammo
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
        io.sockets.emit('ServerMoveTank', data);

        // autopickup when in vicinity
        let spatialmgr = new SpatialManager2D(WIDTH, HEIGHT, CELL_SIZE); 
        // add resource to space hasher
        resource.forEach((res) => {
          spatialmgr.add(res.coords.x, res.coords.y, res);
        });
        // check for nearby collisions to tank position (x, y)
        // TODO expand to checking in all buckets around tank
        let x = tanks.get(tankid).x;
        let y = tanks.get(tankid).y;
        spatialmgr.bucketOf(x, y).forEach(res => {
          if (dist(res.coords.x, res.coords.y, x, y) < 10.0){ // collision
            console.log("RESOURCE PICKED UP");
            tanks.get(tankid).ammo = res; // mark resource as taken by this tank
            // tell all tanks.
            io.sockets.emit('ServerResourcePickUp',
              { "tankid": tankid, "rid": res.rid }
            );
            console.log(JSON.stringify(res) + " was picked by " + tankid.toString());
            resource.delete(res.rid);
          }
        });
      }
    );
    
    socket.on("ClientResourceDropped",
      /**
       * adds the dropped resource to the field resource map.
       * @param {JSON} data a JSON object with info to build the resource.
       */
      function(data){
        // data is the resource that was dropped in a resource JSON form
        resource.set(data.rid, data);
        console.log("Dropped: " + JSON.stringify(data)); 
        // send it to everyone else but the sender
        io.sockets.emit("ServerResourceDropped", data);
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
        shots.set(data.shotid, data);

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
        // TODO use spatial hashing for HIT collision
        // TODO use HP reduction in HIT collision
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
