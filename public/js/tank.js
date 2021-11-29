
var tankWidth = 20;
var tankHeight = 30;

// A Tank Class
class Tank {
  /**
  * construct a Tank model object with all the information it needs.
  * @param {Vector} startPos a vector that gives current 2D position.
  * @param {*} tankColor a color object for the tanks texture.
  * @param {string} newtankid the unique id of the tank.
  * @param {string} playerName the name of a player that controls this tank.
  */
  constructor(startPos, tankColor, newtankid, playerName) {
    this.on = true; // conection status
    this.tankid = newtankid;
    this.playerName = playerName;
    this.pos = startPos.copy();
    this.r = 20;
    this.heading = 0;
    this.rotation = 0;
    this.vel = createVector(0, 0);
    this.destroyed = false;
    this.tankColor = tankColor;
    this.health = 10; // hp
    this.ammo = undefined; // bullets
    this.nextShot = Date.now(); // for cooldown purposes

    /**
     * update the **nextShot** attribute of this tank.
     * @param {Number} cdtime the time it will take for the canon to cool.
     */
    this.cool = function(cdtime){
      this.nextShot = cdtime;
    };
    /**
     * @returns true if the tank has is in cooldown.
     */
     this.isCooling = function () {
      return Date.now() <= this.nextShot;
    };
    /**
     * @returns true if the tank has ammo and is not in cooldown.
     */
    this.canShoot = function () {
      return this.ammo != undefined  && this.ammo.rounds > 0 && !this.isCooling();
    };

    // Render - to render the tank to the screen
    this.render = function () {
      push();
      translate(this.pos.x, this.pos.y);
      rotate(this.heading + PI / 2);

      if (this.destroyed) {
        // Show destroyed tank
        fill('red');
        ellipse(0, 0, 40, 40);
      }
      else { // Draw Tank
        if (this.tankid == mytankid)
          stroke('white');

        else
          stroke('gray');
        strokeWeight(2);
        fill(this.tankColor);
        rect(0, 0, tankWidth, tankHeight);
        ellipse(0, -3, 14, 18);
        rect(0, -20, 4, 20);
        strokeWeight(6);
        point(0, 0);
      }
      pop();

      push();
      translate(this.pos.x, this.pos.y);
      fill(this.tankColor);
      textAlign(CENTER);
      if (DEBUG && DEBUG == 1)
        text(this.tankid, 0, 30);

      else
        text(this.playerName, 0, 30);
      pop();
    };

    // Moving tank
    this.moveForward = function (a) {
      var force = p5.Vector.fromAngle(this.heading);
      force.mult(a);
      this.vel.add(force);
    };

    this.stopMotion = function () {
      this.vel.x = 0;
      this.vel.y = 0;
      this.vel.z = 0;
    };

    this.setRotation = function (a) {
      this.rotation = a;
    };

    this.turn = function () {
      this.heading += this.rotation;
    };

    // Update its forward and backward motion
    this.update = function () {
      this.pos.add(this.vel);
    };

    /**
     * set the picked up shells as the current shell to use.
     * @param {*} shells a shot object
     * @returns the old equipped shells if there was else just undefined.
     */
    this.pickup = function(shell) {
      let old = this.ammo;
      this.ammo = shell;
      this.hasAmmo = this.ammo.rounds > 0; // there are rounds in the shell
      return old; // drop the old
    }

    /**
     * reduce the armor by an amount depending on collided shell.
     * @param {*} shot the shell that collided with the tank.
     */
    this.takedamage = function(shot){
      this.health -= shot.power;
      this.health = this.health < 0 ? 0 : this.health;
      this.destroyed = this.health == 0; // destroyed when no health left
    }
  }
}