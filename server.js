require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const passport = require('passport');
const api = require('./api');
const router = require('./router');
const config = require('config');
const log = require('./model/log');
const utility = require('./helper/utility');
const throttle = config.get('throttle');
const limiter = require('express-rate-limit');
const i18n = require('i18n');
require('./helper/i18n').config(); // helper file

const port = process.env.PORT || 8080;
const app = express();

// helmet
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    xFrameOptions: { action: "deny" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", 'https://api.stripe.com', `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com`],
        frameSrc: ["'self'", 'https://js.stripe.com', 'https://hooks.stripe.com'],
        childSrc: ["'self'", 'https://js.stripe.com'],
        scriptSrc: ["'self'", 'https://js.stripe.com'],
        styleSrc: ["'self'", 'https://fonts.googleapis.com','https://js.stripe.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'https://*.stripe.com', `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com`, 'data:', 'blob:'],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
     }
    }
  })
);

// cors
const opts = { origin: [
  process.env.CLIENT_URL, 
  process.env.WEBSITE_URL,
  process.env.MISSION_CONTROL_CLIENT, 
  process.env.PRODUCTION_DOMAIN
]};

app.use(i18n.init)
app.use(cors(opts));
app.options('*', cors(opts));

// init passport
app.use(passport.initialize());

// config express
app.use((req, res, next) => {
  switch (req.originalUrl){

    // use raw body with stripe
    case '/api/webhook/stripe':
    next();
    break;

    default:
    express.json()(req, res, next);
    break;

  }
});

app.set('trust proxy', 1); // rate limit proxy
app.use(express.urlencoded({ extended: true }));

// api with rate limiter
app.use('/api/', limiter(throttle.api));
app.use(api);

// router (for non-react routes)
app.use(router);

// error handling
app.use(function(err, req, res, next){

  // sanitize the message sent to the client
  const rawMessage = err.raw?.message || err.message || err.sqlMessage || res.__('global.error');
  
  // sanitize the message sent to the client
  const clientMessage = utility.sanitize.error({ err, translate: res.__ });

  // log unsanitized detailed error message server-side
  console.error(err);
  log.create({ message: rawMessage, body: err, req: req });

  return res.status(500).send({ message: clientMessage, inputError: err.inputError });

});

// start server
const server = app.listen(port, async () => {

  const welcome = () => console.log(i18n.__('global.welcome'))
  welcome('de529c70-eb80-4dfb-9540-5075db7545bf')

});

module.exports = server;




