var win;
//var tank; // Just this instance of the tank
let tanks = new Map(); // All tanks in the game 
let shots = new Map(); // All shots in the game
var socketID = undefined;
var mytankid = undefined;

var socket;
var oldTankx, oldTanky, oldTankHeading;
var fps = 60; // Frames per second
var PlayerName = "";
var DEBUG = 0;
var loopCount = 0.0;  // Keep a running counter to handle animations

// Sounds activated
const soundLib = new sounds();

// helper
/**
 * parses the passed JSON string into a Map object.
 * @param {string} serializedMap 
 * @returns a Map object with all the properties of the JSON object.
 */
const parseMap = (serializedMap) => {
  return new Map(JSON.parse(serializedMap));
}

// Initial Setup
function setup() {

  // Start the audio context on a click/touch event
  userStartAudio().then(function() {
    // Audio context is started - Preload any needed sounds
    soundLib.loadLibSound('saw');
    soundLib.loadLibSound('cannon');
    soundLib.loadLibSound('tankfire');
    soundLib.loadLibSound('dpop');
  });

  // Get the Player
  PlayerName = document.getElementById('playerName').value;
  console.log('Player: ' + PlayerName);

  // Set drawing parmameters
  rectMode(CENTER);
  textSize(32);
  textAlign(CENTER, CENTER);

  // Set window size and push to the main screen
  // Good DEV size
  win = { width: 600, height: 600 };
  // Good PROD size
//  win = { width: 900, height: 700 };
  var canvas = createCanvas(win.width, win.height);
  canvas.parent('sketch-holder');

  // Set the framerate so everyone is *hopefully* the same
  frameRate(fps); // As low as possible to not tax slow systems

  // Create a socket to the main server
  const server = window.location.hostname + ":" + location.port;
  socket = io.connect(server, {transports: ['polling']});

  // All the socket listener method
  socket.on('ServerReadyAddNew', ServerReadyAddNew);
  socket.on('ServerNewTankAdd', ServerNewTankAdd);
  socket.on('ServerTankRemove', ServerTankRemove);
  socket.on('ServerTankDisconnect', ServerTankDisconnect);
  socket.on('ServerMoveTank', ServerMoveTank);
  socket.on('ServerResetAll', ServerResetAll);
  socket.on('ServerMoveShot', ServerMoveShot);;;
  socket.on('ServerNewShot', ServerNewShot);

  // Join (or start) a new game
  socket.on('connect', function(data) {
    socketID = socket.io.engine.id;
    socket.emit('ClientNewJoin', socketID);
  });
}
  
// Draw the screen and process the position updates
function draw() {
  background(0);

  // Loop counter
  if(loopCount > 359*10000)
    loopCount = 0;
  else
    loopCount++;

  // draw shells

  // Process shots
  let expired = [];
  shots.forEach((shot, id) => {
    shot.render();
    shot.update();
    if (shot.offscreen()) {
      expired.push(id);
    }
    else {
      let shotData = { x: shot.pos.x, y: shot.pos.y, 
        shotid: shot.shotid };
      socket.emit('ClientMoveShot', shotData);
    }
  });
  // delete expired shots
  expired.forEach(e => {
    if(shots.has(e)){
      shots.delete(e);
    }
  });
  // Process all the tanks by iterating through the tanks array
  if(tanks && tanks.size > 0) {
    tanks.forEach((tank, id) => {
      if(id == mytankid) {
        if (!tank.destroyed){
          tank.turn();
          tank.update();
        }

        // Check for off screen and don't let it go any further
        if(tank.pos.x < 0)
          tank.pos.x = 0;
        if(tank.pos.x > win.width)
          tank.pos.x = win.width;
        if(tank.pos.y < 0)
          tank.pos.y = 0;
        if(tank.pos.y > win.height)
          tank.pos.y = win.height;
      }
      if (!tank.destroyed) // render any tanks unless destroyed
        tank.render();
    });
  }

  // To keep this program from being too chatty => Only send server info if something has changed
  if(tanks && tanks.size > 0 && tanks.has(mytankid)
    && (oldTankx!=tanks.get(mytankid).pos.x || oldTanky!=tanks.get(mytankid).pos.y || oldTankHeading!=tanks.get(mytankid).heading)) {
    let newTank = { x: tanks.get(mytankid).pos.x, y: tanks.get(mytankid).pos.y, 
      heading: tanks.get(mytankid).heading, tankColor: tanks.get(mytankid).tankColor, 
      tankid: tanks.get(mytankid).tankid };
    socket.emit('ClientMoveTank', newTank);
    oldTankx = tanks.get(mytankid).pos.x;
    oldTanky = tanks.get(mytankid).pos.y;
    oldTankHeading = tanks.get(mytankid).heading;
  }
}

// Handling pressing a Keys
function keyPressed() {
  if(!mytankid)
    return;
  // Can not be a destroyed tank!
  if (tanks.get(mytankid).destroyed)
    return;
  if (key == ' ') { // SPACE_KEY = Fire Shell
    const shotid = random(0, 50000);
    // record actual shot object
    shots.set(shotid,
      new Shot(shotid, tanks.get(mytankid).tankid, tanks.get(mytankid).pos, 
        tanks.get(mytankid).heading, tanks.get(mytankid).tankColor
      )
    );
    // send JSON version to server for broadcast
    let newShot = { x: tanks.get(mytankid).pos.x, y: tanks.get(mytankid).pos.y, heading: tanks.get(mytankid).heading, 
      tankColor: tanks.get(mytankid).tankColor, shotid: shotid, tankid: tanks.get(mytankid).tankid };
    socket.emit('ClientNewShot', newShot);
    // Play a shot sound
    soundLib.playSound('tankfire');
  }
  // movements
  if (keyCode == RIGHT_ARROW) {  // Move Right
    tanks.get(mytankid).setRotation(0.2);
  }
  if (keyCode == LEFT_ARROW) {   // Move Left
    tanks.get(mytankid).setRotation(-0.2);
  }
  if (keyCode == UP_ARROW) {     // Move Forward
    tanks.get(mytankid).moveForward(2.0);
  }
  if (keyCode == DOWN_ARROW) {   // Move Back
    tanks.get(mytankid).moveForward(-2.0);
  }
}

// Release Key
function keyReleased() {
  if(!tanks.has(mytankid))
    return;
  // stop mouvement
  tanks.get(mytankid).setRotation(0.0);
  tanks.get(mytankid).stopMotion();
}
  
//  ***** Socket communication handlers ******
function ServerReadyAddNew(data) {
  console.log('Server Ready');

  // Reset the tanks
  tanks = new Map();
  mytankid = undefined;

  // Create the new tank
  // Make sure it's starting position is at least 20 pixels from the border of all walls
  let startPos = createVector(Math.floor(Math.random()*(win.width-40)+20), Math.floor(Math.random()*(win.height-40)+20));
  let startColor = color(Math.floor(Math.random()*255), Math.floor(Math.random()*255), Math.floor(Math.random()*255));
  let newTank = { x: startPos.x, y: startPos.y, heading: 0, tankColor: startColor, tankid: socketID, playername: PlayerName };

  // Create the new tank and add it to the array
  mytankid = socketID;
  var newTankObj = new Tank(startPos, startColor, mytankid, PlayerName)
  tanks.set(mytankid, newTankObj);

  // Send this new tank to the server to add to the list
  socket.emit('ClientNewTank', newTank);
}

/**
 * upon receiving the complete list of tanks of the server,
 * check for new tanks and adds them to the local
 * database of tanks.
 * @param {string} data 
 */
function ServerNewTankAdd(data) {
  // data is a serialized map of all tanks info so we convert it back to a map
  data = parseMap(data);
  if(DEBUG && DEBUG==1)
    console.log('New Tank: ' + data);
  // Add any tanks not yet in our tank array
  data.forEach((tank, id) => {
    if (!tanks.has(id))
    {
      // Add this tank to the end of the array
      let startPos = createVector(Number(tank.x), Number(tank.y));
      let c = color(tank.tankColor.levels[0], tank.tankColor.levels[1], tank.tankColor.levels[2]);
      let newTankObj = new Tank(startPos, c, tank.tankid, tank.playername);
      tanks.set(id, newTankObj);
    }
  });
  return;
}

/**
 * mark the tank at **socketid** as destroyed.
 * @param {string} socketid the id of the tank that was destroyed
 */
function ServerTankRemove(socketid) {
  // console.log('Remove Tank: ' + socketid);
  if(tanks.has(socketid)){
      tanks.get(socketid).destroyed = true;
  }
  return;
}

/**
 * changes the **on** property of the tank of id **socketid** to 
 * **false** meaning that the player has disconnected from server.
 * @param {string} socketid the id of the client that is disconnected
 */
function ServerTankDisconnect(socketid) {
  // console.log('Remove Tank: ' + socketid);
  if(tanks.has(socketid)){
      tanks.get(socketid).on = true;
  }
  return;
}

/**
 * change the position of the specified tank.
 * @param {JSON} data a json containing the id of the tank, its new position and heading.
 */
function ServerMoveTank(data) {
  data = JSON.parse(data);
  if(DEBUG && DEBUG==1)
    console.log('Move Tank: ' + JSON.stringify(data));
  
  if(tanks.has(data.tankid)){
      tanks.get(data.tankid).pos.x = Number(data.x);
      tanks.get(data.tankid).pos.y = Number(data.y);
      tanks.get(data.tankid).heading = Number(data.heading);
  }
}

/**
 * add a new Shot object to the list of shots.
 * @param {JSON} data the basic info needed to build the Shot object
 */
function ServerNewShot(data) {
  // First check if this shot is already in our list
  if(!shots.has(data.shotid)) {
    // Add this shot to the end of the array
    let c = color(data.tankColor.levels[0], data.tankColor.levels[1], data.tankColor.levels[2]);
    shots.set(data.shotid,
      new Shot(data.shotid, data.tankid, createVector(data.x, data.y), data.heading, c)); 
  }
}

/**
 * change the position of the specified shot
 * @param {*} data 
 */
function ServerMoveShot(data) {
  if(DEBUG && DEBUG==1)
    console.log('Move Shot: ' + data);
  if(shots.has(shotid)) {
      shots.get(shotid).pos.x = Number(data.x);
      shots.get(shotid).pos.y = Number(data.y);
  }
}

/**
 * send a restart flag to the server.
 */
function Restart() {
  socket.emit('ClientResetAll');
}

/**
 * respond to a restart flag from server
 * @param {*} data nothing really is sent at the moment.
 */
function ServerResetAll(data) {
  console.log('Reset System');
  document.forms[0].submit();
  // location.reload();
}