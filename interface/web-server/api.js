const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const respond = require('koa-respond');
const koaSend = require('koa-send');
const findRoot = require('find-root');
const fs = require('fs');
const { default: validator, ...types } = require('koa-context-validator');
const validationErrorHandlers = require('./middlewares/validation-error-handler');
const storeInjector = require('./middlewares/store-injector');
const LogCSVExportStream = require('./LogCSVExportStream');
const { assetsFilePath } = require('./config');

const RunsAPIMiddleware = (prefix, store) => {
  const router = new Router({ prefix });

  // Injects the store into the context.
  router.use(storeInjector(store));

  // Add some utility context functions (e.g. ctx.ok).
  router.use(respond());

  // Intercept validation errors.
  router.use(validationErrorHandlers());

  // Parse the body of the request.
  router.use(bodyParser());

  
  let participantID = "";
  let experimentOrder;
  let conditionIndex = -1;
  let currDelay = '';
  let currReveal = '';
  let image = '';
  let writerPlayback = [];
  let peekPlayback = [];

  // start page, go to experiment(input ID) or practice(interface)
  router.post('/entry', bodyParser(), async function (ctx, next) {
    ctx.redirect('../interface.html?practice=true');
    return next();
  });

  // push next button in the practice interface, return to entry page
  router.post('/return', bodyParser(), async function (ctx, next) {
    ctx.redirect('../start.html');
    return next();
  });

  // start experiment with participant input ID
  router.post('/start', bodyParser(), async function (ctx, next) {
    console.log('start experiment');
  
    // read the corresponding experiment file
    // the experiment file hasn't been loaded as yet - read it
    if (conditionIndex === -1){
      console.log('Loading experiment file...');
      participantID = ctx.request.body.participantID
      var filename = assetsFilePath + '/experiment_design/' + participantID + '.csv';
      experimentOrder = fs.readFileSync(filename).toString().trim().split('\r\n');
      conditionIndex += 1;
  
      ctx.redirect('../interface.html?practice=false');
      return next();
    }
    else if(participantID !== ctx.request.body.participantID){
      // participant change their ID, throw error
      console.log('mismatch participant ID');
      ctx.redirect('../end.html?ending=1');
      return next();
    }
  
    // start: already the end of experiment.
    if (conditionIndex == experimentOrder.length){
      ctx.redirect('../end.html?ending=0');
      return next();
    }
    
    // check current condition to decide which page should go
    var currCondition = experimentOrder[conditionIndex].split(/,|\r/);    
    if (currCondition[4] === 'replay'){
      console.log("Replaying the previous trial...")
      ctx.redirect('../playback.html?practice=false');
      return next();
    }
    else if (currCondition[4] === 'survey'){
      console.log("Survey page")
      ctx.redirect('../survey.html');
      return next();
    }
    else{
      ctx.redirect('../interface.html?practice=false');
      return next();
    }   
  });  
  
  // move to the next condition when the participant clicks the next button
  router.post('/next', bodyParser(), async function (ctx, next) {
    console.log('Moving to the next condition');
    // read the corresponding experiment file
    // the experiment file hasn't been loaded as yet - read it
    if (conditionIndex === -1){
      ctx.redirect('../end.html?ending=2');
      return next();
    }

    conditionIndex += 1;
    
    // already the end of experiment.
    if (conditionIndex == experimentOrder.length){
      ctx.redirect('../end.html?ending=0');
      return next();
    }
  
    // check current condition to decide which page should go
    var currCondition = experimentOrder[conditionIndex].split(/,|\r/);    
    if (currCondition[4] === 'replay'){
      console.log("Replaying the previous trial...")
      ctx.redirect('../playback.html?practice=false');
      return next();
    }
    else if (currCondition[4] === 'survey'){
      console.log("Survey page")
      ctx.redirect('../survey.html');
      return next();
    }
    else{
      ctx.redirect('../interface.html?practice=false');
      return next();
    }          
  });

  // move to the next condition when the participant clicks the next button of survey page
  /*router.post('/surveynext', bodyParser(), async function (ctx, next) {
    console.log('submit survey');

    if (conditionIndex + 1 == experimentOrder.length){
      ctx.redirect('../end.html');
      return next();
    }

    conditionIndex += 1;
    ctx.redirect('../interface.html');
    return next();            
  });

  router.post('/playbacknext', bodyParser(), async function (ctx, next) {
    console.log("Playback finished! Moving to the next condition...");
    conditionIndex += 1;
    ctx.redirect('../interface.html');
    return next();  
  });*/

  // set the experiment properties whenever the interface page is loaded
  router.post('/playbackexperiment', bodyParser(), async function (ctx, next) {
      var currCondition = experimentOrder[conditionIndex].split(/,|\r/);
      console.log(currCondition);
      currDelay = currCondition[0];
      currReveal = currCondition[1];
      image = "assets/images/" + currCondition[2];
      var textname = "assets/paragraphs/" + currCondition[3];
      text = fs.readFileSync(textname).toString();
      ctx.body ={id: participantID, trialNum: conditionIndex, delayStrategy: currDelay, revealStrategy: currReveal, image: image, paragraph: text, writerView: writerPlayback, peekingView: peekPlayback};
      return next();
    });

  // set the experiment properties whenever the interface page is loaded
  router.post('/experiment', bodyParser(), async function (ctx, next) {
    var currCondition = experimentOrder[conditionIndex].split(/,|\r/);
    console.log(currCondition);
    currDelay = currCondition[0];
    currReveal = currCondition[1];
    writerPlayback = [];
    peekPlayback = [];
    image = "assets/images/" + currCondition[2];
    var textname = "assets/paragraphs/" + currCondition[3];
    text = fs.readFileSync(textname).toString();
    ctx.body ={id: participantID, trialNum: conditionIndex, delayStrategy: currDelay, revealStrategy: currReveal, image: image, paragraph: text};
    return next();
  });

  // Set the end page
  router.post('/endpage', bodyParser(), async function (ctx, next) {
    ctx.redirect('../start.html');
    return next();
  });

  // updateString
  router.post('/updateString', bodyParser(), async function (ctx, next) {
    console.log(ctx.request.body.string);
    return next();
  });

  // Saving the full writer view for the playback
  router.post('/fullWriterUpdate', bodyParser(), async function (ctx, next) {
    writerPlayback.push(ctx.request.body);
    return next();
  });

  // Saving the full peeking view for the playback
  router.post('/fullPeekingUpdate', bodyParser(), async function (ctx, next) {
    peekPlayback.push(ctx.request.body);
    return next();
  });

  router.get('log-export', '/logs/:logType(.+)\\-logs.csv', async (ctx, next) => {
    ctx.type = 'text/csv';
    ctx.body = LogCSVExportStream(ctx.store, ctx.params.logType);
    return next();
  });

  router.post(
    'logs',
    '/logs',
    validator({
      body: types
        .object()
        .keys({
          type: types.string().required(),
          date: types.date().required(),
          runId: types.string().required(),

          // These are forbidden because the server set them up itself.
          requestIp: types.any().forbidden(),
          requestHref: types.any().forbidden(),
          requestDate: types.any().forbidden(),
          requestUserAgent: types.any().forbidden(),
          serverVersion: types.any().forbidden(),
          serverVersionHash: types.any().forbidden(),
          isServerVersionClean: types.any().forbidden(),
        })
        .unknown(),
    }),
    async (ctx, next) => {
      ctx.ok({
        logId: await ctx.store.log({
          ...ctx.request.body,
          requestIp: ctx.request.ip,
          requestHref: ctx.href,
          requestDate: new Date(),
          requestUserAgent: ctx.headers['user-agent'],
          serverVersion: ctx.app.version,
          serverVersionHash: ctx.app.versionStatus.hash,
          isServerVersionClean: [
            'deletedFiles',
            'modifiedFiles',
            'renamedFiles',
          ].every(prop => ctx.app.versionStatus[prop] === 0),
        }),
      });
      return next();
    },
  );

  return router;
};

module.exports = RunsAPIMiddleware;
