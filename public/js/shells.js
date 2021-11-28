/**
 * base class that contains the data for any kind of shell.
 */
class Shell {
    /**
     * creates a new shell with **rounds** many **type** rounds that
     * can be shot before it is empty.
     * @param {Number} rid the unique ID of this shell.
     * @param {string} name the name of the shell.
     * @param {Number} rounds the amount of rounds by default.
     * @param {Number} posX the x coordinate of the shell.
     * @param {Number} posY the y coordinate of the shell.
     * @param {string} descr describes what the round does.
     */
    constructor(rid, name, rounds, posX, posY, descr){
        this.rid = rid;
        this.name = name;
        this.rounds = rounds;
        this.descr = descr;
        this.pos = createVector(0, 0); // used to know where to render it
        this.pos.x = posX;
        this.pos.y = posY;
        /**
         * creates a JSON string from this object.
         * @returns a string model of a JSON object.
         */
        this.stringify = function(){
            return JSON.stringify({
                "name": this.name, "rounds": this.rounds,
                "description": this.descr
            });
        }
        /** auto reduce the number of rounds left in the shell. */
        this.unload = function() {
            this.rounds = this.rounds-- < 0 ? 0 : this.rounds--;
        }
        /**
         * builds and return the right kind of round based on what
         * shell is equipped.
         * @param {string} tankid the id of the tank shooting.
         * @param {Vector} spos the current coords of the tank shooting.
         * @param {*} angle the direction vector of shot.
         * @returns the rounds shot in a list.
         */
        this.fireShell = function(tankid, spos, angle) {
            let shot = []; // shots to spawn
            switch(this.name){
                case "Split Armor Wrecker":
                    shot.push(new SplitAW(tankid, this.rounds, spos,
                        angle - (Math.PI/15))
                    );
                    this.unload(); // countdown
                    shot.push(new SplitAW(tankid, this.rounds, spos, angle));
                    this.unload(); // countdown
                    shot.push(new SplitAW(tankid, this.rounds, spos,
                        angle + (Math.PI/15))
                    );
                    this.unload(); // countdown
                    break;
                case "Ballistic Armor Wrecker":
                    shot.push(new BallisticAW(tankid, this.rounds, spos, angle));
                    this.unload(); // countdown
                    break; 
                default: // Raw Armor Wrecker
                    shot.push(new RapidAW(tankid, this.rounds, spos, angle));
                    this.unload(); // countdown
            }
            return shot;
        };
        
        /** 
         * draws this Shell object to the screen.
         * @param resColor a triplet indicating an RGB color.
         */
        this.render = function(resColor){
            // push drawing context
            push();
            // go to drawing point
            translate(this.pos.x, this.pos.y);
            // set text
            let sText = "";
            if (this.name == "Split Armor Wrecker"){
                sText = "SAW";
            }else if (this.name == "Ballistic Armor Wrecker"){
                sText = "BAW";
            }else{ // Rapid Armor Wrecker
                sText = "RAW";
            }
            // draw
            fill(resColor);
            rect(0, 0, 30, 20);
            fill(0);
            text(sText, -1, 2);
            // pop drawing context
            pop();
        }
    }
}
