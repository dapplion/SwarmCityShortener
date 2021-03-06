const express = require("express");
const es6Renderer = require("express-es6-template-engine");
const db = require("level")(process.env.DB_PATH || "./db");
// Utils
const getShortId = require("./utils/getShortId");
const wrapErrors = require("./utils/wrapErrors");

/**
 * This API / webserver generates and serves shortcodes for social media sharing
 *
 * Generate short link
 * ===================
 *
 * To generate a short link, the front end has to do a POST request to "/" with json data:
 * {
 *   title: `${hashtagName}: ${itemDescription} for ${swtAmount} SWT`,
 *   description: `Reply to this request for ${swtAmount} SWT, posted on hashtag ${hashtagName}`,
 *   redirectUrl: `https://swarm.city/detail/${hashtagAddress}/${itemHash}`,
 * }
 *
 * The API will reply with json:
 * {
 *   id: 'da49j0uB4umlgHSLf7n9'
 * }
 *
 * Query short link
 * ================
 *
 * Just do a regular GET request to the url ${host}/${id}, i.e. i.swarm.city/da49j0uB4umlgHSLf7n9
 * It will return an HTML with meta tags to be properly displayed in social media
 * The HTML will trigger an immediate redirect to ${redirectUrl} via the http-equiv="refresh" mechanism
 *
 */

const port = process.env.PORT || 3000;
const imageName = "demo-item.png";

// Setup app
const app = express();
app.use(express.json()); // Incoming req parser, built-in middleware
app.use(express.static("public")); // Serve static files such as images
app.engine("html", es6Renderer); // Template literal renderer
app.set("views", "views");
app.set("view engine", "html");

app.get("/", (_, res) => res.send("Swarm City shortener service"));

app.get(
  "/:id",
  wrapErrors(async (req, res) => {
    const id = req.params.id;
    const params = await db.get(id).then(JSON.parse);
    res.render("redirect", {
      locals: {
        ...params,
        imageUrl: `${req.get("host")}/${imageName}`,
        shortLinkKey: id
      }
    });
  })
);

app.post(
  "/",
  wrapErrors(async (req, res) => {
    const params = req.body;
    for (const key of ["title", "description", "redirectUrl"]) {
      if (!params[key]) throw Error(`Param ${key} must be defined`);
    }
    // The params below should be generated by the frontEnd
    // `${hashtagName}: ${itemDescription} for ${swtAmount} SWT`,
    // `Reply to this request for ${swtAmount} SWT, posted on hashtag ${hashtagName}`
    const paramsStringified = JSON.stringify({
      title: params.title,
      description: params.description,
      redirectUrl: params.redirectUrl
    });
    const id = getShortId(paramsStringified);
    await db.put(id, paramsStringified);
    res.json({ id });
  })
);

app.listen(port);
console.log(`App listening at port ${port}`);

module.exports = app; // for testing
