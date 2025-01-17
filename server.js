// comment added by usama
const express = require("express");
const app = express();
const { pool } = require("./app/config/db.config");
const cron = require("node-cron");
const uuidv4 = require("uuid").v4;
const axios = require("axios");
const socket = require("socket.io");
const http = require("http");
const server = http.createServer(app);

// Cron jobs
const PORT = 3020;
const bodyParser = require("body-parser");
const paypal = require("paypal-rest-sdk");

const {
  user_name_auth,
  password_auth,
  mode,
  getAccessToken,
  PaypalSandBoxUrlmV2,
  PaypalSandBoxUrl,
} = require("./app/paypal_keys");

paypal.configure({
  mode: mode, //sandbox or live
  client_id: user_name_auth,
  client_secret: password_auth,
});
require("dotenv").config();
const cors = require("cors");
const PaymentSuccess = require("./app/paymentSuccessEmail");
// redis
const redis = require("redis");
const redisClient = redis.createClient();

redisClient.on("connect", () => {
  console.log("Redis client connected");
});

redisClient.on("error", (err) => {
  console.error("Redis error:", err);
});
// Connect to Redis
redisClient.connect();
// redis functionalirty
// app.use(
//   cors({
//     methods: ["GET", "POST", "DELETE", "UPDATE", "PUT", "PATCH"],
//     origin: "*",
//   })
// );

app.use(
  cors({
    origin: "*", // Allow all origins
    methods: "*", // Allow all HTTP methods
    allowedHeaders: "*", // Allow all headers
  })
);

// Handle preflight OPTIONS requests
app.options("*", cors());
// parse requests of content-type - application/json
app.use(express.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(bodyParser.json());

//app.use(
//cors({
//  methods: ["GET", "POST", "DELETE", "UPDATE", "PUT", "PATCH"],
// })
//);

app.use("/uploads", express.static("uploads"));

app.use("/upload-image", require("./app/upload-image"));

app.use("/user", require("./app/routes/Users/customerRoute"));
app.use("/game", require("./app/routes/Games/gamesRoute"));
app.use("/feedback", require("./app/routes/Feedback/feedbackRoute"));
app.use(
  "/qr_bonus_flyer",
  require("./app/routes/QR_Bonus_Flyer/qr_bonus_flyerRoute")
);

app.use("/game_user", require("./app/routes/Game_Users/gamesUsersRoute"));
app.use(
  "/transaction_history",
  require("./app/routes/TransactionHistory/transactionHistoryRoute")
);
app.use("/contact_us", require("./app/routes/Contact_Us/contact_usRoute"));
app.use(
  "/privacy_policy",
  require("./app/routes/Privacy_Policy/privacy_policyRoute")
);

// Delete user account after 90 days
// week ago  59 is minutes 0 is hours and it takes 24 hour format
cron.schedule("59 0 * * *", async function () {
  const client = await pool.connect();
  try {
    console.log("Cron job started");
    const query =
      "DELETE FROM users WHERE deleted_user = $1 AND CURRENT_DATE - deleted_at > $2";
    const result = await pool.query(query, [true, 90]);
    console.log(`Deleted ${result.rowCount} users`);
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
  }
});
// Paypal Add Money as an game entry fee
app.post("/create_payment_paypal-db", async (req, res) => {
  const { user_id, game_id } = req.body;
  console.log(user_id);
  console.log(game_id);
  // check game id and user id
  const game_status = "completed";
  const userDataCheck = await pool.query(
    "SELECT * FROM games WHERE game_id=$1 AND game_status <> $2",
    [game_id, game_status]
  );
  if (userDataCheck.rows.length === 0) {
    console.log("zero");
    res.json({
      error: true,
      message: "Game Not Found OR Game status will be completed!",
    });
  } else {
    console.log("one");
    console.log(userDataCheck.rows[0].entry_fee);
    let entry_fee = userDataCheck.rows[0].entry_fee;
    const gameUserCheck = await pool.query(
      "SELECT * FROM game_users WHERE game_id=$1 AND user_id=$2",
      [game_id, user_id]
    );
    // let game_participants = gameUserCheck.rows.length;
    // let jackpot = parseInt(game_participants) * parseInt(entry_fee);

    if (gameUserCheck.rows.length === 0) {
      console.log("zero");
      const gameUser = await pool.query(
        "INSERT INTO game_users (game_id, user_id) VALUES ($1, $2) RETURNING *",
        [game_id, user_id]
      );
      if (gameUser.rows.length > 0) {
        console.log("Game User Added Successfully");
        // payment success
        // get payed games of user
        const playedGames = await pool.query(
          "SELECT * FROM users WHERE user_id=$1",
          [user_id]
        );
        let user_email;
        if (playedGames.rows.length > 0) {
          user_email = playedGames.rows[0].email;
          const playedGame = await pool.query(
            "UPDATE users SET played_games=$1 WHERE user_id=$2 RETURNING *",
            [parseInt(playedGames.rows[0].played_games) + parseInt(1), user_id]
          );
        }

        // const approval_url = payment.links.find(link => link.rel === 'approval_url').href;
        // email for success payment
        const date = new Date();
        const month = date.toLocaleString("default", { month: "short" });
        const day = date.getDate();
        const year = date.getFullYear();
        const dateToday = month + " " + day + "," + year;
        const subject = "Payment Successfull";

        const gameUserTotal = await pool.query(
          "SELECT * FROM game_users WHERE game_id=$1",
          [game_id]
        );
        let game_participants = gameUserTotal.rows.length;
        let jackpot = parseInt(game_participants) * parseInt(entry_fee);
        console.log("game_participants", game_participants);
        console.log("jackpot", jackpot);

        PaymentSuccess(
          user_email,
          subject,
          game_id,
          entry_fee,
          game_participants,
          jackpot,
          dateToday
        );
        res.json({
          error: false,
          data: gameUser.rows,
          message: "Game User Added Successfully",
        });
      } else {
        console.log("Game User Not Added Successfully");
      }
      // res.json({ error: false, data: gameUser.rows, message: "Game User Added Successfully" });
    } else {
      console.log("one");
      // const approval_url = payment.links.find(link => link.rel === 'approval_url').href;

      res.json({ error: true, message: "Game User Already Exist" });
    }
    // res.json({ error: true, message: "Game already exist" });
  }
});
app.post("/create_payment_paypal-db-v1", async (req, res) => {
  try {
    const { user_id, game_id } = req.body;
    console.log(user_id);
    console.log(game_id);
    let user_email;
    const userExist = await pool.query("SELECT * FROM users WHERE user_id=$1", [
      user_id,
    ]);
    if (userExist.rows.length === 0) {
      return res.json({ error: true, message: "User Not Found" });
    } else {
      user_email = userExist.rows[0].email;
    }

    // check wallet have enough money for play game or not ?
    const userWallet = await pool.query(
      "SELECT * FROM wallet WHERE user_id=$1 AND type=$2",
      [user_id, "deposit"]
    );
    console.log(userWallet);
    if (userWallet.rows.length > 0) {
      // console.log(userWallet.rows)
      let Balance = userWallet.rows[0].balance;
      console.log(Balance);
      // check game amount
      const gameAountCheck = await pool.query(
        "SELECT * FROM games WHERE game_id=$1",
        [game_id]
      );

      const restratedstatus = gameAountCheck.rows[0].restarted;
      const restarted_round = gameAountCheck.rows[0].restarted_round;
      if (gameAountCheck.rows.length > 0) {
        if (restratedstatus === true) {
          // select game users count by user id and game id
          const gameUserCheck = await pool.query(
            "SELECT * FROM game_users WHERE game_id=$1 AND user_id=$2",
            [game_id, user_id]
          );
          if (gameUserCheck.rows.length === 0) {
            console.log("zero");
            // Restarted
            let EntryFee = gameAountCheck.rows[0].entry_fee;
            console.log(EntryFee);
            if (parseFloat(Balance) < parseFloat(EntryFee)) {
              console.log("less");
              res.json({
                error: true,
                insufficientBalnace: true,
                data: [],
                message: "Insufficient Balance",
              });
            } else {
              console.log("big");
              // Charge
              const gameUser = await pool.query(
                "INSERT INTO game_users (game_id, user_id,round_no) VALUES ($1, $2,$3) RETURNING *",
                [game_id, user_id, restarted_round]
              );
              if (gameUser.rows.length > 0) {
                console.log("Game User Added Successfully");
                // Minus amount from wallet
                const wallet = await pool.query(
                  "UPDATE wallet SET balance=$1 WHERE user_id=$2 AND type=$3 RETURNING *",
                  [
                    parseFloat(Balance) - parseFloat(EntryFee),
                    user_id,
                    "deposit",
                  ]
                );
                if (wallet.rows.length > 0) {
                  console.log(" Minus amount from wallet ");
                  const entryfeecut = parseFloat(EntryFee);
                  console.log(" Minus amount from wallet ");
                  const gameTransactions = await pool.query(
                    "INSERT INTO transaction_history (user_id, amount,type,game_id) VALUES ($1, $2,$3,$4) RETURNING *",
                    [user_id, entryfeecut, "entry fees", game_id]
                  );
                  console.log(gameTransactions.rows); //     res.json({
                }

                const date = new Date();
                const month = date.toLocaleString("default", {
                  month: "short",
                });
                const day = date.getDate();
                const year = date.getFullYear();
                const dateToday = month + " " + day + "," + year;
                const subject = "Payment Successfull";

                const gameUserTotal = await pool.query(
                  "SELECT * FROM game_users WHERE game_id=$1",
                  [game_id]
                );
                let game_participants = gameUserTotal.rows.length;
                let jackpot = parseInt(game_participants) * parseInt(EntryFee);
                console.log("game_participants", game_participants);
                console.log("jackpot", jackpot);

                PaymentSuccess(
                  user_email,
                  subject,
                  game_id,
                  EntryFee,
                  game_participants,
                  jackpot,
                  dateToday
                );
                res.json({
                  error: false,
                  data: gameUser.rows,
                  message: "Game User Added Successfully",
                });
              } else {
                console.log("Game User Not Added Successfully");
                res.json({
                  error: true,
                  message: "Game User Not Added Successfully",
                });
              }
            }
          } else {
            let gameusersLength = parseInt(gameUserCheck.rows.length);
            let game_ropundd = parseInt(restarted_round) + parseInt(1);
            if (parseInt(gameusersLength) >= parseInt(game_ropundd)) {
              res.json({
                error: true,
                message: "You cant add more balls in this game",
              });
            } else {
              // Restarted
              let EntryFee = gameAountCheck.rows[0].entry_fee;
              console.log(EntryFee);
              if (parseFloat(Balance) < parseFloat(EntryFee)) {
                console.log("less");
                res.json({
                  error: true,
                  insufficientBalnace: true,
                  data: [],
                  message: "Insufficient Balance",
                });
              } else {
                console.log("big");
                // Charge
                const gameUser = await pool.query(
                  "INSERT INTO game_users (game_id, user_id,round_no) VALUES ($1, $2,$3) RETURNING *",
                  [game_id, user_id, restarted_round]
                );
                if (gameUser.rows.length > 0) {
                  console.log("Game User Added Successfully");
                  // Minus amount from wallet
                  const wallet = await pool.query(
                    "UPDATE wallet SET balance=$1 WHERE user_id=$2 AND type=$3 RETURNING *",
                    [
                      parseFloat(Balance) - parseFloat(EntryFee),
                      user_id,
                      "deposit",
                    ]
                  );
                  if (wallet.rows.length > 0) {
                    console.log(" Minus amount from wallet ");
                    const entryfeecut = parseFloat(EntryFee);
                    console.log(" Minus amount from wallet ");
                    const gameTransactions = await pool.query(
                      "INSERT INTO transaction_history (user_id, amount,type,game_id) VALUES ($1, $2,$3,$4) RETURNING *",
                      [user_id, entryfeecut, "entry fees", game_id]
                    );
                    console.log(gameTransactions.rows);
                  }

                  const date = new Date();
                  const month = date.toLocaleString("default", {
                    month: "short",
                  });
                  const day = date.getDate();
                  const year = date.getFullYear();
                  const dateToday = month + " " + day + "," + year;
                  const subject = "Payment Successfull";

                  const gameUserTotal = await pool.query(
                    "SELECT * FROM game_users WHERE game_id=$1",
                    [game_id]
                  );
                  let game_participants = gameUserTotal.rows.length;
                  let jackpot =
                    parseInt(game_participants) * parseInt(EntryFee);
                  console.log("game_participants", game_participants);
                  console.log("jackpot", jackpot);
                  console.log("user_email", user_email);

                  PaymentSuccess(
                    user_email,
                    subject,
                    game_id,
                    EntryFee,
                    game_participants,
                    jackpot,
                    dateToday
                  );
                  res.json({
                    error: false,
                    data: gameUser.rows,
                    message: "Game User Added Successfully",
                  });
                } else {
                  console.log("Game User Not Added Successfully");
                  res.json({
                    error: true,
                    message: "Game User Not Added Successfully",
                  });
                }
              }
            }
          }
          console.log("RESTRARDED");

          // end
        } else {
          let EntryFee = gameAountCheck.rows[0].entry_fee;
          console.log(EntryFee);
          if (parseFloat(Balance) < parseFloat(EntryFee)) {
            console.log("less");
            res.json({
              error: true,
              insufficientBalnace: true,
              data: [],
              message: "Insufficient Balance",
            });
          } else {
            console.log("big");
            // Charge
            const gameUserCheck = await pool.query(
              "SELECT * FROM game_users WHERE game_id=$1 AND user_id=$2",
              [game_id, user_id]
            );
            if (gameUserCheck.rows.length === 0) {
              console.log("zero");
              const gameUser = await pool.query(
                "INSERT INTO game_users (game_id, user_id,round_no) VALUES ($1, $2,$3) RETURNING *",
                [game_id, user_id, restarted_round]
              );
              if (gameUser.rows.length > 0) {
                console.log("Game User Added Successfully");
                // Minus amount from wallet
                const wallet = await pool.query(
                  "UPDATE wallet SET balance=$1 WHERE user_id=$2 AND type=$3 RETURNING *",
                  [
                    parseFloat(Balance) - parseFloat(EntryFee),
                    user_id,
                    "deposit",
                  ]
                );
                if (wallet.rows.length > 0) {
                  const entryfeecut = parseFloat(EntryFee);
                  console.log(" Minus amount from wallet ");
                  const gameTransactions = await pool.query(
                    "INSERT INTO transaction_history (user_id, amount,type,game_id) VALUES ($1, $2,$3,$4) RETURNING *",
                    [user_id, entryfeecut, "entry fees", game_id]
                  );
                  console.log(gameTransactions.rows);
                }
                // payment success
                // get payed games of user
                const playedGames = await pool.query(
                  "SELECT * FROM users WHERE user_id=$1",
                  [user_id]
                );
                // let user_email;
                if (playedGames.rows.length > 0) {
                  user_email = playedGames.rows[0].email;
                  const playedGame = await pool.query(
                    "UPDATE users SET played_games=$1 WHERE user_id=$2 RETURNING *",
                    [
                      parseInt(playedGames.rows[0].played_games) + parseInt(1),
                      user_id,
                    ]
                  );
                }

                // email for success payment
                const date = new Date();
                const month = date.toLocaleString("default", {
                  month: "short",
                });
                const day = date.getDate();
                const year = date.getFullYear();
                const dateToday = month + " " + day + "," + year;
                const subject = "Payment Successfull";

                const gameUserTotal = await pool.query(
                  "SELECT * FROM game_users WHERE game_id=$1",
                  [game_id]
                );
                let game_participants = gameUserTotal.rows.length;
                let jackpot = parseInt(game_participants) * parseInt(EntryFee);
                console.log("game_participants", game_participants);
                console.log("jackpot", jackpot);
                console.log("user_email", user_email);

                PaymentSuccess(
                  user_email,
                  subject,
                  game_id,
                  EntryFee,
                  game_participants,
                  jackpot,
                  dateToday
                );
                res.json({
                  error: false,
                  data: gameUser.rows,
                  message: "Game User Added Successfully",
                });
              } else {
                console.log("Game User Not Added Successfully");
                res.json({
                  error: true,
                  message: "Game User Not Added Successfully",
                });
              }
            } else {
              console.log("one");

              res.json({
                error: true,
                user_already_exist: true,
                message: "Game User Already Exist",
              });
            }
          }
          // end
        }
      } else {
        console.log("Error amount ");
        res.json({
          error: true,
          data: [],
          message: "Not Found Game Entry Fee",
        });
      }
    } else {
      console.log("Not Found");

      console.log(userWallet.rows);
      res.json({ error: true, data: [], message: "Not Found user Wallet" });
    }
  } catch (error) {
    console.log(error);
  }
});
// Paypal add money to wallet
app.post("/create_payment_paypal-db-wallet", async (req, res) => {
  const { user_id, amount } = req.body;
  console.log(user_id);
  console.log(amount);
  const userDataCheck = await pool.query(
    "SELECT * FROM users WHERE user_id=$1",
    [user_id]
  );

  if (userDataCheck.rows.length === 0) {
    res.json({ error: true, data: [], message: "User Not Found" });
  } else {
    // add winning_amount_single to user wallet
    const userWallet = await pool.query(
      "SELECT * FROM wallet WHERE user_id=$1",
      [user_id]
    );
    if (userWallet.rows.length > 0) {
      const wallet = await pool.query(
        "UPDATE wallet SET balance=$1 WHERE user_id=$2 AND type=$3 RETURNING *",
        [
          parseFloat(userWallet.rows[0].balance) + parseFloat(amount),
          user_id,
          "deposit",
        ]
      );
      if (wallet.rows.length > 0) {
        const type = "deposit";
        const userDataTransaction = await pool.query(
          "INSERT INTO transaction_history(user_id,amount,type) VALUES($1,$2,$3) returning *",
          [user_id, amount, type]
        );
        if (userDataTransaction.rows.length > 0) {
          console.log("wallet updated");
          res.json({
            error: false,
            wallet: wallet.rows[0],
            message: "Amount Added to Wallet Successfully",
          });
        } else {
          res.json({
            error: true,
            data: [],
            message: "Can't Update Transaction History",
          });
        }
      } else {
        res.json({ error: true, data: [], message: "Something went wrong" });
      }
    }
  }
});
// payout check
app.post("/payout-check", async (req, res) => {
  const { payoutBatchId } = req.body;
  try {
    // Obtain the access token again
    const accessToken = await getAccessToken();

    // Execute the payment
    const response = await fetch(
      `${PaypalSandBoxUrl}/payments/payouts/${payoutBatchId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        // body: JSON.stringify(response),
      }
    );

    const payment = await response.json();
    console.log("payment");

    console.log(payment);
    res.json({ error: false, payment: payment });
    // if (response.ok) {
    //   res.json({ error: false, payment: payment });
    // } else {
    //   res.json({ error: true, message: payment });
    // }
  } catch (error) {
    console.log(error);
    res.json({ error: true, message: error.message });
  }
});
// execute check
app.post("/execute-payment", async (req, res) => {
  const { paymentId, payerId } = req.body;

  try {
    // Obtain the access token again
    const accessToken = await getAccessToken();

    // Execute the payment
    const response = await fetch(
      `${PaypalSandBoxUrlmV2}/payments/payment/${paymentId}/execute`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ payer_id: payerId }),
      }
    );

    const payment = await response.json();
    console.log("payment");

    console.log(payment);
    if (response.ok) {
      res.json({ error: false, payment: payment });
    } else {
      res.json({ error: true, message: payment });
    }
  } catch (error) {
    res.json({ error: true, message: error.message });
  }
});

// end point for paypal
app.post("/pay", async (req, res) => {
  const { items, amount, description, redirect_urls, user_id, game_id } =
    req.body;
  try {
    // Obtain the access token
    const accessToken = await getAccessToken();
    const create_payment_json = {
      intent: "sale",
      payer: {
        payment_method: "paypal",
      },
      redirect_urls: redirect_urls,
      transactions: [
        {
          item_list: {
            items: items,
          },
          amount: amount,
          description: description,
        },
      ],
    };
    // Set up PayPal payment request
    const response = await fetch(`${PaypalSandBoxUrlmV2}/payments/payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(create_payment_json),
    });

    const payment = await response.json();

    if (response.ok) {
      const approval_url = payment.links.find(
        (link) => link.rel === "approval_url"
      ).href;
      res.json({ error: false, approval_url: approval_url });
    } else {
      res.json({ error: true, message: payment });
    }
    //not correct below
    // paypal.payment.create(create_payment_json, async function (error, payment) {
    //   if (error) {
    //     // throw error;
    //     res.json({ error: true, message: error });
    //   } else {
    //     console.log(payment);
    //     console.log("Create Payment JSON");

    //     console.log(create_payment_json);
    //     console.log("Create Payment Response");
    //     const approval_url = payment.links.find(
    //       (link) => link.rel === "approval_url"
    //     ).href;
    //     // const paymentID = payment.id; // Payment ID to be saved for future reference

    //     // If you want to save the user's payment method for future transactions
    //     // const payerID = payment.payer.payer_info.payer_id; // Payer ID to be saved for future reference
    //     res.json({ error: false, approval_url: approval_url });
    // }
    // });
  } catch (error) {
    console.log("error", error);
    res.json({ error: true, message: error.message });
  }
});
// withdraw amount
app.post("/payout", async (req, res) => {
  // const { amount, receiver } = req.body;
  // try {
  //   // Get an access token
  //   const {
  //     data: { access_token },
  //   } = await axios.post(API_TOKEN_REQ, null, {
  //     headers: {
  //       Accept: "application/json",
  //       "Accept-Language": "en_US",
  //       "content-type": "application/x-www-form-urlencoded",
  //     },
  //     auth: {
  //       username: user_name_auth,
  //       password: password_auth,
  //     },
  //     params: {
  //       grant_type: "client_credentials",
  //     },
  //   });
  //   // Create a payout
  //   const { data } = await axios.post(
  //     API_URL,
  //     {
  //       sender_batch_header: {
  //         email_subject: Email_Subject_Paypal,
  //       },
  //       items: [
  //         {
  //           recipient_type: "EMAIL",
  //           amount: {
  //             value: amount,
  //             currency: "USD",
  //           },
  //           receiver: receiver,
  //           note: email_note,
  //           sender_item_id: "item_1",
  //         },
  //       ],
  //     },
  //     {
  //       headers: {
  //         "Content-Type": "application/json",
  //         Authorization: `Bearer ${access_token}`,
  //       },
  //     }
  //   );
  //   res.json(data);
  // } catch (error) {
  //   console.error("Error:", error);
  //   res
  //     .status(500)
  //     .json({ error: "An error occurred while creating the payout." });
  // }
});

// Products
// make api for just say server is running when runs localhost:5000 on google
app.get("/", (req, res) => {
  const serverTime = new Date();
  res.status(200).json({ error: false, message: "Server is running" });
  console.log(
    `Hours: ${serverTime.getHours()}, Minutes: ${serverTime.getMinutes()}, Seconds: ${serverTime.getSeconds()}`
  );
});
let io;

io = socket(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});
// const connectedClients = new Set();

// global.onlineUsers = new Map();
// io.on("connection", (socket) => {
//   console.log("New client connected", socket.id);
//   connectedClients.add(socket.id);
//   if (connectedClients.has(socket.id)) {
//     // socket.join('room1');
//     // socket.on("test-message", (data) => {
//     //   console.log(data);
//     // });
//     socket.on("game-created", (data) => {
//       const userId = socket.id; // Assuming `data` includes a `userId`
//       // Implement logic to update unread messages count for the clicked contact/user.
//       console.log("game-created", data);

//       // comment
//       setTimeout(() => {
//         io.emit("received-data", data);
//         // io.to(userId).emit("received-data", data);
//         console.log("emitted received-data", data);
//       }, 1000);

//       // Once the unread messages are updated, you can emit an event to inform the client.
//     });
//     socket.on("received-data", (data) => {
//       // Implement logic to update unread messages count for the clicked contact/user.
//       console.log("received-data", data);

//       // Once the unread messages are updated, you can emit an event to inform the client.
//     });
//     // console.log("Client is connected");
//   } else {
//     console.log("Client is not connected");
//   }

//   socket.on("disconnect", () => {
//     console.log("Client disconnected", socket.id);
//     connectedClients.delete(socket.id);
//   });
// });
// make api to get romm1 users connected
// redis socket
const connectedClients = new Set();

// Explicitly connect Redis client
// (async () => {
//   try {
//     await redisClient.connect();
//     console.log("Redis client connected successfully.");
//   } catch (err) {
//     console.error("Error connecting to Redis:", err);
//   }
// })();
// io.on("connection", (socket) => {
//   console.log("New client connected:", socket.id);

//   // Handle admin creating a game
//   socket.on("game-created", async (gameData) => {
//     const { gameId, status } = gameData;

//     if (!gameId || !status) {
//       console.error("Invalid game creation data");
//       return;
//     }

//     console.log(`Game created: ${gameId} with status ${status}`);

//     // Store game in Redis
//     await redisClient.hSet(
//       `games`,
//       gameId,
//       JSON.stringify({ status, active: true })
//     );

//     // Broadcast game creation to all users
//     io.emit("game-created", gameData);
//   });

//   // User joining a game
//   socket.on("join-game", async ({ gameId, userId }) => {
//     if (!gameId || !userId) {
//       console.error("Invalid join-game request");
//       return;
//     }

//     // Check if the game is active
//     const gameData = await redisClient.hGet(`games`, gameId);
//     if (!gameData) {
//       socket.emit("error", { message: "Game does not exist" });
//       return;
//     }

//     const parsedGame = JSON.parse(gameData);
//     if (!parsedGame.active) {
//       socket.emit("error", { message: "Game is no longer active" });
//       return;
//     }

//     // Add user to the game room
//     await redisClient.sAdd(`room:${gameId}`, userId);
//     await redisClient.sAdd(`user:${userId}:games`, gameId);
//     socket.join(gameId);
//     console.log(`User ${userId} joined game: ${gameId}`);

//     // Notify others in the game room
//     socket.to(gameId).emit("user-joined", { userId, gameId });
//   });
//   // Get games for a user
//   socket.on("get-user-games", async ({ userId }) => {
//     if (!userId) {
//       socket.emit("error", { message: "Invalid userId" });
//       return;
//     }

//     // Fetch all games the user is part of
//     redisClient.sMembers(`user:${userId}:games`, (err, games) => {
//       if (err) {
//         console.error("Redis Error:", err);
//         socket.emit("error", { message: "Failed to fetch user games" });
//         return;
//       }

//       console.log(`Games for user ${userId}:`, games);
//       socket.emit("user-games", { userId, games });
//     });
//   });
//   // Admin updating game status
//   socket.on("update-game-status", async ({ gameId, status }) => {
//     if (!gameId || !status) {
//       console.error("Invalid update-game-status request");
//       return;
//     }

//     // Check if the game exists
//     const gameData = await redisClient.hGet(`games`, gameId);
//     if (!gameData) {
//       socket.emit("error", { message: "Game does not exist" });
//       return;
//     }

//     // Update game status in Redis
//     const parsedGame = JSON.parse(gameData);
//     parsedGame.status = status;

//     if (status === "result-announced") {
//       parsedGame.active = false; // Mark game as inactive
//     }

//     await redisClient.hSet(`games`, gameId, JSON.stringify(parsedGame));
//     console.log(`Game ${gameId} status updated to ${status}`);

//     // Broadcast status update to users in the game room
//     io.to(gameId).emit("game-status-updated", { gameId, status });

//     // If game is inactive, remove the room after a delay
//     if (status === "result-announced") {
//       setTimeout(async () => {
//         await redisClient.del(`room:${gameId}`);
//         console.log(`Game ${gameId} marked as inactive and room cleared.`);
//       }, 5000); // Delay before cleanup
//     }
//   });

//   // Handle user disconnect
//   socket.on("disconnect", () => {
//     console.log("Client disconnected:", socket.id);

//     // Remove user from all rooms in Redis
//     // redisClient.keys("room:*", (err, keys) => {
//     //   if (err) {
//     //     console.error("Redis Error on keys:", err);
//     //     return;
//     //   }

//     //   keys.forEach((key) => {
//     //     redisClient.srem(key, socket.id, (err, reply) => {
//     //       if (err) console.error("Redis Error on srem:", err);
//     //       else if (reply > 0) console.log(`User ${socket.id} removed from ${key}`);
//     //     });
//     //   });
//     // });
//   });
// });
// dummy check for socket

// io.on("connection", (socket) => {
//   console.log("New client connected:", socket.id);

//   // Handle admin creating a game
//   socket.on("game-created", async (gameData) => {
//     const { gameId, status } = gameData;

//     if (!gameId || !status) {
//       console.error("Invalid game creation data");
//       return;
//     }

//     console.log(`Game created: ${gameId} with status ${status}`);

//     const existingGame = await redisClient.hGet(`games`, gameId);
//     if (existingGame) {
//       console.log(`Game with ID ${gameId} already exists. Skipping creation.`);
//       return;
//     }

//     console.log(`Creating game: ${gameId} with status ${status}`);

//     await redisClient.hSet(
//       `games`,
//       gameId,
//       JSON.stringify({ status, active: true })
//     );

//     io.emit("game-created", gameData);
//     emitActiveGames(); // Emit updated active games
//   });

//   // User joining a game
//   socket.on("join-game", async ({ gameId, userId }) => {
//     if (!gameId || !userId) {
//       console.error("Invalid join-game request");
//       return;
//     }

//     // Check if the game is active
//     const gameData = await redisClient.hGet(`games`, gameId);
//     if (!gameData) {
//       socket.emit("error", { message: "Game does not exist" });
//       return;
//     }

//     const parsedGame = JSON.parse(gameData);
//     if (!parsedGame.active) {
//       socket.emit("error", { message: "Game is no longer active" });
//       return;
//     }

//     // Add user to the game room
//     await redisClient.sAdd(`room:${gameId}`, userId);
//     socket.join(gameId);
//     console.log(`User ${userId} joined game: ${gameId}`);

//     // Fetch all participants in the game
//     const participants = await redisClient.sMembers(`room:${gameId}`);
//     socket.to(gameId).emit("user-joined", { userId, gameId });
//     io.to(gameId).emit("game-participants", { gameId, participants });
//   });

//   // Get all active games
//   socket.on("get-games", async () => {
//     const games = await redisClient.hGetAll(`games`);
//     const activeGames = Object.entries(games)
//       .map(([gameId, gameData]) => ({
//         gameId,
//         ...JSON.parse(gameData),
//       }))
//       .filter((game) =>
//         ["scheduled", "waiting", "started"].includes(game.status)
//       );

//     socket.emit("active-games", activeGames);
//   });

//   // Admin updating game status
//   socket.on("update-game-status", async ({ gameId, status }) => {
//     if (!gameId || !status) {
//       console.error("Invalid update-game-status request");
//       return;
//     }

//     // Check if the game exists
//     const gameData = await redisClient.hGet(`games`, gameId);
//     if (!gameData) {
//       socket.emit("error", { message: "Game does not exist" });
//       return;
//     }

//     // Update game status in Redis
//     const parsedGame = JSON.parse(gameData);
//     parsedGame.status = status;

//     if (status === "result-announced") {
//       parsedGame.active = false; // Mark game as inactive
//     }

//     await redisClient.hSet(`games`, gameId, JSON.stringify(parsedGame));
//     console.log(`Game ${gameId} status updated to ${status}`);

//     // Broadcast status update to users in the game room
//     io.to(gameId).emit("game-status-updated", { gameId, status });

//     // Emit updated list of active games
//     // emitActiveGames();

//     // If game is inactive, clean it up from Redis
//     if (status === "result-announced") {
//       setTimeout(async () => {
//         // Delete the game from the `games` hash
//         await redisClient.hDel(`games`, gameId);

//         // Delete the room participants set
//         await redisClient.del(`room:${gameId}`);

//         console.log(`Game ${gameId} cleared from Redis.`);
//         emitActiveGames(); // Emit updated list of active games
//       }, 2000); // Delay before cleanup
//     }
//   });

//   // Emit active games to all clients
//   async function emitActiveGames() {
//     const games = await redisClient.hGetAll(`games`);
//     const activeGames = Object.entries(games)
//       .map(([gameId, gameData]) => ({
//         gameId,
//         ...JSON.parse(gameData),
//       }))
//       .filter((game) =>
//         ["scheduled", "waiting", "started"].includes(game.status)
//       );

//     io.emit("active-games", activeGames);
//   }

//   // Handle user disconnect
//   socket.on("disconnect", async () => {
//     // try {
//     //   // Iterate through all game rooms to remove the user
//     //   const keys = await redisClient.keys("room:*");
//     //   for (const key of keys) {
//     //     // Check if the user is part of the room
//     //     const isMember = await redisClient.sIsMember(key, socket.id);
//     //     if (isMember) {
//     //       await redisClient.sRem(key, socket.id); // Remove user from the room
//     //       console.log(`User ${socket.id} removed from ${key}`);
//     //     }
//     //   }
//     //   // Optionally, clean up user-specific data
//     //   const userGamesKey = `user:${socket.id}:games`;
//     //   const userGames = await redisClient.sMembers(userGamesKey);
//     //   if (userGames.length > 0) {
//     //     await redisClient.del(userGamesKey); // Remove user's game references
//     //     console.log(`Cleared game references for user ${socket.id}`);
//     //   }
//     //   // Notify other clients in the room
//     //   keys.forEach((key) => {
//     //     const gameId = key.split(":")[1];
//     //     io.to(gameId).emit("user-disconnected", { userId: socket.id, gameId });
//     //   });
//     // } catch (err) {
//     //   console.error(`Error during disconnect cleanup for ${socket.id}:`, err);
//     // }
//   });
// });
// optimized code
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  // Track online users
  // socket.on("user-connected", async ({ userId }) => {
  //   if (!userId) {
  //     console.error("No userId provided for user-connected event.");
  //     return;
  //   }

  //   try {
  //     // Store the mapping of socket.id to userId
  //     await redisClient.set(`user:${userId}:socket`, socket.id);
  //     await redisClient.set(`socket:${socket.id}`, userId);

  //     // Add the userId to the online-users set
  //     await redisClient.sAdd("online-users", userId);

  //     console.log(
  //       `User ${userId} connected and mapped to socket ${socket.id}.`
  //     );
  //     emitActiveGames();
  //   } catch (err) {
  //     console.error(`Error tracking online user ${userId}:`, err);
  //   }
  // });
  socket.on("user-connected", async ({ userId }) => {
    console.log("userId", userId);
    if (!userId) {
      console.error("No userId provided for user-connected event.");
      return;
    }

    try {
      // Remove old socket.id mapping if exists
      const previousSocketId = await redisClient.get(`user:${userId}:socket`);
      if (previousSocketId) {
        await redisClient.del(`socket:${previousSocketId}`);
      }

      // Store the mapping of socket.id to userId
      await redisClient.set(`user:${userId}:socket`, socket.id);
      await redisClient.set(`socket:${socket.id}`, userId);

      // Add the userId to the online-users set if not already present
      const isOnline = await redisClient.sIsMember("online-users", userId);
      if (!isOnline) {
        await redisClient.sAdd("online-users", userId);
      }

      console.log(
        `User ${userId} connected and mapped to socket ${socket.id}.`
      );
      emitActiveGames();
    } catch (err) {
      console.error(`Error tracking online user ${userId}:`, err);
    }
  });
  // Handle admin creating a game
  socket.on("game-created", async (gameData) => {
    const { gameId, status } = gameData;

    if (!gameId || !status) {
      console.error("Invalid game creation data");
      return;
    }

    try {
      const existingGame = await redisClient.hGet(`games`, gameId);
      if (existingGame) {
        console.log(
          `Game with ID ${gameId} already exists. Skipping creation.`
        );
        return;
      }

      await redisClient.hSet(
        `games`,
        gameId,
        JSON.stringify({ status, active: true })
      );

      console.log(`Game created: ${gameId} with status ${status}`);
      await redisClient.hSet(
        "games",
        gameId,
        JSON.stringify({ status, active: true })
      );

      // Emit to all online users
      const onlineUsers = await redisClient.sMembers("online-users");
      for (const userId of onlineUsers) {
        const socketId = await redisClient.get(`user:${userId}:socket`);
        if (socketId) {
          io.to(socketId).emit("game-created", gameData);
        }
      }

      emitActiveGames(); // Emit updated active games
    } catch (err) {
      console.error(`Error creating game ${gameId}:`, err);
    }
  });

  // User joining a game
  socket.on("join-game", async ({ gameId, userId }) => {
    if (!gameId || !userId) {
      console.error("Invalid join-game request");
      return;
    }

    try {
      const gameData = await redisClient.hGet(`games`, gameId);
      if (!gameData) {
        socket.emit("error", { message: "Game does not exist" });
        return;
      }

      const parsedGame = JSON.parse(gameData);
      if (!parsedGame.active) {
        socket.emit("error", { message: "Game is no longer active" });
        return;
      }

      await redisClient.sAdd(`room:${gameId}`, userId);
      socket.join(gameId);

      console.log(`User ${userId} joined game: ${gameId}`);

      const participants = await redisClient.sMembers(`room:${gameId}`);
      io.to(gameId).emit("game-participants", { gameId, participants });
    } catch (err) {
      console.error(`Error in join-game for ${userId} and ${gameId}:`, err);
    }
  });

  // Admin updating game status
  socket.on("update-game-status", async ({ gameId, status }) => {
    if (!gameId || !status) {
      console.error("Invalid update-game-status request");
      return;
    }

    try {
      const gameData = await redisClient.hGet(`games`, gameId);
      if (!gameData) {
        socket.emit("error", { message: "Game does not exist" });
        return;
      }

      const parsedGame = JSON.parse(gameData);
      parsedGame.status = status;

      if (status === "result-announced") {
        parsedGame.active = false;
      }

      await redisClient.hSet(`games`, gameId, JSON.stringify(parsedGame));
      console.log(`Game ${gameId} status updated to ${status}`);

      // Emit to participants of the game
      const participants = await redisClient.sMembers(`room:${gameId}`);
      console.log(participants);
      for (const userId of participants) {
        const socketId = await redisClient.get(`user:${userId}:socket`);
        console.log(socketId);
        if (socketId) {
          io.to(socketId).emit("game-status-updated", { gameId, status });
        }
      }

      if (status === "result-announced") {
        setTimeout(async () => {
          await redisClient.hDel(`games`, gameId);
          await redisClient.del(`room:${gameId}`);
          console.log(`Game ${gameId} cleared from Redis.`);
          emitActiveGames();
        }, 2000);
      }
    } catch (err) {
      console.error(`Error updating status for game ${gameId}:`, err);
    }
  });

  // Emit active games to all clients
  async function emitActiveGames() {
    try {
      const games = await redisClient.hGetAll(`games`);
      const activeGames = Object.entries(games)
        .map(([gameId, gameData]) => ({
          gameId,
          ...JSON.parse(gameData),
        }))
        .filter((game) =>
          ["scheduled", "waiting", "started"].includes(game.status)
        );

      const onlineUsers = await redisClient.sMembers("online-users");
      // onlineUsers.forEach((userId) => {
      //   io.to(userId).emit("active-games", activeGames);
      // });
      for (const userId of onlineUsers) {
        const socketId = await redisClient.get(`user:${userId}:socket`);
        if (socketId) {
          io.to(socketId).emit("active-games", activeGames);
        }
      }
    } catch (err) {
      console.error("Error emitting active games:", err);
    }
  }

  // Handle user disconnect
  // socket.on("disconnect", async () => {
  //   console.log(`Client disconnected: ${socket.id}`);

  //   try {
  //     // Retrieve userId associated with this socket.id
  //     const userId = await redisClient.get(`socket:${socket.id}`);

  //     if (userId) {
  //       // Remove userId from the online-users set
  //       await redisClient.sRem("online-users", userId);
  //       console.log(`User ${userId} removed from online users.`);
  //     }

  //     // Remove the mapping for this socket.id
  //     await redisClient.del(`socket:${socket.id}`);
  //   } catch (err) {
  //     console.error(
  //       `Error during disconnect cleanup for socket ${socket.id}:`,
  //       err
  //     );
  //   }
  // });
  socket.on("disconnect", async () => {
    console.log(`Client disconnected: ${socket.id}`);

    try {
      // Retrieve userId associated with this socket.id
      const userId = await redisClient.get(`socket:${socket.id}`);

      if (userId) {
        // Remove the mapping for this socket.id
        await redisClient.del(`socket:${socket.id}`);

        // Check if the user has any active socket connections
        const currentSocketId = await redisClient.get(`user:${userId}:socket`);
        if (currentSocketId === socket.id) {
          // Remove userId from the online-users set if this was their last connection
          await redisClient.sRem("online-users", userId);
          await redisClient.del(`user:${userId}:socket`);
          console.log(`User ${userId} removed from online users.`);
        }
      }
    } catch (err) {
      console.error(
        `Error during disconnect cleanup for socket ${socket.id}:`,
        err
      );
    }
  });
});

// end

// endf
// _________
// test code
// __________________
// io.on("connection", (socket) => {
//   connectedClients.add(socket.id);
//   console.log("A client connected:", socket.id);

//   if (connectedClients.has(socket.id)) {
//     console.log("Client is connected", socket.id);
//     // io.to(socket.id).emit("game-updated", { message });
//   }
//   // const getMessagesForRoom = async (room) => {
//   //   try {
//   //     // Get messages from Redis
//   //     const messages = await redisClient.lRange(`room:${room}:messages`, 0, -1);

//   //     if (messages.length > 0) {
//   //       // Return parsed messages from Redis
//   //       return messages.map((msg) => JSON.parse(msg));
//   //     } else {
//   //       // Fallback to database (if not in Redis)
//   //       const query =
//   //         "SELECT * FROM messages WHERE room_name = $1 ORDER BY created_at ASC";
//   //       const result = await pool.query(query, [room]);

//   //       // Cache messages in Redis
//   //       for (const msg of result.rows) {
//   //         await redisClient.rPush(`room:${room}:messages`, JSON.stringify(msg));
//   //       }

//   //       return result.rows;
//   //     }
//   //   } catch (err) {
//   //     console.error("Error fetching messages for room:", err);
//   //     return [];
//   //   }
//   // };

//   // Fetch messages when a user joins the room
//   socket.on("joinGroup", async ({ userId, room }) => {
//     console.log("joinGroup event received:", { userId, room });
//     try {
//       console.log("JOIN ROOM ");
//       if (!userId || !room) {
//         throw new Error("Invalid userId or room");
//       }
//       // Add user to the Redis set
//       await redisClient.sAdd(`room:${room}:users`, userId);
//       socket.join(room);

//       // Fetch messages for the room
//       // const messages = await getMessagesForRoom(room);
//       socket.emit("message history", {
//         messages: [{ senderId: 123, message: "Welcome to the chat room!" }],
//       });

//       console.log(`User ${userId} joined room ${room} with message history`);
//     } catch (err) {
//       console.error("Error joining group with message history:", err);
//     }
//   });
//   socket.on("sendMessageToGroup", async ({ room, message, senderId }) => {
//     try {
//       // Prepare the message object
//       const timestamp = Date.now();
//       const messageObject = { senderId, message, timestamp };

//       // Store the message in Redis (list for ordered messages)
//       await redisClient.lPush(
//         `room:${room}:messages`,
//         JSON.stringify(messageObject)
//       );

//       // Emit the message to all users in the room
//       io.to(room).emit("groupMessage", messageObject);
//       console.log(`Message sent to room ${room} by ${senderId}`);
//     } catch (err) {
//       console.error("Error sending message to group:", err);
//     }
//   });
//   socket.on("disconnect", async () => {
//     if (!redisClient.isOpen) {
//       console.error("Redis client is closed. Skipping disconnection logic.");
//       return;
//     }
//     try {
//       // Find the user and their rooms (use session or mapping)
//       // const userId = 1253; // Retrieve user ID from the session
//       // const rooms = await redisClient.sMembers(`user:${userId}:rooms`);
//       // Remove the user from each room
//       // for (const room of rooms) {
//       // await redisClient.sRem(`room:${room}:users`, userId);
//       // }
//       // console.log(`User ${userId} disconnected and removed from rooms`);
//     } catch (err) {
//       console.error("Error handling disconnection:", err);
//     }
//   });
// });

// Move setInterval outside

// end
app.get("/room1", (req, res) => {
  const serverTime = new Date();
  res.status(200).json({ error: false, message: "Server is running" });
  console.log(
    `Hours: ${serverTime.getHours()}, Minutes: ${serverTime.getMinutes()}, Seconds: ${serverTime.getSeconds()}`
  );
  console.log(connectedClients);
  console.log(onlineUsers);
});

server.listen(PORT, () =>
  console.log(`
 ################################################
       Server listening on port: ${PORT}
 ################################################
 `)
);
module.exports = { server, io };
