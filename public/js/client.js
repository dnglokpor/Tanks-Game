var win;
//var tank; // Just this instance of the tank
let tanks = new Map(); // All tanks in the game 
let shots = new Map(); // All shots in the game
let resource = new Map(); // All available resources
let rc = {'r':255, 'g':50, 'b':111}; // color render
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
/**
 * returns the right shell based on the passed data. it will always return
 * at least a shell; defaulting to RAW.
 * @param {Number} rid the id od this Shell.
 * @param {*} type a string. possibilities are **'R'**, **'S'** or **'B'**
 * @param {Number} posX the x coordinate of this Shell.
 * @param {Number} posY the y coordinate of this Shell.
 * @param {*} rounds the number of rounds left in the shell.
 * @returns a Shell object of the type **type** with **rounds** in it.
 */
const createShell = (rid, type, posX, posY, rounds) => {
  let ammo = undefined;
  switch(type){
    case 'S':
      ammo = new Shell(
        rid,
        "Split Armor Wrecker", rounds, posX, posY,
        "Power: 5|Range: LOW|Cooldown: 3s"
      );
      break;
    case 'B':
      ammo = new Shell(
        rid,
        "Ballistic Armor Wrecker", rounds, posX, posY,
        "Power: 8|Range: HIGH|Cooldown: 5s"
      );
      break;
    default:
      ammo = new Shell(
        rid,
        "Rapid Armor Wrecker", rounds, posX, posY,
        "Power: 2|Range: MEDIUM|Cooldown: 1s"
      );
  }
  return ammo;
};
/**
 * creates a round that matches provided description.
 * @param {string} type the type of the round.
 * @param {string} tankid the id of the tank that shot it.
 * @param {Number} id the id of this specific round in its shell.
 * @param {Vector} spos the starting position of the round.
 * @param {*} angle the angle of the shot.
 * @returns the created round Object.
 */
const createRound = (type, tankid, id, spos, angle) => {
  let round = undefined;
  switch(type){
    case "S":
        round = new SplitAW(tankid, id, spos, angle);
        break;
    case "B":
        round = new BallisticAW(tankid, id, spos, angle);
        break; 
    default: // case R:
        round = new RapidAW(tankid, id, spos, angle);
  }
  return round;
};

/**
 * p5 drawing context setup function. run once before the start of the
 * rendering. for setting purposes.
 */
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

  // Set window size and push to the main screen
  // Good DEV size
  //win = { width: 600, height: 600 };
  // Good PROD size
  win = { width: 800, height: 600 };
  var canvas = createCanvas(win.width, win.height);
  canvas.parent('sketch-holder');

  // Set drawing parmameters
  rectMode(CENTER);
  textSize(win.width / 70);
  textAlign(CENTER, CENTER);

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
  socket.on('ServerMoveShot', ServerMoveShot);
  socket.on('ServerNewShot', ServerNewShot);
  socket.on('ServerResourcePickUp', ServerResourcePickUp);
  socket.on('ServerResourceDropped', ServerResourceDropped);

  // Join (or start) a new game
  socket.on('connect', function(data) {
    socketID = socket.io.engine.id;
    socket.emit('ClientNewJoin', socketID);
  });
}
  
// Draw the screen and process the position updates
// TODO add guy to inform player on current HP and AMMO
function draw() {
  background(128);

  // Loop counter
  if(loopCount > 359*10000)
    loopCount = 0;
  else
    loopCount++;

  
  if (loopCount % 45 == 0){
    rc.r = Math.floor(Math.random() * 127) + 128
    rc.g = Math.floor(Math.random() * 127) + 128
    rc.b = Math.floor(Math.random() * 127) + 128;
  }
  // draw shells
  resource.forEach((shell) => {
    shell.render(color(rc.r, rc.g, rc.b));
  });

  // Process shots
  let expired = [];
  shots.forEach((round, id) => {
    round.render();
    round.update();
    if (round.offscreen() || !round.flying) {
      expired.push(id);
    }
    else {
      let shotData = { x: round.pos.x, y: round.pos.y, 
        shotid: round.shotid };
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
      heading: tanks.get(mytankid).heading, 
      tankColor: tanks.get(mytankid).tankColor,
      tankid: tanks.get(mytankid).tankid
    };
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
    tank = tanks.get(mytankid);
    if(tank.canShoot()){
      let fired = tank.ammo.fireShell(mytankid, tank.pos, tank.heading);
      fired.forEach(shot => {
        shots.set(shot.shotid, shot);
        // send JSON version to server for broadcast
        let jShot = shot.jsonize();
        jShot.type = tank.ammo.name[0]; // add type
        socket.emit('ClientNewShot', jShot);
      });
      // cooldown
      // set the time at which the tank can shoot again.
      tank.cool(Date.now() + (fired[0].getCD() * 1000));
      // Play a shot sound
      soundLib.playSound('tankfire');
    }
  }
  // movements
  // TODO add oblique movement and shooting while moving
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
/**
 * this is the initial data of the game environment
 * as received by the client on connection.
 * @param {JSON} data a JSON containing the resource, the opponents and the shots in play for the new client.
 */
function ServerReadyAddNew(data) {
  console.log('Server Ready');

  // set the tanks
  tanks = parseMap(data.opponents);
  shots = parseMap(data.flying);
  sResources = parseMap(data.resource);
  // resource
  sResources.forEach((res, rid) => {
    let ammo = createShell(rid, res.type, res.coords.x, res.coords.y, res.rounds);
    resource.set(rid, ammo);
  });

  // Create the new tank
  // Make sure it's starting position is at least 20 pixels from the border of all walls
  let startPos = createVector(Math.floor(Math.random()*(win.width-40)+20), Math.floor(Math.random()*(win.height-40)+20));
  let startColor = color(Math.floor(Math.random()*255), Math.floor(Math.random()*255), Math.floor(Math.random()*255));
  let newTank = { x: startPos.x, y: startPos.y, heading: 0, 
    tankColor: startColor, tankid: socketID, playername: PlayerName,
    ammo: undefined
  };

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
      if (tank.ammo != undefined){
        newTankObj.pickup(createShell(tank.ammo.rid, tank.ammo.type, 
          tank.ammo.coords.x, tank.ammo.coords.y, tank.ammo.rounds));
      }
      tanks.set(id, newTankObj);
    }
  });
  return;
}

function ServerResourcePickUp(data) {
  // data is a JSON with the id of the tank that picked up the ammo and
  // the id of the picked up resource
  console.log(data);
  if (tanks.has(data.tankid)){
    let old = tanks.get(data.tankid).pickup(resource.get(data.rid)); // pickup
    resource.delete(data.rid); // remove from list
    // drop
    // only the tank doing the drop emits this
    if (data.tankid == mytankid && old != undefined){
      // old is ejected in a direction away from user
      let dropsite = p5.Vector.fromAngle(tanks.get(mytankid).heading + Math.PI);
      dropsite.mult(6);
      old.pos.add(dropsite);
      let dropped = {
        "rid": old.rid,
        "type": old.name[0],
        "coords": {"x": old.pos.x, "y": old.pos.y},
        "rounds": old.rounds
      };
      socket.emit("ClientResourceDropped", dropped)
    }
  }
}

/**
 * tells all clients to add this resource to the field resources.
 * @param {JSON} data the resource that was dropped.
 */
function ServerResourceDropped(data){
  resource.set(data.rid, createShell(data.rid, data.type, data.coords.x, 
    data.coords.y, data.rounds));
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
    shots.set(data.shotid,
      createRound(data.type, data.tankid, data.id, createVector(data.x, data.y),
        data.angle)); 
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