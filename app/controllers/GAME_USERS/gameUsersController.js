const { pool } = require("../../config/db.config");
const fetchBallImages = require("../../utils/ball_images_urls");

// Participate in game after paying entry fee // Also update the winning ball
exports.createGameUser = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { game_users_id, winning_ball } = req.body;

    if (
      game_users_id === null ||
      game_users_id === "" ||
      game_users_id === undefined
    ) {
      res.json({ error: true, message: "Please Provide Game Users ID" });
    } else {
      if (
        // parseInt(winning_ball) === parseInt(8) ||
        // parseInt(winning_ball) === parseInt(9) ||
        parseInt(winning_ball) < parseInt(0) ||
        parseInt(winning_ball) > parseInt(15)
      ) {
        res.json({
          error: true,
          message: "Invalid input: winning_ball should be between 0 and 15",
        });
      } else {
        const gameUserCheck = await pool.query(
          "SELECT * FROM game_users WHERE game_users_id=$1",
          [game_users_id]
        );
        console.log("gameUserCheck.rows");
        console.log(gameUserCheck.rows[0].game_id);
        const game_id = gameUserCheck.rows[0].game_id;
        // get game by game id
        const game = await pool.query("SELECT * FROM games WHERE game_id=$1", [
          game_id,
        ]);
        console.log("game.rows");
        console.log(game.rows);
        console.log("game.rows[0].game_status");
        console.log(game.rows[0].game_status);

        console.log(gameUserCheck.rows);
        if (gameUserCheck.rows.length === 0) {
          res.json({
            error: true,
            message:
              "Game User Error !. Check whether Entry Fee submitted or not .",
          });
          console.log("zero");
        } else {
          // if (game.rows[0].restarted) {
          //   // Add multiple balls
          //   // TODO: Implement logic to add multiple balls
          //   console.log("Add multiple balls logic");

          // } else {
          // Pick one ball
          const gameUser = await pool.query(
            "UPDATE game_users SET winning_ball=$1 WHERE game_users_id=$2 RETURNING *",
            [winning_ball, game_users_id]
          );
          if (gameUser.rows.length > 0) {
            console.log("Game User Updated Successfully");
            res.json({
              error: false,
              data: gameUser.rows,
              message: "Game User Updated Successfully",
            });
          } else {
            // console.log("Game User Not Updated Successfully")
            res.json({
              error: true,
              message:
                "Game User Not exist!. Check whether Entry Fee submitted or not .",
            });
          }
        }
        // res.json({ error: true, message: "Game already exist" });
      }
    }
  } catch (err) {
    res.json({ error: true, data: [], message: "Catch eror" });
  } finally {
    client.release();
  }
};

exports.createGameUserV2 = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { game_users_id, winning_ball } = req.body;

    if (
      game_users_id === null ||
      game_users_id === "" ||
      game_users_id === undefined
    ) {
      res.json({ error: true, message: "Please Provide Game Users ID" });
    } else {
      if (
        // parseInt(winning_ball) === parseInt(8) ||
        // parseInt(winning_ball) === parseInt(9) ||
        parseInt(winning_ball) < parseInt(0) ||
        parseInt(winning_ball) > parseInt(15)
      ) {
        res.json({
          error: true,
          message: "Invalid input: winning_ball should be between 0 and 15",
        });
      } else {
        const gameUserCheck = await pool.query(
          "SELECT * FROM game_users WHERE game_users_id=$1",
          [game_users_id]
        );
        if (gameUserCheck.rows.length === 0) {
          res.json({
            error: true,
            message:
              "Game User Error !. Check whether Entry Fee submitted or not .",
          });
          console.log("zero");
        } else {
          //    Update into agme users by game id winning ball
          const gameUser = await pool.query(
            "UPDATE game_users SET winning_ball=$1 WHERE game_users_id=$2 RETURNING *",
            [winning_ball, game_users_id]
          );
          if (gameUser.rows.length > 0) {
            console.log("Game User Updated Successfully");
            res.json({
              error: false,
              data: gameUser.rows,
              message: "Game User Updated Successfully",
            });
          } else {
            // console.log("Game User Not Updated Successfully")
            res.json({
              error: true,
              message:
                "Game User Not exist!. Check whether Entry Fee submitted or not .",
            });
          }
        }
        // res.json({ error: true, message: "Game already exist" });
      }
    }
  } catch (err) {
    res.json({ error: true, data: [], message: "Catch eror" });
  } finally {
    client.release();
  }
};
// Get game by game id updated
// exports.getGameUserByGameId = async (req, res, next) => {
//     const client = await pool.connect();
//     try {
//         const { game_id } = req.query;
//         if (game_id === null || game_id === "" || game_id === undefined) {
//             res.json({ error: true, message: "Please Provide Game ID" });
//         } else {
//             const gameUser = await pool.query("SELECT * FROM games WHERE game_id=$1", [game_id]);
//             if (gameUser.rows.length > 0) {
//                 console.log("Game  Found")
//                 let game_details = gameUser.rows[0];
//                 const entry_fee = gameUser.rows[0].entry_fee;
//                 const game_status = gameUser.rows[0].game_status;
//                 const commisssion = gameUser.rows[0].commission;

//                 // get all participated users count
//                 const gameUsers = await pool.query("SELECT * FROM game_users WHERE game_id=$1", [game_id]);
//                 const participated_users = gameUsers.rows.length;
//                 console.log(gameUsers.rows)

//                 // get all participated users details
//                 let participants_array = []
//                 for (let i = 0; i < gameUsers.rows.length; i++) {
//                     const gameUsersDetails = await pool.query(`
//                  SELECT *
//                  FROM users
//                  WHERE user_id=$1
//              `, [gameUsers.rows[i].user_id]);
//                     if (gameUsersDetails.rows.length > 0) {
//                         const result = await pool.query(`
//                         SELECT balance
//                         FROM wallet
//                         WHERE user_id = $1
//                     `, [gameUsers.rows[i].user_id]);
//                     const walletBalance = result.rows[0] ? result.rows[0].balance : 0;
//                     const userDetailsWithBalance = {
//                         ...gameUsersDetails.rows[0],
//                         wallet_balance: walletBalance,
//                     };
//                     participants_array.push(userDetailsWithBalance);
//                         // gameUsersDetails.rows[0].winning_ball = gameUsers.rows[i].winning_ball
//                         // participants_array.push(gameUsersDetails.rows[0])
//                     } else {

//                     }
//                     // participants_array.push(gameUsersDetails.rows[0])
//                 }
//                 // get jackpot
//                 let jackpot = 0
//                 if (game_status === 'scheduled') {
//                     jackpot = parseFloat(entry_fee) * parseFloat(participated_users);

//                 } else {
//                     // deduct commision from jackpot
//                     jackpot = parseFloat(entry_fee) * parseFloat(participated_users);
//                     const commission_amount = parseFloat(jackpot) * parseFloat(commisssion) / 100;
//                     // deduct commission from jackpot
//                     jackpot = jackpot - commission_amount;
//                     // if game completed

//                 }
//                 let winnersUsersArray = []
//                 if (game_status === 'completed') {
//                     console.log("game_details.winning_ball")

//                     console.log(game_details.winner_ball)
//                     const winnersUsers = await pool.query(`
//                     SELECT user_id
//                     FROM game_users
//                     WHERE game_id = $1
//                     AND winning_ball = $2
//                 `, [game_id, game_details.winner_ball]);
//                 const userIds = winnersUsers.rows.map(row => row.user_id);

//                 if (userIds.length > 0) {
//                     const winnersDetails = await pool.query(`
//                         SELECT *
//                         FROM users
//                         WHERE user_id = ANY($1::int[])
//                     `, [userIds]);
//                     winnersUsersArray = await Promise.all(winnersDetails.rows.map(async user => {
//                         const result = await pool.query(`
//                             SELECT balance
//                             FROM wallet
//                             WHERE user_id = $1
//                         `, [user.user_id]);
//                         const walletBalance = result.rows[0] ? result.rows[0].balance : 0;
//                         return {
//                             ...user,
//                             wallet_balance: walletBalance,
//                         };
//                     }));
//                     // winnersUsersArray = winnersDetails.rows;
//                 } else {
//                     winnersUsersArray = [];
//                 }
//                 }
//                 //    get all balls users selected

//                 // console.log(winnersUsers.rows)

//                 // Get the counts from the database
//                 const ballCountsResult = await pool.query(`
//                 SELECT winning_ball, COUNT(*) as users
//                 FROM game_users
//                 WHERE game_id = $1
//                 GROUP BY winning_ball
//                 `, [game_id]);
//                 const ballCounts = ballCountsResult.rows;
//                 console.log(ballCounts)
//                 // Create an array of all possible balls
//                 const allBalls = Array.from({ length: 16 }, (_, i) => i);

//                 // Map the allBalls array to the result, filling in the user count where available
//                 const result = allBalls.map(ball => {
//                     const foundBall = ballCounts.find(({ winning_ball }) => Number(winning_ball) === ball);
//                     return {
//                         winning_ball: ball,
//                         users: foundBall ? Number(foundBall.users) : 0

//                     };
//                 });

//                 // console.log(result);

//                 res.json({
//                     error: false,
//                     game_details: game_details,
//                     participated_users: participated_users,
//                     balls_count: result,
//                     jackpot: jackpot,
//                     participants_array: participants_array,
//                     winners_array: winnersUsersArray,
//                     message: "Game Data Fetched Successfully"
//                 });
//             }
//             else {
//                 console.log("Game  Not Found")
//                 res.json({ error: true, message: "Game  Not Found" });
//             }
//         }
//     }
//     catch (err) {
//         console.log(err)
//         res.json({ error: true, data: [], message: "Catch eror" });

//     } finally {
//         client.release();
//     }

// }
exports.getGameUserByGameId = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { game_id, user_id } = req.query;

    if (!game_id) {
      return res.json({ error: true, message: "Please Provide Game ID" });
    }

    // Fetch game details
    const gameData = await pool.query(
      "SELECT * FROM games WHERE game_id = $1",
      [game_id]
    );

    if (gameData.rows.length === 0) {
      return res.json({ error: true, message: "Game Not Found" });
    }

    const gameDetails = gameData.rows[0];
    const {
      entry_fee,
      commission,
      game_status,
      initial_deposit,
      winner_details,
    } = gameDetails;
    const initialDeposit = initial_deposit || 0;

    // Fetch total participants
    const totalParticipantsQuery = await pool.query(
      "SELECT COUNT(DISTINCT user_id) AS total_participants FROM game_users WHERE game_id = $1",
      [game_id]
    );
    const totalParticipants =
      totalParticipantsQuery.rows[0]?.total_participants || 0;

    // Calculate jackpot
    let jackpot =
      parseFloat(entry_fee) * parseFloat(totalParticipants) +
      parseFloat(initialDeposit);
    if (game_status !== "scheduled") {
      const commissionAmount = jackpot * (commission / 100);
      jackpot -= commissionAmount;
    }

    // Fetch ball counts
    const ballCountsQuery = await pool.query(
      "SELECT winning_ball, COUNT(*) AS count FROM game_users WHERE game_id = $1 GROUP BY winning_ball",
      [game_id]
    );

    // Populate ball counts with images and counts
    const ballImageUrls = await fetchBallImages(); // Fetch ball images
    let ballCounts = {};
    for (let i = 1; i <= 15; i++) {
      ballCounts[i] = {
        count: 0,
        imageUrl: ballImageUrls[i],
      };
    }
    for (let row of ballCountsQuery.rows) {
      ballCounts[row.winning_ball] = {
        count: parseInt(row.count),
        imageUrl: ballImageUrls[row.winning_ball],
      };
    }

    // Fetch all participants of the game
    const participantsQuery = await pool.query(
      `
      SELECT 
        gu.user_id, 
        u.user_name, 
        u.email, 
        gu.winning_ball, 
        gu.round_no, 
        gu.game_users_id
      FROM 
        game_users gu
      JOIN 
        users u ON gu.user_id = u.user_id::TEXT
      WHERE 
        gu.game_id = $1
      `,
      [game_id]
    );

    let participants = participantsQuery.rows.map((row) => ({
      user_id: row.user_id,
      user_name: row.user_name,
      email: row.email,
      selected_ball: row.winning_ball,
      game_user_id: row.game_users_id,
      ball_image: ballImageUrls[row.winning_ball],
      round: row.round_no,
    }));

    // Check if the requesting user participated in this game
    let userParticipated = false;
    let userSelectedBallDetails = [];

    if (user_id) {
      userSelectedBallDetails = participants.filter(
        (p) => p.user_id === user_id
      );
      userParticipated = userSelectedBallDetails.length > 0;
    }

    // Build response
    const gameResponse = {
      game_id,
      entry_fee,
      winner_details,
      commission,
      game_status,
      total_participants: totalParticipants,
      ball_counts_participants: ballCounts,
      user_participated: userParticipated,
      user_selected_ball_details: userSelectedBallDetails,
      restartedStatus: gameDetails.restarted || null,
      restartedRound: gameDetails.restarted_round || "0",
      jackpot:
        Number(jackpot) % 1 === 0
          ? Number(jackpot)
          : Number(jackpot).toFixed(2),
      participants, // All participants added here
    };

    res.json({
      error: false,
      data: gameResponse,
      message: "Game details fetched successfully",
    });
  } catch (err) {
    console.error("Error fetching game details:", err);
    res.json({ error: true, data: [], message: "An error occurred" });
  } finally {
    client.release();
  }
};

// exports.getGameUserByGameId = async (req, res, next) => {
//   const client = await pool.connect();
//   try {
//     const { game_id, user_id } = req.query;

//     if (!game_id) {
//       return res.json({ error: true, message: "Please Provide Game ID" });
//     }

//     const gameData = await pool.query(
//       "SELECT * FROM games WHERE game_id = $1",
//       [game_id]
//     );
//     if (gameData.rows.length === 0) {
//       return res.json({ error: true, message: "Game Not Found" });
//     }

//     const gameDetails = gameData.rows[0];
//     const { entry_fee, commission, game_status, winner_ball, initial_deposit } =
//       gameDetails;

//     // Set default value for initial deposit
//     const initialDeposit = initial_deposit || 0;

//     // Fetch total participants
//     const totalParticipantsQuery = await pool.query(
//       "SELECT COUNT(DISTINCT user_id) AS total_participants FROM game_users WHERE game_id = $1",
//       [game_id]
//     );
//     const totalParticipants =
//       totalParticipantsQuery.rows[0]?.total_participants || 0;

//     // Calculate jackpot
//     let jackpot =
//       parseFloat(entry_fee) * parseFloat(totalParticipants) +
//       parseFloat(initialDeposit);
//     if (game_status !== "scheduled") {
//       const commissionAmount = jackpot * (commission / 100);
//       jackpot -= commissionAmount;
//     }

//     // Fetch ball counts
//     const ballCountsQuery = await pool.query(
//       "SELECT winning_ball, COUNT(*) AS count FROM game_users WHERE game_id = $1 GROUP BY winning_ball",
//       [game_id]
//     );

//     // Populate ball counts with images and counts
//     const ballImageUrls = await fetchBallImages(); // Assuming the same function from `getScheduledGamesv2`
//     let ballCounts = {};
//     for (let i = 1; i <= 15; i++) {
//       ballCounts[i] = {
//         count: 0,
//         imageUrl: ballImageUrls[i],
//       };
//     }
//     for (let row of ballCountsQuery.rows) {
//       ballCounts[row.winning_ball] = {
//         count: parseInt(row.count),
//         imageUrl: ballImageUrls[row.winning_ball],
//       };
//     }

//     // Check if the user participated in this game
//     let userParticipated = false;
//     let userSelectedBallDetails = [];
//     if (user_id) {
//       const userParticipationQuery = await pool.query(
//         `
//           SELECT
//             gu.winning_ball,
//             gu.game_users_id,
//             gu.round_no,
//             u.user_name,
//             u.email
//           FROM
//             game_users gu
//           JOIN
//             users u
//           ON
//             gu.user_id = u.user_id::TEXT
//           WHERE
//             gu.game_id = $1
//             AND gu.user_id = $2
//         `,
//         [game_id, user_id]
//       );

//       if (userParticipationQuery.rows.length > 0) {
//         userParticipated = true;
//         userSelectedBallDetails = userParticipationQuery.rows.map((row) => ({
//           selected_ball: row.winning_ball,
//           game_user_id: row.game_users_id,
//           ball_image: ballImageUrls[row.winning_ball],
//           round: row.round_no,
//           user_name: row.user_name,
//           email: row.email,
//         }));
//       }
//     }

//     // Build response
//     const gameResponse = {
//       game_id: game_id,
//       entry_fee: entry_fee,
//       commission: commission,
//       game_status: game_status,
//       total_participants: totalParticipants,
//       ball_counts_participants: ballCounts,
//       user_participated: userParticipated,
//       user_selected_ball_details: userSelectedBallDetails,
//       restartedStatus: gameDetails.restarted || null,
//       restartedRound: gameDetails.restarted_round || "0",
//       jackpot:
//         Number(jackpot) % 1 === 0
//           ? Number(jackpot)
//           : Number(jackpot).toFixed(2),
//     };

//     res.json({
//       error: false,
//       data: gameResponse,
//       message: "Game details fetched successfully",
//     });
//   } catch (err) {
//     console.error("Error fetching game details:", err);
//     res.json({ error: true, data: [], message: "An error occurred" });
//   } finally {
//     client.release();
//   }
// };

exports.getGameUserByGameId1 = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { game_id, user_id } = req.query;
    if (!game_id) {
      res.json({ error: true, message: "Please Provide Game ID" });
      return;
    }

    const gameUser = await pool.query("SELECT * FROM games WHERE game_id=$1", [
      game_id,
    ]);
    if (gameUser.rows.length === 0) {
      res.json({ error: true, message: "Game Not Found" });
      return;
    }

    let game_details = gameUser.rows[0];
    let { entry_fee, game_status, commission, winner_ball, initial_deposit } =
      game_details;
    if (initial_deposit == null) {
      initial_deposit = 0;
    }
    //   game_details.entry_fee = parseFloat(game_details.entry_fee).toFixed(4);
    //   game_details.commission = parseFloat(game_details.commission).toFixed(4);
    game_details.winning_amount = parseFloat(
      game_details.winning_amount
    ).toFixed(2);
    game_details.winning_amount_single = parseFloat(
      game_details.winning_amount_single
    ).toFixed(2);
    game_details.commision_winning_amount = parseFloat(
      game_details.commision_winning_amount
    ).toFixed(2);
    //   game_details.participants = parseFloat(game_details.participants).toFixed(4);
    //   game_details.winners = parseFloat(game_details.winners).toFixed(4);
    const gameUsers = await pool.query(
      "SELECT * FROM game_users WHERE game_id=$1",
      [game_id]
    );

    const gameUsers1 = await pool.query(
      "SELECT DISTINCT user_id FROM game_users WHERE game_id=$1",
      [game_id]
    );
    const game_users1 = await pool.query(
      "SELECT COUNT(DISTINCT user_id) AS total_participants FROM game_users WHERE game_id=$1",
      [game_id]
    );
    const actual_participants = game_users1.rows.length;

    const participated_users = gameUsers.rows.length;

    let participants_array = [];
    for (let i = 0; i < gameUsers1.rows.length; i++) {
      const user_id = gameUsers1.rows[i].user_id;
      const gameUsersDetails = await pool.query(
        "SELECT * FROM users WHERE user_id=$1",
        [user_id]
      );
      if (gameUsersDetails.rows.length > 0) {
        const result = await pool.query(
          "SELECT balance FROM wallet WHERE user_id = $1",
          [user_id]
        );
        const walletBalance = result.rows[0] ? result.rows[0].balance : 0;
        const userDetailsWithBalance = {
          ...gameUsersDetails.rows[0],
          wallet_balance: parseFloat(walletBalance).toFixed(2),
        };
        participants_array.push(userDetailsWithBalance);
      }
    }

    let jackpot =
      parseFloat(entry_fee) * parseFloat(participated_users) +
      parseFloat(initial_deposit);
    if (game_status !== "scheduled") {
      const commission_amount = jackpot * (parseFloat(commission) / 100);
      jackpot -= commission_amount;
    }

    let winnersUsersArray = [];
    if (game_status === "completed") {
      let winnerCondition;
      if (winner_ball == 0) {
        winnerCondition = "winning_ball = '0'";
      }
      // else if (winner_ball == 8) {
      //   winnerCondition =
      //     "winning_ball IN ('1', '2', '3', '4', '5', '6', '7', '8')";
      // } else if (winner_ball == 9) {
      //   winnerCondition =
      //     "winning_ball IN ('9', '10', '11', '12', '13', '14', '15')";
      // }
      else {
        winnerCondition = `winning_ball = '${winner_ball}'`;
      }

      const winnersUsers = await pool.query(
        `SELECT user_id FROM game_users WHERE game_id = $1 AND ${winnerCondition}`,
        [game_id]
      );
      const userIds = winnersUsers.rows.map((row) => row.user_id);

      if (userIds.length > 0) {
        const winnersDetails = await pool.query(
          "SELECT * FROM users WHERE user_id = ANY($1::int[])",
          [userIds]
        );
        winnersUsersArray = await Promise.all(
          winnersDetails.rows.map(async (user) => {
            const result = await pool.query(
              "SELECT balance FROM wallet WHERE user_id = $1",
              [user.user_id]
            );
            const walletBalance = result.rows[0] ? result.rows[0].balance : 0;
            return {
              ...user,
              wallet_balance: parseFloat(walletBalance).toFixed(2),
            };
          })
        );
      }
    }

    const ballCountsResult = await pool.query(
      `
            SELECT winning_ball, COUNT(*) as users
            FROM game_users
            WHERE game_id = $1
            GROUP BY winning_ball
          `,
      [game_id]
    );
    const ballCounts = ballCountsResult.rows;
    const allBalls = Array.from({ length: 16 }, (_, i) => i);

    const result = allBalls.map((ball) => {
      const foundBall = ballCounts.find(
        ({ winning_ball }) => Number(winning_ball) === ball
      );
      return {
        winning_ball: ball,
        users: foundBall ? Number(foundBall.users) : 0,
      };
    });
    let gameUsersCurent;
    if (user_id) {
      const gameUsersCurent1 = await pool.query(
        "SELECT * FROM game_users WHERE game_id=$1 AND user_id=$2",
        [game_id, user_id]
      );
      if (gameUsersCurent1.rows.length > 0) {
        gameUsersCurent = gameUsersCurent1;
      } else {
        gameUsersCurent = null;
      }
    } else {
      gameUsersCurent = null;
    }
    res.json({
      error: false,
      game_details,
      participated_users: actual_participants,
      balls_count: result,
      jackpot:
        Number(jackpot || 0) % 1 === 0
          ? Number(jackpot || 0)
          : Number(jackpot || 0).toFixed(2),
      participants_array,
      user_selected_balls: gameUsersCurent === null ? [] : gameUsersCurent.rows,
      winners_array: winnersUsersArray,
      message: "Game Data Fetched Successfully",
    });
  } catch (err) {
    console.log(err);
    res.json({ error: true, data: [], message: "Catch error" });
  } finally {
    client.release();
  }
};
