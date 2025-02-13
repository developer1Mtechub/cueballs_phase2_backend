const { pool } = require("../../config/db.config");
const crypto = require("crypto");
const WelcomeEmail = require("../../welcomeEmail");
const VerificationEmail = require("../../emailVerification");
const { secret_key_hash } = require("../../stripe_keys");
const { sendNotification } = require("../../utils/sendNotification");
const WelcomeEmailSubadmin = require("../../welcomeEmailsubadmin");
const moment = require("moment");

// user Registration
exports.registerCustomer = async (req, res, next) => {
  const client = await pool.connect();
  try {
    // Email
    //   const subject="Welcome Email"

    //   const date = new Date()
    //   const month = date.toLocaleString('default', { month: 'short' });
    //   const day = date.getDate()
    //   const year = date.getFullYear()
    //   const dateToday = month+" "+day+","+year

    //   PaymentSuccess('rimshanimo22@gmail.com', subject,443,200,44,33,dateToday)
    //   res.json({ error: true, data: [], message: "Catch eror" });

    const {
      email,
      user_name,
      password,
      signup_type,
      access_token,
      device_token,
      web_token,
    } = req.body;
    // const company_user = false;
    if (email === null || email === "" || email === undefined) {
      res.json({ error: true, message: "Please Provide User Email" });
    } else {
      const userDataCheck = await pool.query(
        "SELECT * FROM users WHERE email=$1",
        [email]
      );

      if (userDataCheck.rows.length === 0) {
        let hashedPassword = null;
        if (password === null || password === "" || password === undefined) {
        } else {
          hashedPassword = crypto
            .createHash("sha256")
            .update(password + secret_key_hash)
            .digest("hex");
        }
        const deleted_user = false;
        const account_status = "active";
        const played_games = 0;
        const win_games = 0;

        const userData = await pool.query(
          "INSERT INTO users(user_name,email,password,signup_type,access_token,deleted_user,account_status,played_games,win_games,device_token,web_token,role) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning *",
          [
            user_name || null,
            email,
            hashedPassword || null,
            signup_type,
            access_token || null,
            deleted_user,
            account_status,
            played_games,
            win_games,
            device_token || null,
            web_token || null,
            "user",
          ]
        );
        if (userData.rows.length === 0) {
          res.json({ error: true, data: [], message: "Can't Create User" });
        } else {
          const data = userData.rows[0];
          const user_id = userData.rows[0].user_id;
          const balance = 0;
          // create wallet
          const walletData = await pool.query(
            "INSERT INTO wallet(user_id,balance,type) VALUES($1,$2,$3) returning *",
            [user_id, balance, "bonus"]
          );
          const walletData1 = await pool.query(
            "INSERT INTO wallet(user_id,balance,type) VALUES($1,$2,$3) returning *",
            [user_id, balance, "withdrawl"]
          );
          // Email
          const subject = "Welcome Email";
          WelcomeEmail(email, subject);

          res.json({
            error: false,
            data,
            wallet: walletData.rows[0],
            message: "User Created Successfully",
          });
        }
      } else {
        console.log(userDataCheck.rows[0].deleted_user);
        const deletedStatus = userDataCheck.rows[0].deleted_user;
        if (deletedStatus === true || deletedStatus === "true") {
          // user has been deleted response
          res.json({
            error: true,
            data: [],
            message: "This email has account deleted",
          });
        } else {
          const data = userDataCheck.rows[0];
          res.json({ error: true, data, message: "Email Already Exist" });
        }
      }
    }
  } catch (err) {
    console.log(err);
    res.json({ error: true, data: [], message: "Catch eror" });
  } finally {
    client.release();
  }
};
exports.registerCustomer1 = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { email, password, caller_id, agent_name, permissions } = req.body;
    // const company_user = false;
    if (email === null || email === "" || email === undefined) {
      res.json({ error: true, message: "Please Provide User Email" });
    } else {
      const userDataCheck = await pool.query(
        "SELECT * FROM users WHERE email=$1",
        [email]
      );

      if (userDataCheck.rows.length === 0) {
        let hashedPassword = null;
        if (password === null || password === "" || password === undefined) {
        } else {
          hashedPassword = crypto
            .createHash("sha256")
            .update(password + secret_key_hash)
            .digest("hex");
        }

        const userData = await pool.query(
          "INSERT INTO users(email,password,role,caller_id,agent_name,permissions,account_status,signup_type,deleted_user) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *",
          [
            email,
            hashedPassword || null,
            "subadmin",
            caller_id,
            agent_name,
            permissions,
            "active",
            "email",
            false,
          ]
        );
        if (userData.rows.length === 0) {
          res.json({ error: true, data: [], message: "Can't Create User" });
        } else {
          const data = userData.rows[0];
          const user_id = userData.rows[0].user_id;
          const balance = 0;
          // create wallet
          const walletData = await pool.query(
            "INSERT INTO wallet(user_id,balance,type) VALUES($1,$2,$3) returning *",
            [user_id, balance, "withdrawl"]
          );
          const walletData1 = await pool.query(
            "INSERT INTO wallet(user_id,balance,type) VALUES($1,$2,$3) returning *",
            [user_id, balance, "bonus"]
          );
          // Email
          const subject = "Welcome Email";
          WelcomeEmailSubadmin(email, subject, password);

          res.json({
            error: false,
            data,
            wallet: walletData.rows[0],
            message: "Agent Created Successfully",
          });
        }
      } else {
        console.log(userDataCheck.rows[0].deleted_user);
        const deletedStatus = userDataCheck.rows[0].deleted_user;
        if (deletedStatus === true || deletedStatus === "true") {
          // user has been deleted response
          res.json({
            error: true,
            data: [],
            message: "This email has account deleted",
          });
        } else {
          const data = userDataCheck.rows[0];
          res.json({ error: true, data, message: "Email Already Exist" });
        }
      }
    }
  } catch (err) {
    console.log(err);
    res.json({ error: true, data: [], message: "Catch eror" });
  } finally {
    client.release();
  }
};

exports.get_subadmin = async (req, res) => {
  const client = await pool.connect();
  try {
    let { page, limit } = req.query;

    // Set default values if not provided
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const offset = (page - 1) * limit;

    // Query to get total count for pagination metadata
    const countResult = await pool.query(
      "SELECT COUNT(*) FROM users WHERE role = 'subadmin' "
    );
    const totalRows = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalRows / limit);

    // Query to fetch paginated sub-admins
    const subadmin = await pool.query(
      "SELECT * FROM users WHERE role = 'subadmin' AND deleted_user = 'false' ORDER BY created_at LIMIT $1 OFFSET $2",
      [limit, offset]
    );

    res.status(200).json({
      error: false,
      page,
      limit,
      totalRows,
      totalPages,
      data: subadmin.rows,
    });
  } catch (error) {
    console.error("Error fetching sub-admins:", error);
    res.status(500).json({ error: true, message: "Server error" });
  } finally {
    client.release();
  }
};
exports.update_subadmin = async (req, res) => {
  const client = await pool.connect();
  try {
    const { user_id, agent_name, caller_id, permissions } = req.body;
    const userData = await pool.query(
      "UPDATE users SET agent_name=$1,caller_id=$2,permissions=$3 WHERE user_id=$4 RETURNING *",
      [agent_name, caller_id, permissions, user_id]
    );
    res.status(200).json({
      error: false,
      message: "Subadmin Updated Successfully",
      data: userData.rows[0],
    });
  } catch (error) {
    console.error("Error updating subadmin:", error);
    res.status(500).json({ error: true, message: "Server error" });
  } finally {
    client.release();
  }
};
// update subadmin password
exports.update_subadmin_password = async (req, res) => {
  const client = await pool.connect();
  try {
    const { user_id, password } = req.body;
    let hashedPassword = null;
    hashedPassword = crypto
      .createHash("sha256")
      .update(password + secret_key_hash)
      .digest("hex");
    const userData = await pool.query(
      "UPDATE users SET password=$1 WHERE user_id=$2 RETURNING *",
      [hashedPassword, user_id]
    );
    res.status(200).json({
      error: false,
      message: "Subadmin Password Updated Successfully",
      data: userData.rows[0],
    });
  } catch (error) {
    console.error("Error updating subadmin password:", error);
    res.status(500).json({ error: true, message: "Server error" });
  } finally {
    client.release();
  }
};
exports.delete_subadmin = async (req, res) => {
  const client = await pool.connect();
  try {
    const { user_id } = req.body;
    const userData = await pool.query(
      "UPDATE users SET deleted_user=true WHERE user_id=$1 RETURNING *",
      [user_id]
    );
    res.status(200).json({
      error: false,
      message: "Subadmin Deleted Successfully",
      data: userData.rows[0],
    });
  } catch (error) {
    console.error("Error deleting subadmin:", error);
    res.status(500).json({ error: true, message: "Server error" });
  } finally {
    client.release();
  }
};
exports.signinCustomer = async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      email,
      password,
      signin_type,
      access_token,
      device_token,
      web_token,
    } = req.body;

    if (!email) {
      return res.json({ error: true, message: "Please Provide Email" });
    }

    const userDataCheck = await pool.query(
      "SELECT * FROM users WHERE email=$1 AND role=$2",
      [email, "user"]
    );

    if (userDataCheck.rows.length === 0) {
      return res.json({
        error: true,
        data: [],
        message: "No User exists for this email",
      });
    }

    const user = userDataCheck.rows[0];

    if (user.account_status === "inactive") {
      return res.json({
        error: true,
        data: [],
        message: "Your account is inactive",
      });
    }

    const signup_type = user.signup_type;
    const user_id = user.user_id;

    let query = "UPDATE users SET ";
    let index = 2;
    let values = [user_id];

    if (access_token) {
      query += `access_token = $${index}, `;
      values.push(access_token);
      index++;
    }
    if (device_token) {
      query += `device_token = $${index}, `;
      values.push(device_token);
      index++;
    }
    if (web_token) {
      query += `web_token = $${index}, `;
      values.push(web_token);
      index++;
    }

    if (signin_type === "google" || signin_type === "apple") {
      if (signup_type === signin_type) {
        // Continue with Google/Apple login
        query += "WHERE user_id = $1 RETURNING *";
        query = query.replace(/,\s+WHERE/g, " WHERE");

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
          return res.json({
            error: true,
            data: [],
            message: "Something went wrong",
          });
        }

        return res.json({
          error: false,
          data: result.rows[0],
          message: "User Login Successfully",
        });
      } else {
        // Update signup type to new method
        query += `signup_type = $${index}, `;
        values.push(signin_type);
        index++;

        query += "WHERE user_id = $1 RETURNING *";
        query = query.replace(/,\s+WHERE/g, " WHERE");

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
          return res.json({
            error: true,
            data: [],
            message: "Something went wrong",
          });
        }

        return res.json({
          error: false,
          data: result.rows[0],
          message: "User Login Successfully",
        });
      }
    } else {
      if (signup_type === "google" || signup_type === "apple") {
        // User signed up with Google/Apple, but trying to log in with email
        return res.json({
          error: true,
          data: user,
          message:
            "Please log in with the method you used to sign up (Google or Email).",
        });
      } else {
        // Email/Password login

        const hashedPasswordFromDb = user.password;
        const hashedUserEnteredPassword = crypto
          .createHash("sha256")
          .update(password + secret_key_hash)
          .digest("hex");

        if (hashedPasswordFromDb === hashedUserEnteredPassword) {
          // Update tokens after successful login
          query += "WHERE user_id = $1 RETURNING *";
          query = query.replace(/,\s+WHERE/g, " WHERE");

          const result = await pool.query(query, values);

          if (result.rows.length === 0) {
            return res.json({
              error: true,
              data: [],
              message: "Something went wrong",
            });
          }

          return res.json({
            error: false,
            data: result.rows[0],
            message: "Login Successfully",
          });
        } else {
          return res.json({ error: true, message: "Invalid Credentials" });
        }
      }
    }
  } catch (err) {
    console.error("Error during login:", err);
    res.json({ error: true, data: [], message: "An error occurred" });
  } finally {
    client.release();
  }
};
exports.addMoneyToWallet = async (req, res) => {
  const client = await pool.connect();
  try {
    const { user_id, amount, money_type, screenshoot } = req.body;

    // Validate input
    if (!user_id || !amount || !money_type) {
      return res.status(400).json({
        error: true,
        message: "user_id, amount, and money_type are required.",
      });
    }

    // Parse amount to ensure it's a valid number
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        error: true,
        message: "Amount must be a valid positive number.",
      });
    }

    // Format money_type: capitalize and replace spaces with underscores
    const formattedMoneyType = money_type.toUpperCase().replace(/\s+/g, "_");

    // Check if the user exists
    const userResult = await pool.query(
      "SELECT * FROM users WHERE user_id = $1",
      [user_id]
    );
    let user_data = userResult.rows[0];
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: true,
        message: "User not found.",
      });
    }

    // Fetch the user's wallet
    const walletResult = await pool.query(
      "SELECT * FROM wallet WHERE user_id = $1 AND type = $2",
      [user_id, "withdrawl"]
    );
    let wallet;
    console.log("wallet result", walletResult.rows[0]);
    let balance = 0;
    let prev_amount = walletResult.rows[0].balance;
    balance = parseFloat(prev_amount) + parseFloat(amount);
    if (walletResult.rows.length === 0) {
      // If the wallet doesn't exist, create a new one
      const newWallet = await pool.query(
        `INSERT INTO wallet (user_id, balance,type) VALUES ($1, $2,$3) RETURNING *`,
        [user_id, balance.toFixed(2), "withdrawl"]
      );
      wallet = newWallet.rows[0];
    } else {
      // If the wallet exists, update the balance
      wallet = walletResult.rows[0];
      // const updatedBalance = parseFloat(wallet.balance || "0") + parsedAmount;
      const updatedWallet = await pool.query(
        `UPDATE wallet SET balance = $1, updated_at = NOW() WHERE user_id = $2 AND type=$3 RETURNING *`,
        [balance.toFixed(2), user_id, "withdrawl"]
      );
      wallet = updatedWallet.rows[0];
    }

    // Log the transaction in transaction_history

    let result = await pool.query(
      `INSERT INTO transaction_history (user_id, amount, type, money_type_details,screenshoot,money_type)
       VALUES ($1, $2, $3, $4,$5,$6) RETURNING *`,
      [
        user_id,
        balance.toFixed(2),
        "deposit",
        formattedMoneyType,
        screenshoot || null,
        "manual",
      ]
    );
    let token = {
      deviceToken: user_data.device_token,
      webToken: user_data.web_token,
    };
    const title = `Money Added`;
    const body = `Money has been added to your wallet.`;
    const type = "manual_deposit";
    console.log("result", result);
    const data = {
      user_id: user_id,
      result: result.rows[0],
    };

    sendNotification(token, title, body, data, type);
    console.log(`Notification sent to user ${user_id}`);

    await pool.query(
      "INSERT INTO notifications (user_id, title, body, type) VALUES ($1, $2, $3, $4)",
      [user_id, title, body, type]
    );

    // Respond with the updated wallet information
    res.json({
      error: false,
      data: wallet,
      message: "Money successfully added to the wallet.",
    });
  } catch (err) {
    console.error("Error adding money to wallet:", err);
    res.status(500).json({ error: true, message: "An error occurred." });
  } finally {
    client.release();
  }
};

exports.verifyEmail = async (req, res) => {
  const client = await pool.connect();
  try {
    const { email } = req.body;
    // const company_user = false;
    if (email === null || email === "" || email === undefined) {
      res.json({ error: true, message: "Please Provide Email" });
    } else {
      const userDataCheck = await pool.query(
        "SELECT * FROM users WHERE email=$1",
        [email]
      );

      if (userDataCheck.rows.length === 0) {
        res.json({ error: true, message: "Email is not Registered" });
      } else {
        const resetLink = Math.floor(
          100000 + Math.random() * 900000
        ).toString();
        const user_name = email.split("@")[0];
        const subject = "Verify Email";
        const message =
          "You have requested to reset your password. Here is your OTP code for password reset.";
        const userDataEmailCheck = await pool.query(
          "SELECT * FROM otp_verification_user WHERE email=$1",
          [email]
        );
        if (userDataEmailCheck.rows.length === 0) {
          // res.json({ error: true, message: "Email is not Registered" });
          const userData = await pool.query(
            "INSERT INTO otp_verification_user(email,otp) VALUES($1,$2) returning *",
            [email, resetLink]
          );
          if (userData.rows.length === 0) {
            // res.json({ error: true, data: [], message: "Can't Save OTP" });
            res.json({
              error: true,
              otp: resetLink,
              message: "Cant Verify Right Now!",
            });
            // Emailtemplate(email, resetLink, subject, message, user_name)
          } else {
            res.json({
              error: false,
              otp: resetLink,
              message: "Email sent successfully!",
            });
            VerificationEmail(email, subject, resetLink);
          }
        } else {
          const userData = await pool.query(
            "UPDATE otp_verification_user SET otp=$1, created_at=CURRENT_TIMESTAMP WHERE email=$2 returning *",
            [resetLink, email]
          );
          if (userData.rows.length === 0) {
            // res.json({ error: true, data: [], message: "Can't Save OTP" });
            res.json({
              error: true,
              otp: resetLink,
              message: "Cant Verify Right Now!",
            });
            // Emailtemplate(email, resetLink, subject, message, user_name)
          } else {
            res.json({
              error: false,
              otp: resetLink,
              message: "Email sent successfully!",
            });
            VerificationEmail(email, subject, resetLink);
          }
        }
      }
    }
  } catch (err) {
    res.json({ error: true, data: err, message: "Catch eror" });
  } finally {
    client.release();
  }
};
exports.verificationOtp = async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, otp } = req.body;
    // const company_user = false;
    if (email === null || email === "" || email === undefined) {
      res.json({ error: true, message: "Please Provide Email" });
    } else {
      const userDataCheck = await pool.query(
        "SELECT * FROM otp_verification_user WHERE email=$1",
        [email]
      );

      if (userDataCheck.rows.length === 0) {
        res.json({
          error: true,
          message: "Didn't Get any OTP for this email!",
        });
      } else {
        const resetLink = userDataCheck.rows[0].otp;
        const createdAt = userDataCheck.rows[0].created_at;
        const currentTime = new Date();
        const timeDifference = (currentTime - createdAt) / 1000 / 60; // difference in minutes

        if (timeDifference > 15) {
          res.json({ error: true, message: "OTP has expired!" });
        } else if (resetLink === otp) {
          res.json({
            error: false,
            otp: resetLink,
            message: "OTP Verified Successfully!",
          });
        } else {
          res.json({
            error: true,
            otp: resetLink,
            message: "OTP is not Correct!",
          });
        }
      }
    }
  } catch (err) {
    res.json({ error: true, data: err, message: "Catch eror" });
  } finally {
    client.release();
  }
};
exports.resetPassword = async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, password } = req.body;

    const hashedPassword = crypto
      .createHash("sha256")
      .update(password + secret_key_hash)
      .digest("hex");
    // const company_user = false;
    if (email === null || email === "" || email === undefined) {
      res.json({ error: true, message: "Please Provide Email" });
    } else {
      const query1 = "SELECT * FROM users WHERE email =$1";
      const result1 = await pool.query(query1, [email]);
      if (result1.rows.length === 0) {
        res.json({ error: true, message: "Email Doesnot Exist" });
      } else {
        const signup_type = result1.rows[0].signup_type;
        if (signup_type === "email") {
          // if email
          let query = "UPDATE users SET ";
          let index = 2;
          let values = [email];

          if (hashedPassword) {
            query += `password = $${index} , `;
            values.push(hashedPassword);
            index++;
          }
          query += "WHERE email = $1 RETURNING*";
          query = query.replace(/,\s+WHERE/g, " WHERE");
          const result = await pool.query(query, values);

          if (result.rows.length === 0) {
            res.json({
              error: true,
              data: [],
              message: "Something went wrong",
            });
          } else {
            res.json({
              error: false,
              data: result.rows,
              message: "Password reset successfully!",
            });
          }
        } else {
          // if google and apple
          let query = "UPDATE users SET ";
          let signup_type = "email";

          let index = 2;
          let values = [email];

          if (hashedPassword) {
            query += `password = $${index} , `;
            values.push(hashedPassword);
            index++;
          }
          if (signup_type) {
            query += `signup_type = $${index} , `;
            values.push(signup_type);
            index++;
          }
          query += "WHERE email = $1 RETURNING*";
          query = query.replace(/,\s+WHERE/g, " WHERE");
          const result = await pool.query(query, values);

          if (result.rows.length === 0) {
            res.json({
              error: true,
              data: [],
              message: "Something went wrong",
            });
          } else {
            res.json({
              error: false,
              data: result.rows,
              message: "Password reset successfully!",
            });
          }
        }
      }
    }
  } catch (err) {
    res.json({ error: true, data: [], message: "Catch eror" });
  } finally {
    client.release();
  }
};
exports.resetPasswordProfile = async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, old_password, new_password } = req.body;

    const hashedOldPassword = crypto
      .createHash("sha256")
      .update(old_password + secret_key_hash)
      .digest("hex");
    const hashedPassword = crypto
      .createHash("sha256")
      .update(new_password + secret_key_hash)
      .digest("hex");
    // const company_user = false;
    if (email === null || email === "" || email === undefined) {
      res.json({ error: true, message: "Please Provide Email" });
    } else {
      const query1 = "SELECT * FROM users WHERE email =$1";
      const result1 = await pool.query(query1, [email]);
      if (result1.rows.length === 0) {
        res.json({ error: true, message: "Email Doesnot Exist" });
      } else {
        const signup_type = result1.rows[0].signup_type;
        if (signup_type === "email") {
          // if email
          // check old password
          const hashedPasswordFromDb = result1.rows[0].password;
          if (hashedPasswordFromDb === hashedOldPassword) {
            let query = "UPDATE users SET ";
            let index = 2;
            let values = [email];

            if (hashedPassword) {
              query += `password = $${index} , `;
              values.push(hashedPassword);
              index++;
            }
            query += "WHERE email = $1 RETURNING*";
            query = query.replace(/,\s+WHERE/g, " WHERE");
            const result = await pool.query(query, values);

            if (result.rows.length === 0) {
              res.json({
                error: true,
                data: [],
                message: "Something went wrong",
              });
            } else {
              res.json({
                error: false,
                data: result.rows,
                message: "Password reset successfully!",
              });
            }
          } else {
            res.json({ error: true, message: "Old Password is not correct" });
          }
        } else {
          // if google and apple
          let query = "UPDATE users SET ";
          let signup_type = "email";

          let index = 2;
          let values = [email];

          if (hashedPassword) {
            query += `password = $${index} , `;
            values.push(hashedPassword);
            index++;
          }
          if (signup_type) {
            query += `signup_type = $${index} , `;
            values.push(signup_type);
            index++;
          }
          query += "WHERE email = $1 RETURNING*";
          query = query.replace(/,\s+WHERE/g, " WHERE");
          const result = await pool.query(query, values);

          if (result.rows.length === 0) {
            res.json({
              error: true,
              data: [],
              message: "Something went wrong",
            });
          } else {
            res.json({
              error: false,
              data: result.rows,
              message: "Password reset successfully!",
            });
          }
        }
      }
    }
  } catch (err) {
    res.json({ error: true, data: [], message: "Catch eror" });
  } finally {
    client.release();
  }
};
// admin sign in
exports.signinAdmin = async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, password } = req.body;
    // const company_user = false;
    if (email === null || email === "" || email === undefined) {
      res.json({ error: true, message: "Please Provide Email" });
    } else {
      const userDataCheck = await pool.query(
        "SELECT * FROM users WHERE email=$1 AND deleted_user!=$2",
        [email, true]
      );

      if (userDataCheck.rows.length === 0) {
        res.json({
          error: true,
          data: [],
          message: "No Admin exist for this email",
        });
      } else {
        // login
        const hashedPasswordFromDb = userDataCheck.rows[0].password;
        let admin_details = userDataCheck.rows[0];

        const hashedUserEnteredPassword = crypto
          .createHash("sha256")

          .update(password + secret_key_hash)
          .digest("hex");
        const subject = "Verify Email";

        const resetLink = Math.floor(
          100000 + Math.random() * 900000
        ).toString();

        if (hashedPasswordFromDb === hashedUserEnteredPassword) {
          //     VerificationEmail(email, subject, resetLink);

          //   res.json({
          //     error: false,
          //     data: userDataCheck.rows[0],
          //     message: "Verify Email OTP",
          //   });
          // OTP SEND
          const userDataEmailCheck = await pool.query(
            "SELECT * FROM otp_verification_user WHERE email=$1",
            [email]
          );
          if (userDataEmailCheck.rows.length === 0) {
            // res.json({ error: true, message: "Email is not Registered" });
            const userData = await pool.query(
              "INSERT INTO otp_verification_user(email,otp) VALUES($1,$2) returning *",
              [email, resetLink]
            );
            if (userData.rows.length === 0) {
              // res.json({ error: true, data: [], message: "Can't Save OTP" });
              res.json({
                error: true,
                otp: resetLink,
                message: "Cant Verify Right Now!",
              });
              // Emailtemplate(email, resetLink, subject, message, user_name)
            } else {
              res.json({
                error: false,
                otp: resetLink,
                message: "Email sent successfully!",
                admin_details,
              });
              VerificationEmail(email, subject, resetLink);
            }
          } else {
            const userData = await pool.query(
              "UPDATE otp_verification_user SET otp=$1, created_at=CURRENT_TIMESTAMP WHERE email=$2 returning *",
              [resetLink, email]
            );
            if (userData.rows.length === 0) {
              // res.json({ error: true, data: [], message: "Can't Save OTP" });
              res.json({
                error: true,
                otp: resetLink,
                message: "Cant Verify Right Now!",
              });
              // Emailtemplate(email, resetLink, subject, message, user_name)
            } else {
              res.json({
                error: false,
                otp: resetLink,
                message: "Email sent successfully!",
                admin_details,
              });
              VerificationEmail(email, subject, resetLink);
            }
          }

          // END
        } else {
          res.json({ error: true, message: "Invalid Credentials" });
        }
      }
    }
  } catch (err) {
    res.json({ error: true, data: [], message: "Catch eror" });
  } finally {
    client.release();
  }
};
exports.otpverificationresponse = async (req, res) => {
  const client = await pool.connect();
  try {
    const { email } = req.body;
    // const company_user = false;
    if (email === null || email === "" || email === undefined) {
      res.json({ error: true, message: "Please Provide Email" });
    } else {
      const userDataCheck = await pool.query(
        "SELECT * FROM users WHERE email=$1 AND signup_type=$2",
        [email, "admin"]
      );

      if (userDataCheck.rows.length === 0) {
        res.json({
          error: true,
          data: [],
          message: "No Admin exist for this email",
        });
      } else {
        res.json({
          error: false,
          data: userDataCheck.rows,
          message: "Successfully verified",
        });
      }
    }
  } catch (err) {
    console.log(err);
    res.json({ error: true, data: [], message: "Catch eror" });
  } finally {
    client.release();
  }
};
exports.resetPasswordAdmin = async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, password } = req.body;
    if (email === null || email === "" || email === undefined) {
      res.json({ error: true, message: "Please Provide Email" });
    } else {
      const query1 = "SELECT * FROM users WHERE email =$1 AND signup_type=$2";
      const result1 = await pool.query(query1, [email, "admin"]);
      if (result1.rows.length === 0) {
        res.json({ error: true, message: "Email Doesnot Exist for ADMIN" });
      } else {
        const hashedUserEnteredPassword = crypto
          .createHash("sha256")
          .update(password + secret_key_hash)
          .digest("hex");
        // if email
        let query = "UPDATE users SET ";
        let index = 2;
        let values = [email];

        if (hashedUserEnteredPassword) {
          query += `password = $${index} , `;
          values.push(hashedUserEnteredPassword);
          index++;
        }
        query += "WHERE email = $1 RETURNING*";
        query = query.replace(/,\s+WHERE/g, " WHERE");
        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
          res.json({ error: true, data: [], message: "Something went wrong" });
        } else {
          res.json({
            error: false,
            data: result.rows,
            message: "Password reset successfully!",
          });
        }
      }
    }
  } catch (err) {
    res.json({ error: true, data: [], message: "Catch eror" });
  } finally {
    client.release();
  }
};
// Profile Update Password
exports.resetPasswordAdminLoggedUser = async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, old_password, new_password } = req.body;
    if (email === null || email === "" || email === undefined) {
      res.json({ error: true, message: "Please Provide Email" });
    } else {
      const query1 = "SELECT * FROM users WHERE email =$1 AND signup_type=$2";
      const result1 = await pool.query(query1, [email, "admin"]);
      if (result1.rows.length === 0) {
        res.json({ error: true, message: "Email Doesnot Exist for ADMIN" });
      } else {
        // check old password
        const hashedPasswordFromDb = result1.rows[0].password;
        const hashedUserEnteredPassword = crypto
          .createHash("sha256")
          .update(old_password + secret_key_hash)
          .digest("hex");
        if (hashedPasswordFromDb === hashedUserEnteredPassword) {
          // if email
          let query = "UPDATE users SET ";
          let index = 2;
          let values = [email];
          const hashedUserEnteredPasswordNew = crypto
            .createHash("sha256")
            .update(new_password + secret_key_hash)
            .digest("hex");
          if (hashedUserEnteredPasswordNew) {
            query += `password = $${index} , `;
            values.push(hashedUserEnteredPasswordNew);
            index++;
          }
          query += "WHERE email = $1 RETURNING*";
          query = query.replace(/,\s+WHERE/g, " WHERE");
          const result = await pool.query(query, values);

          if (result.rows.length === 0) {
            res.json({
              error: true,
              data: [],
              message: "Something went wrong",
            });
          } else {
            res.json({
              error: false,
              data: result.rows,
              message: "Password reset successfully!",
            });
          }
        } else {
          res.json({ error: true, message: "Old Password is not correct" });
        }
      }
    }
  } catch (err) {
    res.json({ error: true, data: [], message: "Catch eror" });
  } finally {
    client.release();
  }
};
//Profile Update User Name
exports.updateUserName = async (req, res) => {
  const client = await pool.connect();
  try {
    const { user_id, user_name } = req.body;
    if (user_id === null || user_id === "" || user_id === undefined) {
      res.json({ error: true, message: "Please Provide user_id" });
    } else {
      const query1 = "SELECT * FROM users WHERE user_id =$1";
      const result1 = await pool.query(query1, [user_id]);
      if (result1.rows.length === 0) {
        res.json({ error: true, message: "User Doesnot Exist" });
      } else {
        // if user_id
        let query = "UPDATE users SET ";
        let index = 2;
        let values = [user_id];

        if (user_name) {
          query += `user_name = $${index} , `;
          values.push(user_name);
          index++;
        }
        query += "WHERE user_id = $1 RETURNING*";
        query = query.replace(/,\s+WHERE/g, " WHERE");
        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
          res.json({ error: true, data: [], message: "Something went wrong" });
        } else {
          res.json({
            error: false,
            data: result.rows,
            message: "User Name Updated successfully!",
          });
        }
      }
    }
  } catch (err) {
    res.json({ error: true, data: [], message: "Catch eror" });
  } finally {
    client.release();
  }
};
// get all users
exports.getAllUsers = async (req, res) => {
  const client = await pool.connect();
  try {
    // const query1 = 'SELECT * FROM users WHERE deleted_user=$1 AND signup_type != $2 ORDER BY created_at DESC'
    const query1 =
      "SELECT * FROM users WHERE deleted_user=$1 AND role=$2 ORDER BY created_at DESC";

    // const result1 = await pool.query(query1, [false,'admin']);
    const result1 = await pool.query(query1, [false, "user"]);

    if (result1.rows.length === 0) {
      res.json({ error: true, message: "No Users Found" });
    } else {
      res.json({ error: false, data: result1.rows, message: "Users Found" });
    }
  } catch (err) {
    console.log(err);
    res.json({ error: true, data: [], message: "Catch eror" });
  } finally {
    client.release();
  }
};
// get all deleted users
exports.getAllDeletedUsers = async (req, res) => {
  const client = await pool.connect();
  try {
    const query1 =
      "SELECT *, EXTRACT(DAY FROM CURRENT_DATE - deleted_at) AS days_since_deleted FROM users WHERE deleted_user=$1 ORDER BY created_at DESC";
    const result1 = await pool.query(query1, [true]);
    if (result1.rows.length === 0) {
      res.json({ error: true, message: "No Users Found" });
    } else {
      res.json({ error: false, data: result1.rows, message: "Users Found" });
    }
  } catch (err) {
    res.json({ error: true, data: [], message: "Catch eror" });
  } finally {
    client.release();
  }
};
// get all deleted users pagination
exports.getAllDeletedUsersPagination = async (req, res) => {
  const client = await pool.connect();
  try {
    const { page, limit } = req.query;
    const query1 =
      "SELECT *, EXTRACT(DAY FROM CURRENT_DATE - deleted_at) AS days_since_deleted FROM users WHERE deleted_user=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3";
    const result1 = await pool.query(query1, [true, limit, page]);
    if (result1.rows.length === 0) {
      res.json({ error: true, message: "No Users Found" });
    } else {
      const query2 = "SELECT * FROM users WHERE deleted_user=$1";
      const result2 = await pool.query(query2, [true]);
      const total = result2.rows.length;
      res.json({
        error: false,
        data: result1.rows,
        total_users: total,
        message: "Users Found",
      });
    }
  } catch (err) {
    console.log(err);
    res.json({ error: true, data: [], message: "Catch eror" });
  } finally {
    client.release();
  }
};
// delete user api and make delete status of user true after 90 days delete user from db
exports.deleteUser = async (req, res) => {
  const client = await pool.connect();
  try {
    const { email } = req.body;
    if (email === null || email === "" || email === undefined) {
      res.json({ error: true, message: "Please Provide Email" });
    } else {
      const query1 = "SELECT * FROM users WHERE email =$1";
      const result1 = await pool.query(query1, [email]);
      if (result1.rows.length === 0) {
        res.json({ error: true, message: "Email Doesnot Exist" });
      } else {
        const deleted_at = new Date();
        // if email
        let query = "UPDATE users SET ";
        let index = 2;
        let values = [email];

        if (true) {
          query += `deleted_user = $${index} , `;
          values.push(true);
          index++;
        }
        if (deleted_at) {
          query += `deleted_at = $${index} , `;
          values.push(deleted_at);
          index++;
        }
        query += "WHERE email = $1 RETURNING*";
        query = query.replace(/,\s+WHERE/g, " WHERE");
        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
          res.json({ error: true, data: [], message: "Something went wrong" });
        } else {
          res.json({
            error: false,
            data: result.rows,
            message: "User Deleted successfully!",
          });
        }
      }
    }
  } catch (err) {
    res.json({ error: true, data: [], message: "Catch eror" });
  } finally {
    client.release();
  }
};

// get all users pagination
exports.getAllUsersPagination = async (req, res) => {
  const client = await pool.connect();
  try {
    const { page, limit } = req.query;
    const offset = (page - 1) * limit;
    const query1 =
      "SELECT * FROM users WHERE deleted_user=$1 AND role = $2 ORDER BY user_id DESC LIMIT $3 OFFSET $4";
    const result1 = await pool.query(query1, [false, "user", limit, offset]);
    if (result1.rows.length === 0) {
      res.json({ error: true, message: "No Users Found" });
    } else {
      const query2 = "SELECT * FROM users WHERE deleted_user=$1 AND role = $2";
      const result2 = await pool.query(query2, [false, "user"]);
      const total = result2.rows.length;
      res.json({
        error: false,
        data: result1.rows,
        total_users: total,
        message: "Users Found",
      });
    }
  } catch (err) {
    console.log(err);
    res.json({ error: true, data: [], message: "Catch eror" });
  } finally {
    client.release();
  }
};
//update user account status
exports.updateUserAccountStatus = async (req, res) => {
  const client = await pool.connect();
  try {
    const { user_id, account_status } = req.body;
    if (user_id === null || user_id === "" || user_id === undefined) {
      res.json({ error: true, message: "Please Provide user_id" });
    } else {
      const query1 = "SELECT * FROM users WHERE user_id =$1";
      const result1 = await pool.query(query1, [user_id]);
      if (result1.rows.length === 0) {
        res.json({ error: true, message: "User Doesnot Exist" });
      } else {
        // if user_id
        let query = "UPDATE users SET ";
        let index = 2;
        let values = [user_id];

        if (account_status) {
          query += `account_status = $${index} , `;
          values.push(account_status);
          index++;
        }
        query += "WHERE user_id = $1 RETURNING*";
        query = query.replace(/,\s+WHERE/g, " WHERE");
        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
          res.json({ error: true, data: [], message: "Something went wrong" });
        } else {
          res.json({
            error: false,
            data: result.rows,
            message: "Account Status Updated successfully!",
          });
        }
      }
    }
  } catch (err) {
    console.log(err);
    res.json({ error: true, data: [], message: "Catch eror" });
  } finally {
    client.release();
  }
};
// get user by year
exports.getUsersByYear = async (req, res) => {
  const client = await pool.connect();
  try {
    const year = req.query.year; // assuming the year is passed as a URL parameter
    const query = `
            SELECT EXTRACT(MONTH FROM created_at) AS month, COUNT(*) AS count
            FROM users
            WHERE EXTRACT(YEAR FROM created_at) = $1 AND role = $2
            GROUP BY month
            ORDER BY month ASC
        `;
    const result = await pool.query(query, [year, "user"]);
    const counts = Array(12).fill(0); // initialize an array with 12 zeros
    for (const row of result.rows) {
      counts[row.month - 1] = row.count; // subtract 1 because months are 1-indexed
    }
    res.json({
      error: false,
      data: {
        January: counts[0],
        February: counts[1],
        March: counts[2],
        April: counts[3],
        May: counts[4],
        June: counts[5],
        July: counts[6],
        August: counts[7],
        September: counts[8],
        October: counts[9],
        November: counts[10],
        December: counts[11],
      },
      message: "Users Found",
    });
  } catch (err) {
    res.json({ error: true, data: [], message: "Catch error" });
  } finally {
    client.release();
  }
};
// get top 5 recent registered users
exports.getTop5RecentRegisteredUsers = async (req, res) => {
  const client = await pool.connect();
  try {
    const query1 =
      "SELECT * FROM users WHERE deleted_user=$1 AND role=$2 ORDER BY created_at DESC LIMIT 5";
    const result1 = await pool.query(query1, [false, "user"]);
    if (result1.rows.length === 0) {
      res.json({ error: true, message: "No Users Found" });
    } else {
      res.json({ error: false, data: result1.rows, message: "Users Found" });
    }
  } catch (err) {
    console.log(err);
    res.json({ error: true, data: [], message: "Catch eror" });
  } finally {
    client.release();
  }
};
// get specific user by user id
exports.getSpecificUserById = async (req, res) => {
  const client = await pool.connect();
  try {
    const { user_id } = req.query;
    if (user_id === null || user_id === "" || user_id === undefined) {
      res.json({ error: true, message: "Please Provide User Id" });
    } else {
      const query1 = "SELECT * FROM users WHERE user_id =$1";
      const result1 = await pool.query(query1, [user_id]);
      const query2 = "SELECT * FROM wallet WHERE user_id =$1 AND type=$2";
      const result2 = await pool.query(query2, [user_id, "bonus"]);
      const query3 = "SELECT * FROM wallet WHERE user_id =$1 AND type=$2";
      const result3 = await pool.query(query3, [user_id, "withdrawl"]);
      if (result1.rows.length === 0) {
        res.json({ error: true, message: "User Id Doesnot Exist" });
      } else {
        res.json({
          error: false,
          data: result1.rows,
          bonus_wallet:
            Number(result2.rows[0].balance || 0) % 1 === 0
              ? Number(result2.rows[0].balance || 0)
              : Number(result2.rows[0].balance || 0).toFixed(2),
          withdrawl_wallet:
            Number(result3.rows[0].balance || 0) % 1 === 0
              ? Number(result3.rows[0].balance || 0)
              : Number(result3.rows[0].balance || 0).toFixed(2),
          //   wallet:result2.rows[0].balance||0

          message: "User Found",
        });
      }
    }
  } catch (err) {
    console.log(err);
    res.json({ error: true, data: [], message: "Catch eror" });
  } finally {
    client.release();
  }
};

exports.getUserTransactionsWithDateRange = async (req, res) => {
  const client = await pool.connect();
  try {
    const { user_id, start_date, end_date } = req.query;

    // Validate user_id
    if (!user_id) {
      return res
        .status(400)
        .json({ error: true, message: "Please provide User ID" });
    }

    // Validate and convert date format from "DD-MM-YYYY" to "YYYY-MM-DD"
    let formattedStartDate = moment(start_date, "DD-MM-YYYY").format(
      "YYYY-MM-DD"
    );
    let formattedEndDate = moment(end_date, "DD-MM-YYYY").format("YYYY-MM-DD");

    // Check if dates are valid
    if (
      !moment(formattedStartDate, "YYYY-MM-DD", true).isValid() ||
      !moment(formattedEndDate, "YYYY-MM-DD", true).isValid()
    ) {
      return res.status(400).json({
        error: true,
        message: "Invalid date format. Please use DD-MM-YYYY.",
      });
    }

    // Step 1: Check if user exists
    const userResult = await pool.query(
      "SELECT * FROM users WHERE user_id = $1",
      [user_id]
    );
    if (userResult.rows.length === 0) {
      return res
        .status(404)
        .json({ error: true, message: "User ID does not exist" });
    }

    // Step 2: Get wallet balances
    const walletQuery = "SELECT type, balance FROM wallet WHERE user_id = $1";
    const walletResult = await pool.query(walletQuery, [user_id]);

    let bonusWallet = 0;
    let withdrawalWallet = 0;

    walletResult.rows.forEach((wallet) => {
      if (wallet.type === "bonus") {
        bonusWallet = parseFloat(wallet.balance) || 0;
      } else if (wallet.type === "withdrawl") {
        withdrawalWallet = parseFloat(wallet.balance) || 0;
      }
    });

    // Step 3: Get transactions within the date range
    const transactionQuery = `
      SELECT * FROM transaction_history
      WHERE user_id = $1 AND created_at BETWEEN $2 AND $3
      ORDER BY created_at DESC
    `;
    const transactionResult = await pool.query(transactionQuery, [
      user_id,
      formattedStartDate,
      formattedEndDate,
    ]);

    res.status(200).json({
      error: false,
      message: "User transactions retrieved successfully",
      user: userResult.rows[0],
      transactions: transactionResult.rows,
      bonus_wallet: bonusWallet.toFixed(2),
      withdrawal_wallet: withdrawalWallet.toFixed(2),
    });
  } catch (err) {
    console.error("Error in getUserTransactionsWithDateRange:", err);
    res.status(500).json({ error: true, message: "Internal server error" });
  } finally {
    client.release();
  }
};

exports.getGamesByDateRange = async (req, res) => {
  const client = await pool.connect();

  try {
    const { start_date, end_date } = req.query;

    // Validate and convert date format from "DD-MM-YYYY" to "YYYY-MM-DD"
    let formattedStartDate = moment(start_date, "DD-MM-YYYY").format(
      "YYYY-MM-DD"
    );
    let formattedEndDate = moment(end_date, "DD-MM-YYYY").format("YYYY-MM-DD");

    // Check if dates are valid
    if (
      !moment(formattedStartDate, "YYYY-MM-DD", true).isValid() ||
      !moment(formattedEndDate, "YYYY-MM-DD", true).isValid()
    ) {
      return res.status(400).json({
        error: true,
        message: "Invalid date format. Please use DD-MM-YYYY.",
      });
    }

    // Fetch games played within the given date range
    const gamesQuery = `
      SELECT * FROM games 
      WHERE played_at::date BETWEEN $1 AND $2
      ORDER BY played_at DESC
    `;
    const gamesResult = await pool.query(gamesQuery, [
      formattedStartDate,
      formattedEndDate,
    ]);

    if (gamesResult.rows.length === 0) {
      return res.status(404).json({
        error: true,
        message: "No games found within the specified date range",
      });
    }

    // Fetch users who participated in these games
    const gameIds = gamesResult.rows.map((game) => game.game_id);
    const gameUsersQuery = `
      SELECT * FROM game_users 
      WHERE game_id = ANY($1)
    `;
    const gameUsersResult = await pool.query(gameUsersQuery, [gameIds]);

    // Organize game users by game_id
    const gameUsersMap = {};
    gameUsersResult.rows.forEach((user) => {
      if (!gameUsersMap[user.game_id]) {
        gameUsersMap[user.game_id] = [];
      }
      gameUsersMap[user.game_id].push(user);
    });

    // Attach users to each game
    const gamesWithUsers = gamesResult.rows.map((game) => ({
      ...game,
      participants: gameUsersMap[game.game_id] || [],
    }));

    res.status(200).json({
      error: false,
      message: "Games retrieved successfully",
      games: gamesWithUsers,
    });
  } catch (err) {
    console.error("Error in getGamesByDateRange:", err);
    res.status(500).json({ error: true, message: "Internal server error" });
  } finally {
    client.release();
  }
};
