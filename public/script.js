// client-side js, loaded by index.html
// Add to this list as you consult the p5.js documentation for other functions.
/* global createCanvas, colorMode, HSB, background, ellipse, random, width, height,
   rect, line, text, rectMode, CENTER, mouseX, mouseY, io, noStroke, fill, keyCode, key, millis, stroke, strokeWeight,
   pmouseX, pmouseY, colour, clear, createGraphics, image, textSize, frameCount, createButton, ml5*/

//communication variables for 
let socket;
let sentTexts = [];
let listOfCoordinates = [];
let unsentText = "";

//mouse movement
let mouseDisp = 0;
let mouseDispTotal = 0;

//canvas width & height
const width = 1600;
const height = 600;

//colour variables
let h,s,b;

let leftBuffer;

let amountOfConnections = 0;

let startButton;
let startGame;
let button1, button2, buttonReset;
let buttonsHere = false;
let timer;
let stop;

let vote = 0; //0 = no vote, 1 = vote for 1, 2 = vote for 2

let votes = [0,0]; //so i guess votes[0] = votes for 1 and votes[1] = votes for 2

//all the models that it can draw
let models = ['cat', 'bicycle', 'octopus', 'face', 'truck', 'pineapple', 'spider', 'angel', 'butterfly', 'pig', 'garden',
  'crab', 'windmill', 'yoga', 'castle', 'ant', 'basket', 'chair', 'bridge', 'firetruck', 'flower',
  'owl', 'pig', 'skull', 'snowflake', 'sheep', 'paintbrush', 'bee',
  'backpack', 'barn','bus','cactus','calendar','couch','hand','helicopter','lighthouse',
  'passport','peas','postcard','radio','snail','stove','strawberry', 'tiger','toothpaste','toothbrush',
   'whale','tractor','squirrel','bear','book','brain','dolphin', 'eye','fan',
  'kangaroo','key','lobster','map','monkey','penguin','rabbit', 'sandwich', 'steak'];

let drawingText; // the sketchRNN name

//sketchRNN varaibles
let model;
let strokePath = null;
let oldX = 1300;
let oldY = 200;
let pen = "down";

const drawingTextX = 650;
const drawingTextYLong = 40;
const drawingTextYShort = 100;
const timerX = 560;
const timerY = 50;

//scroll properties
const sP = {
  y: null,
  spd: null
};

//scroll function that allows it to move
function mouseWheel(event) {
  sP.spd = event.delta;
}

function setup() {
  //creates the canvas and colours
  colorMode(HSB);
  createCanvas(width, height);
  background(0, 0, 75); //grey
  
  //variables to start/stop and restrict others to draw
  startGame = false;
  stop = true;
  
  //coloours for the texts
  h = random(100,360);
  s = random(100,360);
  b = random(100,360);

  leftBuffer = createGraphics(600, height);
  
  socket = io.connect("localhost:3000"); //https://friend-or-ai.glitch.me/
  //reads the socket data from these methods
  socket.on("text", newText);
  socket.on("mouse", newDrawing);
  socket.on("count", connAndDisconn);
  socket.on("stage", changeStage);
  socket.on("vote", newVote);
  
  //the print out screen for when you first join
  printOutBeginningRules();
  showStartButton();
  
  //picks the model that the person who starts the game will draw
  drawingText = pickModel();
  
  //sets the timer to 10 for the person drawing
  timer = 10;
}

function draw() {
  drawLeftBuffer();
  image(leftBuffer, 0, 0);

  start();

  if(button1){
    button1.mousePressed(voteForOne);
  }
  if(button2){
    button2.mousePressed(voteForTwo);
  }

  //if the votes add up to the # of connections
  if ((votes[0] + votes[1] >= (amountOfConnections - 1)) && (amountOfConnections > 1)){
    //clearAllDrawings();
    //socket.emit("eraseAll", {});
    fill(255);
    rect(775,175,225,100);
    fill(0);
    text("2 was the AI's drawing", 800, 200); // these only show on one person's screen
    text("Votes for 1: "+votes[0], 900, 225);
    text("Votes for 2: "+votes[1], 900, 250);
    votes[0] = 0;
    votes[1] = 0;

    buttonReset = createButton('Next Round'); // button for everyone
    buttonReset.position(900, 550);
  }

  if(buttonReset) {
    buttonReset.mousePressed(resetGame);
  }

  //speed changes y
  sP.y -= sP.spd;
  if(sP.y < -90-(sentTexts.length-1)*10){
    sP.y = -90-(sentTexts.length-1)*10
  }
  if(sP.y > 460){
    sP.y = 460
  }
  //speed slows down over time
  sP.spd /= 25;

  //All texts (displaying the array)
  for(let i = 0; i <= sentTexts.length-1; i = i + 2){
    fill(sentTexts[i + 1], 20, 50);
    rect(10, (height - 50) + i * 10 - sentTexts.length * 10 - sP.y, 500 + Math.sin(i / 10 + millis() / 800) * 5, 20);
    fill(sentTexts[i + 1],50, 100);
    text(sentTexts[i], 12, (height - 35) + i * 10 - sentTexts.length * 10 - sP.y);
  }

  //text input variables
  let msgBoxX = 10;
  let msgBoxY = (height - 50) + (mouseDisp+mouseDispTotal) / 4;
  let msgBoxWidth = 500;
  let msgBoxHeight = 30;

  fill(100, 0, 100);
  //position for msgBox
  rect(msgBoxX, msgBoxY, msgBoxWidth, msgBoxHeight);
  fill(200, 0, 50);

  text("Type your message. Hit enter to send!" + "      Number of People: " + amountOfConnections, msgBoxX + 2, msgBoxY + 4, msgBoxWidth);

  //displays next to the message if it's too long
  if(!checkLength(unsentText)){
    text("Message is too long!", 300, msgBoxY + 4, msgBoxWidth);
  }

  text(unsentText, msgBoxX + 2, msgBoxY + 17, msgBoxWidth);

  //for sketchRNN drawing
  if (strokePath != null) {
    let newX = oldX + strokePath.dx;
    let newY = oldY + strokePath.dy;
    if (pen == "down") {
      noStroke();
      stroke(0);
      strokeWeight(7);
      line(oldX, oldY, newX, newY);
      noStroke();

      let dataL = {
        x: newX,
        y: newY,
        px: oldX,
        py: oldY,
        c: 1,
        s: true
      };
      listOfCoordinates.push(dataL);
    }
    pen = strokePath.pen;
    strokePath = null;
    oldX = newX;
    oldY = newY;

    if (pen !== "end") {
      model.generate(gotSketch);
    }
  }
}

//picks the model name from the list of names
function pickModel() {
  let random = Math.floor(Math.random() * models.length);
  return models[random];
}

function printOutBeginningRules() {
  textOutBeginning("You connected: ");
  textOutBeginning("Welcome to Friend or AI!");
  textOutBeginning("This is a drawing & guessing game for your friends");
  textOutBeginning("One person will start the game and will draw on the side that they see the word on.");
  textOutBeginning("Others will guess once the timer is up to draw then others can take turns!");
  textOutBeginning("Try to trick your friends and have fun!");
  textOutBeginning("P.S. Remember to communicate in this chat room.");
}

function textOutBeginning(statement) {
  sentTexts.push(statement);
  sentTexts.push(100);
}

function showStartButton() {
  buttonsHere = false;
  startButton = createButton('Play Friend or AI?');
  startButton.position(1050, 300);
  startButton.size(150, 50);
  startButton.style("background-color","orange");
  startButton.mousePressed(begin);
}

//called when play button is pressed
function begin() {
  //only allows people to play if there are 2 people on
  if(amountOfConnections >= 2) {
    background(0, 0, 75);
    stop = true;
    startGame = true;
    socket.emit('stage', 1);
    socket.emit('stage', 3);
    //loads the image
    model = ml5.sketchRNN(drawingText, modelReady);
    startButton.remove(); 
    return startGame;
  } else {
    alert("You need at least 2 people to play! Invite your friends by sending this link! https://friend-or-ai.glitch.me/");
  }
}

//updates the status for non players
function changeStage(data) {
  if(data == 1){
    startButton.remove();
    timer == 10;
    guesserCountDown();
  } else if(data === 2) {
    buttonReset.remove();
  } else if(data === 3) {
    buttonsHere = false;
  }
}

function modelReady(){
  model.reset();
  model.generate(gotSketch);
}

function gotSketch(error, s){
  if (error){
    console.error(error);
  } else {
    strokePath = s;
  }
}
//checks the amount of connections and detects disconnections
function connAndDisconn(dataC) {
  amountOfConnections = dataC;
  sentTexts.push("Number of people: " + dataC);
  sentTexts.push(200);
}

//left chat area has a background of black
function drawLeftBuffer() {
  leftBuffer.background(0);
}

//MOUSE DRAWING
function newDrawing(dataM) {
  if(dataM.s) {
    if(dataM.x > 600){
      noStroke();
      stroke(dataM.c);
      strokeWeight(7);
      line(dataM.x, dataM.y, dataM.px, dataM.py);
      noStroke();
    }
  }

  textSize(32);
  text(dataM.d, 900, 150); // displays the text for the other screens of what it is
  text("Guess which one the AI drew?", 750, 50);
  text("1", 700, 150);
  text("2", 1200, 150);

  if(buttonsHere === false){  //only run this once as the drawing begins
    buttonsHere = true;
    button1 = createButton('ONE'); //buttons for guessing
    button2 = createButton('TWO'); //only shows when the new drawing is displayed from one screen
    button1.position(750, drawingTextYShort);
    button2.position(1250, drawingTextYShort);
  }
  textSize(12);

}

//VOTING
function newVote(data) {
  if(data == 1){
    votes[0]++;
  } else if (data == 2){
    votes[1]++;
  }
}

function voteForOne() {
  vote = 1
  votes[0]++;
  socket.emit('vote', 1);
  noMoreVoting();
}

function voteForTwo() {
  vote = 2
  votes[1]++;
  socket.emit('vote', 2);
  noMoreVoting();
}

function noMoreVoting() {
  button1.remove();
  button2.remove();
}

//MOUSE DRAGGED
function mouseDragged() {
  let dataM = {
    x: mouseX,
    y: mouseY,
    px: pmouseX,
    py: pmouseY,
    c: 0,
    s: startGame,
    d: drawingText
  };

  if(mouseX > 600  && mouseX < 1100 && startGame && stop && pmouseX > 600 && pmouseX < 1100) {
    listOfCoordinates.push(dataM);
    noStroke();
    stroke(0);
    strokeWeight(7);
    line(mouseX, mouseY, pmouseX, pmouseY);
    noStroke();
  }
}

function sendAllData() {
  listOfCoordinates.forEach(data => {
    socket.emit('mouse', data);
  });
  listOfCoordinates = [];
}

function clearAllDrawings() {
  clear();
  listOfCoordinates = [];
  background(0, 0, 75); //grey
}

//TEXT
function newText(dataK) {
  if (dataK === "erase") {
    clearAllDrawings();
    return;
  }
  noStroke();
  //keep each new text in an array (store who sent it)
  sentTexts.push(dataK.text);
  sentTexts.push(dataK.c);
}

function keyPressed() {
  //checks if it was enter, if so sends text, if not doesn't do anything
  if (keyCode === 13 && check(unsentText) && checkLength(unsentText)) {

    var dataK = {
      text: unsentText,
      c: h
    };
    socket.emit("text", dataK);

    noStroke();
    fill(255);
    fill(h, s, b);

    sentTexts.push(unsentText);
    sentTexts.push(h);
    unsentText = "";

  } else if (keyCode === 8) {
    if (unsentText.length > 0) {
      unsentText = unsentText.slice(0, -1);
    }
  } else {
    if (key.length === 1) {
      unsentText = unsentText + key;
    }
  }
}

//checks if user typed something before pressing send
function check(unsentMsg) {
  return (unsentMsg === "") ? false : true;
}

//checks if user's text is longer than limit
function checkLength(txt) {
  return (txt.length < 80) ? true : false;
}

//when timer is at 0 then user cannot draw, the image is sent to everyone else
function timerCountDown() {
  if(timer === 0) {
    stop = false;
    sendAllData();
    textSize(24);
    text("Nice Drawing! Wait for your friends to guess.", drawingTextX, drawingTextYLong);
    textSize(12);
  } else {
    textSize(25);
    fill("red");
    text(timer, timerX, timerY);
    textSize(12);
    fill("grey");
  }

  if (frameCount % 60 == 0 && timer > 0) {
    timer --;
  }
}

function guesserCountDown() {
  textSize(25);
  fill("red");
  text(timer, timerX, timerY);
  textSize(12);
  fill("grey");
}

function resetGame() {
  //clear everyone's screens and resets everything
  clear();
  clearAllDrawings();

  socket.emit("eraseAll", {});
  buttonReset.remove();
  socket.emit('stage', 2);
  //clears everyone's screens including the words of drawingText and you were drawing this round
  startGame = false;
  buttonsHere = false;
  createCanvas(width, height);
  background(0, 0, 75); //grey
  startGame = false;
  stop = true;
  drawingText = pickModel();
  timer = 10;
  //resets the start button
  showStartButton();
}

function start() {
  if(startGame) {
    timerCountDown();
    textSize(32);
    text("Draw: " + drawingText, drawingTextX, drawingTextYShort);
    textSize(12);
  }
}

