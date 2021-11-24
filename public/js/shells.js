/**
 * base class that contains the data for any kind of shell.
 */
class Shell {
    /**
     * creates a new shell with **rounds** many **type** rounds that
     * can be shot before it is empty.
     * @param {string} name the name of the shell.
     * @param {Number} rounds the amount of rounds by default.
     * @param {string} descr describes what the round does.
     */
    constructor(name, rounds, descr){
        this.name = name;
        this.rounds = rounds;
        this.descr = descr;
        this.position = createVector(0, 0); // used to know where to render it
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
         * @returns a the object contructor for the round matching this shell.
         */
        this.loadShell = function() {
            shot = [];
            switch(this.name){
                case "Split Armor Wrecker":
                    for(var i = 0; i < 3; i ++)
                        shot.push(SplitAW);
                    break;
                case "Ballistic Armor Wrecker":
                    shot.push(BallisticAW);
                    break; 
                default: // Raw Armor Wrecker
                    shot.push(RapidAW);
            }
            this.unload(); // countdown
            return shot;
        };
        /** draws this Shell object to the screen. */
        this.render = function(){
            // push drawing context
            push();
            // go to drawing point
            translate(this.pos.x, this.pos.y);
            // set color
            let color = undefined;
            let sText = "";
            if (this.name == "Split Armor Wrecker"){
                color = (0, 255, 0);
                sText = "SAW";
            }else if (this.name == "Ballistic Armor Wrecker"){
                color = (255, 0, 0);
                sText = "BAW";
            }else{ // Rapid Armor Wrecker
                color = (0, 0, 255);
                sText = "RAW";
            }
            // draw
            fill(color);
            let time = millis();
            rotateX(time / 1000);
            rotateY(time / 1234);
            sText(sText, 5, 5);
            // pop drawing context
            pop();
        }
    }
}

// predefined shells
let RAW = new Shell(
    "Rapid Armor Wrecker", 35, "Power: 2|Range: MEDIUM|Cooldown: 1s"
);
let SAW = new Shell(
    "Split Armor Wrecker", 10, "Power: 5|Range: LOW|Cooldown: 3s"
);
let BAW = new Shell(
    "Ballistic Armor Wrecker", 15, "Power: 8|Range: HIGH|Cooldown: 5s"
); 
