import express, { Request, Response, NextFunction } from "express";
import auth from "./middleware/auth";
import userRoute from "./routes/user.routes";
import memberRoute from "./routes/member.routes";
import db from "./models";
import cors from "cors"; // Importing cors directly
const jwt = require('jsonwebtoken')
const bodyParser = require("body-parser");
const { swaggerServe, swaggerSetup } = require("./config/config");
const cron = require('node-cron');


const app = express();

app.use(cors()); // Enable CORS for all routes

// Handle preflight requests
app.options("*", cors());

app.use(bodyParser.json({ limit: "100mb" }));
app.use(bodyParser.urlencoded({ limit: "100mb", extended: true }));
app.use(bodyParser.text({ limit: "100mb" }));
// Static file serving
app.use("/profile", express.static(__dirname + "/profile"));
app.use("/productimage", express.static(__dirname + "/productimage"));
app.use("/productvideo", express.static(__dirname + "/productvideo"));
app.use("/kyc", express.static(__dirname + "/kyc"));


app.use(express.static("resources"));

// API routes
app.use("/api/v1/auth", userRoute);
app.use("/api/v1/member", auth, memberRoute);
app.use("/verify", swaggerSetup);
app.use("/api-docs", swaggerServe, swaggerSetup);

// Welcome endpoint
const port = process.env.PORT || 4000;
app.get("/api/v1/welcome", (req, res) => {
  res.status(200).send({
    message: `http://locslhost:4000/api-docs`,
    data: {
      active: true,
    },
  });
});


app.get('/api/v1/verify', async (req, res: Response) => {
  // Get the token from the query parameters
  //  const email = (req as any).user?.email;
  try {
    const token = req.query.token
    const decode = jwt.decode(token);

    const email = decode.email

    const insert = await db.users.update({
      email,
      active: true,
    }, {
      where: {
        email
      }
    });

    res.status(200).send(`verification success for ${email}`);
  } catch (error) {
    res.status(400).send(
      `Internal server error`
    );
  }

});
// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const status = err.status || 500;
  res.status(status).json({ error: { message: err.message } }); // Send error message instead of the entire error object
});

// Database synchronization and server startup
db.sequelize.sync().then(() => {
  app.listen(port, async () => {
    console.log(`App Started on port ${port}`);
    cron.schedule('*/5 * * * * *', () => {
      console.log('running a task every minute');
    });
  });
});
