const { default: axios } = require("axios");
const { pool } = require("../../config/db.config");
const {
  email_note,
  getAccessToken,
  PaypalSandBoxUrlmV2,
} = require("../../paypal_keys");
const stripe = require("stripe")(process.env.SECRET_KEY_STRIPE);

const { sendNotification } = require("../../utils/sendNotification");
// exports.createTransactionHistory = async (req, res) => {
//   const { user_id, amount, email } = req.body;
//   const client = await pool.connect();
//   try {
//     // Fetch user data
//     const userData = await pool.query("SELECT * FROM users WHERE user_id=$1", [
//       user_id,
//     ]);
//     if (userData.rows.length === 0) {
//       return res.json({ error: true, message: "User Not Found!" });
//     }

//     let user_email = userData.rows[0].email;

//     // Fetch user wallet data
//     const userWalletData = await pool.query("SELECT * FROM wallet WHERE user_id=$1", [user_id]);
//     if (userWalletData.rows.length === 0) {
//       return res.json({ error: true, message: "User wallet Not Found!" });
//     }

//     const userWalletBalance = userWalletData.rows[0].balance;
//     if (parseInt(userWalletBalance) < parseInt(amount)) {
//       return res.json({ error: true, message: "Insufficient balance!" });
//     }

//     // --------------------------- Payout
//     // Get PayPal Access Token
//     const accessToken = await getAccessToken();

//     const payoutResponse = await fetch(`${PaypalSandBoxUrlmV2}/payments/payouts`, {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${accessToken}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         sender_batch_header: {
//           sender_batch_id: `batch_${Date.now()}`,
//           email_subject: "You have a payout!",
//           email_message: "You have received a payout! Thanks for using our service.",
//         },
//         items: [
//           {
//             recipient_type: "EMAIL",
//             amount: {
//               value: amount,
//               currency: "USD",
//             },
//             receiver: email,
//             note: `Payout to ${email}`,
//             sender_item_id: `item_${Date.now()}`,
//           },
//         ],
//       }),
//     });

//     // Handle potential errors with the response
//     if (!payoutResponse.ok) {
//       const errorText = await payoutResponse.text();
//       console.error("PayPal API Error:", errorText);
//       return res.json({ error: true, message: "Error processing payout", details: errorText });
//     }

//     // Parse JSON response from PayPal
//     const payoutData = await payoutResponse.json();
//     console.log("Payout Response:", payoutData);

//     // Proceed with transaction logging
//     // (Your transaction history logic here...)

//     res.json({
//       error: false,
//       message: "Transaction successfully processed",
//       data: payoutData,
//     });

//   } catch (error) {
//     console.error("Error in createTransactionHistory:", error.message);
//     res.status(500).json({ error: true, message: "Internal Server Error" });
//   } finally {
//     client.release();
//   }
// };

exports.createTransactionHistory = async (req, res) => {
  const { user_id, amount, email } = req.body;
  const client = await pool.connect();
  try {
    // const accessToken = await getAccessToken();
    // const payoutResponse = await fetch('https://api-m.sandbox.paypal.com/v1/payments/payouts', {
    //     method: 'POST',
    //     headers: {
    //         'Authorization': `Bearer ${accessToken}`,
    //         'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify({
    //         sender_batch_header: {
    //             sender_batch_id: `batch_${Date.now()}`,
    //             email_subject: 'You have a payout!',
    //             email_message: 'You have received a payout! Thanks for using our service.'
    //         },
    //         items: [{
    //             recipient_type: 'EMAIL',
    //             amount: {
    //                 value: amount,
    //                 currency: 'USD'
    //             },
    //             receiver: "sb-9b2qe31970612@personal.example.com",
    //             note: email_note,
    //             sender_item_id: `item_${Date.now()}`
    //         }]
    //     })
    // });

    // const payoutData = await payoutResponse.json();
    // const { batch_header, links } = payoutData;
    // const status = batch_header.batch_status;

    // console.log(batch_header);
    // console.log(status);
    // res.json({ PaypalWithdrawObject: batch_header, status_Payment: status, links: links });

    // check user id exist or not
    const userData = await pool.query("SELECT * FROM users WHERE user_id=$1", [
      user_id,
    ]);
    if (userData.rows.length === 0) {
      res.json({ error: true, message: "User Not Found!" });
    } else {
      // user email
      let user_email = userData.rows[0].email;
      // check balance from user wallet
      const userWalletData = await pool.query(
        "SELECT * FROM wallet WHERE user_id=$1 AND type=$2",

        [user_id, "withdrawl"]
      );
      if (userWalletData.rows.length === 0) {
        res.json({ error: true, message: "User wallet Not Found!" });
      } else {
        const userWalletBalance = userWalletData.rows[0].balance;
        if (parseInt(userWalletBalance) < parseInt(amount)) {
          res.json({ error: true, message: "Insufficient balance!" });
        } else {
          // ---------------------------Payout
          // Get an access token
          const accessToken = await getAccessToken();
          const payoutResponse = await fetch(
            `${PaypalSandBoxUrlmV2}/payments/payouts`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                sender_batch_header: {
                  sender_batch_id: `batch_${Date.now()}`,
                  email_subject: "You have a payout!",
                  email_message:
                    "You have received a payout! Thanks for using our service.",
                },
                items: [
                  {
                    recipient_type: "EMAIL",
                    amount: {
                      value: amount,
                      currency: "USD",
                    },
                    // receiver: user_email,
                    receiver: email,

                    note: email_note,
                    sender_item_id: `item_${Date.now()}`,
                  },
                ],
              }),
            }
          );

          const payoutData = await payoutResponse.json();
          const { batch_header, links } = payoutData;
          const status = batch_header.batch_status;

          console.log(batch_header);
          console.log(status);

          // ---------------------------Payout
          const type = "withdraw";
          const userDataTransaction = await pool.query(
            "INSERT INTO transaction_history(user_id,amount,type) VALUES($1,$2,$3) returning *",
            [user_id, amount, type]
          );
          if (userDataTransaction.rows.length > 0) {
            // update wallet
            const userWallet = await pool.query(
              "UPDATE wallet SET balance=$1 WHERE user_id=$2 AND type=$3  RETURNING *",
              [
                parseFloat(userWalletBalance) - parseFloat(amount),
                user_id,
                "withdrawl",
              ]
            );
            if (userWallet.rows.length > 0) {
              // res.json({ PaypalWithdrawObject: batch_header, status_Payment: status, links: links });

              res.status(200).json({
                PaypalWithdrawObject: batch_header,
                status_Payment: status,
                links: links,
                message: "Transaction history created successfully",
                data: userDataTransaction.rows[0],
              });
            } else {
              res
                .status(400)
                .json({ message: "Transaction history not created" });
            }
          } else {
            res
              .status(400)
              .json({ message: "Transaction history not created" });
          }
        }
      }
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
};
// get all transactions by user id
exports.getAllTransactionsByUserId = async (req, res) => {
  const { user_id, type } = req.query; // Added type to the query parameters
  const client = await pool.connect();
  try {
    let query;
    let queryParams = [user_id];

    // Determine the query based on the type filter
    if (type === "withdrawl") {
      query = `
        SELECT * 
        FROM transaction_history 
        WHERE user_id=$1 
          AND type IN ('entry fees', 'added to wallet', 'diverted', 'deposit',withdrawl) 
        ORDER BY created_at DESC
      `;
    } else if (type === "bonus") {
      query = `
        SELECT * 
        FROM transaction_history 
        WHERE user_id=$1 
          AND type NOT IN ('entry fees', 'added to wallet', 'diverted', 'deposit',withdrawl) 
        ORDER BY created_at DESC
      `;
    } else if (type === "all") {
      // Default query: fetch all transactions if no type filter is provided
      query = `
        SELECT * 
        FROM transaction_history 
        WHERE user_id=$1 
        ORDER BY created_at DESC
      `;
    }

    const result = await pool.query(query, queryParams);
    res.status(200).json({ message: "All transactions", data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
};

// get wallet value by user id
exports.getWalletValueByUserId1 = async (req, res) => {
  const { user_id } = req.query;
  const client = await pool.connect();
  try {
    const query = "SELECT * FROM wallet WHERE user_id=$1 AND type=$2";
    const result = await pool.query(query, [user_id, "withdrawl"]);
    // if user doesnot exist then return 0
    if (result?.rows?.length === 0) {
      res.status(200).json({
        message: "Wallet value",
        withdrawl_balance: 0,
        non_withdrawl_balance: 0,
        total_won_games: 0,
        total_played_games: 0,
        total_lose_games: 0,
      });
    } else {
      const queryw = "SELECT * FROM wallet WHERE user_id=$1 AND type=$2";
      const resultw = await pool.query(queryw, [user_id, "withdrawl"]);

      const query1 = "SELECT * FROM users WHERE user_id=$1";
      const result1 = await pool.query(query1, [user_id]);
      const total_played_games = result1?.rows[0]?.played_games;
      const total_won_games = result1?.rows[0]?.win_games;
      const total_lose_games =
        parseInt(total_played_games) - parseInt(total_won_games);

      res.status(200).json({
        message: "Wallet value",
        withdrawl_balance:
          Number(result?.rows[0]?.balance || 0) % 1 === 0
            ? Number(result?.rows[0]?.balance || 0)
            : Number(result?.rows[0]?.balance || 0).toFixed(2),
        non_withdrawl_balance:
          Number(resultw?.rows[1]?.balance || 0) % 1 === 0
            ? Number(resultw?.rows[1]?.balance || 0)
            : Number(resultw?.rows[1]?.balance || 0).toFixed(2),
        total_won_games: result1?.rows[0].win_games,
        total_played_games: result1.rows[0]?.played_games,
        total_lose_games: total_lose_games,
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
};
exports.getWalletValueByUserId = async (req, res) => {
  const { user_id } = req.query;
  const client = await pool.connect();

  try {
    // Fetch user details to get Stripe Customer ID
    const userQuery = "SELECT * FROM users WHERE user_id=$1";
    const userResult = await pool.query(userQuery, [user_id]);

    if (userResult.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "User not found", withdrawl_balance: 0 });
    }

    const user = userResult.rows[0];
    const stripeCustomerId = user.stripe_customer_id;

    // Fetch wallet balances
    const depositQuery = "SELECT * FROM wallet WHERE user_id=$1 AND type=$2";
    const depositResult = await pool.query(depositQuery, [
      user_id,
      "withdrawl",
    ]);

    const withdrawQuery = "SELECT * FROM wallet WHERE user_id=$1 AND type=$2";
    const withdrawResult = await pool.query(withdrawQuery, [user_id, "bonus"]);

    // Calculate total played, won, and lost games
    const total_played_games = user.played_games || 0;
    const total_won_games = user.win_games || 0;
    const total_lose_games =
      parseInt(total_played_games) - parseInt(total_won_games);

    // Fetch Stripe Billing Details if Stripe Customer ID exists
    let billingDetails = null;
    if (stripeCustomerId) {
      try {
        const customer = await stripe.customers.retrieve(stripeCustomerId);
        billingDetails = customer.address || null; // Address object or null
      } catch (stripeError) {
        console.error("Error fetching Stripe customer:", stripeError.message);
      }
    }

    res.status(200).json({
      message: "Wallet value",
      withdrawl_balance: Number(depositResult?.rows[0]?.balance || 0).toFixed(
        2
      ),
      bonus_balance: Number(withdrawResult?.rows[0]?.balance || 0).toFixed(2),
      total_won_games,
      total_played_games,
      total_lose_games,
      stripe_customer_id: stripeCustomerId || null,
      billing_details: billingDetails, // Returns null if no billing details are provided
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
};

// insert the transaction_request
// exports.insertTransactionRequest = async (req, res) => {
//   const { user_id, amount, type, payment_object } = req.body;
//   const client = await pool.connect();
//   try {
//     // check wallet of user by user id and type withdrawl
//     const userWalletData = await pool.query(
//       "SELECT * FROM wallet WHERE user_id=$1 AND type=$2",
//       [user_id, "withdrawl"]
//     );
//     if (userWalletData.rows.length === 0) {
//       res.json({ error: true, message: "User wallet Not Found!" });
//     }
//     // check balance from user wallet
//     const userWalletBalance = userWalletData.rows[0].balance;
//     if (parseInt(userWalletBalance) < parseInt(amount)) {
//       res.json({ error: true, message: "Insufficient balance!" });
//     }

//     const query =
//       "INSERT INTO transaction_request(user_id,amount,type,payment_object,status) VALUES($1,$2,$3,$4,$5) returning *";
//     const result = await pool.query(query, [
//       user_id,
//       amount,
//       type,
//       payment_object,
//       "pending",
//     ]);
//     if (result.rows.length > 0) {
//       // Step 4: Retrieve all admin users
//       const adminUsers = await pool.query(
//         "SELECT user_id, email, device_token, web_token FROM users WHERE role = $1",
//         ["admin"]
//       );

//       // Step 5: Send notifications to all admins
//       let title = "New Withdrawal Request";
//       let body = `A withdrawal request of ${amount} has been created.`;
//       let data = {
//         user_id,
//         amount,
//         result: result.rows[0],
//       };

//       for (const admin of adminUsers.rows) {
//         const token = {
//           deviceToken: admin.device_token,
//           webToken: admin.web_token,
//         };
//         sendNotification(token, title, body, data);
//       }

//       return res.status(200).json({
//         error: false,
//         message: "Transaction request created successfully",
//         data: result.rows[0],
//       });
//     } else {
//       res
//         .status(400)
//         .json({ message: "Transaction request not created", error: true });
//     }
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Internal server error", error: true });
//   } finally {
//     client.release();
//   }
// };
exports.insertTransactionRequest = async (req, res) => {
  const { user_id, amount, type, payment_object } = req.body;
  const client = await pool.connect();

  try {
    // Step 1: Check if the user has a withdrawal wallet
    const userWalletData = await client.query(
      "SELECT * FROM wallet WHERE user_id=$1 AND type=$2",
      [user_id, "withdrawl"]
    );

    if (userWalletData.rows.length === 0) {
      return res
        .status(400)
        .json({ error: true, message: "User wallet not found!" });
    }

    // Step 2: Check if the user has enough balance
    const userWalletBalance = parseFloat(userWalletData.rows[0].balance);
    if (userWalletBalance < parseFloat(amount)) {
      return res
        .status(400)
        .json({ error: true, message: "Insufficient balance!" });
    }

    // Step 3: Insert withdrawal request
    const query = `
      INSERT INTO transaction_request(user_id, amount, type, payment_object, status)
      VALUES($1, $2, $3, $4, $5) RETURNING *`;

    const result = await client.query(query, [
      user_id,
      amount,
      type,
      payment_object,
      "pending",
    ]);

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: true,
        message: "Transaction request not created",
      });
    }

    // Step 4: Retrieve all admin users
    const adminUsers = await client.query(
      "SELECT user_id, email, device_token, web_token FROM users WHERE role = $1",
      ["admin"]
    );

    // Step 5: Send notifications to all admins
    const title = "New Withdrawal Request";
    const body = `A withdrawal request of ${amount} has been created.`;
    const data = {
      userId: user_id,
      amount,
      transaction: result.rows[0],
    };
    let type1 = "withdraw_desposit";

    for (const admin of adminUsers.rows) {
      const token = {
        deviceToken: admin.device_token,
        webToken: admin.web_token,
      };
      await sendNotification(token, title, body, data, type1);
    }

    // Step 6: Return success response
    return res.status(200).json({
      error: false,
      message: "Transaction request created successfully",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("Error inserting transaction request:", err);
    return res
      .status(500)
      .json({ message: "Internal server error", error: true });
  } finally {
    client.release(); // Ensure client is always released
  }
};
// get all tramnsaction requests paginated and also get by status filter
exports.getAllTransactionRequests = async (req, res) => {
  const { page = 1, limit = 10, status } = req.query; // Default values for page and limit
  const offset = (page - 1) * limit; // Calculate offset
  const client = await pool.connect();

  try {
    let query;
    let values;

    // Build query based on whether status is provided
    if (status) {
      query = `
        SELECT 
          tr.*, 
          u.user_name, 
          u.email 
        FROM transaction_request tr
        LEFT JOIN users u 
        ON tr.user_id::INT = u.user_id
        WHERE tr.status = $1
        ORDER BY tr.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      values = [status, limit, offset];
    } else {
      query = `
        SELECT 
          tr.*, 
          u.user_name, 
          u.email 
        FROM transaction_request tr
        LEFT JOIN users u 
        ON tr.user_id::INT = u.user_id
        ORDER BY tr.created_at DESC
        LIMIT $1 OFFSET $2
      `;
      values = [limit, offset];
    }

    // Execute query
    const result = await client.query(query, values);

    res.status(200).json({
      message: "All transaction requests with user details",
      data: result.rows,
      error: false,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error", error: true });
  } finally {
    client.release();
  }
};
// update transaction_request status success and screenshot is optional also add transaction history
// exports.updateTransactionRequest = async (req, res) => {
//   const { transaction_request_id, screenshot, status } = req.body;
//   const client = await pool.connect();
//   try {
//     let query;
//     let values;
//     // const status = "completed";

//     // Build query for updating transaction request
//     if (screenshot) {
//       query =
//         "UPDATE transaction_request SET status=$1, screenshot=$2 WHERE transaction_request_id=$3 RETURNING *";
//       values = [status, screenshot, transaction_request_id];
//     } else {
//       query =
//         "UPDATE transaction_request SET status=$1 WHERE transaction_request_id=$2 RETURNING *";
//       values = [status, transaction_request_id];
//     }

//     const result = await client.query(query, values);

//     if (result.rows.length === 0) {
//       return res.status(400).json({
//         message: "Transaction request not found or not updated",
//         error: true,
//       });
//     }
//     let { user_id, amount, type } = result.rows[0];
//     let money_type = result.rows[0].type;

//     if (status === "completed") {
//       // Fetch user wallet for type "withdrawal"
//       const userWalletData = await client.query(
//         "SELECT * FROM wallet WHERE user_id=$1 AND type=$2",
//         [user_id, "withdrawl"]
//       );

//       if (userWalletData.rows.length === 0) {
//         return res.status(400).json({
//           message: "User wallet not found",
//           error: true,
//         });
//       }

//       // Check if wallet has sufficient balance
//       const userWalletBalance = userWalletData.rows[0].balance;

//       if (parseFloat(userWalletBalance) < parseFloat(amount)) {
//         return res.status(400).json({
//           message: "Insufficient balance in user wallet",
//           error: true,
//         });
//       }
//       // Add transaction to transaction_history
//       const userDataTransaction = await client.query(
//         "INSERT INTO transaction_history (user_id, amount, type, money_type, screenshoot) VALUES ($1, $2, $3, $4, $5) RETURNING *",
//         [user_id, amount, "withdrawl-request-rejected", money_type, screenshot]
//       );

//       if (userDataTransaction.rows.length === 0) {
//         return res.status(400).json({
//           message: "Failed to record transaction history",
//           error: true,
//         });
//       }

//       // Deduct amount from wallet
//       const updatedWallet = await client.query(
//         "UPDATE wallet SET balance=$1 WHERE user_id=$2 AND type=$3 RETURNING *",
//         [
//           parseFloat(userWalletBalance) - parseFloat(amount),
//           user_id,
//           "withdrawl",
//         ]
//       );

//       if (updatedWallet.rows.length === 0) {
//         return res.status(400).json({
//           message: "Failed to update user wallet",
//           error: true,
//         });
//       }
//     } else {
//       // rejected
//       const userDataTransaction = await client.query(
//         "INSERT INTO transaction_history (user_id, amount, type, money_type, screenshoot) VALUES ($1, $2, $3, $4, $5) RETURNING *",
//         [user_id, amount, type, money_type, screenshot]
//       );

//       if (userDataTransaction.rows.length === 0) {
//         return res.status(400).json({
//           message: "Failed to record transaction history",
//           error: true,
//         });
//       }
//     }

//     // Respond with success after all operations
//     res.status(200).json({
//       message:
//         "Transaction request status updated and wallet adjusted successfully",
//       data: result.rows[0],
//       error: false,
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Internal server error", error: true });
//   } finally {
//     client.release();
//   }
// };
exports.updateTransactionRequest = async (req, res) => {
  const { transaction_request_id, screenshot, status } = req.body;
  const client = await pool.connect();
  try {
    let query;
    let values;

    // Build query for updating transaction request
    if (screenshot) {
      query =
        "UPDATE transaction_request SET status=$1, screenshot=$2 WHERE transaction_request_id=$3 RETURNING *";
      values = [status, screenshot, transaction_request_id];
    } else {
      query =
        "UPDATE transaction_request SET status=$1 WHERE transaction_request_id=$2 RETURNING *";
      values = [status, transaction_request_id];
    }

    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return res.status(400).json({
        message: "Transaction request not found or not updated",
        error: true,
      });
    }
    console.log("resuklt", result.rows);
    const { user_id, amount, type } = result.rows[0];
    const money_type = result.rows[0].type;
    const detail_data = result.rows[0];
    console.log("detail data ", detail_data);

    if (status === "completed") {
      // Fetch user wallet for type "withdrawal"
      const userWalletData = await client.query(
        "SELECT * FROM wallet WHERE user_id=$1 AND type=$2",
        [user_id, "withdrawl"]
      );

      if (userWalletData.rows.length === 0) {
        return res.status(400).json({
          message: "User wallet not found",
          error: true,
        });
      }

      // Check if wallet has sufficient balance
      const userWalletBalance = userWalletData.rows[0].balance;

      if (parseFloat(userWalletBalance) < parseFloat(amount)) {
        return res.status(400).json({
          message: "Insufficient balance in user wallet",
          error: true,
        });
      }

      // Add transaction to transaction_history
      const userDataTransaction = await client.query(
        "INSERT INTO transaction_history (user_id, amount, type,money_type, money_type_details, screenshoot,withdrawl_object) VALUES ($1, $2, $3, $4, $5,$6,$7) RETURNING *",
        // [
        //   user_id,
        //   amount,
        //   "withdrawl",
        //   "manual",
        //   money_type,
        //   screenshot,
        //   detail_data,
        // ]
        [
          user_id,
          amount,
          "withdrawl",
          "manual",
          detail_data?.type,
          screenshot,
          JSON.stringify(detail_data),
        ]
      );

      if (userDataTransaction.rows.length === 0) {
        return res.status(400).json({
          message: "Failed to record transaction history",
          error: true,
        });
      }

      // Deduct amount from wallet
      const updatedWallet = await client.query(
        "UPDATE wallet SET balance=$1 WHERE user_id=$2 AND type=$3 RETURNING *",
        [
          parseFloat(userWalletBalance) - parseFloat(amount),
          user_id,
          "withdrawl",
        ]
      );

      if (updatedWallet.rows.length === 0) {
        return res.status(400).json({
          message: "Failed to update user wallet",
          error: true,
        });
      }
    } else {
      // Rejected transaction
      const userDataTransaction = await client.query(
        "INSERT INTO transaction_history (user_id, amount, type, money_type,money_type_details, screenshoot,withdrawl_object) VALUES ($1, $2, $3, $4, $5,$6,$7) RETURNING *",
        [
          user_id,
          amount,
          "withdrawl",
          "manual",
          detail_data?.type,
          screenshot,
          JSON.stringify(detail_data),
        ]
      );

      if (userDataTransaction.rows.length === 0) {
        return res.status(400).json({
          message: "Failed to record transaction history",
          error: true,
        });
      }
    }
    // Fetch user FCM tokens for notifications
    const userResult = await client.query(
      "SELECT device_token, web_token FROM users WHERE user_id=$1",
      [user_id]
    );

    if (userResult.rows.length > 0) {
      const { device_token, web_token } = userResult.rows[0];

      const token = {
        deviceToken: device_token,
        webToken: web_token,
      };

      if (!token.deviceToken && !token.webToken) {
        console.warn(
          `No FCM token found for user ${user_id}, skipping notification.`
        );
      } else {
        const title = `Withdrawal Request ${
          status === "completed" ? "Approved" : "Rejected"
        }`;
        const body = `Your withdrawal request of ${amount} has been ${status}.`;
        const type = "withdraw_desposit";
        const data = { transaction_request_id, status, amount };

        sendNotification(token, title, body, data, type);
      }
    }

    // Respond with success after all operations
    return res.status(200).json({
      message:
        "Transaction request status updated and wallet adjusted successfully",
      data: result.rows[0],
      error: false,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Internal server error", error: true });
  } finally {
    client.release();
  }
};
