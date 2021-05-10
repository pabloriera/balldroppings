/*
 *  ____        _ _ ____                        _                 
 * | __ )  __ _| | |  _ \ _ __ ___  _ __  _ __ (_)_ __   __ _ ___ 
 * |  _ \ / _` | | | | | | '__/ _ \| '_ \| '_ \| | '_ \ / _` / __|
 * | |_) | (_| | | | |_| | | | (_) | |_) | |_) | | | | | (_| \__ \
 * |____/ \__,_|_|_|____/|_|  \___/| .__/| .__/|_|_| |_|\__, |___/
 *                                 |_|   |_|            |___/     
 *  by Josh Nimoy, originally written in 2003,
 *     and ported to Processing.js in 2009
 *     more info and ports at http://balldroppings.com
 */


/* const synth1 = new Tone.Synth({
    oscillator: {
        type: "amtriangle",
        harmonicity: 0.5,
        modulationType: "sine"
    },
    envelope: {
        attackCurve: "exponential",
        attack: 0.05,
        decay: 0.2,
        sustain: 0.,
        release: 1.5,
    },
    portamento: 0.05
})


const synth = new Tone.PolySynth(synth1).toDestination(); */



var notes = ['C1', 'Db1', 'D1', 'Eb1', 'E1', 'F1', 'Gb1', 'G1', 'Ab1', 'A1', 'Bb1', 'B1', 'C2', 'Db2', 'D2', 'Eb2', 'E2', 'F2', 'Gb2', 'G2', 'Ab2', 'A2', 'Bb2', 'B2', 'C3', 'Db3', 'D3', 'Eb3', 'E3', 'F3', 'Gb3', 'G3', 'Ab3', 'A3', 'Bb3', 'B3', 'C4', 'Db4', 'D4', 'Eb4', 'E4', 'F4', 'Gb4', 'G4', 'Ab4', 'A4', 'Bb4', 'B4', 'C5', 'Db5', 'D5', 'Eb5', 'E5', 'F5', 'Gb5', 'G5', 'Ab5', 'A5', 'Bb5', 'B5', 'C6', 'Db6', 'D6', 'Eb6', 'E6', 'F6', 'Gb6', 'G6', 'Ab6', 'A6', 'Bb6', 'B6', 'C7', 'Db7', 'D7', 'Eb7', 'E7', 'F7', 'Gb7', 'G7', 'Ab7', 'A7', 'Bb7', 'B7'];
var midi_output;
WebMidi.enable();
midi_output = WebMidi.outputs[0];
const poly = new Tone.PolySynth(Tone.AMSynth).toDestination();

//global variables

var mouseIsDown = false;
var lines = [];
var balls = [];
var draggable = -1;
var dragside = 0;
var ballEmitterX = 500;
var ballEmitterY = 100;
var ticks = 0;
var ballDropRate = 100;
var gravity = 0.3;
var dt = 0.1;
var sendmidi = false;
var playsynth = true;
//-------------------------------------------------------------

//class
function V3(newx, newy, newz) {

    this.x = newx;
    this.y = newy;
    this.z = newz;

    this.dot = function (vec) {
        return ((this.x * vec.x) + (this.y * vec.y) + (this.z * vec.z));
    }

    this.copyFrom = function (that) {
        this.x = that.x;
        this.y = that.y;
        this.z = that.z;
    }

    this.copyFrom = function (xx, yy, zz) {
        this.x = xx;
        this.y = yy;
        this.z = zz;
    }

    this.getRightNormal = function () {
        return new V3(this.y, -this.x, 0);
    }

    this.getLeftNormal = function () {
        return new V3(-this.y, this.x, 0);
    }

    this.normalize = function () {
        var norm = this.getLength();
        this.x /= norm;
        this.y /= norm;
        this.z /= norm;
    }

    this.getLength = function () {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    this.scaleVec = function (scalar) {
        this.x *= scalar;
        this.y *= scalar;
        this.z *= scalar;
    }

    this.minVecNew = function (vec) {
        return new V3(this.x - vec.x, this.y - vec.y, this.z - vec.z);
    }


    this.selfMul = function (a) {
        this.x *= a;
        this.y *= a;
        this.z *= a;
    }

    this.selfPlus = function (v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
    }

    this.lerpSelfTo = function (that, scale) {
        this.x += (that.x - this.x) * scale;
        this.y += (that.y - this.y) * scale;
        this.z += (that.z - this.z) * scale;
    }

}//end class

//-------------------------------------------------------------

//class
function EditLine() {
    this.x1 = 0;
    this.y1 = 0;
    this.x2 = 0;
    this.y2 = 0;

    this.diffSign = function (v1, v2) {
        if ((v1 >= 0 && v2 < 0) || (v2 >= 0 && v1 < 0)) return true;
        else return false;
    }


    this.checkAngle = function (point_x, point_y, line_x, line_y, lineVec) {
        var vec = new V3(line_x - point_x, line_y - point_y, 0);
        var vecline = new V3(0, 0, 0);
        vecline.copyFrom(lineVec.x, lineVec.y, lineVec.z);

        vecline = vecline.getRightNormal();

        vec.normalize();
        vecline.normalize();
        return vec.dot(vecline);

    }

    this.checkBallCollide = function (ball) {

        var lineLocalVec = new V3(this.x2 - this.x1, this.y2 - this.y1, 0);

        //get the angle between the ball and one end of the wall
        var angleCurrent1 = this.checkAngle(ball.x, ball.y, this.x1, this.y1, lineLocalVec);
        var angleCurrent2 = this.checkAngle(ball.x, ball.y, this.x2, this.y2, lineLocalVec);

        //lets get the angle between the ball and one end of the wall
        var angleFuture1 = this.checkAngle(ball.x + ball.velX, ball.y + ball.velY
            , this.x1, this.y1, lineLocalVec);
        var angleFuture2 = this.checkAngle(ball.x + ball.velX, ball.y + ball.velY
            , this.x2, this.y2, lineLocalVec);

        if (this.diffSign(angleCurrent1, angleFuture1) && this.diffSign(angleCurrent2, angleFuture2)) {
            var d1x = ball.x - this.x1;
            var d1y = ball.y - this.y1;
            var d2x = ball.x - this.x2;
            var d2y = ball.y - this.y2;
            var wallLength = lineLocalVec.getLength();
            if ((Math.sqrt(d1x * d1x + d1y * d1y) < wallLength) && (Math.sqrt(d2x * d2x + d2y * d2y) < wallLength)) {
                return true;
            }
            else return false;
        }
        else return false;
    }


}//end class


//-------------------------------------------------------------


//class
function Ball() {

    this.x = 0;
    this.y = 0;
    this.velX = 0;
    this.velY = 0;
    this.rad = 3;
    this.destRad = 3;

    this.step = function () {
        this.x += this.velX * dt;
        this.y += this.velY * dt;
        this.velY += gravity * dt;
        this.rad += (this.destRad - this.rad) * 0.1;
    }

    this.bounce = function (x1, y1, x2, y2) {

        //Thank you to Theo Watson for helping me out here.
        //V
        var v = new V3(this.velX, this.velY, 0);

        //N
        var n = new V3(x2 - x1, y2 - y1, 0);
        n = n.getLeftNormal();
        n.normalize();

        //2 * V [dot] N
        var dotVec = v.dot(n) * 2;

        // ( 2 * V [dot] N ) N
        n.scaleVec(dotVec);

        //V - ( 2 * V [dot] N ) N
        //change direction
        var mvn = v.minVecNew(n);
        this.velX = mvn.x;
        this.velY = mvn.y;

        //enlarge the ball

        this.rad = Math.sqrt(this.velX * this.velX +
            this.velY * this.velY);

        //play a sound

        var vel = this.rad;

        if (vel > 39) vel = 39;//don't blow the array
        if (vel < 0) vel = 0;

        if (playsynth)
            poly.triggerAttackRelease(vel * 60 + -10, 0.05)
        // console.log(notes, Math.round(vel))

        if (sendmidi)
            WebMidi.outputs[0].playNote(notes[Math.round(vel) + 10], 1, { duration: 100, velocity: 0.8 });


    }
}//end class


//-------------------------------------------------------------


window.onload = function () {

    //make a Processing.js instance
    var p = Processing("canvasElement");

    p.setup = function () {
        this.size(window.innerWidth, window.innerHeight - 100);
    };


    p.mousePressed = function (e) {
        if (p.mouseButton == 1) {
            mouseIsDown = true;

            //checking for dragging old line
            var foundOne = false;
            for (var i = 0; i < lines.length; i++) {
                if (this.dist(lines[i].x1, lines[i].y1, p.mouseX, p.mouseY) < 6) {
                    foundOne = true;
                    draggable = i;
                    dragside = 0;
                    break;
                }

                if (this.dist(lines[i].x2, lines[i].y2, p.mouseX, p.mouseY) < 6) {
                    foundOne = true;
                    draggable = i;
                    dragside = 1;
                    break;
                }
            }


            if (!foundOne) {
                var newLine = new EditLine();
                newLine.x1 = p.mouseX;
                newLine.y1 = p.mouseY;
                newLine.x2 = p.mouseX;
                newLine.y2 = p.mouseY;
                lines.push(newLine);
            }

        }

        if (p.mouseButton == 3) {

            ballEmitterX = p.mouseX;
            ballEmitterY = p.mouseY;
        }


    };

    p.mouseReleased = function () {
        if (p.mouseButton == 1) {

            mouseIsDown = false;
            draggable = -1;
        }

    };



    p.draw = function () {

        //STEP

        //drawing a line
        if (mouseIsDown) {
            if (draggable == -1) {
                lines[lines.length - 1].x2 = p.mouseX;
                lines[lines.length - 1].y2 = p.mouseY;
            } else {
                if (dragside) {
                    lines[draggable].x2 = p.mouseX;
                    lines[draggable].y2 = p.mouseY;
                } else {
                    lines[draggable].x1 = p.mouseX;
                    lines[draggable].y1 = p.mouseY;
                }
            }
        }

        //step balls
        for (var i = 0; i < balls.length; i++) {
            balls[i].step();
        }

        //step lines
        for (var i = 0; i < lines.length; i++) {
            for (var j = 0; j < balls.length; j++) {
                if (lines[i].checkBallCollide(balls[j])) {
                    balls[j].bounce(lines[i].x1, lines[i].y1,
                        lines[i].x2, lines[i].y2);
                }
            }
        }

        //new balls
        if (ticks % ballDropRate == 0) {
            var newball = new Ball();
            newball.x = ballEmitterX;
            newball.y = ballEmitterY;
            balls.push(newball);
        }

        //old balls
        if (balls.length > 0) {
            if (balls[0].y > window.innerHeight) {
                balls.shift();
            }
        }


        //DRAW
        this.background(0);

        //draw lines
        this.stroke(255);
        for (var i = 0; i < lines.length; i++) {
            this.line(lines[i].x1, lines[i].y1,
                lines[i].x2, lines[i].y2);
        }

        //draw ends?
        this.fill(255);
        this.noStroke();
        for (var i = 0; i < lines.length; i++) {

            if (this.dist(lines[i].x1, lines[i].y1, p.mouseX, p.mouseY) < 6) {
                this.rect(lines[i].x1 - 3, lines[i].y1 - 3, 6, 6);
            }

            if (this.dist(lines[i].x2, lines[i].y2, p.mouseX, p.mouseY) < 6) {
                this.rect(lines[i].x2 - 3, lines[i].y2 - 3, 6, 6);
            }

        }

        //draw emmiter
        this.stroke(100);
        this.noFill();
        this.ellipse(ballEmitterX, ballEmitterY, 12, 12);

        //draw balls
        this.fill(255);
        this.noStroke();
        for (var i = 0; i < balls.length; i++) {
            this.ellipse(balls[i].x, balls[i].y,
                balls[i].rad * 2, balls[i].rad * 2);
        }


        ticks++;
    };

    //keep the canvas element the same size as the window
    this.resize = function () {
        p.size(window.innerWidth, window.innerHeight - 100);
    }

    //start processing.js
    p.init();

    // load data if hash is set
    if (window.location.hash.length > 1) {
        loadStateFromURL();
    }
};

window.onresize = function () {
    this.resize();
}


//-------------------------------------------------------------

//reset button
function reset(keepLocationHash) {

    if (!keepLocationHash)
        window.location.hash = '';

    lines = [];
    balls = [];
    ballDropRate = 100;
    gravity = 0.3;
}


//-------------------------------------------------------------

// data
function getState() {
    return {
        ballEmitterX: ballEmitterX,
        ballEmitterY: ballEmitterY,
        lines: lines,
        ballDropRate: ballDropRate,
        gravity: gravity
    }
}

function saveState() {
    window.location.hash = window.btoa(JSON.stringify(getState()));
    return true;
}

function loadStateFromURL() {
    reset(true);
    var data = {};
    try {
        data = JSON.parse(window.atob(window.location.hash.substr(1)));
    } catch (e) {
        return false;
    }
    for (i in data.lines) {
        var newLine = new EditLine();
        newLine.x1 = data.lines[i].x1;
        newLine.x2 = data.lines[i].x2;
        newLine.y1 = data.lines[i].y1;
        newLine.y2 = data.lines[i].y2;
        lines.push(newLine);
    }
    gravity = data.gravity;
    ballEmitterX = data.ballEmitterX;
    ballEmitterY = data.ballEmitterY;
    ballDropRate = data.ballDropRate;
    return true;
}
