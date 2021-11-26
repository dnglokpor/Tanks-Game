/**
 * models any round. provides base property fields.
 */
class BaseRound {
    /**
     * basic requirements of any round.
     * @param {string} tankid the id of the tank that shot this.
     * @param {Number} idx the idx of the round (from the shell).
     * @param {Vector} spos the starting position of the round.
     * @param {*} angle the angle at which it was fired.
     * @param {Number} power the damage done by this round.
     * @param {Number} speed the speed of this round.
     * @param {Number} range the range of travel attainable.
     * @param {Number} cd the delay between two shots.
     * @param {*} color the color of this round.
    */
    constructor(tankid, idx, spos, angle, power, speed, range, cd, color) {
        this.shotid = tankid + '>' + idx.toString();
        this.initPos = createVector(spos.x, spos.y);
        this.pos = createVector(spos.x, spos.y);
        this.flying = true;
        this.heading = angle;
        this.vel = p5.Vector.fromAngle(angle);
        this.vel.mult(speed);
        this.power = power;
        this.range = range;
        this.cd = cd;
        this.color = color;

        /**
         * @returns the ID of the tank that shot this shell.
         */
        this.getTankID = function() {
            return this.shotid.split('>')[0];
        };
        /**
         * @returns the ID of the round from its shell.
         */
         this.getID = function() {
            return this.shotid.split('>')[1];
        };
        /**
         * @returns the cooldown time of the tank. cooldown is in seconds.
         */
         this.getCD = function() {
            return this.cd;
        };
        /**
         * @returns a json object allowing to clone this round.
         */
        this.jsonize = function(){
            return {
                "tankid": this.getTankID(),
                "id": this.getID(),
                "x": this.pos.x, "y": this.pos.y,
                "heading": this.heading
            };
        };

        // compute current position
        this.update = function () {
            this.pos.add(this.vel);
            this.flying = this.pos.dist(this.initPos) < this.range ? true : false;
        };

        // Render the shot to the screen
        this.render = function () {
            push();
            translate(this.pos.x, this.pos.y);
            rotate(this.heading + PI / 2);
            stroke(255);
            fill(this.color);
            strokeWeight(1);
            triangle(
                this.pos.x - 6, this.pos.y - 3,
                this.pos.x - 6, this.pos.y + 3,
                this.pos.x + 6, this.pos.y
            );
            pop();
        };

        /**
         * checks if this instance is now off the screen.
         * @returns a boolean **true** if it is offscreen; **false** else.
         */
        this.offscreen = function () {
            if (this.pos.x > width || this.pos.x < 0 || this.pos.y > height || this.pos.y < 0)
                return true;
            return false;
        };
    }
}

/**
 * this object models a quickfire low damage medium range rounds.
 * RAWs deal only 2 damage on hit but they have a good range of attack.
 */
class RapidAW extends BaseRound{
    /**
     * construct a Rapid Armor Wrecker. Requires information on the tank.
     * @param {string} tankid the id of the tank that shot this.
     * @param {Number} idx the idx of the round (from the shell).
     * @param {Vector} spos the starting position of the round.
     * @param {*} angle the angle at which it was fired.
    */
    constructor(tankid, idx, spos, angle) {
        super(
            tankid, idx, spos, angle, 2, 4, 500, 1, color(0, 0, 255) // Red
        );
    }
}

/**
 * this object models round that doesn't travel far but can do serious
 * damage. it cannot be rafaled thought.
 */
 class SplitAW extends BaseRound{
    /**
     * construct a Split Armor Wrecker. Requires information on the tank.
     * @param {string} tankid the id of the tank that shot this.
     * @param {Number} idx the idx of the round (from the shell).
     * @param {Vector} spos the starting position of the round.
     * @param {*} angle the angle at which it was fired.
    */
    constructor(tankid, idx, spos, angle) {
        super(
            tankid, idx, spos, angle, 5, 3, 300, 3, color(0, 255, 0) // Red
        );
    }
}

/**
 * ballistic rounds are able to travel quickly over really long distances.
 * but they also deal tremendous amount of damage. but it takes a long.
 * time to shoot them.
 */
 class BallisticAW extends BaseRound{
    /**
     * construct a Split Armor Wrecker. Requires information on the tank.
     * @param {string} tankid the id of the tank that shot this.
     * @param {Number} idx the idx of the round (from the shell).
     * @param {Vector} spos the starting position of the round.
     * @param {*} angle the angle at which it was fired.
    */
    constructor(tankid, idx, spos, angle) {
        super(
            tankid, idx, spos, angle, 8, 5, 700, 5, color(255, 0, 0) // Red
        );
    }
}