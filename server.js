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
const stripe = require("stripe")(process.env.SECRET_KEY_STRIPE);
// Cron jobs
const PORT = 3020;
const bodyParser = require("body-parser");
const paypal = require("paypal-rest-sdk");
const admin = require("firebase-admin");

const {
  user_name_auth,
  password_auth,
  mode,
  getAccessToken,
  PaypalSandBoxUrlmV2,
  PaypalSandBoxUrl,
} = require("./app/paypal_keys");
admin.initializeApp({
  credential: admin.credential.cert({
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
  }),
});
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
const { sendNotification } = require("./app/utils/sendNotification");
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
app.use("/limit", require("./app/routes/Limits/LimitsRoute"));

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
    const { user_id, game_id, wallet_type } = req.body;
    console.log(user_id);
    console.log(game_id);
    if (!user_id || !game_id || !wallet_type) {
      return res.json({
        error: true,
        message:
          "Please provide user_id and game_id and wallet type (bonus or withdrawl)",
      });
    }
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
      [user_id, wallet_type]
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

      const restratedstatus = gameAountCheck?.rows[0]?.restarted;
      const restarted_round = gameAountCheck?.rows[0]?.restarted_round;
      console.log("restratedstatus", gameAountCheck.rows[0]);
      if (gameAountCheck.rows.length > 0) {
        // if (restratedstatus === true) {
        //   // select game users count by user id and game id
        //   const gameUserCheck = await pool.query(
        //     "SELECT * FROM game_users WHERE game_id=$1 AND user_id=$2",
        //     [game_id, user_id]
        //   );
        //   if (gameUserCheck.rows.length === 0) {
        //     console.log("zero");
        //     // Restarted
        //     let EntryFee = gameAountCheck.rows[0].entry_fee;
        //     console.log(EntryFee);
        //     if (parseFloat(Balance) < parseFloat(EntryFee)) {
        //       console.log("less");
        //       res.json({
        //         error: true,
        //         insufficientBalnace: true,
        //         data: [],
        //         message: "Insufficient Balance",
        //       });
        //     } else {
        //       console.log("big");
        //       // Charge
        //       const gameUser = await pool.query(
        //         "INSERT INTO game_users (game_id, user_id,round_no) VALUES ($1, $2,$3) RETURNING *",
        //         [game_id, user_id, restarted_round]
        //       );
        //       if (gameUser.rows.length > 0) {
        //         console.log("Game User Added Successfully");
        //         // Minus amount from wallet
        //         const wallet = await pool.query(
        //           "UPDATE wallet SET balance=$1 WHERE user_id=$2 AND type=$3 RETURNING *",
        //           [
        //             parseFloat(Balance) - parseFloat(EntryFee),
        //             user_id,
        //             "withdrawl",
        //           ]
        //         );
        //         if (wallet.rows.length > 0) {
        //           console.log(" Minus amount from wallet ");
        //           const entryfeecut = parseFloat(EntryFee);
        //           console.log(" Minus amount from wallet ");
        //           const gameTransactions = await pool.query(
        //             "INSERT INTO transaction_history (user_id, amount,type,game_id) VALUES ($1, $2,$3,$4) RETURNING *",
        //             [user_id, entryfeecut, "entry fees", game_id]
        //           );
        //           console.log(gameTransactions.rows); //     res.json({
        //         }

        //         const date = new Date();
        //         const month = date.toLocaleString("default", {
        //           month: "short",
        //         });
        //         const day = date.getDate();
        //         const year = date.getFullYear();
        //         const dateToday = month + " " + day + "," + year;
        //         const subject = "Payment Successfull";

        //         const gameUserTotal = await pool.query(
        //           "SELECT * FROM game_users WHERE game_id=$1",
        //           [game_id]
        //         );
        //         let game_participants = gameUserTotal.rows.length;
        //         let jackpot = parseInt(game_participants) * parseInt(EntryFee);
        //         console.log("game_participants", game_participants);
        //         console.log("jackpot", jackpot);

        //         PaymentSuccess(
        //           user_email,
        //           subject,
        //           game_id,
        //           EntryFee,
        //           game_participants,
        //           jackpot,
        //           dateToday
        //         );
        //         res.json({
        //           error: false,
        //           data: gameUser.rows,
        //           message: "Game User Added Successfully",
        //         });
        //       } else {
        //         console.log("Game User Not Added Successfully");
        //         res.json({
        //           error: true,
        //           message: "Game User Not Added Successfully",
        //         });
        //       }
        //     }
        //   } else {
        //     let gameusersLength = parseInt(gameUserCheck.rows.length);
        //     let game_ropundd = parseInt(restarted_round) + parseInt(1);
        //     if (parseInt(gameusersLength) >= parseInt(game_ropundd)) {
        //       res.json({
        //         error: true,
        //         message: "You cant add more balls in this game",
        //       });
        //     } else {
        //       // Restarted
        //       let EntryFee = gameAountCheck.rows[0].entry_fee;
        //       console.log(EntryFee);
        //       if (parseFloat(Balance) < parseFloat(EntryFee)) {
        //         console.log("less");
        //         res.json({
        //           error: true,
        //           insufficientBalnace: true,
        //           data: [],
        //           message: "Insufficient Balance",
        //         });
        //       } else {
        //         console.log("big");
        //         // Charge
        //         const gameUser = await pool.query(
        //           "INSERT INTO game_users (game_id, user_id,round_no) VALUES ($1, $2,$3) RETURNING *",
        //           [game_id, user_id, restarted_round]
        //         );
        //         if (gameUser.rows.length > 0) {
        //           console.log("Game User Added Successfully");
        //           // Minus amount from wallet
        //           const wallet = await pool.query(
        //             "UPDATE wallet SET balance=$1 WHERE user_id=$2 AND type=$3 RETURNING *",
        //             [
        //               parseFloat(Balance) - parseFloat(EntryFee),
        //               user_id,
        //               "withdrawl",
        //             ]
        //           );
        //           if (wallet.rows.length > 0) {
        //             console.log(" Minus amount from wallet ");
        //             const entryfeecut = parseFloat(EntryFee);
        //             console.log(" Minus amount from wallet ");
        //             const gameTransactions = await pool.query(
        //               "INSERT INTO transaction_history (user_id, amount,type,game_id) VALUES ($1, $2,$3,$4) RETURNING *",
        //               [user_id, entryfeecut, "entry fees", game_id]
        //             );
        //             console.log(gameTransactions.rows);
        //           }

        //           const date = new Date();
        //           const month = date.toLocaleString("default", {
        //             month: "short",
        //           });
        //           const day = date.getDate();
        //           const year = date.getFullYear();
        //           const dateToday = month + " " + day + "," + year;
        //           const subject = "Payment Successfull";

        //           const gameUserTotal = await pool.query(
        //             "SELECT * FROM game_users WHERE game_id=$1",
        //             [game_id]
        //           );
        //           let game_participants = gameUserTotal.rows.length;
        //           let jackpot =
        //             parseInt(game_participants) * parseInt(EntryFee);
        //           console.log("game_participants", game_participants);
        //           console.log("jackpot", jackpot);
        //           console.log("user_email", user_email);

        //           PaymentSuccess(
        //             user_email,
        //             subject,
        //             game_id,
        //             EntryFee,
        //             game_participants,
        //             jackpot,
        //             dateToday
        //           );
        //           res.json({
        //             error: false,
        //             data: gameUser.rows,
        //             message: "Game User Added Successfully",
        //           });
        //         } else {
        //           console.log("Game User Not Added Successfully");
        //           res.json({
        //             error: true,
        //             message: "Game User Not Added Successfully",
        //           });
        //         }
        //       }
        //     }
        //   }
        //   console.log("RESTRARDED");

        //   // end
        // } else {
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
                  "withdrawl",
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
          // }
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
  const { user_id, amount, bonus_flyer_id, payment_type } = req.body;
  console.log(user_id);
  // console.log(amount);
  let final_amount;
  let bonus_amount;
  let flyer;

  if (bonus_flyer_id) {
    const qrBonusFlyer = await pool.query(
      "SELECT * FROM qr_bonus_flyer WHERE qr_bonus_flyer_id=$1",
      [bonus_flyer_id]
    );
    if (qrBonusFlyer.rows.length > 0) {
      console.log(qrBonusFlyer.rows[0]);
      flyer = qrBonusFlyer.rows[0];
      // offer_amount = qrBonusFlyer.rows[0].offer_amount;
      // Calculate total amount
      const bonus_coins = parseFloat(flyer.bonus_coins);
      const offer_percentage = parseFloat(flyer.offer_percentage);
      bonus_amount = bonus_coins + bonus_coins * (offer_percentage / 100);
      console.log("bonus_amount", bonus_amount);
    }
  }
  if (bonus_flyer_id) {
    final_amount = bonus_amount;
    // + amount;
  } else {
    final_amount = amount;
  }
  console.log("final_amount", final_amount);
  const userDataCheck = await pool.query(
    "SELECT * FROM users WHERE user_id=$1",
    [user_id]
  );

  if (userDataCheck.rows.length === 0) {
    res.json({ error: true, data: [], message: "User Not Found" });
  } else {
    // add winning_amount_single to user wallet
    let userWallet;

    if (bonus_flyer_id) {
      userWallet = await pool.query(
        "SELECT * FROM wallet WHERE user_id=$1 AND type=$2",
        [user_id, "bonus"]
      );
    } else {
      userWallet = await pool.query(
        "SELECT * FROM wallet WHERE user_id=$1 AND type=$2",
        [user_id, "withdrawl"]
      );
    }

    if (userWallet.rows.length > 0) {
      let wallet;

      if (bonus_flyer_id) {
        wallet = await pool.query(
          "UPDATE wallet SET balance=$1 WHERE user_id=$2 AND type=$3  RETURNING *",
          [
            parseFloat(userWallet?.rows[0]?.balance) + parseFloat(final_amount),
            user_id,
            "bonus",
          ]
        );
      } else {
        wallet = await pool.query(
          "UPDATE wallet SET balance=$1 WHERE user_id=$2 AND type=$3  RETURNING *",
          [
            parseFloat(userWallet?.rows[0]?.balance) + parseFloat(final_amount),
            user_id,
            "withdrawl",
          ]
        );
      }
      if (wallet.rows.length > 0) {
        const type = "withdrawl";
        const userDataTransaction = await pool.query(
          "INSERT INTO transaction_history(user_id,amount,type, money_type,money_type_details ) VALUES($1,$2,$3,$4,$5) returning *",
          [user_id, final_amount, type, payment_type, JSON.stringify(flyer)]
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
    const convertedAmount = (amount / 100).toFixed(2); // Convert pennies to dollars
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
            // items: items,
            items: [
              {
                name: "item", // from user details
                sku: "item",
                price: convertedAmount, //entry fee
                currency: "USD",
                quantity: 1, //always 1
              },
            ],
          },
          amount: {
            currency: "USD", // Specify the currency
            total: convertedAmount, // Use the converted amount
          },
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
// deposit by stripe

// const createCustomer = async (
//   customeremail,
//   paymentMethodId,
//   address,
//   city,
//   country,
//   zip_code,
//   province,
//   phone_number,
//   name,
//   user_id_req,
//   prevCard
// ) => {
//   // Search for an existing customer by email
//   const existingCustomers = await stripe.customers.list({
//     email: customeremail,
//     limit: 1,
//   });

//   let customer;

//   if (existingCustomers.data.length > 0) {
//     console.log("CUST ALREADY EXITS STRIOE");
//     // Customer exists, update their details
//     customer = existingCustomers.data[0];
//     await stripe.customers.update(customer.id, {
//       name: name,
//       address: {
//         line1: address,
//         city: city,
//         country: country,
//         postal_code: zip_code,
//         state: province,
//       },
//       phone: phone_number,
//       metadata: {
//         userId: user_id_req,
//         country: country,
//       },
//     });
//     await stripe.paymentMethods.attach(paymentMethodId, {
//       customer: customer.id,
//     });
//     await stripe.customers.update(customer.id, {
//       invoice_settings: {
//         default_payment_method: paymentMethodId,
//       },
//     });
//   } else {
//     // Customer does not exist, create a new one
//     console.log("CUST CREATED STRIOE");

//     customer = await stripe.customers.create({
//       email: customeremail,
//       payment_method: paymentMethodId,
//       name: name,
//       address: {
//         line1: address,
//         city: city,
//         country: country,
//         postal_code: zip_code,
//         state: province,
//       },
//       phone: phone_number,
//       metadata: {
//         userId: user_id_req,
//         country: country,
//       },
//     });

//     if (!prevCard) {
//       // Attach the payment method and set it as the default payment method
//       await stripe.paymentMethods.attach(paymentMethodId, {
//         customer: customer.id,
//       });
//       await stripe.customers.update(customer.id, {
//         invoice_settings: {
//           default_payment_method: paymentMethodId,
//         },
//       });
//     }
//   }

//   return customer.id;
// };

// const handlePaymentIntent = async (
//   price,
//   paymentMethodId,
//   stripeCustomerId,
//   Pricing_product_id_stripe,
//   PricingName,
//   teamMembers,
//   coupon
// ) => {
//   let paymentIntent;
//   let subscriptionId;
//   // Create the subscription
//   if (PricingName === "Professional") {
//     const subscription = await stripe.subscriptions.create({
//       customer: stripeCustomerId,
//       items: [{ price: Pricing_product_id_stripe }], //priceId from frontend
//       expand: ["latest_invoice.payment_intent"],
//       default_payment_method: paymentMethodId,
//     });

//     paymentIntent = subscription.status;
//     subscriptionId = subscription.id;
//   } else if (PricingName === "Team") {
//     console.log("COUPON", coupon);
//     const subscription = await stripe.subscriptions.create({
//       customer: stripeCustomerId,
//       items: [{ price: Pricing_product_id_stripe, quantity: teamMembers }], //priceId from frontend
//       expand: ["latest_invoice.payment_intent"],
//       coupon: coupon,
//       default_payment_method: paymentMethodId,
//     });
//     console.log("subscription");

//     // console.log(subscription);
//     // console.log(subscription.status);

//     paymentIntent = subscription.status;
//     subscriptionId = subscription.id;
//   }

//   // const paymentIntent = await stripe.paymentIntents.create({
//   //   amount: price * 100,
//   //   currency: "usd",
//   //   customer: stripeCustomerId,
//   //   payment_method: paymentMethodId,
//   //   confirm: true,
//   //   return_url: "https://your-return-url.com/complete", // Replace with your actual return URL
//   //   automatic_payment_methods: {
//   //     enabled: true,
//   //     allow_redirects: "never", // This prevents the need for redirects
//   //   },
//   // });
//   // console.log("paymentIntent");

//   // console.log(paymentIntent);

//   return {
//     status: paymentIntent,
//     subscriptionId: subscriptionId,
//   };
// };

// const checkUserData = async (customeremail) => {
//   const userDataCheck = await pool.query("SELECT * FROM users WHERE email=$1", [
//     customeremail,
//   ]);
//   return userDataCheck.rows[0];
// };

// const updateUserPlan = async (
//   company_admin_user_id,
//   price_id,
//   customeremail,
//   current_token,
//   expirationTimestamp,
//   price,
//   duration,
//   paymentMethodId,
//   stripeCustomerId,
//   teamMembers,
//   subscripId
// ) => {
//   const userPlanCheck = await pool.query(
//     "SELECT * FROM user_plan WHERE user_id=$1",
//     [company_admin_user_id]
//   );

//   await pool.query(
//     `
//     INSERT INTO transaction_history (user_id, plan_id, email, subscription_start_date, subscription_end_date, amount, type, status, transaction_id, stripe_customer_id, members)
//     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
//     `,
//     [
//       company_admin_user_id,
//       price_id,
//       customeremail,
//       current_token,
//       expirationTimestamp,
//       price,
//       duration,
//       "Active",
//       paymentMethodId,
//       stripeCustomerId,
//       teamMembers,
//     ]
//   );

//   if (userPlanCheck.rows.length === 0) {
//     await pool.query(
//       `
//       INSERT INTO user_plan (user_id, plan_id, subscription_start_date, subscription_end_date, amount, type, status, transaction_id,stripe_customer_id, members,stripe_subscription_id)
//       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,$10,$11)
//       `,
//       [
//         company_admin_user_id,
//         price_id,
//         current_token,
//         expirationTimestamp,
//         price,
//         duration,
//         "active",
//         paymentMethodId,
//         stripeCustomerId,
//         teamMembers,
//         subscripId,
//       ]
//     );
//   } else {
//     await pool.query(
//       `
//       UPDATE user_plan
//       SET plan_id = $2, subscription_start_date = $3, subscription_end_date = $4, amount = $5, type = $6, status = $7, transaction_id = $8,stripe_customer_id=$10, members = $9,stripe_subscription_id=$11
//       WHERE user_id = $1
//       `,
//       [
//         company_admin_user_id,
//         price_id,
//         current_token,
//         expirationTimestamp,
//         price,
//         duration,
//         "Active",
//         paymentMethodId,
//         teamMembers,
//         stripeCustomerId,
//         subscripId,
//       ]
//     );
//   }
// };

// const handleErrors = (error, res) => {
//   if (error.code === "card_declined") {
//     res.json({
//       error: true,
//       message: error.raw.message,
//       errorDetail: error,
//     });
//   } else if (
//     error.code === "expired_card" ||
//     error.code === "incorrect_cvc" ||
//     error.code === "processing_error" ||
//     error.code === "incorrect_number" ||
//     error.code === "authentication_required"
//   ) {
//     res.json({ error: true, message: error.raw.message, errorDetail: error });
//   } else {
//     res.json({
//       error: true,
//       errorDetail: error,
//       message: error.message,
//     });
//   }
// };
// async function updateCustomerDetails(customerId, details) {
//   if (!customerId || !details) {
//     throw new Error("customerId and details  are required");
//   }

//   try {
//     const customer = await stripe.customers.update(customerId, {
//       name: details.name,
//       phone: details.phone,
//       address: {
//         line1: details.address.line1,
//         city: details.address.city,
//         country: details.address.country,
//         postal_code: details.address.postal_code,
//         state: details.address.state,
//       },
//     });

//     return {
//       customer: customer,
//       error: false,
//       message: "Updated Billing Details.",
//     };
//   } catch (error) {
//     throw new Error("Failed to update customer details");
//   }
// }
// async function getUserSubscription(customerId) {
//   // Fetch all subscriptions for the customer
//   const subscriptions = await stripe.subscriptions.list({
//     customer: customerId,
//     status: "active",
//   });

//   // If the customer has any active subscriptions, return the first one
//   if (subscriptions.data.length > 0) {
//     return subscriptions.data[0];
//   }
//   return null;
// }
// async function cancelExistingSubscription(
//   subscriptionId,
//   cancelAtPeriodEnd = true
// ) {
//   const canceledSubscription = await stripe.subscriptions.update(
//     subscriptionId,
//     {
//       cancel_at_period_end: cancelAtPeriodEnd, // Set true to cancel at the end of the period, false to cancel immediately
//     }
//   );

//   return canceledSubscription;
// }
//sgsghs

// app.post("/pay-by-stripe", async (req, res) => {
//   try {
//     const {
//       billingInfo,
//       teamMembers,
//       paymentMethodId,
//       customeremail,
//       price,
//       duration,
//       price_id,
//       prevCard,
//       coupon,
//     } = req.body;
//     console.log(billingInfo);
//     console.log("COUPON DStart", coupon);
//     // Create a new constant for the full name
//     const name = `${billingInfo.first_name} ${billingInfo.last_name}`;
//     const address = billingInfo.address.line1;
//     const city = billingInfo.address.city;
//     const country = billingInfo.address.country;
//     const zip_code = billingInfo.address.postal_code;
//     const province = billingInfo.address.state;
//     const phone_number = billingInfo.phone;

//     let userData = await checkUserData(customeremail);
//     if (!userData) {
//       return res.json({ message: "Email not Found.", error: true });
//     }
//     let user_id_req = userData.user_id;

//     const stripeCustomerId = await createCustomer(
//       customeremail,
//       paymentMethodId,
//       address,
//       city,
//       country,
//       zip_code,
//       province,
//       phone_number,
//       name,
//       user_id_req,
//       prevCard
//     );
//     console.log("stripeCustomerId");

//     console.log(stripeCustomerId);
//     // chk prev subscriotion
//     const existingSubscription = await getUserSubscription(stripeCustomerId);
//     console.log("existingSubscription", existingSubscription);
//     if (existingSubscription) {
//       await cancelExistingSubscription(existingSubscription.id, true); // Cancel immediately or set to true for end of period
//     }

//     const paymentIntent = await handlePaymentIntent(
//       price,
//       paymentMethodId,
//       stripeCustomerId,
//       Pricing_product_id_stripe,
//       PricingName,
//       teamMembers,
//       coupon
//     );
//     console.log("paymentIntent", paymentIntent);
//     if (paymentIntent.status === "active") {
//       let subscripId = paymentIntent.subscriptionId;
//       const result = await updateCustomerDetails(stripeCustomerId, billingInfo);
//       // console.log("result");

//       // console.log(result);
//       const company_admin_user_id = userData.user_id;
//       let current_token = new Date();
//       let expirationTimestamp = new Date();
//       duration === "monthly"
//         ? expirationTimestamp.setMonth(expirationTimestamp.getMonth() + 1)
//         : expirationTimestamp.setFullYear(
//             expirationTimestamp.getFullYear() + 1
//           );
//       console.log("duration");

//       console.log(duration);

//       console.log(expirationTimestamp);
//       if (PricingName === "Team") {
//         const companyData = await pool.query(
//           "SELECT * FROM company WHERE company_admin_email=$1",
//           [customeremail]
//         );
//         if (companyData.rows.length === 0) {
//           const addressData = `${address}, ${city}, ${province}, ${zip_code}, ${country}`;
//           const billingAddress = true;
//           const companyDetails = await pool.query(
//             `
//             INSERT INTO company (company_email, company_admin_email, status, members, address, contact_no,billingaddress,company_logo)
//             VALUES ($1, $2, $3, $4, $5, $6,$7,$8) RETURNING *
//             `,
//             [
//               customeremail,
//               customeremail,
//               "inactive",
//               teamMembers,
//               addressData,
//               phone_number,
//               billingAddress,
//               company_logo,
//             ]
//           );
//           const companyId = companyDetails.rows[0].company_id;
//           // Update into users the company id and company admin is true
//           await pool.query(
//             `
//             UPDATE users
//             SET company_id = $1, company_admin = true, stripe_cust_id =$3
//             WHERE email = $2
//             `,
//             [companyId, customeremail, stripeCustomerId]
//           );
//         } else {
//           const companyId2 = companyData.rows[0].company_id;
//           await pool.query(
//             `
//             UPDATE company
//             SET members = $2
//             WHERE company_admin_email = $1
//             `,
//             [customeremail, teamMembers]
//           );
//           // Update into users the company id and company admin is true
//           await pool.query(
//             `
//             UPDATE users
//             SET company_id = $1, company_admin = true, stripe_cust_id =$3
//             WHERE email = $2
//             `,
//             [companyId2, customeremail, stripeCustomerId]
//           );
//         }
//       }

//       await updateUserPlan(
//         company_admin_user_id,
//         price_id,
//         customeremail,
//         current_token,
//         expirationTimestamp,
//         price,
//         duration,
//         paymentMethodId,
//         stripeCustomerId,
//         teamMembers,
//         subscripId
//       );
//       // make email

//       // get user by user id
//       const user = await pool.query("SELECT * FROM users WHERE user_id=$1", [
//         user_id_req,
//       ]);
//       const userDataDeatails = user.rows[0];
//       // console.log(userDataDeatails);

//       res.json({
//         error: false,
//         message: "Payment has been processed.",
//         userData: userDataDeatails,
//       });
//     } else {
//       res.json({ error: true, message: "Payment failed." });
//     }
//   } catch (error) {
//     handleErrors(error, res);
//   }
// });

// correct
app.post("/pay-by-stripe1", async (req, res) => {
  try {
    const {
      paymentMethodId,
      customeremail,
      return_url,
      price, // Price in pennies
      billingInfo, // Contains billing details: name, address, city, etc.
    } = req.body;

    // Convert price from pennies to dollars
    const priceInDollars = (price / 100).toFixed(2);
    console.log(
      `Processing payment for ${customeremail} with amount $${priceInDollars}`
    );

    // Extract billing details
    const {
      first_name,
      last_name,
      address: { line1, city, country, postal_code, state },
      phone,
    } = billingInfo;

    const name = `${first_name} ${last_name}`;

    // Check if the customer exists, otherwise create one
    let stripeCustomer;
    const existingCustomer = await stripe.customers.list({
      email: customeremail,
      limit: 1,
    });

    if (existingCustomer.data.length > 0) {
      stripeCustomer = existingCustomer.data[0].id;
      console.log(`Using existing Stripe customer: ${stripeCustomer}`);

      // Update the customer's billing details if they already exist
      await stripe.customers.update(stripeCustomer, {
        name,
        email: customeremail,
        address: {
          line1,
          city,
          country,
          postal_code,
          state,
        },
        phone,
      });
    } else {
      // Create a new Stripe customer with billing details
      const customer = await stripe.customers.create({
        name,
        email: customeremail,
        payment_method: paymentMethodId,
        address: {
          line1,
          city,
          country,
          postal_code,
          state,
        },
        phone,
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
      stripeCustomer = customer.id;
      console.log(`Created new Stripe customer: ${stripeCustomer}`);
    }

    // Create a Payment Intent with billing details
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(price), // Use the original price in pennies
      currency: "usd",
      customer: stripeCustomer,
      payment_method: paymentMethodId,
      confirm: true,
      description: `Payment of $${priceInDollars} by ${customeremail}`,
      receipt_email: customeremail,
      metadata: {
        customer_email: customeremail,
        customer_name: name,
      },
      return_url: return_url,
      // automatic_payment_methods: {
      //   enabled: true, // Enable automatic payment methods

      // },
    });

    // Handle payment status
    if (paymentIntent.status === "succeeded") {
      console.log("Payment successful:", paymentIntent.id);

      res.json({
        error: false,
        message: "Payment has been processed successfully.",
        paymentIntentId: paymentIntent.id,
        customerId: stripeCustomer,
      });
    } else {
      console.error("Payment failed:", paymentIntent.status);

      res.json({
        error: true,
        message: "Payment failed.",
        status: paymentIntent.status,
      });
    }
  } catch (error) {
    console.error("Error processing payment:", error);
    res.status(500).json({
      error: true,
      message: "An error occurred while processing the payment.",
      details: error.message,
    });
  }
});
app.post("/pay-by-stripe", async (req, res) => {
  try {
    const {
      paymentMethodId,
      customeremail,
      return_url,
      price, // Price in pennies
      billingInfo, // Optional: Billing details (name, address, city, etc.)
    } = req.body;

    // Convert price from pennies to dollars
    const priceInDollars = (price / 100).toFixed(2);
    console.log(
      `Processing payment for ${customeremail} with amount $${priceInDollars}`
    );

    let stripeCustomer;
    const existingCustomer = await stripe.customers.list({
      email: customeremail,
      limit: 1,
    });

    if (existingCustomer.data.length > 0) {
      stripeCustomer = existingCustomer.data[0].id;
      console.log(`Using existing Stripe customer: ${stripeCustomer}`);

      // Update only if billing info is provided
      if (billingInfo) {
        const {
          first_name,
          last_name,
          address: { line1, city, country, postal_code, state } = {},
          phone,
        } = billingInfo;
        const name = `${first_name} ${last_name}`;

        await stripe.customers.update(stripeCustomer, {
          name,
          email: customeremail,
          address: {
            line1,
            city,
            country,
            postal_code,
            state,
          },
          phone,
        });
      }
    } else {
      // Create a new customer if not found
      const customerParams = {
        email: customeremail,
        payment_method: paymentMethodId,
        invoice_settings: { default_payment_method: paymentMethodId },
      };

      if (billingInfo) {
        const {
          first_name,
          last_name,
          address: { line1, city, country, postal_code, state } = {},
          phone,
        } = billingInfo;
        customerParams.name = `${first_name} ${last_name}`;
        customerParams.address = {
          line1,
          city,
          country,
          postal_code,
          state,
        };
        customerParams.phone = phone;
      }

      const customer = await stripe.customers.create(customerParams);
      stripeCustomer = customer.id;
      console.log(`Created new Stripe customer: ${stripeCustomer}`);
    }

    // Create a Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(price),
      currency: "usd",
      customer: stripeCustomer,
      payment_method: paymentMethodId,
      confirm: true,
      description: `Payment of $${priceInDollars} by ${customeremail}`,
      receipt_email: customeremail,
      metadata: {
        customer_email: customeremail,
        customer_id: stripeCustomer,
      },
      return_url: return_url,
    });

    // Handle payment status
    if (paymentIntent.status === "succeeded") {
      console.log("Payment successful:", paymentIntent.id);
      res.json({
        error: false,
        message: "Payment has been processed successfully.",
        paymentIntentId: paymentIntent.id,
        customerId: stripeCustomer,
      });
    } else {
      console.error("Payment failed:", paymentIntent.status);
      res.json({
        error: true,
        message: "Payment failed.",
        status: paymentIntent.status,
      });
    }
  } catch (error) {
    console.error("Error processing payment:", error);
    res.status(500).json({
      error: true,
      message: "An error occurred while processing the payment.",
      details: error.message,
    });
  }
});

// end
// Products
// make api for just say server is running when runs localhost:5000 on google
app.get("/", (req, res) => {
  const serverTime = new Date();
  res.status(200).json({ error: false, message: "Server is running" });
  console.log(
    `Hours: ${serverTime.getHours()}, Minutes: ${serverTime.getMinutes()}, Seconds: ${serverTime.getSeconds()}`
  );
});
// sockets
let io;

io = socket(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});
// server.listen(3020, "0.0.0.0", () => {
//   console.log("WebSocket server running on port 3020");
// });

// redis socket
const connectedClients = new Set();

// optimized code
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

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

  socket.on("game-created", async (gameData) => {
    const { gameId, status } = gameData;

    if (!gameId || !status) {
      console.error("Invalid game creation data");
      return;
    }

    try {
      if (/^\d{6}$/.test(gameId)) {
        // ✅ If gameId is 6 digits, it's a GROUP ID
        console.log(
          `Game ID ${gameId} detected as a GROUP. Fetching related games...`
        );

        const gamesInGroup = await pool.query(
          "SELECT game_id FROM games WHERE group_id=$1",
          [gameId]
        );

        if (gamesInGroup.rows.length === 0) {
          console.error(`No games found under group ID ${gameId}`);
          return;
        }

        for (const game of gamesInGroup.rows) {
          const groupGameId = game.game_id;

          // ✅ Store each game in Redis
          await redisClient.hSet(
            `games`,
            groupGameId,
            JSON.stringify({ status, active: true })
          );

          console.log(
            `Group game created: ${groupGameId} with status ${status}`
          );

          // Emit event for each game in the group
          const onlineUsers = await redisClient.sMembers("online-users");
          for (const userId of onlineUsers) {
            const socketId = await redisClient.get(`user:${userId}:socket`);
            if (socketId) {
              io.to(socketId).emit("game-created", {
                gameId: groupGameId,
                status,
                groupId: gameId, // Include groupId in the response
              });
            }
          }
        }
      } else {
        // ✅ If gameId is NOT 6 digits, it's a SINGLE GAME
        console.log(`Game ID ${gameId} detected as a SINGLE GAME.`);

        // Store game details in Redis
        await redisClient.hSet(
          `games`,
          gameId,
          JSON.stringify({ status, active: true })
        );

        console.log(`Single game created: ${gameId} with status ${status}`);

        // Emit event for the single game
        const onlineUsers = await redisClient.sMembers("online-users");
        for (const userId of onlineUsers) {
          const socketId = await redisClient.get(`user:${userId}:socket`);
          if (socketId) {
            io.to(socketId).emit("game-created", { gameId, status });
          }
        }
      }
      // NOTIfiCAYION
      // (Game ID ${gameResults.map(
      //   (result) => result.rows[0]
      // )})
      const title = `New Game Created`;
      const body = `A new game has been successfully created. Join now to participate.`;
      const type = "game";
      await pool.query(
        "INSERT INTO notifications (user_id, title, body, type) VALUES ($1, $2, $3, $4)",
        [null, title, body, type]
      );
      emitActiveGames(); // Emit updated active games
    } catch (err) {
      console.error(`Error creating game ${gameId}:`, err);
    }
  });

  // User joining a game
  socket.on("join-game", async ({ gameId, userId }) => {
    console.log("gameid", gameId);
    console.log("userId", userId);
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

  // socket.on("update-game-status", async ({ gameId, status }) => {
  //   if (!gameId || !status) {
  //     console.error("Invalid update-game-status request");
  //     return;
  //   }

  //   try {
  //     let gamesToUpdate = [];

  //     if (/^\d{6}$/.test(gameId)) {
  //       // ✅ If `gameId` is 6 digits, it's a GROUP ID - Fetch all related games
  //       console.log(`Updating status for GROUP ID ${gameId}`);

  //       const groupGames = await pool.query(
  //         "SELECT game_id FROM games WHERE group_id=$1",
  //         [gameId]
  //       );

  //       if (groupGames.rows.length === 0) {
  //         console.error(`No games found under group ID ${gameId}`);
  //         return;
  //       }

  //       gamesToUpdate = groupGames.rows.map((row) => row.game_id);
  //     } else {
  //       // ✅ If `gameId` is NOT 6 digits, it's a SINGLE GAME
  //       console.log(`Updating status for SINGLE GAME ID ${gameId}`);
  //       gamesToUpdate.push(gameId);
  //     }

  //     let allParticipants = new Set(); // Store unique users from all games

  //     for (const game of gamesToUpdate) {
  //       const gameData = await redisClient.hGet(`games`, game);
  //       if (!gameData) {
  //         console.warn(`Game ${game} not found in Redis, skipping.`);
  //         continue;
  //       }

  //       const parsedGame = JSON.parse(gameData);
  //       parsedGame.status = status;

  //       if (status === "result-announced") {
  //         parsedGame.active = false;
  //       }

  //       await redisClient.hSet(`games`, game, JSON.stringify(parsedGame));
  //       console.log(`Game ${game} status updated to ${status}`);

  //       // Collect all participants
  //       const participants = await redisClient.sMembers(`room:${game}`);

  //       console.log("participants ", participants);

  //       participants.forEach((userId) => allParticipants.add(userId));
  //     }

  //     // Emit status update to all users in the affected games
  //     for (const userId of allParticipants) {
  //       const socketId = await redisClient.get(`user:${userId}:socket`);
  //       if (socketId) {
  //         io.to(socketId).emit("game-status-updated", { gameId, status });
  //       }
  //     }

  //     // If status is "result-announced", remove games from Redis
  //     // if (status === "result-announced") {
  //     //   setTimeout(async () => {
  //     //     for (const game of gamesToUpdate) {
  //     //       // await redisClient.hDel(`games`, game);
  //     //       console.log(`Clearing game from Redis: ${game}`); // ✅ Logs the game ID
  //     //       // await redisClient.del(`room:${game}`);
  //     //       console.log(`Game ${game} cleared from Redis.`);
  //     //       // api call
  //     //       const gameResults = await pool.query(
  //     //         "SELECT * FROM games WHERE game_id=$1",
  //     //         [game]);
  //     //       console.log("Game Results", gameResults.rows[0]);
  //     //       const winner_details = gameResults.rows[0].winner_details;
  //     //       const title = `Game Results Announced`;
  //     //       const body = `The results for the game have been announced. Check your profile for more details.`;
  //     //       const type = "games";
  //     //       await pool.query(
  //     //         "INSERT INTO notifications (user_id, title, body, type) VALUES ($1, $2, $3, $4)",
  //     //         [null, title, body, type]
  //     //       );
  //     //     }
  //     //     emitActiveGames();
  //     //   }, 2000);
  //     // }
  //     if (status === "result-announced") {
  //       setTimeout(async () => {
  //         for (const game of gamesToUpdate) {
  //           console.log(`Clearing game from Redis: ${game}`);

  //           // Fetch game results
  //           const gameResults = await pool.query(
  //             "SELECT * FROM games WHERE game_id=$1",
  //             [game]
  //           );

  //           if (gameResults.rows.length === 0) {
  //             console.error(`Game ${game} not found in DB.`);
  //             continue;
  //           }

  //           console.log("Game Results:", gameResults.rows[0]);

  //           const winnerDetails = gameResults.rows[0].winner_details;
  //           if (!winnerDetails || winnerDetails.length === 0) {
  //             console.log(`No winners found for game ${game}`);
  //             continue;
  //           }

  //           // ✅ Parse winner details if stored as JSON string
  //           const winners =
  //             typeof winnerDetails === "string"
  //               ? JSON.parse(winnerDetails)
  //               : winnerDetails;

  //           console.log(`Winners for game ${game}:`, winners);

  //           // ✅ Get FCM tokens for winners
  //           const winnerUserIds = winners.map((winner) => winner.user_id);
  //           if (winnerUserIds.length > 0) {
  //             const winnerTokensQuery = await pool.query(
  //               `SELECT user_id, device_token, web_token FROM users WHERE user_id = ANY($1)`,
  //               [winnerUserIds]
  //             );

  //             const userTokens = winnerTokensQuery.rows.reduce((acc, row) => {
  //               acc[row.user_id] = {
  //                 deviceToken: row.device_token,
  //                 webToken: row.web_token,
  //               };
  //               return acc;
  //             }, {});

  //             // ✅ Send notifications to each winner
  //             for (const winner of winners) {
  //               const { user_id, ball, amount } = winner;
  //               const { deviceToken, webToken } = userTokens[user_id] || {};
  //               const token = deviceToken || webToken;

  //               if (!token) {
  //                 console.warn(
  //                   `No FCM token found for winner ${user_id}, skipping.`
  //                 );
  //                 continue;
  //               }

  //               const title = `Congratulations! You Won 🎉`;
  //               const body = `You won ${amount} in game ${game} with ball ${ball}.`;
  //               const type = "games";
  //               const data = { gameId: game, status };

  //               // ✅ Send FCM notification
  //               sendNotification(token, title, body, data);
  //               console.log(`Notification sent to winner ${user_id}`);

  //               // ✅ Insert into notifications table
  //               await pool.query(
  //                 "INSERT INTO notifications (user_id, title, body, type) VALUES ($1, $2, $3, $4)",
  //                 [user_id, title, body, type]
  //               );
  //             }
  //           }

  //           console.log(`Game ${game} results processed.`);
  //         }

  //         emitActiveGames();
  //       }, 2000);
  //     }
  //   } catch (err) {
  //     console.error(`Error updating status for game ${gameId}:`, err);
  //   }
  // });
  socket.on("update-game-status", async ({ gameId, status }) => {
    if (!gameId || !status) {
      console.error("Invalid update-game-status request");
      return;
    }

    try {
      let gamesToUpdate = [];

      if (/^\d{6}$/.test(gameId)) {
        // ✅ If `gameId` is 6 digits, it's a GROUP ID - Fetch all related games
        console.log(`Updating status for GROUP ID ${gameId}`);

        const groupGames = await pool.query(
          "SELECT game_id FROM games WHERE group_id=$1",
          [gameId]
        );

        if (groupGames.rows.length === 0) {
          console.error(`No games found under group ID ${gameId}`);
          return;
        }

        gamesToUpdate = groupGames.rows.map((row) => row.game_id);
      } else {
        // ✅ If `gameId` is NOT 6 digits, it's a SINGLE GAME
        console.log(`Updating status for SINGLE GAME ID ${gameId}`);
        gamesToUpdate.push(gameId);
      }

      let allParticipants = new Set(); // Store unique users from all games

      for (const game of gamesToUpdate) {
        const gameData = await redisClient.hGet(`games`, game);
        if (!gameData) {
          console.warn(`Game ${game} not found in Redis, skipping.`);
          continue;
        }

        const parsedGame = JSON.parse(gameData);
        parsedGame.status = status;

        if (status === "result-announced") {
          parsedGame.active = false;
        }

        await redisClient.hSet(`games`, game, JSON.stringify(parsedGame));
        console.log(`Game ${game} status updated to ${status}`);

        // ✅ Get participants from game_users table
        const participantsQuery = await pool.query(
          "SELECT user_id FROM game_users WHERE game_id = $1",
          [game]
        );
        const participants = participantsQuery.rows.map((row) => row.user_id);

        participants.forEach((userId) => allParticipants.add(userId));
      }

      // ✅ Send WebSocket notifications
      for (const userId of allParticipants) {
        const socketId = await redisClient.get(`user:${userId}:socket`);
        if (socketId) {
          io.to(socketId).emit("game-status-updated", { gameId, status });
        }
      }

      // ✅ Fetch FCM tokens for participants
      if (allParticipants.size > 0) {
        const userIdsArray = Array.from(allParticipants);
        const userTokensQuery = await pool.query(
          `SELECT user_id, device_token, web_token FROM users WHERE user_id = ANY($1)`,
          [userIdsArray]
        );

        const userTokens = userTokensQuery.rows.reduce((acc, row) => {
          acc[row.user_id] = {
            deviceToken: row.device_token,
            webToken: row.web_token,
          };
          return acc;
        }, {});

        // ✅ Send FCM notifications & insert into notifications table
        for (const userId of allParticipants) {
          const { deviceToken, webToken } = userTokens[userId] || {};
          const token = {
            deviceToken,
            webToken,
          };

          if (!token) {
            console.warn(`No FCM token found for user ${userId}, skipping.`);
            continue;
          }

          const title = `Game Status Updated`;
          const body = `Your game (ID: ${gameId}) status changed to ${status}.`;
          const type = "game";
          const data = { gameId, status };

          sendNotification(token, title, body, data, type);
          console.log(`Notification sent to user ${userId}`);

          // await pool.query(
          //   "INSERT INTO notifications (user_id, title, body, type) VALUES ($1, $2, $3, $4)",
          //   [userId, title, body, type]
          // );
        }
      }

      // ✅ If status is "result-announced", process results
      if (status === "result-announced") {
        setTimeout(async () => {
          for (const game of gamesToUpdate) {
            console.log(`Clearing game from Redis: ${game}`);
            await redisClient.hDel(`games`, game);
            await redisClient.del(`room:${game}`);

            //     //       console.log(`Clearing game from Redis: ${game}`); // ✅ Logs the game ID
            // Fetch game results
            const gameResults = await pool.query(
              "SELECT * FROM games WHERE game_id=$1",
              [game]
            );

            if (gameResults.rows.length === 0) {
              console.error(`Game ${game} not found in DB.`);
              continue;
            }

            console.log("Game Results:", gameResults.rows[0]);

            const winnerDetails = gameResults.rows[0].winner_details;
            if (!winnerDetails || winnerDetails.length === 0) {
              console.log(`No winners found for game ${game}`);
              continue;
            }

            const winners =
              typeof winnerDetails === "string"
                ? JSON.parse(winnerDetails)
                : winnerDetails;

            console.log(`Winners for game ${game}:`, winners);

            // ✅ Get FCM tokens for winners
            const winnerUserIds = winners.map((winner) => winner.user_id);
            if (winnerUserIds.length > 0) {
              const winnerTokensQuery = await pool.query(
                `SELECT user_id, device_token, web_token FROM users WHERE user_id = ANY($1)`,
                [winnerUserIds]
              );

              const winnerTokens = winnerTokensQuery.rows.reduce((acc, row) => {
                acc[row.user_id] = {
                  deviceToken: row.device_token,
                  webToken: row.web_token,
                };
                return acc;
              }, {});

              // ✅ Send notifications to winners
              for (const winner of winners) {
                const { user_id, ball, amount } = winner;
                const { deviceToken, webToken } = winnerTokens[user_id] || {};
                const token = deviceToken || webToken;

                if (!token) {
                  console.warn(
                    `No FCM token found for winner ${user_id}, skipping.`
                  );
                  continue;
                }

                const title = `Congratulations! You Won 🎉`;
                const body = `You won ${amount} in game ${game} with ball ${ball}.`;
                const type = "game";
                const data = { gameId: game, status };

                sendNotification(token, title, body, data, type);
                console.log(`Notification sent to winner ${user_id}`);

                // await pool.query(
                //   "INSERT INTO notifications (user_id, title, body, type) VALUES ($1, $2, $3, $4)",
                //   [user_id, title, body, type]
                // );
              }
            }
          }

          emitActiveGames();
        }, 2000);
      }
    } catch (err) {
      console.error(`Error updating status for game ${gameId}:`, err);
    }
  });

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
// export const sendNotification = async (tokenObj, title, body, data) => {
//   // Convert all values in the data object to strings
//   const stringData = Object.fromEntries(
//     Object.entries(data).map(([key, value]) => [key, String(value)])
//   );

//   // Extract tokens
//   const { deviceToken, webToken } = tokenObj;

//   // Prepare the message structure
//   const message = {
//     notification: {
//       title,
//       body,
//     },
//     data: stringData,
//   };

//   try {
//     console.log("Sending Notification:", { title, body, data });

//     // Array to track promises for sending notifications
//     const notificationPromises = [];

//     // ✅ Send to device token if available
//     if (deviceToken) {
//       console.log(`Sending FCM to device token: ${deviceToken}`);
//       notificationPromises.push(
//         admin.messaging().send({ ...message, token: deviceToken })
//       );
//     }

//     // ✅ Send to web token if available
//     if (webToken) {
//       console.log(`Sending FCM to web token: ${webToken}`);
//       notificationPromises.push(
//         admin.messaging().send({ ...message, token: webToken })
//       );
//     }

//     // Execute all notification sends
//     const responses = await Promise.all(notificationPromises);

//     // ✅ If at least one notification was sent successfully, insert into DB
//     if (responses.length > 0) {
//       await pool.query(
//         "INSERT INTO notifications (user_id, title, body, type) VALUES ($1, $2, $3, $4)",
//         [data.userId || null, title, body, "game"]
//       );
//       console.log("Notification record inserted successfully.");
//     } else {
//       console.error("Notification sending failed. Not inserting into DB.");
//     }

//     console.log("Notification(s) sent successfully.");
//   } catch (error) {
//     console.error("Error sending notification:", error);
//   }
// };

// const sendNotification1 = async (token, title, body, data) => {
//   // Convert all values in the data object to strings
//   const stringData = Object.fromEntries(
//     Object.entries(data).map(([key, value]) => [key, String(value)])
//   );
//   console.log(token, title, body, data);
//   const message = {
//     notification: {
//       title,
//       body,
//     },
//     token,
//     data: stringData,
//   };

//   try {
//     console.log("data", data);

//     let notification_data1;
//     notification_data1 = {
//       user_id: data.userId, // make sure receiver_id is part of the data object
//       title,
//       body,
//       type: "game", //game, manual_deposit,withdraw deposit,general
//     };

//     console.log(data);
//     // insert into notifications
//     const response = await admin.messaging().send(message);
//     if (response) {
//       await pool.query(
//         "INSERT INTO notifications (user_id, title, body, type) VALUES ($1, $2, $3, $4)",
//         [data.userId || null, title, body, "game"]
//       );
//       console.log("Notification data inserted successfully:");
//     } else {
//       console.error(
//         "Notification sending failed, not inserting into database."
//       );
//     }

//     console.log("Notification sent successfully:");
//   } catch (error) {
//     console.error("Error sending notification:", error);
//   }
// };
// make api to get all notifications

// socket end
// notification
app.post("/send-notification", async (req, res) => {
  const {
    title,
    body,
    imageUrl,
    // ,token
  } = req.body;
  // const token =
  //   "f-3Re1EJTUqMkUm0HeJTlb:APA91bGfQHOEYCN6uRGtYvh5QUDI-3viGU3pYDmRy9HFKeSyUoxpLlsWX1tI5HsKMu-X4CTONcA6LRucfNYxdXMjqx_9-epBysjDa9wEIHM2iqWC3P4__sQ";
  // web
  const token = {
    deviceToken:
      "dT5g5pMlS7uHDvLc2XA0-7:APA91bFrIoWKo6M3JdLbhTJ0hXkIY_ytekRy-tTMNM3uiV3z3JmAzO5QhIQOlvlWFpscKEyxycDF7Cw1SVN57QnVuHg1hA3LQiMl5zDp4LLZoXcuBxxfi74",
    webToken:
      "fRWv-q-xWB3_LeZSBou4OG:APA91bH5dyEdZEyG9JIrCHaGa0tRN3eZlazFVKAk0DXGZ9-8fPf1umBip4-ry6jNIp_adgSs_pOoBc_ub7PzMTDIw4ogg_NNXdhRulRl0TDDa1kPhs1ywww",
  };
  const message = {
    notification: {
      title,
      body,
      imageUrl,
    },
    token, // Device token
  };

  try {
    const title = `New Service Request`;
    const body = `You have a new service request from .`;
    const type = "SERVICES";
    const data = {
      user_id: "123",
      type,
    };
    await sendNotification(token, title, body, data, type);

    // const response = await admin.messaging().send(message);

    res.status(200).json({ message: "Notification sent successfully" });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// payment intent
app.post("/create-payment-intent", async (req, res) => {
  const client = await pool.connect();
  try {
    const { amount, currency = "usd", user_id, email } = req.body;

    if (!user_id) {
      return res
        .status(400)
        .json({ error: true, message: "User ID is required" });
    }

    // Fetch the user to check if they already have a Stripe customer ID
    const userResult = await pool.query(
      "SELECT stripe_customer_id FROM users WHERE user_id = $1",
      [user_id]
    );
    let customer_id = userResult.rows[0]?.stripe_customer_id;

    let customer;
    if (customer_id) {
      // Use existing Stripe customer
      customer = await stripe.customers.retrieve(customer_id);
    } else {
      // Create a new Stripe customer if none exists
      customer = await stripe.customers.create({
        email,
        description: "App User",
      });

      // Store Stripe customer ID in the users table
      await pool.query(
        "UPDATE users SET stripe_customer_id = $1 WHERE user_id = $2",
        [customer.id, user_id]
      );

      console.log(`New Stripe Customer Created: ${customer.id}`);
    }

    // Generate an Ephemeral Key
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: "2023-10-16" }
    );

    // Create a Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency,
      customer: customer.id,
      automatic_payment_methods: { enabled: true },
    });

    return res.json({
      paymentIntent: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: customer.id, // Stripe customer ID
    });
  } catch (error) {
    console.error("Stripe Error:", error);
    res.status(500).json({ error: true, message: error.message });
  } finally {
    client.release();
  }
});

// notification end
server.listen(PORT, () =>
  console.log(`
 ################################################
       Server listening on port: ${PORT}
 ################################################
 `)
);
module.exports = { server, io };
