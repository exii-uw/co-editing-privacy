import queryString from 'query-string';
import { diffChars } from 'diff';
import Logger from '../commons/Logger';
import Queue from './Queue';
import Cookies from 'js-cookie';
import 'normalize.css/normalize.css';
import './index.css';
import { END_POINTS } from '../commons/constants';

var requireContextJpg = require.context("../../assets/images", true, /^\.\/.*\.jpg$/);
var requireContextPng = require.context("../../assets/icons", true, /^\.\/.*\.png$/);
requireContextJpg.keys().map(requireContextJpg);
requireContextPng.keys().map(requireContextPng);

const getURL = file => `${END_POINTS.api}/${file}`;

let {
  practice
} = queryString.parse(window.location.search, {parseBooleans: true});

//console.log(practice);

let runId;
let trialNum;

let delayStrategy = '' // immediacy, time, characters, sentence, manual
let revealStrategy = ''; // fullTyping, perfectTyping, paste - if delay is control, overwrite these values
let init = false;

// TODO: change this to some believeable text, randomize for each condition
let observerText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'
var observerIndex = 0;

let image = document.getElementById("image");
let revealButton = document.getElementById('revealButton');
let imageIconC = document.getElementById('iconC');

// log
let startLogging = false;
let logger;
const ongoingPromises = [];

class stringCursor{
  constructor(string, cursorStart, cursorEnd) {
    this.string = string;
    this.cursorStart = cursorStart;
    this.cursorEnd = cursorEnd;
  }
}

let peekText = new stringCursor("", 0, 0);
let WriterText = new stringCursor("", 0, 0);

// -------------------------------------
// select methods
// -------------------------------------
// Apply the strategy
let timerId = 0;
let characterDelay = false;
function applyStrategy(delaySelect, revealSelect){
  console.log('apply strategy');

  delayStrategy = delaySelect;
  revealStrategy = revealSelect;

  // check the character bar
  if(characterDelay){
    characterbar.style.visibility="hidden";
    characterDelay = false;
  }

  // character bar if the delay is character
  if (delayStrategy === 'characters'){
    characterbar.style.visibility="visible";
    let text = writerView.value.split("\n\n\t")[0];
    var charCount = text.length;
    let charCountRemain = charCount % charInterval;
    characterCounts.style.width= (100 - charCountRemain * 100 / charInterval) + "%";
    characterDelay= true;
  }

  // check the timer, clear it if it's already there
  if(timerId){
    clearInterval(timerId);
    timerId = 0;
    invisibleProgressbar('timeIntervalBar');
  }

  // timer if the delay is time - run every Xs.
  if (delayStrategy === 'time'){
    timerId = setInterval(() =>{
      console.log("Time passed! Revealing text...");
      let processList = stringList.splice(0, stringList.length);
      updateVis();
      reveal(processList);
      createProgressbar('timeIntervalBar', numSecondsString);
    }, 1000* numSeconds);
    createProgressbar('timeIntervalBar', numSecondsString);
  }

  // disable reveal button
  if (delayStrategy !== 'manual'){
    revealButton.style.visibility="hidden";
  }
  else{
    revealButton.style.visibility="visible";
  }
}


const getUpdate = data => ({
  type: 'Update',
  texts: data,
});

const getEvent = (input, start, end) => ({
  type: 'Event',
  key: input,
  cursorStart: start,
  cursorEnd: end,
});

//const keyList = [];
let curiousCursorLocation = 0;
const stringList = [];
let isUpdating = false;
let isTyping = false;
const queue = Queue();
let previousString = "";

// Text areas
let peekView = document.getElementById('peek');
let writerView = document.getElementById('writer');
let observerView = document.getElementById('observer');
let writerBackdrop = document.getElementById('writerBD');
let writerHighlight = document.getElementById('writerHL');
let peekBackdrop = document.getElementById('peekBD');
let peekHighlight = document.getElementById('peekHL');

let title = document.getElementById('title');
let strategy = document.getElementById('strategy');

// POST request to the server to set the experiment variables
if (practice !== true){
  console.log("Not practice! Getting experiment condition...");
  fetch(getURL('experiment'), {method: 'POST', headers: {'Content-Type': 'application/json'}})
  .then(res => {
    if (res.ok)     
      return res.json();
    else
      throw new Error ('Request failed!');
  })
  .then(json => {     
    runId = json.id;
    trialNum = json.trialNum;
    delayStrategy = json.delayStrategy;
    revealStrategy = json.revealStrategy;
    let imageFile = json.image;
    image.src = json.image;
    observerText = json.paragraph;
    //console.log(json);
    logger = Logger({
      defaults: {
        runId,
        trialNum,        
        delayStrategy,
        revealStrategy,        
        imageFile,
      },
    })
    startLogging = true;

    title.innerHTML = "<b>Trial " + parseInt(trialNum/2+1) + "/ 22.</b>"

    applyStrategy(delayStrategy, revealStrategy);
    let rad = document.strategyForm.strtegies;
    let condition = delayStrategy + "_" + revealStrategy;
    for (let i = 0; i < rad.length; i++) {  
      if(rad[i].value === condition){
        rad[i].checked = true;
        strategy.innerText = rad[i].nextSibling.data+".";
      }
      rad[i].disabled = true;
    }
    document.strategyForm.style.visibility = "hidden";

    // check cookie
    if (Cookies.get('observerIndex') !== undefined) {
      observerIndex = parseInt(Cookies.get('observerIndex'));
      //console.log(observerIndex);
    }
    if (Cookies.get('writerText') !== undefined) {
      WriterText = new stringCursor(Cookies.get('writerText'), 0, 0);
      queue.enqueue(WriterText);
      previousString = WriterText.string;
      changeWriting();
      typing();
    }    
    init = true;

    // Sending the start with timestamp
    var payload = {text: '', cursorStart: 0, cursorEnd: 0, type: 'click', timestamp: Date.now()};
    fetch(getURL('fullWriterUpdate'), {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)})
      .then(res => {
      })
      .catch(error => {
        // console.log(error);
      });
    observerTyping();
  })
  .catch(error => {
    //console.log(error);
  });
}
else{
  title.innerHTML = "<b>Practice</b>"
  image.src = "assets/images/26a.jpg";
  let rad = document.strategyForm.strtegies;
  rad[0].checked = true;
  applyStrategy("immediacy", "fullTyping");
  for (let i = 0; i < rad.length; i++) {  
    rad[i].addEventListener('change', function() {
        //console.log(this.value)
        let conditions = this.value.split("_");
        applyStrategy(conditions[0], conditions[1]);
    });
  }
  // check cookie
  if (Cookies.get('observerIndex') !== undefined) {
    observerIndex = parseInt(Cookies.get('observerIndex'));
    //console.log(observerIndex);
  }
  if (Cookies.get('writerText') !== undefined) {
    WriterText = new stringCursor(Cookies.get('writerText'), 0, 0);
    queue.enqueue(WriterText);
    previousString = WriterText.string;
    changeWriting();
    typing();
  }    
  init = true;
  observerTyping();
}

// Hidden observer text field - on change update the shared view to get the typing effect
function changePeeking(){
  if(isTyping){
    peekView.value = peekText.string + ' ......\n\n\t' + observerView.value;
    let highlightedText = applyHighlights(peekText.string, peekText.cursorStart, peekText.cursorEnd, "shared") + ' ......\n\n\t'
      + applyHighlights(observerView.value, observerView.value.length, observerView.value.length, "observer");
      peekHighlight.innerHTML = highlightedText;
  }
  else{
    peekView.value = peekText.string + '\n\n\t' + observerView.value ;
    let highlightedText = applyHighlights(peekText.string, peekText.cursorStart, peekText.cursorEnd, "shared") + '\n\n\t'
      + applyHighlights(observerView.value, observerView.value.length, observerView.value.length, "observer");
    peekHighlight.innerHTML = highlightedText;
  } 

  // // Sending the full writerView to the server with every keystroke
  // var payload = {string: peekView.value, timestamp: Date.now()};
  // fetch(getURL('fullPeekingUpdate'), {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)})
  //   .then(res => {
  //   })
  //   .catch(error => {
  //     // console.log(error);
  //   });
}

function changeWriting(){
  writerView.value = WriterText.string + '\n\n\t' + observerView.value;
  let highlightedText = applyHighlights(WriterText.string, WriterText.cursorStart, WriterText.cursorEnd, "writer") + '\n\n\t'
    + applyHighlights(observerView.value, observerView.value.length, observerView.value.length, "observer");
  writerHighlight.innerHTML = highlightedText;
  writerView.setSelectionRange(WriterText.cursorStart, WriterText.cursorEnd);

  // // Sending the full writerView to the server with every keystroke
  // var payload = {string: writerView.value, timestamp: Date.now()};
  // fetch(getURL('fullWriterUpdate'), {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)})
  //   .then(res => {
  //   })
  //   .catch(error => {
  //     // console.log(error);
  //   });
}

observerView.addEventListener('change', function() {
  changePeeking();
  changeWriting();

  var payload = {string: observerView.value, timestamp: Date.now()};
  fetch(getURL('fullPeekingUpdate'), {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)})
    .then(res => {
    })
    .catch(error => {
      // console.log(error);
  });
});

let charInterval = 15; // TODO: finalize this
let wordInterval = 2; // TODO: finalize this


function typing(){
  if (!queue.isEmpty()){
    isUpdating = true;
    checkIndicator();

    peekText = JSON.parse(JSON.stringify(queue.dequeue()));

    if(curiousCursorLocation > peekText.string.length){
      curiousCursorLocation = peekText.string.length;
    }

    changePeeking();

    // TODO: play with these settings to make the typing realistic
    var speed = Math.round((Math.random() * (1000-300) + 100));
    setTimeout(typing, speed);
  }
  else{
    isUpdating = false;
    checkIndicator();
  }
}

function addIndicator(){
  peekView.value = peekText.string + ' ......\n\n\t' 
    + observerView.value;

  let highlightedText = applyHighlights(peekText.string, peekText.cursorStart, peekText.cursorEnd, "shared") + ' ......\n\n\t'
    + applyHighlights(observerView.value, observerView.value.length, observerView.value.length, "observer");
  peekHighlight.innerHTML = highlightedText;
}

function removeIndicator(){
  peekView.value = peekText.string + '\n\n\t' + observerView.value;

  let highlightedText = applyHighlights(peekText.string, peekText.cursorStart, peekText.cursorEnd, "shared") + '\n\n\t'
    + applyHighlights(observerView.value, observerView.value.length, observerView.value.length, "observer");
    peekHighlight.innerHTML = highlightedText;
}

function reveal(list, logUpdate = true, theEnd = false) {
  if(!theEnd){
    list.forEach(function(item, index){
      if(revealStrategy === 'fullTyping'){
        queue.enqueue(JSON.parse(JSON.stringify(item)));
      }
      if(index + 1 === list.length){
        if(revealStrategy === 'perfectTyping'){
          // find the difference
          //console.log(previousString);
          //console.log( item.string);
          const diff = diffChars(previousString, item.string);
          let prevIdx = 0;
          let modifiedString = previousString;
          previousString = item.string;
          // loop through the difference and update the previous string 
          diff.forEach((part) => {
            if(part.added){
              for (let i = 0; i < part.value.length; i++) {
                modifiedString = modifiedString.slice(0, prevIdx) + part.value[i] + modifiedString.slice(prevIdx, modifiedString.length);
                prevIdx ++;
                queue.enqueue(new stringCursor(modifiedString, prevIdx, prevIdx));
              }     
            }
            else if(part.removed){
              if(part.value.length !== 1){
                // select first, then delete
                queue.enqueue(new stringCursor(modifiedString, prevIdx, prevIdx + part.value.length));
              }
              modifiedString = modifiedString.slice(0, prevIdx) + modifiedString.slice(prevIdx + part.value.length, modifiedString.length);
              queue.enqueue(new stringCursor(modifiedString, prevIdx, prevIdx));
            }
            else{
              prevIdx = prevIdx + part.value.length;
              queue.enqueue(new stringCursor(modifiedString, prevIdx, prevIdx));
            }
          });
        }
        else if(revealStrategy === 'paste'){
          queue.enqueue(JSON.parse(JSON.stringify(item)));
          previousString = item.string;
        }
        else if(revealStrategy === 'fullTyping'){
          previousString = item.string;
        }
      }
    });

    typing();
  }
  else{
    list.forEach(function(item, index){
      if(index + 1 === list.length){
        previousString = item.string;
      }
    });
  }

  // store all incoming event
  if(startLogging && logUpdate){
    const newPromise = logger.log(getUpdate(previousString));
    ongoingPromises.push(newPromise);
    // send string to server
    var payload = {string: previousString};
    fetch(getURL('updateString'), {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)})
      .then(res => {
      })
      .catch(error => {
        //console.log(error);
      });
  }
}

function applyHighlights(text, cursorStart, cursorEnd, type) {
  let returnText;
  let textFix = text;//.replace(/\n$/g, '\n\n');
  if(type === "writer"){
    // only apply curious cursor
    returnText = textFix.slice(0, curiousCursorLocation) + '<span class="vC">' + textFix.slice(curiousCursorLocation, textFix.length) + '</span>';
  }
  else if(type === "observer"){
    if(cursorStart !== cursorEnd){
      // apply highlight and add cursor in the end
      returnText = textFix.slice(0, cursorStart) + '<mark>' + textFix.slice(cursorStart, cursorEnd) + '</mark><span class="vO">' + textFix.slice(cursorEnd, textFix.length) + '</span>';
    }
    else{
      returnText = textFix.slice(0, cursorStart) + '<span class="vO">' + textFix.slice(cursorStart, textFix.length) + '</span>';
    }
  }
  else{
    if(cursorStart !== cursorEnd){
      // apply highlight and add cursor in the end
      if(curiousCursorLocation < cursorStart){
        returnText = textFix.slice(0, curiousCursorLocation) + '<span class="vC">' + textFix.slice(curiousCursorLocation, cursorStart) + '</span><mark>' + textFix.slice(cursorStart, cursorEnd) + '</mark><span class="vW">' + textFix.slice(cursorEnd, textFix.length) + '</span>';
      }
      else if(curiousCursorLocation === cursorStart){
        returnText = textFix.slice(0, cursorStart) + '<span class="vC"></span>' + '<mark>' + textFix.slice(cursorStart, cursorEnd) + '</mark><span class="vW">' + textFix.slice(cursorEnd, textFix.length) + '</span>';
      }
      else if(curiousCursorLocation < cursorEnd){
        returnText = textFix.slice(0, cursorStart) + '<mark>' + textFix.slice(cursorStart, curiousCursorLocation) + '<span class="vC">' + textFix.slice(curiousCursorLocation, cursorEnd) + '</span></mark><span class="vW">' + textFix.slice(cursorEnd, textFix.length) + '</span>';
      }
      else if(curiousCursorLocation === cursorEnd){
        returnText = textFix.slice(0, cursorStart) + '<mark>' + textFix.slice(cursorStart, cursorEnd) + '</mark><span class="vC"><span class="vW">' + textFix.slice(cursorEnd, textFix.length) + '</span></span>';
      }
      else{
        returnText = textFix.slice(0, cursorStart) + '<mark>' + textFix.slice(cursorStart, cursorEnd) + '</mark></span><span class="vW">' + textFix.slice(cursorEnd, curiousCursorLocation) + '</span><span class="vC">' + textFix.slice(curiousCursorLocation, textFix.length) + '</span>';
      }
    }
    else{
      if(curiousCursorLocation < cursorStart){
        returnText = textFix.slice(0, curiousCursorLocation) + '<span class="vC">' + textFix.slice(curiousCursorLocation, cursorStart) + '</span><span class="vW">' + textFix.slice(cursorStart, textFix.length) + '</span>';
      }
      else if(curiousCursorLocation === cursorStart){
        returnText = textFix.slice(0, cursorStart) + '<span class="vC">' + '<span class="vW">' + textFix.slice(cursorStart, textFix.length) + '</span></span>';
      }
      else{
        returnText = textFix.slice(0, cursorStart) + '<span class="vW">' + textFix.slice(cursorStart, curiousCursorLocation) + '</span><span class="vC">' + textFix.slice(curiousCursorLocation, textFix.length) + '</span>';
      }
    }
  }
  return returnText;
}

function checkIndicator(){
  // status
  if(WriterText.string === previousString){
    if(isTyping){
      removeIndicator();
    }
    isTyping = false;
  }
  else{
    if(!isUpdating && !isTyping){
      addIndicator();
      isTyping = true;
    }
  }
}

function processInput(currentText, cursorStart, cursorEnd, type) {
  // Sending the full writerView to the server with every keystroke
  var payload = {text: currentText, cursorStart: cursorStart, cursorEnd: cursorEnd, type: type, timestamp: Date.now()};
  fetch(getURL('fullWriterUpdate'), {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)})
    .then(res => {
    })
    .catch(error => {
      // console.log(error);
    });

  //console.log(currentText + "," + cursorStart + "," + cursorEnd);
  let text = currentText.split("\n\n\t")[0];
  if(cursorStart > text.length){
    cursorStart = text.length;
  }
  if(cursorEnd > text.length){
    cursorEnd = text.length;
  }
  // console.log(writerView.value)
  WriterText = new stringCursor(text, cursorStart, cursorEnd);
  Cookies.set('writerText', text, { expires: 1 });
  //console.log(WriterText.string + "," + WriterText.cursorStart + "," + WriterText.cursorEnd);

  checkIndicator();

  if(type !== "selectionchange"){
    stringList.push(WriterText);
  }
  
  if(type === "input"){
    // CharCount delay
    if (delayStrategy === 'characters'){
      var charCount = text.length;
      let charCountRemain = charCount % charInterval;
      characterCounts.style.width= (100 - charCountRemain * 100 / charInterval) + "%";
      if (charCountRemain === 0){
        console.log(charInterval + " characters! Revealing text...");
        let processList = stringList.splice(0, stringList.length);
        updateVis();
        reveal(processList);
      }
    }

    // WordCount delay
    /*else if (delayStrategy === 'wordCount'){
      var words = currentText.split(' ');
      //console.log(words)
      if ((words.length-1) % wordInterval === 0 && currentText.endsWith(' ')){
        console.log(wordInterval + " words! Revealing text...");
        let processList = stringList.splice(0, stringList.length);
        reveal(processList);
      }
    }*/

    // Sentence delay
    else if (delayStrategy === 'sentence'){
      var lastChar = text.charAt(text.length-1);
      //console.log(lastChar);
      var punctuation = '.?!'; // TODO edit later to make more diverse
      if (punctuation.includes(lastChar)){
        console.log("New sentence! Revealing text...");
        let processList = stringList.splice(0, stringList.length);
        updateVis();
        reveal(processList);
      }
    }

    // Control condition - update the shared view right away
    else if (delayStrategy === 'immediacy'){
      let processList = stringList.splice(0, stringList.length);
      updateVis();
      reveal(processList);
    }
    //previousString = writerText;
  }  
  else{
    if (delayStrategy === 'immediacy'){
      let processList = stringList.splice(0, stringList.length);
      reveal(processList, false);
    }
  }
  // process personal view cursor
  changeWriting();
}

writerView.addEventListener('scroll', function(event) {
  writerBackdrop.scrollTop = writerView.scrollTop;
  writerBackdrop.scrollLeft = writerView.scrollLeft;
});

peekView.addEventListener('scroll', function(event) {
  peekBackdrop.scrollTop = peekView.scrollTop;
  peekBackdrop.scrollLeft = peekView.scrollLeft;
});

writerView.addEventListener('input', function(event) {
  processInput(writerView.value, writerView.selectionStart, writerView.selectionEnd, "input");
  //console.log("input");
});

document.addEventListener("selectionchange",  function(event) {
  
  const activeElement = document.activeElement

  // make sure this is your textarea
  if (activeElement && activeElement.id === "writer") {
    //console.log("selectionchange: " + activeElement.selectionStart + "," + activeElement.selectionEnd);
    const range = {
      start: activeElement.selectionStart,
      end: activeElement.selectionEnd
    }
    // do something with your range
    processInput(writerView.value, range.start, range.end, "selectionchange");
  }
});

writerView.addEventListener('keyup', function(event) {
  switch (event.key) {
    case "ArrowLeft":
    case "ArrowRight":
    case "ArrowUp":
    case "ArrowDown":
      // Up, down pressed, skip
      processInput(writerView.value, writerView.selectionStart, writerView.selectionEnd, "keyup");
      break;
    default:
      // store all incoming event
      if(startLogging){
        //console.log(event.key)
        const newPromise = logger.log(getEvent(event.key, writerView.selectionStart, writerView.selectionEnd));
        ongoingPromises.push(newPromise);
      }
      // already handled by input event
      break;
  }
  
  //console.log(event.key)  
});

writerView.addEventListener('click', event => {
  processInput(writerView.value, writerView.selectionStart, writerView.selectionEnd, "click");
  //console.log("click")
})

var numSeconds = 10; // TODO: finalize this
var numSecondsString = '10s'; // TODO: finalize this

// -------------------------------------
// Update notification
function updateVis() {
  //writerView.style.borderColor = "red";
  if(writerView.classList.contains("textareaAnimate")){
  	writerView.classList.remove('textareaAnimate');
    // magic trick to make it work...
    void writerView.offsetWidth;
  }
  writerView.classList.add('textareaAnimate');
}


// character count interval bar
let characterbar = document.getElementById("characterIntervalBar");
let characterCounts = document.getElementById("character-countdown");
characterbar.style.visibility="hidden";

// time interval bar
function createProgressbar(id, duration, callback) {
  // We select the div that we want to turn into a progressbar
  var progressbar = document.getElementById(id);
  progressbar.className = 'progressbar';

  while (progressbar.firstChild) {
    progressbar.removeChild(progressbar.firstChild);
  }

  // We create the div that changes width to show progress
  var progressbarinner = document.createElement('div');
  progressbarinner.className = 'inner';

  // Now we set the animation parameters
  progressbarinner.style.animationDuration = duration;

  // Eventually couple a callback
  //if (typeof(callback) === 'function') {
  //  progressbarinner.addEventListener('animationend', callback);
  //}

  // Append the progressbar to the main progressbardiv
  progressbar.appendChild(progressbarinner);

  // When everything is set up we start the animation
  progressbarinner.style.animationPlayState = 'running';
  progressbar.style.visibility="visible";
}

function invisibleProgressbar(id) {
  // We select the div that we want to turn into a progressbar
  var progressbar = document.getElementById(id);
  progressbar.className = 'progressbar';

  while (progressbar.firstChild) {
    progressbar.removeChild(progressbar.firstChild);
  }
  progressbar.style.visibility="hidden";
}

// Manage manually revealing when the 'Reveal' button is pressed
revealButton.addEventListener('click', function(){
  //console.log('Reveal button was clicked!');

  if (delayStrategy === 'manual'){
    console.log("Button pressed! Revealing text...");
    let processList = stringList.splice(0, stringList.length);
    updateVis();
    reveal(processList);

    // Sending the full writerView to the server with every keystroke
    var payload = {text: 'revealEvent', cursorStart: 0, cursorEnd: 0, type: 'click', timestamp: Date.now()};
    fetch(getURL('fullWriterUpdate'), {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)})
      .then(res => {
      })
      .catch(error => {
        // console.log(error);
      });
  }
});

// -------------------------------------
function observerTyping(){
  if(init){
    if (observerIndex < observerText.length){
      observerView.value = observerText.substring(0, observerIndex);
      observerView.dispatchEvent(new Event('change'));
      Cookies.set('observerIndex', observerIndex, { expires: 1 });
      // TODO: play with these settings to make the typing realistic
      var speed = Math.round((Math.random() * (1000-300) +200));
      setTimeout(observerTyping, speed);
      
      // Mimic backspaces - TODO do we want to have the observer make fake typos if the writer is in 'perfectTyping'?
      // TODO: make this timing better (more/less backspaces), add fake typos
      var rand = Math.floor(Math.random() * 30);
      if (rand === 0) // if 0, decrease the index to mimic a backspace
        observerIndex--;
      else if (rand > 2) // if 1, stay the same and if 2+, type more
        observerIndex++;
    }
  }
}

// 30-50s delay to make it a little more believeable, can change
// TODO: made this 2s delay for debugging, change before the experiment?
setTimeout(observerTyping(), 1000 * Math.random() * 2);

//-------------------------------------
// curious cursor
function curiousCursorPosition(){
  // 0 - current string length
  if(previousString.length !== 0){
    //curiousCursorLocation = Math.floor(Math.random() * previousString.length + 1 );
    curiousCursorLocation = 0
    //console.log("curiousCursorPosition: " + curiousCursorLocation + "," + previousString.length);
    setTimeout(curiousCursorPosition, 1000 * Math.random() * 10);
  }
  else{
    curiousCursorLocation = 0;
    setTimeout(curiousCursorPosition, 1000 * Math.random() * 10);
  }

  changePeeking();
}

// TODO: design the time to change location
setTimeout(curiousCursorPosition(), 1000 * Math.random() * 10);

