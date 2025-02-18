const { pool, getBallImages } = require("../../config/db.config");
const crypto = require("crypto");
const express = require("express");
const io = require("../../../server");
async function generateUniqueGroupId() {
  // Example logic for generating a unique group ID
  let group_id;
  let isUnique = false;

  while (!isUnique) {
    // Generate a random group_id between 100000 and 999999
    group_id = Math.floor(Math.random() * 900000) + 100000;

    // Check if the group_id exists in the database
    const groupIdCheck = await pool.query(
      "SELECT COUNT(*) FROM games WHERE group_id = $1",
      [group_id]
    );

    if (parseInt(groupIdCheck.rows[0].count) === 0) {
      isUnique = true; // ID is unique, exit the loop
    }
  }

  return group_id; // Return the unique group_id
  // return `group_${Math.floor(Math.random() * 90000) + 10000}`;
}
const fetchBallImages = require("../../utils/ball_images_urls");
// make an api call to get the ball images and it would be used in below apis

async function generateUniqueGameId() {
  let game_id;
  let isUnique = false;

  // Loop until a unique game_id is found
  while (!isUnique) {
    // Generate a random game_id between 10000 and 99999
    game_id = Math.floor(Math.random() * 90000) + 10000;

    // Check if the generated game_id already exists in the database
    const gameIdCheck = await pool.query(
      "SELECT game_id FROM games WHERE game_id = $1",
      [game_id]
    );
    console.log("duplicated game id ..  ");

    // If no rows are returned, the game_id is unique
    if (gameIdCheck.rows.length === 0) {
      console.log("Uniq game id found ");
      isUnique = true; // game_id is unique, exit the loop
    }
  }

  return game_id; // Return the unique game_id
}
exports.createGame = async (req, res, next) => {
  const client = await pool.connect();
  try {
    // io.emit("game-created", { gameId: "game_id_data", status: "scheduled" });

    let { entry_fee, commission, initial_deposit } = req.body;
    if (entry_fee === null || entry_fee === "" || entry_fee === undefined) {
      res.json({ error: true, message: "Please Provide Entry Fee" });
    } else {
      let game_status = "scheduled";
      // const game_id = Math.floor(Math.random() * 90000) + 10000;
      let game_id = await generateUniqueGameId();
      if (
        initial_deposit === null ||
        initial_deposit === "" ||
        initial_deposit === undefined
      ) {
        initial_deposit = 0;
      }
      const userData = await pool.query(
        "INSERT INTO games(game_id,entry_fee,commission,game_status,restarted_round,initial_deposit) VALUES($1,$2,$3,$4,$5,$6) returning *",
        [game_id, entry_fee, commission, game_status, 0, initial_deposit]
      );
      if (userData.rows.length === 0) {
        res.json({ error: true, data: [], message: "Can't Create Game" });
      } else {
        const game_id_data = userData.rows[0].games_id;
        // insery into game_rounds the game id and round 0
        const game_rounds = await pool.query(
          "INSERT INTO game_rounds(game_id,round_no) VALUES($1,$2) returning *",
          [game_id, 0]
        );
        // socket call
        // Emit the socket event
        res.json({
          error: false,
          data: userData.rows[0],
          message: "Game Created Successfully",
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

exports.createGameGroup = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { commission, initial_deposit, games } = req.body;

    // Validate the input
    if (
      !commission ||
      !initial_deposit ||
      !Array.isArray(games) ||
      games.length === 0
    ) {
      return res.json({ error: true, message: "Invalid data provided" });
    }

    // Determine if we need a group ID (only if more than one game)
    const group_id = await generateUniqueGroupId();

    // Step 2: Insert each game into the games table
    const gameInsertPromises = games.map(async (game) => {
      const { entry_fee } = game;

      // Validate entry fee
      if (!entry_fee) {
        throw new Error("Each game must have an entry fee");
      }

      // Generate a unique game ID for each game
      const game_id = await generateUniqueGameId();

      return pool.query(
        "INSERT INTO games (game_id, entry_fee, commission, initial_deposit, game_status, restarted_round, group_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
        [
          game_id,
          entry_fee,
          commission,
          initial_deposit,
          "scheduled",
          0,
          group_id, // Will be NULL for a single game
        ]
      );
    });

    // Execute all game insertions concurrently
    const gameResults = await Promise.all(gameInsertPromises);
    const notificationData = await pool.query(
      `INSERT INTO notifications (user_id, title, body, type) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [
        null,
        "Game Created",
        "A new game has been created. Check it out!",
        "game",
      ]
    );

    // end
    res.json({
      error: false,
      data: {
        group_id, // Can be NULL for a single game
        games: gameResults.map((result) => result.rows[0]),
      },
      message: "Games created successfully" + (group_id ? " as a group" : ""),
    });
  } catch (err) {
    console.error(err);
    res.json({ error: true, message: "Error creating games" });
  } finally {
    client.release();
  }
};

exports.getAllGroupedGames2 = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const ballImageUrls = await fetchBallImages(); // Fetch ball images

    // Parse pagination parameters
    const page = parseInt(req.query.page, 10) || 1; // Default page 1
    const limit = parseInt(req.query.limit, 10) || 10; // Default 10 items per page
    const offset = (page - 1) * limit;

    // Fetch grouped games excluding completed ones, paginated
    const userData = await pool.query(
      `SELECT * FROM games 
       WHERE group_id IS NOT NULL AND game_status != 'completed' 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    if (userData.rows.length === 0) {
      return res.json({
        error: true,
        data: [],
        message: "No grouped games found",
      });
    }

    // Fetch total count for pagination
    const totalCountResult = await pool.query(
      `SELECT COUNT(DISTINCT group_id) AS total 
       FROM games WHERE group_id IS NOT NULL AND game_status != 'completed'`
    );
    const totalCount = totalCountResult.rows[0]?.total || 0;

    // Organizing grouped games
    let groupedGames = {};
    for (let game of userData.rows) {
      const group_id = game.group_id;
      const game_id = game.game_id;
      const game_status = game.game_status;
      const restartedStatus = game.restarted;
      const restartedRound = game.restarted_round;

      // If the group doesn't exist, initialize it
      if (!groupedGames[group_id]) {
        groupedGames[group_id] = {
          group_id: group_id,
          commission: parseFloat(game.commission), // Collective commission for the group
          initial_deposit: parseFloat(game.initial_deposit) || 0, // Collective initial deposit
          games: [],
          total_participants: 0,
          jackpot: 0,
          ball_counts_participants: {},
        };
      }

      // Fetch total participants for the game
      const total_participants_query = await pool.query(
        "SELECT COUNT(DISTINCT user_id) AS total_participants FROM game_users WHERE game_id=$1",
        [game_id]
      );
      const actual_participants =
        total_participants_query.rows[0]?.total_participants || 0;

      // Calculate jackpot
      let jackpot = 0;
      const entry_fee = parseFloat(game.entry_fee);
      const commission = groupedGames[group_id].commission; // Use collective commission
      const initial_deposit = groupedGames[group_id].initial_deposit; // Use collective initial deposit

      if (game_status === "scheduled") {
        jackpot = entry_fee * actual_participants + initial_deposit;
      } else {
        const raw_jackpot = entry_fee * actual_participants + initial_deposit;
        const commission_amount = raw_jackpot * (commission / 100);
        jackpot = raw_jackpot - commission_amount;
      }

      // Fetch ball counts for the game
      const ball_counts_result = await pool.query(
        "SELECT winning_ball, COUNT(*) AS count FROM game_users WHERE game_id=$1 GROUP BY winning_ball",
        [game_id]
      );

      let ball_counts = {};
      for (let i = 1; i <= 15; i++) {
        ball_counts[i] = {
          count: 0,
          imageUrl: ballImageUrls[i],
        };
      }
      for (let row of ball_counts_result.rows) {
        ball_counts[row.winning_ball] = {
          count: parseInt(row.count),
          imageUrl: ballImageUrls[row.winning_ball],
        };
      }

      // Fetch user participation details
      const game_user_current = await pool.query(
        `SELECT gu.winning_ball, gu.game_users_id, gu.round_no, u.user_name, u.email, u.user_id 
         FROM game_users gu 
         JOIN users u ON gu.user_id = u.user_id::TEXT 
         WHERE gu.game_id = $1`,
        [game_id]
      );

      let user_participated = false;
      let user_selected_ball_details = [];
      if (game_user_current.rows.length > 0) {
        user_participated = true;
        user_selected_ball_details = game_user_current.rows.map((row) => ({
          selected_ball: row.winning_ball,
          game_user_id: row.game_users_id,
          ball_image: ballImageUrls[row.winning_ball],
          round: row.round_no,
          user_name: row.user_name,
          user_id: row.user_id,
          email: row.email,
        }));
      }

      // Add game details under group
      groupedGames[group_id].games.push({
        game_id,
        entry_fee: game.entry_fee,
        game_status,
        total_participants: actual_participants,
        ball_counts_participants: ball_counts,
        user_participated,
        user_selected_ball_details,
        restartedStatus,
        restartedRound,
        jackpot:
          Number(jackpot) % 1 === 0
            ? Number(jackpot)
            : Number(jackpot).toFixed(2),
      });

      // Aggregate totals for the group
      groupedGames[group_id].total_participants += actual_participants;
      groupedGames[group_id].jackpot += jackpot;
      groupedGames[group_id].ball_counts_participants = ball_counts; // Keeping latest counts
    }

    // Convert groupedGames object to array format
    let resulting_data = Object.values(groupedGames);

    res.json({
      error: false,
      data: resulting_data,
      total: totalCount,
      page: page,
      totalPages: Math.ceil(totalCount / limit),
      message: "Grouped games fetched successfully",
    });
  } catch (err) {
    console.error("Error fetching grouped games:", err);
    res.json({ error: true, data: [], message: "An error occurred" });
  } finally {
    client.release();
  }
};
exports.getAllGroupedGames = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const ballImageUrls = await fetchBallImages(); // Fetch ball images

    // Parse pagination parameters
    const page = parseInt(req.query.page, 10) || 1; // Default page 1
    const limit = parseInt(req.query.limit, 10) || 10; // Default 10 items per page
    const offset = (page - 1) * limit;

    // Fetch both grouped and ungrouped games
    const userData = await pool.query(
      `SELECT * FROM games 
       WHERE game_status != 'completed' 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    if (userData.rows.length === 0) {
      return res.json({
        error: true,
        data: [],
        message: "No games found",
      });
    }

    // Fetch total count for pagination
    const totalCountResult = await pool.query(
      `SELECT COUNT(*) AS total FROM games WHERE game_status != 'completed'`
    );
    const totalCount = totalCountResult.rows[0]?.total || 0;

    // Organizing all games into a single array
    let allGames = {};

    for (let game of userData.rows) {
      const group_id = game.group_id || "null"; // ✅ Treat ungrouped games as group_id = "null"
      const game_id = game.game_id;
      const game_status = game.game_status;
      const restartedStatus = game.restarted;
      const restartedRound = game.restarted_round;

      // If the game belongs to a group, aggregate it
      if (!allGames[group_id]) {
        allGames[group_id] = {
          group_id: group_id, // ✅ "null" for ungrouped games
          commission: parseFloat(game.commission), // Collective commission
          initial_deposit: parseFloat(game.initial_deposit) || 0, // Collective deposit
          created_at: game.created_at, // Sorting reference
          games: [], // List of games inside this group
        };
      }

      // Fetch total participants for the game
      const total_participants_query = await pool.query(
        "SELECT COUNT(DISTINCT user_id) AS total_participants FROM game_users WHERE game_id=$1",
        [game_id]
      );
      const actual_participants =
        total_participants_query.rows[0]?.total_participants || 0;

      // Calculate jackpot
      let jackpot = 0;
      const entry_fee = parseFloat(game.entry_fee);
      const commission = parseFloat(game.commission);
      const initial_deposit = parseFloat(game.initial_deposit) || 0;

      if (game_status === "scheduled") {
        jackpot = entry_fee * actual_participants + initial_deposit;
      } else {
        const raw_jackpot = entry_fee * actual_participants + initial_deposit;
        const commission_amount = raw_jackpot * (commission / 100);
        jackpot = raw_jackpot - commission_amount;
      }

      // Fetch ball counts for the game
      const ball_counts_result = await pool.query(
        "SELECT winning_ball, COUNT(*) AS count FROM game_users WHERE game_id=$1 GROUP BY winning_ball",
        [game_id]
      );

      let ball_counts = {};
      for (let i = 1; i <= 15; i++) {
        ball_counts[i] = {
          count: 0,
          imageUrl: ballImageUrls[i],
        };
      }
      for (let row of ball_counts_result.rows) {
        ball_counts[row.winning_ball] = {
          count: parseInt(row.count),
          imageUrl: ballImageUrls[row.winning_ball],
        };
      }

      // Fetch user participation details
      const game_user_current = await pool.query(
        `SELECT gu.winning_ball, gu.game_users_id, gu.round_no, u.user_name, u.email, u.user_id 
         FROM game_users gu 
         JOIN users u ON gu.user_id = u.user_id::TEXT 
         WHERE gu.game_id = $1`,
        [game_id]
      );

      let user_participated = false;
      let user_selected_ball_details = [];
      if (game_user_current.rows.length > 0) {
        user_participated = true;
        user_selected_ball_details = game_user_current.rows.map((row) => ({
          selected_ball: row.winning_ball,
          game_user_id: row.game_users_id,
          ball_image: ballImageUrls[row.winning_ball],
          round: row.round_no,
          user_name: row.user_name,
          user_id: row.user_id,
          email: row.email,
        }));
      }

      // ✅ Add game inside the correct group or as an individual game
      allGames[group_id].games.push({
        game_id,
        entry_fee: game.entry_fee,
        game_status,
        total_participants: actual_participants,
        ball_counts_participants: ball_counts,
        user_participated,
        user_selected_ball_details,
        restartedStatus,
        restartedRound,
        jackpot:
          Number(jackpot) % 1 === 0
            ? Number(jackpot)
            : Number(jackpot).toFixed(2),
      });
    }

    // Convert allGames object to an array
    let allGamesArray = Object.values(allGames);

    // ✅ Sort all games by created_at in descending order
    allGamesArray.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    res.json({
      error: false,
      data: allGamesArray, // ✅ Single array with sorted grouped and ungrouped games
      total: totalCount,
      page: page,
      totalPages: Math.ceil(totalCount / limit),
      message: "All games fetched successfully",
    });
  } catch (err) {
    console.error("Error fetching games:", err);
    res.json({ error: true, data: [], message: "An error occurred" });
  } finally {
    client.release();
  }
};

exports.getAllGroupedGames1 = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const ballImageUrls = await fetchBallImages(); // Fetch ball images

    // Parse pagination parameters
    const page = parseInt(req.query.page, 10) || 1; // Default page 1
    const limit = parseInt(req.query.limit, 10) || 10; // Default 10 items per page
    const offset = (page - 1) * limit;

    // Fetch grouped games excluding completed ones, paginated
    const userData = await pool.query(
      `SELECT * FROM games 
       WHERE group_id IS NOT NULL AND game_status != 'completed' 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    if (userData.rows.length === 0) {
      return res.json({
        error: true,
        data: [],
        message: "No grouped games found",
      });
    }

    // Fetch total count for pagination
    const totalCountResult = await pool.query(
      `SELECT COUNT(DISTINCT group_id) AS total 
       FROM games WHERE group_id IS NOT NULL AND game_status != 'completed'`
    );
    const totalCount = totalCountResult.rows[0]?.total || 0;

    // Organizing grouped games
    let groupedGames = {};
    for (let game of userData.rows) {
      const group_id = game.group_id;
      const game_id = game.game_id;
      const game_status = game.game_status;
      const restartedStatus = game.restarted;
      const restartedRound = game.restarted_round;

      if (!groupedGames[group_id]) {
        groupedGames[group_id] = {
          group_id: group_id,
          games: [],
          total_participants: 0,
          jackpot: 0,
          ball_counts_participants: {},
        };
      }

      // Fetch total participants for the game
      const total_participants_query = await pool.query(
        "SELECT COUNT(DISTINCT user_id) AS total_participants FROM game_users WHERE game_id=$1",
        [game_id]
      );
      const actual_participants =
        total_participants_query.rows[0]?.total_participants || 0;

      // Calculate jackpot
      let jackpot = 0;
      const entry_fee = parseFloat(game.entry_fee);
      const commission = parseFloat(game.commission);
      let initial_deposit = game.initial_deposit
        ? parseFloat(game.initial_deposit)
        : 0;

      if (game_status === "scheduled") {
        jackpot = entry_fee * actual_participants + initial_deposit;
      } else {
        const raw_jackpot = entry_fee * actual_participants + initial_deposit;
        const commission_amount = raw_jackpot * (commission / 100);
        jackpot = raw_jackpot - commission_amount;
      }

      // Fetch ball counts for the game
      const ball_counts_result = await pool.query(
        "SELECT winning_ball, COUNT(*) AS count FROM game_users WHERE game_id=$1 GROUP BY winning_ball",
        [game_id]
      );

      let ball_counts = {};
      for (let i = 1; i <= 15; i++) {
        ball_counts[i] = {
          count: 0,
          imageUrl: ballImageUrls[i],
        };
      }
      for (let row of ball_counts_result.rows) {
        ball_counts[row.winning_ball] = {
          count: parseInt(row.count),
          imageUrl: ballImageUrls[row.winning_ball],
        };
      }

      // Fetch user participation details
      const game_user_current = await pool.query(
        `SELECT gu.winning_ball, gu.game_users_id, gu.round_no, u.user_name, u.email, u.user_id 
         FROM game_users gu 
         JOIN users u ON gu.user_id = u.user_id::TEXT 
         WHERE gu.game_id = $1`,
        [game_id]
      );

      let user_participated = false;
      let user_selected_ball_details = [];
      if (game_user_current.rows.length > 0) {
        user_participated = true;
        user_selected_ball_details = game_user_current.rows.map((row) => ({
          selected_ball: row.winning_ball,
          game_user_id: row.game_users_id,
          ball_image: ballImageUrls[row.winning_ball],
          round: row.round_no,
          user_name: row.user_name,
          user_id: row.user_id,
          email: row.email,
        }));
      }

      // Add game details under group
      groupedGames[group_id].games.push({
        game_id,
        entry_fee: game.entry_fee,
        commission: game.commission,
        game_status,
        total_participants: actual_participants,
        ball_counts_participants: ball_counts,
        user_participated,
        user_selected_ball_details,
        restartedStatus,
        restartedRound,
        jackpot:
          Number(jackpot) % 1 === 0
            ? Number(jackpot)
            : Number(jackpot).toFixed(2),
      });

      // Aggregate totals for the group
      groupedGames[group_id].total_participants += actual_participants;
      groupedGames[group_id].jackpot += jackpot;
      groupedGames[group_id].ball_counts_participants = ball_counts; // Keeping latest counts
    }

    // Convert groupedGames object to array format
    let resulting_data = Object.values(groupedGames);

    res.json({
      error: false,
      data: resulting_data,
      total: totalCount,
      page: page,
      totalPages: Math.ceil(totalCount / limit),
      message: "Grouped games fetched successfully",
    });
  } catch (err) {
    console.error("Error fetching grouped games:", err);
    res.json({ error: true, data: [], message: "An error occurred" });
  } finally {
    client.release();
  }
};

// Helper function to generate a unique group ID

exports.changeStatus = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { game_id, group_id, game_status, restarted } = req.body;

    // Ensure either game_id OR group_id is provided, but not both
    if (!game_id && !group_id) {
      return res.json({
        error: true,
        message: "Provide either game_id or group_id",
      });
    }
    if (game_id && group_id) {
      return res.json({
        error: true,
        message: "Provide only game_id or group_id, not both",
      });
    }

    let query = "UPDATE games SET game_status = $1";
    let params = [game_status];
    let restartedRoundQuery = "";
    let whereClause = "";

    // If restarted is explicitly provided
    if (typeof restarted !== "undefined") {
      query += ", restarted = $2";
      params.push(restarted);

      if (restarted === true && game_status === "scheduled") {
        // Fetch the current restarted_round value
        let restartedRoundData;
        if (group_id) {
          restartedRoundData = await pool.query(
            "SELECT MAX(restarted_round) as restarted_round FROM games WHERE group_id = $1",
            [group_id]
          );
        } else {
          restartedRoundData = await pool.query(
            "SELECT restarted_round FROM games WHERE game_id = $1",
            [game_id]
          );
        }

        let restarted_round = restartedRoundData.rows[0]?.restarted_round;

        // Initialize if null/undefined, otherwise increment
        restarted_round = restarted_round ? parseInt(restarted_round) + 1 : 1;

        restartedRoundQuery = ", restarted_round = $" + (params.length + 1);
        params.push(restarted_round);
      }
    }

    // Determine WHERE condition
    if (group_id) {
      whereClause = " WHERE group_id = $" + (params.length + 1);
      params.push(group_id);
    } else {
      whereClause = " WHERE game_id = $" + (params.length + 1);
      params.push(game_id);
    }

    // Construct final query
    query += restartedRoundQuery + whereClause + " RETURNING *";

    // Execute update query
    const updatedGames = await pool.query(query, params);

    if (updatedGames.rows.length === 0) {
      res.json({ error: true, data: [], message: "Can't Update Game Status" });
    } else {
      res.json({
        error: false,
        data: updatedGames.rows,
        message: "Game Status Updated Successfully",
      });
    }
  } catch (err) {
    console.error(err);
    res.json({ error: true, data: [], message: "Error updating game status" });
  } finally {
    client.release();
  }
};

// exports.changeStatus = async (req, res, next) => {
//   const client = await pool.connect();
//   try {
//     const { game_id, game_status, restarted } = req.body;
//     let query = "UPDATE games SET game_status = $1";
//     let params = [game_status];
//     let restartedRoundQuery = "";

//     if (typeof restarted !== "undefined") {
//       query += ", restarted = $2";
//       params.push(restarted);

//       if (restarted === true && game_status === "scheduled") {
//         // Fetch the current value of restarted_round
//         const restartedRoundData = await pool.query(
//           "SELECT restarted_round FROM games WHERE game_id = $1",
//           [game_id]
//         );

//         let restarted_round = restartedRoundData.rows[0]?.restarted_round;

//         if (restarted_round === null || restarted_round === undefined) {
//           restarted_round = 1; // Initialize if null or undefined
//         } else {
//           restarted_round = parseInt(restarted_round) + 1; // Increment the current value
//         }

//         restartedRoundQuery = ", restarted_round = $" + (params.length + 1);
//         params.push(restarted_round);
//       }
//     }

//     // Add the WHERE clause and the game_id parameter
//     query +=
//       restartedRoundQuery +
//       " WHERE game_id = $" +
//       (params.length + 1) +
//       " RETURNING *";
//     params.push(game_id);

//     const userData = await pool.query(query, params);

//     if (userData.rows.length === 0) {
//       res.json({ error: true, data: [], message: "Can't Update Game Status" });
//     } else {
//       res.json({
//         error: false,
//         data: userData.rows[0],
//         message: "Game Status Updated Successfully",
//       });
//     }
//   } catch (err) {
//     console.log(err);
//     res.json({ error: true, data: [], message: "Catch error" });
//   } finally {
//     client.release();
//   }
// };

// delete game
exports.deleteGame = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { game_id } = req.body;
    const userData = await pool.query(
      "DELETE FROM games WHERE game_id = $1 returning *",
      [game_id]
    );
    if (userData.rows.length === 0) {
      res.json({ error: true, data: [], message: "Can't Delete Game" });
    } else {
      res.json({
        error: false,
        data: userData.rows[0],
        message: "Game Deleted Successfully",
      });
    }
  } catch (err) {
    res.json({ error: true, data: [], message: "Catch eror" });
  } finally {
    client.release();
  }
};
// get All Games
// exports.getAllGames = async (req, res, next) => {
//   const client = await pool.connect();
//   try {
//     const userData = await pool.query(
//       "SELECT * FROM games ORDER BY created_at DESC"
//     );
//     if (userData.rows.length === 0) {
//       res.json({
//         error: true,
//         data: [],
//         message: "Can't Get Games or Games data Empty",
//       });
//     } else {
//       const total_games = userData.rows.length;
//       let resulting_data = [];
//       // console.log("total_games", userData.rows)
//       for (let i = 0; i < total_games; i++) {
//         const game_id = userData.rows[i].game_id;
//         const winners = userData.rows[i].winners;
//         const winning_amount = userData.rows[i].winning_amount;
//         const winning_amount_single = userData.rows[i].winning_amount_single;

//         const game_users = await pool.query(
//           "SELECT * FROM game_users WHERE game_id=$1",
//           [game_id]
//         );
//         const total_participants = game_users.rows.length;
//         const game_details = {
//           game_id: game_id,
//           entry_fee: userData.rows[i].entry_fee,
//           commission: userData.rows[i].commission,
//           game_status: userData.rows[i].game_status,
//           total_participants: total_participants,
//           winners: winners === null ? 0 : winners,
//           winning_amount:
//             winning_amount === null ? 0 : parseFloat(winning_amount).toFixed(2),
//           winning_amount_single:
//             winning_amount_single === null
//               ? 0
//               : parseFloat(winning_amount_single).toFixed(2),
//         };
//         resulting_data.push(game_details);
//         // console.log(resulting_data);
//       }
//       res.json({
//         error: false,
//         data: resulting_data,
//         message: "Games Get Successfully",
//       });
//     }
//   } catch (err) {
//     console.log(err);
//     res.json({ error: true, data: [], message: "Catch error" });
//   } finally {
//     client.release();
//   }
// };
// get All Games
exports.getAllGames = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const userData = await pool.query(
      "SELECT * FROM games ORDER BY created_at DESC"
    );
    if (userData.rows.length === 0) {
      res.json({
        error: true,
        data: [],
        message: "Can't Get Games or Games data Empty",
      });
    } else {
      const total_games = userData.rows.length;
      let resulting_data = [];
      for (let i = 0; i < total_games; i++) {
        const game_id = userData.rows[i].game_id;
        const winners = userData.rows[i].winners;
        const winning_amount = userData.rows[i].winning_amount;
        const winning_amount_single = userData.rows[i].winning_amount_single;
        const initial_deposit = userData.rows[i].initial_deposit;
        // Query to count distinct user_ids for the game
        const game_users = await pool.query(
          "SELECT COUNT(DISTINCT user_id) AS total_participants FROM game_users WHERE game_id=$1",
          [game_id]
        );
        const total_participants = game_users.rows[0].total_participants;

        const game_details = {
          game_id: game_id,
          entry_fee: userData.rows[i].entry_fee,
          commission: userData.rows[i].commission,
          game_status: userData.rows[i].game_status,
          initial_deposit: initial_deposit,
          total_participants: total_participants,
          winners: winners === null ? 0 : winners,
          winning_amount:
            winning_amount === null ? 0 : parseFloat(winning_amount).toFixed(2),
          winning_amount_single:
            winning_amount_single === null
              ? 0
              : parseFloat(winning_amount_single).toFixed(2),
        };
        resulting_data.push(game_details);
      }
      res.json({
        error: false,
        data: resulting_data,
        message: "Games Get Successfully",
      });
    }
  } catch (err) {
    console.log(err);
    res.json({ error: true, data: [], message: "Catch error" });
  } finally {
    client.release();
  }
};
// paginatyed get all
// exports.getAllGames = async (req, res, next) => {
//   const client = await pool.connect();
//   try {
//     // Get page and limit from query parameters, or set default values
//     const page = parseInt(req.body.page) || 1;
//     const limit = parseInt(req.body.limit) || 10;
//     const offset = (page - 1) * limit;

//     // Query to count total games for pagination calculation
//     const totalGamesResult = await pool.query("SELECT COUNT(*) FROM games");
//     const totalGames = parseInt(totalGamesResult.rows[0].count);

//     // Query with limit and offset for pagination
//     const userData = await pool.query(
//       "SELECT * FROM games ORDER BY created_at DESC LIMIT $1 OFFSET $2",
//       [limit, offset]
//     );

//     if (userData.rows.length === 0) {
//       res.json({
//         error: true,
//         data: [],
//         message: "Can't Get Games or Games data Empty",
//       });
//     } else {
//       let resulting_data = [];
//       for (let i = 0; i < userData.rows.length; i++) {
//         const game_id = userData.rows[i].game_id;
//         const winners = userData.rows[i].winners;
//         const winning_amount = userData.rows[i].winning_amount;
//         const winning_amount_single = userData.rows[i].winning_amount_single;

//         // Query to count distinct user_ids for the game
//         const game_users = await pool.query(
//           "SELECT COUNT(DISTINCT user_id) AS total_participants FROM game_users WHERE game_id=$1",
//           [game_id]
//         );
//         const total_participants = game_users.rows[0].total_participants;

//         const game_details = {
//           game_id: game_id,
//           entry_fee: userData.rows[i].entry_fee,
//           commission: userData.rows[i].commission,
//           game_status: userData.rows[i].game_status,
//           total_participants: total_participants,
//           winners: winners === null ? 0 : winners,
//           winning_amount:
//             winning_amount === null ? 0 : parseFloat(winning_amount).toFixed(2),
//           winning_amount_single:
//             winning_amount_single === null
//               ? 0
//               : parseFloat(winning_amount_single).toFixed(2),
//         };
//         resulting_data.push(game_details);
//       }

//       // Response with pagination info
//       res.json({
//         error: false,
//         data: resulting_data,
//         totalGames, // For frontend to calculate total pages
//         totalPages: Math.ceil(totalGames / limit), // Total pages
//         currentPage: page,
//         message: "Games Get Successfully",
//       });
//     }
//   } catch (err) {
//     console.log(err);
//     res.json({ error: true, data: [], message: "Catch error" });
//   } finally {
//     client.release();
//   }
// };
// _______________
// comment initial scenario
// } else if (parseInt(winning_ball) === parseInt(8)) {
//   // get all game users with winning ball 0
//   const gameUsers1 = await pool.query(
//     "SELECT * FROM game_users WHERE game_id=$1 ",
//     [game_id, [1, 2, 3, 4, 5, 6, 7, 8]]
//   );
//   console.log("Prev winners", gameUsers1.rows);
//   // amount deduct
//   const gameUsersWinners = await pool.query(
//     "SELECT DISTINCT user_id FROM game_users WHERE game_id = $1 AND CAST(winning_ball AS INTEGER) = ANY($2::INT[])",
//     [game_id.toString(), [1, 2, 3, 4, 5, 6, 7, 8]]
//   );
//   console.log(gameUsersWinners.rows);

//   let participated_usersWinner = gameUsersWinners.rows.length;
//   let actual_users_game_balls = gameUsers1.rows.length;
//   // No record then no winner
//   if (parseInt(participated_usersWinner) === parseInt(0)) {
//     console.log("dshjdsh");
//     return res.json({
//       error: true,
//       // game_details: game_details,
//       again_start_game: true,
//       message: "No User Winner",
//     });
//   } else {
//     console.log("else ");
//     // const participated_usersWinner = gameUsersWinners.rows.length;
//     console.log("participated_usersWinner", participated_usersWinner);
//     // console.log("participated_usersWinner", participated_users);

//     // get jackpot
//     jackpot = parseFloat(entry_fee) * parseFloat(actual_users_game_balls);
//     // deduct commision from jackpot
//     const commission_amount =
//       parseFloat(jackpot) * (parseFloat(commisssion) / 100);
//     // deduct commission from jackpot
//     jackpot = jackpot - commission_amount;

//     const winning_amount_single =
//       parseFloat(jackpot) / parseFloat(participated_usersWinner);

//     for (let i = 0; i < parseInt(participated_usersWinner); i++) {
//       const user_id = gameUsersWinners.rows[i].user_id;

//       // Fetch user's current wallet balance in a single query
//       const userWallet = await client.query(
//         "SELECT balance FROM wallet WHERE user_id=$1 FOR UPDATE", // Lock the row
//         [user_id]
//       );

//       if (userWallet.rows.length === 0) {
//         console.log(`User ${user_id} wallet not found`);
//         continue; // Skip to the next user if wallet is not found
//       }

//       // Calculate new balance
//       const newBalance =
//         parseFloat(userWallet.rows[0].balance) -
//         parseFloat(winning_amount_single);

//       // Check if the user has enough balance to deduct
//       if (newBalance < 0) {
//         console.log(`User ${user_id} does not have enough balance`);
//         continue; // Skip this user if they don't have sufficient balance
//       }

//       // Update the user's wallet balance
//       const updatedWallet = await client.query(
//         "UPDATE wallet SET balance=$1 WHERE user_id=$2 RETURNING *",
//         [newBalance, user_id]
//       );

//       console.log(
//         `Wallet updated for user ${user_id}:`,
//         updatedWallet.rows[0]
//       );
//       // remove won game
//       const winGames = await pool.query(
//         "SELECT * FROM users WHERE user_id=$1",
//         [user_id]
//       );
//       if (winGames.rows.length > 0) {
//         const winGame = await pool.query(
//           "UPDATE users SET win_games=$1 WHERE user_id=$2 RETURNING *",
//           [parseInt(winGames.rows[0].win_games) - parseInt(1), user_id]
//         );
//       }
//       // Insert transaction into transaction history
//       const transaction = await client.query(
//         "INSERT INTO transaction_history (user_id, amount, type, game_id) VALUES ($1, $2, $3, $4) RETURNING *",
//         [user_id, winning_amount_single, "diverted", game_id]
//       );

//       console.log(
//         `Transaction recorded for user ${user_id}:`,
//         transaction.rows[0]
//       );
//     }
//   }
// } else if (parseInt(winning_ball) === parseInt(9)) {
//   // get all game users with winning ball 0
//   const gameUsers1 = await pool.query(
//     "SELECT * FROM game_users WHERE game_id=$1 ",
//     [game_id]
//   );
//   console.log("Prev winners", gameUsers1.rows);
//   // amount deduct
//   const gameUsersWinners = await pool.query(
//     "SELECT DISTINCT user_id FROM game_users WHERE game_id = $1 AND CAST(winning_ball AS INTEGER) = ANY($2::INT[])",
//     [game_id.toString(), [9, 10, 11, 12, 13, 14, 15]]
//   );
//   console.log(gameUsersWinners.rows);

//   let participated_usersWinner = gameUsersWinners.rows.length;
//   let actual_users_game_balls = gameUsers1.rows.length;
//   // No record then no winner
//   if (parseInt(participated_usersWinner) === parseInt(0)) {
//     console.log("dshjdsh");
//     return res.json({
//       error: true,
//       // game_details: game_details,
//       again_start_game: true,
//       message: "No User Winner",
//     });
//   } else {
//     console.log("else ");
//     // const participated_usersWinner = gameUsersWinners.rows.length;
//     console.log("participated_usersWinner", participated_usersWinner);
//     // console.log("participated_usersWinner", participated_users);

//     // get jackpot
//     jackpot = parseFloat(entry_fee) * parseFloat(actual_users_game_balls);
//     // deduct commision from jackpot
//     const commission_amount =
//       parseFloat(jackpot) * (parseFloat(commisssion) / 100);
//     // deduct commission from jackpot
//     jackpot = jackpot - commission_amount;

//     const winning_amount_single =
//       parseFloat(jackpot) / parseFloat(participated_usersWinner);

//     for (let i = 0; i < parseInt(participated_usersWinner); i++) {
//       const user_id = gameUsersWinners.rows[i].user_id;

//       // Fetch user's current wallet balance in a single query
//       const userWallet = await client.query(
//         "SELECT balance FROM wallet WHERE user_id=$1 FOR UPDATE", // Lock the row
//         [user_id]
//       );

//       if (userWallet.rows.length === 0) {
//         console.log(`User ${user_id} wallet not found`);
//         continue; // Skip to the next user if wallet is not found
//       }

//       // Calculate new balance
//       const newBalance =
//         parseFloat(userWallet.rows[0].balance) -
//         parseFloat(winning_amount_single);

//       // Check if the user has enough balance to deduct
//       if (newBalance < 0) {
//         console.log(`User ${user_id} does not have enough balance`);
//         continue; // Skip this user if they don't have sufficient balance
//       }

//       // Update the user's wallet balance
//       const updatedWallet = await client.query(
//         "UPDATE wallet SET balance=$1 WHERE user_id=$2 RETURNING *",
//         [newBalance, user_id]
//       );
//       // remove won game
//       const winGames = await pool.query(
//         "SELECT * FROM users WHERE user_id=$1",
//         [user_id]
//       );
//       if (winGames.rows.length > 0) {
//         const winGame = await pool.query(
//           "UPDATE users SET win_games=$1 WHERE user_id=$2 RETURNING *",
//           [parseInt(winGames.rows[0].win_games) - parseInt(1), user_id]
//         );
//       }
//       console.log(
//         `Wallet updated for user ${user_id}:`,
//         updatedWallet.rows[0]
//       );

//       // Insert transaction into transaction history
//       const transaction = await client.query(
//         "INSERT INTO transaction_history (user_id, amount, type, game_id) VALUES ($1, $2, $3, $4) RETURNING *",
//         [user_id, winning_amount_single, "diverted", game_id]
//       );

//       console.log(
//         `Transaction recorded for user ${user_id}:`,
//         transaction.rows[0]
//       );
//     }
//   }
// }
// ______
// comment nect update winner
// else if (parseInt(reset_winner_ball) === parseInt(8)) {
//   const gameUsersWinners1 = await pool.query(
//     "SELECT DISTINCT user_id FROM game_users WHERE game_id = $1 AND CAST(winning_ball AS INTEGER) = ANY($2::INT[])",
//     [game_id.toString(), [1, 2, 3, 4, 5, 6, 7, 8]]
//   );
//   console.log(gameUsersWinners1.rows);

//   let participated_usersWinner1 = gameUsersWinners1.rows.length;
//   let actual_users_game_balls1 = gameUsers.rows.length;
//   // No record then no winner
//   if (parseInt(participated_usersWinner1) === parseInt(0)) {
//     console.log("dshjdsh");
//     return res.json({
//       error: true,
//       game_details: game_details,
//       again_start_game: true,
//       message: "No User Winner",
//     });
//   } else {
//     console.log("else ");
//     // const participated_usersWinner1 = gameUsersWinners1.rows.length;
//     console.log("participated_usersWinner1", participated_usersWinner1);
//     // console.log("participated_usersWinner1", participated_users);

//     // get jackpot
//     jackpot = parseFloat(entry_fee) * parseFloat(actual_users_game_balls1);
//     // deduct commision from jackpot
//     const commission_amount =
//       parseFloat(jackpot) * (parseFloat(commisssion) / 100);
//     // deduct commission from jackpot
//     jackpot = jackpot - commission_amount;

//     winning_amount_single1 =
//       parseFloat(jackpot) / parseFloat(participated_usersWinner1);

//     for (let i = 0; i < parseInt(participated_usersWinner1); i++) {
//       const user_id = gameUsersWinners1.rows[i].user_id;

//       // Fetch user's current wallet balance in a single query
//       const userWallet = await client.query(
//         "SELECT balance FROM wallet WHERE user_id=$1 FOR UPDATE", // Lock the row
//         [user_id]
//       );

//       if (userWallet.rows.length === 0) {
//         console.log(`User ${user_id} wallet not found`);
//         continue; // Skip to the next user if wallet is not found
//       }

//       // Calculate new balance
//       const newBalance =
//         parseFloat(userWallet.rows[0].balance) +
//         parseFloat(winning_amount_single1);

//       // Check if the user has enough balance to deduct
//       if (newBalance < 0) {
//         console.log(`User ${user_id} does not have enough balance`);
//         continue; // Skip this user if they don't have sufficient balance
//       }

//       // Update the user's wallet balance
//       const updatedWallet = await client.query(
//         "UPDATE wallet SET balance=$1 WHERE user_id=$2 RETURNING *",
//         [newBalance, user_id]
//       );

//       console.log(
//         `Wallet updated for user ${user_id}:`,
//         updatedWallet.rows[0]
//       );
//       const winGames = await pool.query(
//         "SELECT * FROM users WHERE user_id=$1",
//         [user_id]
//       );
//       if (winGames.rows.length > 0) {
//         const winGame = await pool.query(
//           "UPDATE users SET win_games=$1 WHERE user_id=$2 RETURNING *",
//           [parseInt(winGames.rows[0].win_games) + parseInt(1), user_id]
//         );
//       }
//       // Insert transaction into transaction history
//       const transaction = await client.query(
//         "INSERT INTO transaction_history (user_id, amount, type, game_id) VALUES ($1, $2, $3, $4) RETURNING *",
//         [user_id, winning_amount_single, "added to wallet", game_id]
//       );

//       console.log(
//         `Transaction recorded for user ${user_id}:`,
//         transaction.rows[0]
//       );
//     }
//   }
//   const gameUserWinnerReset = await pool.query(
//     "UPDATE games SET winner_ball=$1,winning_amount=$2,commision_winning_amount=$3,participants=$4,winners=$5,winning_amount_single=$6 WHERE game_id=$7 RETURNING *",
//     [
//       reset_winner_ball,
//       jackpot,
//       commission_amount,
//       participated_users,
//       participated_usersWinner1,
//       winning_amount_single1,
//       game_id,
//     ]
//   );
//   if (gameUserWinnerReset.rows.length > 0) {
//     res.json({
//       error: false,
//       winner_ball_image_url: ballImageUrls[reset_winner_ball], // Add the URL of the winner ball

//       game_details: gameUserWinnerReset.rows[0],
//       participated_users: participated_users,
//       winners: participated_usersWinner1,
//       message: "Winner Reset Successfully",
//     });
//   } else {
//     res.json({
//       error: true,
//       again_start_game: true,
//       message: "Cant Reset Winner Ball Right Now !",
//     });
//   }
// } else if (parseInt(reset_winner_ball) === parseInt(9)) {
//   const gameUsersWinners1 = await pool.query(
//     "SELECT DISTINCT user_id FROM game_users WHERE game_id = $1 AND CAST(winning_ball AS INTEGER) = ANY($2::INT[])",
//     [game_id.toString(), [9, 10, 11, 12, 13, 14, 15]]
//   );
//   console.log(gameUsersWinners1.rows);

//   let participated_usersWinner1 = gameUsersWinners1.rows.length;
//   let actual_users_game_balls1 = gameUsers.rows.length;
//   // No record then no winner
//   if (parseInt(participated_usersWinner1) === parseInt(0)) {
//     console.log("dshjdsh");
//     return res.json({
//       error: true,
//       game_details: game_details,
//       again_start_game: true,
//       message: "No User Winner",
//     });
//   } else {
//     console.log("else ");
//     // const participated_usersWinner1 = gameUsersWinners1.rows.length;
//     console.log("participated_usersWinner1", participated_usersWinner1);
//     // console.log("participated_usersWinner1", participated_users);

//     // get jackpot
//     jackpot = parseFloat(entry_fee) * parseFloat(actual_users_game_balls1);
//     // deduct commision from jackpot
//     const commission_amount =
//       parseFloat(jackpot) * (parseFloat(commisssion) / 100);
//     // deduct commission from jackpot
//     jackpot = jackpot - commission_amount;

//     winning_amount_single1 =
//       parseFloat(jackpot) / parseFloat(participated_usersWinner1);

//     for (let i = 0; i < parseInt(participated_usersWinner1); i++) {
//       const user_id = gameUsersWinners1.rows[i].user_id;

//       // Fetch user's current wallet balance in a single query
//       const userWallet = await client.query(
//         "SELECT balance FROM wallet WHERE user_id=$1 FOR UPDATE", // Lock the row
//         [user_id]
//       );

//       if (userWallet.rows.length === 0) {
//         console.log(`User ${user_id} wallet not found`);
//         continue; // Skip to the next user if wallet is not found
//       }

//       // Calculate new balance
//       const newBalance =
//         parseFloat(userWallet.rows[0].balance) +
//         parseFloat(winning_amount_single1);

//       // Check if the user has enough balance to deduct
//       if (newBalance < 0) {
//         console.log(`User ${user_id} does not have enough balance`);
//         continue; // Skip this user if they don't have sufficient balance
//       }
//       const winGames = await pool.query(
//         "SELECT * FROM users WHERE user_id=$1",
//         [user_id]
//       );
//       if (winGames.rows.length > 0) {
//         const winGame = await pool.query(
//           "UPDATE users SET win_games=$1 WHERE user_id=$2 RETURNING *",
//           [parseInt(winGames.rows[0].win_games) + parseInt(1), user_id]
//         );
//       }
//       // Update the user's wallet balance
//       const updatedWallet = await client.query(
//         "UPDATE wallet SET balance=$1 WHERE user_id=$2 RETURNING *",
//         [newBalance, user_id]
//       );

//       console.log(
//         `Wallet updated for user ${user_id}:`,
//         updatedWallet.rows[0]
//       );

//       // Insert transaction into transaction history
//       const transaction = await client.query(
//         "INSERT INTO transaction_history (user_id, amount, type, game_id) VALUES ($1, $2, $3, $4) RETURNING *",
//         [user_id, winning_amount_single, "added to wallet", game_id]
//       );

//       console.log(
//         `Transaction recorded for user ${user_id}:`,
//         transaction.rows[0]
//       );
//     }
//   }
//   const gameUserWinnerReset = await pool.query(
//     "UPDATE games SET winner_ball=$1,winning_amount=$2,commision_winning_amount=$3,participants=$4,winners=$5,winning_amount_single=$6 WHERE game_id=$7 RETURNING *",
//     [
//       reset_winner_ball,
//       jackpot,
//       commission_amount,
//       participated_users,
//       participated_usersWinner1,
//       winning_amount_single1,
//       game_id,
//     ]
//   );
//   if (gameUserWinnerReset.rows.length > 0) {
//     res.json({
//       error: false,
//       winner_ball_image_url: ballImageUrls[reset_winner_ball], // Add the URL of the winner ball

//       game_details: gameUserWinnerReset.rows[0],
//       participated_users: participated_users,
//       winners: participated_usersWinner1,
//       message: "Winner Reset Successfully",
//     });
//   } else {
//     res.json({
//       error: true,
//       again_start_game: true,
//       message: "Cant Reset Winner Ball Right Now !",
//     });
//   }
// }
exports.resetCall = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { game_id, reset_winner_ball } = req.body;
    // get game by game id
    let winning_amount_single1 = 0;
    const ballImageUrls = await fetchBallImages();

    const gameData = await pool.query("SELECT * FROM games WHERE game_id=$1", [
      game_id,
    ]);
    let game_details = gameData.rows[0];
    if (gameData.rows.length === 0) {
      return res.json({
        error: true,
        data: [],
        message: "Can't Get Games or Games data Empty",
      });
    }

    const gameUsersAll = await pool.query(
      "SELECT COUNT(DISTINCT user_id) AS total_participants FROM game_users WHERE game_id=$1",
      [game_id]
    );
    const participated_users = gameUsersAll.rows[0].total_participants;
    let winning_ball = gameData.rows[0].winner_ball;
    let entry_fee = gameData.rows[0].entry_fee;
    let commisssion = gameData.rows[0].commission;
    let commission_amount = gameData.rows[0].commission;

    let winning_amount_single = gameData.rows[0].winning_amount_single;

    console.log("gamedata");

    // const game_winners = gameData.rows[0].winners;
    // if (parseInt(game_winners) === parseInt(0)) {
    //  return res.json({
    //     error: true,
    //     data: [],
    //     message: "No Winners Found",
    //   });
    // }

    // get game users by game id
    let gameUsers = await pool.query(
      "SELECT * FROM game_users WHERE game_id=$1",
      [game_id]
    );
    if (gameUsers.rows.length === 0) {
      return res.json({
        error: true,
        data: [],
        message: "Can't Get Games or Games data Empty",
      });
    }
    // Check for reset_winner_ball conditions
    let gameUsers2;

    // if (parseInt(reset_winner_ball) === 8) {
    //   // If reset_winner_ball is 8, check for winning_ball between 1-8
    //   gameUsers2 = await pool.query(
    //     "SELECT * FROM game_users WHERE game_id=$1 AND winning_ball BETWEEN 1 AND 8",
    //     [game_id]
    //   );
    //   console.log("New winners", gameUsers2.rows);

    //   // If no users found, return an error
    //   if (gameUsers2.rows.length === 0) {
    //     return res.json({
    //       error: true,
    //       data: [],
    //       message: "No Winners Found for the specified winning ball range.",
    //     });
    //   }
    // } else if (parseInt(reset_winner_ball) === 9) {
    //   // If reset_winner_ball is 9, check for winning_ball between 9-15
    //   gameUsers2 = await pool.query(
    //     "SELECT * FROM game_users WHERE game_id=$1 AND winning_ball BETWEEN 9 AND 15",
    //     [game_id]
    //   );
    //   console.log("New winners", gameUsers2.rows);

    //   // If no users found, return an error
    //   if (gameUsers2.rows.length === 0) {
    //     return res.json({
    //       error: true,
    //       data: [],
    //       message: "No Winners Found for the specified winning ball range.",
    //     });
    //   }
    // } else if (parseInt(reset_winner_ball) === 0) {
    //   // If reset_winner_ball is 0, do nothing or handle this case if needed
    // } else {
    //   // For any other reset_winner_ball, fetch users with exact match
    //   gameUsers2 = await pool.query(
    //     "SELECT * FROM game_users WHERE game_id=$1 AND winning_ball = $2",
    //     [game_id, reset_winner_ball]
    //   );
    //   console.log("New winners", gameUsers2.rows);

    //   // If no users found, return an error
    //   if (gameUsers2.rows.length === 0) {
    //     return res.json({
    //       error: true,
    //       data: [],
    //       message: "No Winners Found for the specified winning ball range.",
    //     });
    //   }
    // }

    // const gameUsers2 = await pool.query(
    //     "SELECT * FROM game_users WHERE game_id=$1 AND winning_ball = $2",
    //     [game_id, reset_winner_ball]
    //   );
    //   console.log("New winners", gameUsers2.rows);
    //   // amount deduct
    //   if (gameUsers2.rows.length === 0) {
    //     return res.json({
    //       error: true,
    //       data: [],
    //       message: "No Winners Found",
    //     });
    //   }
    console.log("gameUsers", gameUsers.rows);
    console.log("winning_ball", winning_ball);
    console.log("winning_amount_single", winning_amount_single);
    if (parseInt(winning_ball) === parseInt(0)) {
      console.log("no winning ball prev");
    } else {
      console.log(winning_ball);
      const gameUsersWinnersPW = await pool.query(
        "SELECT DISTINCT user_id FROM game_users WHERE game_id = $1 AND winning_ball = $2",
        [game_id.toString(), winning_ball.toString()]
      );
      //         console.log("GAMEUSERWINNERS");
      let gameUsersWinnersPartWin = gameUsersWinnersPW.rows.length;
      let userIdsArray = gameUsersWinnersPW.rows.map((row) => ({
        user_id: row.user_id,
      }));
      console.log("ids user ");
      console.log(userIdsArray);

      const totalGameUsers = await pool.query(
        "SELECT COUNT(*) AS total FROM game_users WHERE game_id = $1",
        [game_id]
      );
      console.log("Total Game User Entries:", totalGameUsers.rows[0].total);

      let participated_usersWinner = totalGameUsers.rows[0].total;

      if (
        parseInt(gameUsersWinnersPartWin) === parseInt(0) ||
        parseInt(gameUsersWinnersPartWin) === null ||
        parseInt(gameUsersWinnersPartWin) === "null"
      ) {
        console.log("dshjdsh");
        return res.json({
          error: true,
          game_details: game_details,
          again_start_game: true,
          message: "No User Winner",
        });
      } else {
        console.log("else ");
        // const participated_usersWinner = gameUsersWinners.rows.length;
        console.log("participated_usersWinner", participated_usersWinner);
        // console.log("participated_usersWinner", participated_users);

        // get jackpot
        jackpot = parseFloat(entry_fee) * parseFloat(participated_usersWinner);
        // deduct commision from jackpot
        const commission_amount =
          parseFloat(jackpot) * (parseFloat(commisssion) / 100);
        // deduct commission from jackpot
        jackpot = jackpot - commission_amount;

        const winning_amount_single =
          parseFloat(jackpot) / parseFloat(gameUsersWinnersPartWin);

        // Create a map to track the count of wins for each user
        const userWinCounts = userIdsArray.reduce((acc, { user_id }) => {
          acc[user_id] = (acc[user_id] || 0) + 1;
          return acc;
        }, {});
        for (const userId in userWinCounts) {
          const winCount = userWinCounts[userId];
          const totalWinningAmount = winCount * winning_amount_single;

          // const user_id = gameUsersWinners.rows[i].user_id;

          // Fetch user's current wallet balance in a single query
          const userWallet = await client.query(
            "SELECT balance FROM wallet WHERE user_id=$1 FOR UPDATE", // Lock the row
            [userId]
          );

          if (userWallet.rows.length === 0) {
            console.log(`User ${userId} wallet not found`);
            continue; // Skip to the next user if wallet is not found
          }

          // Calculate new balance
          const newBalance =
            parseFloat(userWallet.rows[0].balance) -
            parseFloat(totalWinningAmount);
          // remove won game
          const winGames = await pool.query(
            "SELECT * FROM users WHERE user_id=$1",
            [userId]
          );
          if (winGames.rows.length > 0) {
            const winGame = await pool.query(
              "UPDATE users SET win_games=$1 WHERE user_id=$2 RETURNING *",
              [parseInt(winGames.rows[0].win_games) - parseInt(1), userId]
            );
          }

          // Check if the user has enough balance to deduct
          if (newBalance < 0) {
            console.log(`User ${userId} does not have enough balance`);
            continue; // Skip this user if they don't have sufficient balance
          }

          // Update the user's wallet balance
          const updatedWallet = await client.query(
            "UPDATE wallet SET balance=$1 WHERE user_id=$2 RETURNING *",
            [newBalance, userId]
          );

          console.log(
            `Wallet updated for user ${userId}:`,
            updatedWallet.rows[0]
          );

          // Insert transaction into transaction history
          const transaction = await client.query(
            "INSERT INTO transaction_history (user_id, amount, type, game_id) VALUES ($1, $2, $3, $4) RETURNING *",
            [userId, totalWinningAmount, "diverted", game_id]
          );

          console.log(
            `Transaction recorded for user ${userId}:`,
            transaction.rows[0]
          );
        }
      }
      // UPADTE NEW USERS
      //-------------------------------------
      // ADDD
    }
    console.log("new Winners data");
    // New users updatyed wallet
    // _________
    // ____
    // get all game users with winning ball 0
    const gameUsersWinnersNew = await pool.query(
      "SELECT * FROM game_users WHERE game_id=$1 AND winning_ball = $2",
      [game_id, reset_winner_ball]
    );
    console.log("Prev winners", gameUsersWinnersNew.rows);
    // amount deduct
    if (parseInt(reset_winner_ball) === parseInt(0)) {
      console.log("HOUSE WINS");

      const gameUserWinnerReset = await pool.query(
        "UPDATE games SET winner_ball=$1,winning_amount=$2,commision_winning_amount=$3,participants=$4,winners=$5,winning_amount_single=$6 WHERE game_id=$7 RETURNING *",
        [
          reset_winner_ball,
          jackpot,
          commission_amount,
          participated_users,
          0,
          0,
          game_id,
        ]
      );
      if (gameUserWinnerReset.rows.length > 0) {
        res.json({
          error: false,
          winner_ball_image_url: ballImageUrls[reset_winner_ball], // Add the URL of the winner ball

          game_details: gameUserWinnerReset.rows[0],
          participated_users: participated_users,
          winners: 0,
          message: "Winner Reset Successfully",
        });
      } else {
        res.json({
          error: true,
          again_start_game: true,
          message: "Cant Reset Winner Ball Right Now !",
        });
      }
    } else if (parseInt(reset_winner_ball) === parseInt(8)) {
      // reset_winner_ball
      const gameUsersWinnersP = await pool.query(
        "SELECT DISTINCT user_id FROM game_users WHERE game_id = $1",
        [game_id.toString()]
      );
      //         console.log("GAMEUSERWINNERS");
      let gameUsersWinnersPart = gameUsersWinnersP.rows.length;
      const gameUsersWinnersPW = await pool.query(
        "SELECT user_id FROM game_users WHERE game_id = $1 AND CAST(winning_ball AS INTEGER) = ANY($2::INT[])",
        [game_id.toString(), [1, 2, 3, 4, 5, 6, 7, 8]]
      );
      //         console.log("GAMEUSERWINNERS");
      let gameUsersWinnersPartWin = gameUsersWinnersPW.rows.length;
      let userIdsArray = gameUsersWinnersPW.rows.map((row) => ({
        user_id: row.user_id,
      }));
      console.log("ids user ");
      console.log(userIdsArray);

      const totalGameUsers = await pool.query(
        "SELECT COUNT(*) AS total FROM game_users WHERE game_id = $1",
        [game_id]
      );
      console.log("Total Game User Entries:", totalGameUsers.rows[0].total);

      // Step 2: Use a CTE to identify winning users and count all their entries
      //       const countQuery = `
      // WITH winning_users AS (
      //   SELECT DISTINCT user_id
      //   FROM game_users
      //   WHERE game_id = $1 AND winning_ball = $2
      // )
      // SELECT COUNT(*) AS winning_entries, ARRAY_AGG(user_id) AS winning_user_ids
      // FROM game_users
      // WHERE game_id = $1
      //   AND user_id IN (SELECT user_id FROM winning_users)
      // `;

      //       const countParams = [game_id.toString(), reset_winner_ball.toString()];

      //       const gameUsersCountResult = await pool.query(countQuery, countParams);

      //       console.log(
      //         "Winning Users Count (All Their Entries):",
      //         gameUsersCountResult.rows[0].winning_entries
      //       );
      //       let winningUsersCount = gameUsersCountResult.rows[0].winning_entries;
      //       const winningUserIds = gameUsersCountResult.rows[0].winning_user_ids;
      //       console.log("GAMEUSERWINNERS 1");
      //       console.log(winningUserIds);

      let participated_usersWinner1 = totalGameUsers.rows[0].total;
      // let actual_users_game_balls1 = winningUsersCount;
      // const gameUsersWinners1 = await pool.query(
      //   "SELECT DISTINCT user_id FROM game_users WHERE game_id = $1 AND winning_ball = $2",
      //   [game_id.toString(), reset_winner_ball.toString()]
      // );
      // console.log(gameUsersWinners1.rows);

      // let participated_usersWinner1 = gameUsersWinners1.rows.length;
      // let actual_users_game_balls1 = gameUsers.rows.length;
      // No record then no winner
      if (
        parseInt(gameUsersWinnersPartWin) === parseInt(0) ||
        parseInt(gameUsersWinnersPartWin) === null ||
        parseInt(gameUsersWinnersPartWin) === "null"
      ) {
        console.log("dshjdsh");
        return res.json({
          error: true,
          game_details: game_details,
          again_start_game: true,
          message: "No User Winner",
        });
      } else {
        console.log("else ");
        // const participated_usersWinner1 = gameUsersWinners1.rows.length;
        console.log("participated_usersWinner1", participated_usersWinner1);
        // console.log("participated_usersWinner1", participated_users);

        // get jackpot
        jackpot = parseFloat(entry_fee) * parseFloat(participated_usersWinner1);
        // deduct commision from jackpot
        const commission_amount =
          parseFloat(jackpot) * (parseFloat(commisssion) / 100);
        // deduct commission from jackpot
        jackpot = jackpot - commission_amount;

        winning_amount_single1 =
          parseFloat(jackpot) / parseFloat(gameUsersWinnersPartWin);
        const userWinCounts = userIdsArray.reduce((acc, { user_id }) => {
          acc[user_id] = (acc[user_id] || 0) + 1;
          return acc;
        }, {});

        for (const userId in userWinCounts) {
          // const user_id = gameUsersWinners1.rows[i].user_id;
          const winCount = userWinCounts[userId];
          const totalWinningAmount = winCount * winning_amount_single1;

          // Fetch user's current wallet balance in a single query
          const userWallet = await client.query(
            "SELECT balance FROM wallet WHERE user_id=$1 FOR UPDATE", // Lock the row
            [userId]
          );

          if (userWallet.rows.length === 0) {
            console.log(`User ${userId} wallet not found`);
            continue; // Skip to the next user if wallet is not found
          }

          // Calculate new balance
          const newBalance =
            parseFloat(userWallet.rows[0].balance) +
            parseFloat(totalWinningAmount);

          // Check if the user has enough balance to deduct
          if (newBalance < 0) {
            console.log(`User ${userId} does not have enough balance`);
            continue; // Skip this user if they don't have sufficient balance
          }
          // remove won game
          const winGames = await pool.query(
            "SELECT * FROM users WHERE user_id=$1",
            [userId]
          );
          if (winGames.rows.length > 0) {
            const winGame = await pool.query(
              "UPDATE users SET win_games=$1 WHERE user_id=$2 RETURNING *",
              [parseInt(winGames.rows[0].win_games) + parseInt(1), userId]
            );
          }
          // Update the user's wallet balance
          const updatedWallet = await client.query(
            "UPDATE wallet SET balance=$1 WHERE user_id=$2 RETURNING *",
            [newBalance, userId]
          );

          console.log(
            `Wallet updated for user ${userId}:`,
            updatedWallet.rows[0]
          );

          // Insert transaction into transaction history
          const transaction = await client.query(
            "INSERT INTO transaction_history (user_id, amount, type, game_id) VALUES ($1, $2, $3, $4) RETURNING *",
            [userId, totalWinningAmount, "added to wallet", game_id]
          );

          console.log(
            `Transaction recorded for user ${userId}:`,
            transaction.rows[0]
          );
        }
      }

      const gameUserWinnerReset = await pool.query(
        "UPDATE games SET winner_ball=$1,winning_amount=$2,commision_winning_amount=$3,participants=$4,winners=$5,winning_amount_single=$6 WHERE game_id=$7 RETURNING *",
        [
          reset_winner_ball,
          jackpot,
          commission_amount,
          participated_users,
          participated_usersWinner1,
          winning_amount_single1,
          game_id,
        ]
      );
      if (gameUserWinnerReset.rows.length > 0) {
        res.json({
          error: false,
          winner_ball_image_url: ballImageUrls[reset_winner_ball], // Add the URL of the winner ball

          game_details: gameUserWinnerReset.rows[0],
          participated_users: participated_users,
          winners: participated_usersWinner1,
          message: "Winner Reset Successfully",
        });
      } else {
        res.json({
          error: true,
          again_start_game: true,
          message: "Cant Reset Winner Ball Right Now !",
        });
      }
    } else if (parseInt(reset_winner_ball) === parseInt(9)) {
      // reset_winner_ball
      const gameUsersWinnersP = await pool.query(
        "SELECT DISTINCT user_id FROM game_users WHERE game_id = $1",
        [game_id.toString()]
      );
      //         console.log("GAMEUSERWINNERS");
      let gameUsersWinnersPart = gameUsersWinnersP.rows.length;
      const gameUsersWinnersPW = await pool.query(
        "SELECT user_id FROM game_users WHERE game_id = $1 AND CAST(winning_ball AS INTEGER) = ANY($2::INT[])",
        [game_id.toString(), [9, 10, 11, 12, 13, 14, 15]]
      );
      //         console.log("GAMEUSERWINNERS");
      let gameUsersWinnersPartWin = gameUsersWinnersPW.rows.length;
      let userIdsArray = gameUsersWinnersPW.rows.map((row) => ({
        user_id: row.user_id,
      }));
      console.log("ids user ");
      console.log(userIdsArray);

      const totalGameUsers = await pool.query(
        "SELECT COUNT(*) AS total FROM game_users WHERE game_id = $1",
        [game_id]
      );
      console.log("Total Game User Entries:", totalGameUsers.rows[0].total);

      // Step 2: Use a CTE to identify winning users and count all their entries
      //       const countQuery = `
      // WITH winning_users AS (
      //   SELECT DISTINCT user_id
      //   FROM game_users
      //   WHERE game_id = $1 AND winning_ball = $2
      // )
      // SELECT COUNT(*) AS winning_entries, ARRAY_AGG(user_id) AS winning_user_ids
      // FROM game_users
      // WHERE game_id = $1
      //   AND user_id IN (SELECT user_id FROM winning_users)
      // `;

      //       const countParams = [game_id.toString(), reset_winner_ball.toString()];

      //       const gameUsersCountResult = await pool.query(countQuery, countParams);

      //       console.log(
      //         "Winning Users Count (All Their Entries):",
      //         gameUsersCountResult.rows[0].winning_entries
      //       );
      //       let winningUsersCount = gameUsersCountResult.rows[0].winning_entries;
      //       const winningUserIds = gameUsersCountResult.rows[0].winning_user_ids;
      //       console.log("GAMEUSERWINNERS 1");
      //       console.log(winningUserIds);

      let participated_usersWinner1 = totalGameUsers.rows[0].total;
      // let actual_users_game_balls1 = winningUsersCount;
      // const gameUsersWinners1 = await pool.query(
      //   "SELECT DISTINCT user_id FROM game_users WHERE game_id = $1 AND winning_ball = $2",
      //   [game_id.toString(), reset_winner_ball.toString()]
      // );
      // console.log(gameUsersWinners1.rows);

      // let participated_usersWinner1 = gameUsersWinners1.rows.length;
      // let actual_users_game_balls1 = gameUsers.rows.length;
      // No record then no winner
      if (
        parseInt(gameUsersWinnersPartWin) === parseInt(0) ||
        parseInt(gameUsersWinnersPartWin) === null ||
        parseInt(gameUsersWinnersPartWin) === "null"
      ) {
        console.log("dshjdsh");
        return res.json({
          error: true,
          game_details: game_details,
          again_start_game: true,
          message: "No User Winner",
        });
      } else {
        console.log("else ");
        // const participated_usersWinner1 = gameUsersWinners1.rows.length;
        console.log("participated_usersWinner1", participated_usersWinner1);
        // console.log("participated_usersWinner1", participated_users);

        // get jackpot
        jackpot = parseFloat(entry_fee) * parseFloat(participated_usersWinner1);
        // deduct commision from jackpot
        const commission_amount =
          parseFloat(jackpot) * (parseFloat(commisssion) / 100);
        // deduct commission from jackpot
        jackpot = jackpot - commission_amount;

        winning_amount_single1 =
          parseFloat(jackpot) / parseFloat(gameUsersWinnersPartWin);
        const userWinCounts = userIdsArray.reduce((acc, { user_id }) => {
          acc[user_id] = (acc[user_id] || 0) + 1;
          return acc;
        }, {});

        for (const userId in userWinCounts) {
          // const user_id = gameUsersWinners1.rows[i].user_id;
          const winCount = userWinCounts[userId];
          const totalWinningAmount = winCount * winning_amount_single1;

          // Fetch user's current wallet balance in a single query
          const userWallet = await client.query(
            "SELECT balance FROM wallet WHERE user_id=$1 FOR UPDATE", // Lock the row
            [userId]
          );

          if (userWallet.rows.length === 0) {
            console.log(`User ${userId} wallet not found`);
            continue; // Skip to the next user if wallet is not found
          }

          // Calculate new balance
          const newBalance =
            parseFloat(userWallet.rows[0].balance) +
            parseFloat(totalWinningAmount);

          // Check if the user has enough balance to deduct
          if (newBalance < 0) {
            console.log(`User ${userId} does not have enough balance`);
            continue; // Skip this user if they don't have sufficient balance
          }
          // remove won game
          const winGames = await pool.query(
            "SELECT * FROM users WHERE user_id=$1",
            [userId]
          );
          if (winGames.rows.length > 0) {
            const winGame = await pool.query(
              "UPDATE users SET win_games=$1 WHERE user_id=$2 RETURNING *",
              [parseInt(winGames.rows[0].win_games) + parseInt(1), userId]
            );
          }
          // Update the user's wallet balance
          const updatedWallet = await client.query(
            "UPDATE wallet SET balance=$1 WHERE user_id=$2 RETURNING *",
            [newBalance, userId]
          );

          console.log(
            `Wallet updated for user ${userId}:`,
            updatedWallet.rows[0]
          );

          // Insert transaction into transaction history
          const transaction = await client.query(
            "INSERT INTO transaction_history (user_id, amount, type, game_id) VALUES ($1, $2, $3, $4) RETURNING *",
            [userId, totalWinningAmount, "added to wallet", game_id]
          );

          console.log(
            `Transaction recorded for user ${userId}:`,
            transaction.rows[0]
          );
        }
      }

      const gameUserWinnerReset = await pool.query(
        "UPDATE games SET winner_ball=$1,winning_amount=$2,commision_winning_amount=$3,participants=$4,winners=$5,winning_amount_single=$6 WHERE game_id=$7 RETURNING *",
        [
          reset_winner_ball,
          jackpot,
          commission_amount,
          participated_users,
          participated_usersWinner1,
          winning_amount_single1,
          game_id,
        ]
      );
      if (gameUserWinnerReset.rows.length > 0) {
        res.json({
          error: false,
          winner_ball_image_url: ballImageUrls[reset_winner_ball], // Add the URL of the winner ball

          game_details: gameUserWinnerReset.rows[0],
          participated_users: participated_users,
          winners: participated_usersWinner1,
          message: "Winner Reset Successfully",
        });
      } else {
        res.json({
          error: true,
          again_start_game: true,
          message: "Cant Reset Winner Ball Right Now !",
        });
      }
    } else {
      // reset_winner_ball
      const gameUsersWinnersP = await pool.query(
        "SELECT DISTINCT user_id FROM game_users WHERE game_id = $1",
        [game_id.toString()]
      );
      //         console.log("GAMEUSERWINNERS");
      let gameUsersWinnersPart = gameUsersWinnersP.rows.length;
      const gameUsersWinnersPW = await pool.query(
        "SELECT DISTINCT user_id FROM game_users WHERE game_id = $1 AND winning_ball = $2",
        [game_id.toString(), reset_winner_ball.toString()]
      );
      //         console.log("GAMEUSERWINNERS");
      let gameUsersWinnersPartWin = gameUsersWinnersPW.rows.length;
      let userIdsArray = gameUsersWinnersPW.rows.map((row) => ({
        user_id: row.user_id,
      }));
      console.log("ids user ");
      console.log(userIdsArray);

      const totalGameUsers = await pool.query(
        "SELECT COUNT(*) AS total FROM game_users WHERE game_id = $1",
        [game_id]
      );
      console.log("Total Game User Entries:", totalGameUsers.rows[0].total);

      // Step 2: Use a CTE to identify winning users and count all their entries
      //       const countQuery = `
      // WITH winning_users AS (
      //   SELECT DISTINCT user_id
      //   FROM game_users
      //   WHERE game_id = $1 AND winning_ball = $2
      // )
      // SELECT COUNT(*) AS winning_entries, ARRAY_AGG(user_id) AS winning_user_ids
      // FROM game_users
      // WHERE game_id = $1
      //   AND user_id IN (SELECT user_id FROM winning_users)
      // `;

      //       const countParams = [game_id.toString(), reset_winner_ball.toString()];

      //       const gameUsersCountResult = await pool.query(countQuery, countParams);

      //       console.log(
      //         "Winning Users Count (All Their Entries):",
      //         gameUsersCountResult.rows[0].winning_entries
      //       );
      //       let winningUsersCount = gameUsersCountResult.rows[0].winning_entries;
      //       const winningUserIds = gameUsersCountResult.rows[0].winning_user_ids;
      //       console.log("GAMEUSERWINNERS 1");
      //       console.log(winningUserIds);

      let participated_usersWinner1 = totalGameUsers.rows[0].total;
      // let actual_users_game_balls1 = winningUsersCount;
      // const gameUsersWinners1 = await pool.query(
      //   "SELECT DISTINCT user_id FROM game_users WHERE game_id = $1 AND winning_ball = $2",
      //   [game_id.toString(), reset_winner_ball.toString()]
      // );
      // console.log(gameUsersWinners1.rows);

      // let participated_usersWinner1 = gameUsersWinners1.rows.length;
      // let actual_users_game_balls1 = gameUsers.rows.length;
      // No record then no winner
      if (
        parseInt(gameUsersWinnersPartWin) === parseInt(0) ||
        parseInt(gameUsersWinnersPartWin) === null ||
        parseInt(gameUsersWinnersPartWin) === "null"
      ) {
        console.log("dshjdsh");
        return res.json({
          error: true,
          game_details: game_details,
          again_start_game: true,
          message: "No User Winner",
        });
      } else {
        console.log("else ");
        // const participated_usersWinner1 = gameUsersWinners1.rows.length;
        console.log("participated_usersWinner1", participated_usersWinner1);
        // console.log("participated_usersWinner1", participated_users);

        // get jackpot
        jackpot = parseFloat(entry_fee) * parseFloat(participated_usersWinner1);
        // deduct commision from jackpot
        const commission_amount =
          parseFloat(jackpot) * (parseFloat(commisssion) / 100);
        // deduct commission from jackpot
        jackpot = jackpot - commission_amount;

        winning_amount_single1 =
          parseFloat(jackpot) / parseFloat(gameUsersWinnersPartWin);
        const userWinCounts = userIdsArray.reduce((acc, { user_id }) => {
          acc[user_id] = (acc[user_id] || 0) + 1;
          return acc;
        }, {});

        for (const userId in userWinCounts) {
          // const user_id = gameUsersWinners1.rows[i].user_id;
          const winCount = userWinCounts[userId];
          const totalWinningAmount = winCount * winning_amount_single1;

          // Fetch user's current wallet balance in a single query
          const userWallet = await client.query(
            "SELECT balance FROM wallet WHERE user_id=$1 FOR UPDATE", // Lock the row
            [userId]
          );

          if (userWallet.rows.length === 0) {
            console.log(`User ${userId} wallet not found`);
            continue; // Skip to the next user if wallet is not found
          }

          // Calculate new balance
          const newBalance =
            parseFloat(userWallet.rows[0].balance) +
            parseFloat(totalWinningAmount);

          // Check if the user has enough balance to deduct
          if (newBalance < 0) {
            console.log(`User ${userId} does not have enough balance`);
            continue; // Skip this user if they don't have sufficient balance
          }
          // remove won game
          const winGames = await pool.query(
            "SELECT * FROM users WHERE user_id=$1",
            [userId]
          );
          if (winGames.rows.length > 0) {
            const winGame = await pool.query(
              "UPDATE users SET win_games=$1 WHERE user_id=$2 RETURNING *",
              [parseInt(winGames.rows[0].win_games) + parseInt(1), userId]
            );
          }
          // Update the user's wallet balance
          const updatedWallet = await client.query(
            "UPDATE wallet SET balance=$1 WHERE user_id=$2 RETURNING *",
            [newBalance, userId]
          );

          console.log(
            `Wallet updated for user ${userId}:`,
            updatedWallet.rows[0]
          );

          // Insert transaction into transaction history
          const transaction = await client.query(
            "INSERT INTO transaction_history (user_id, amount, type, game_id) VALUES ($1, $2, $3, $4) RETURNING *",
            [userId, totalWinningAmount, "added to wallet", game_id]
          );

          console.log(
            `Transaction recorded for user ${userId}:`,
            transaction.rows[0]
          );
        }
      }

      const gameUserWinnerReset = await pool.query(
        "UPDATE games SET winner_ball=$1,winning_amount=$2,commision_winning_amount=$3,participants=$4,winners=$5,winning_amount_single=$6 WHERE game_id=$7 RETURNING *",
        [
          reset_winner_ball,
          jackpot,
          commission_amount,
          participated_users,
          participated_usersWinner1,
          winning_amount_single1,
          game_id,
        ]
      );
      if (gameUserWinnerReset.rows.length > 0) {
        res.json({
          error: false,
          winner_ball_image_url: ballImageUrls[reset_winner_ball], // Add the URL of the winner ball

          game_details: gameUserWinnerReset.rows[0],
          participated_users: participated_users,
          winners: participated_usersWinner1,
          message: "Winner Reset Successfully",
        });
      } else {
        res.json({
          error: true,
          again_start_game: true,
          message: "Cant Reset Winner Ball Right Now !",
        });
      }
    }
  } catch (err) {
    console.log(err);
    res.json({ error: true, data: [], message: "Catch error" });
  } finally {
    client.release();
  }
};
//get all user games in which user participated

// exports.getGameUserByGameId = async (req, res, next) => {
//   const client = await pool.connect();
//   try {
//     const ballImageUrls = await fetchBallImages();
//     const { user_id } = req.query;
//     const userData = await pool.query(
//       "SELECT * FROM game_users WHERE user_id=$1",
//       [user_id]
//     );
//     if (userData.rows.length === 0) {
//       res.json({
//         error: true,
//         data: [],
//         message: "Can't Get Games or Games data Empty",
//       });
//     } else {
//       // Store game data with multiple user selections
//       const gameMap = {};

//       for (const userGame of userData.rows) {
//         const user_selected_winning_ball = userGame.winning_ball;
//         const game_id = userGame.game_id;

//         if (!user_selected_winning_ball) {
//           continue;
//         }

//         // Fetch game details only once for each game_id
//         if (!gameMap[game_id]) {
//           const game_details = await pool.query(
//             "SELECT * FROM games WHERE game_id=$1 AND game_status='completed' ORDER BY created_at DESC LIMIT 1",
//             [game_id]
//           );
//           if (game_details.rows.length === 0) {
//             console.log(`Game with id ${game_id} doesn't exist`);
//             continue;
//           }

//           // Get game status and other data
//           const game_statusData = game_details.rows[0].game_status;
//           const winner_ball = game_details.rows[0].winner_ball;
//           const played_at = game_details.rows[0].played_at;
//           const winning_amount =
//             Number(game_details.rows[0].winning_amount) % 1 === 0
//               ? Number(game_details.rows[0].winning_amount)
//               : Number(game_details.rows[0].winning_amount).toFixed(2);
//           const winning_amount_single =
//             Number(game_details.rows[0].winning_amount_single) % 1 === 0
//               ? Number(game_details.rows[0].winning_amount_single)
//               : Number(game_details.rows[0].winning_amount_single).toFixed(2);

//           const game_users = await pool.query(
//             "SELECT * FROM game_users WHERE game_id=$1",
//             [game_id]
//           );
//           const total_participants = game_users.rows.length;

//           gameMap[game_id] = {
//             game_id,
//             entry_fee: game_details.rows[0].entry_fee,
//             commission: game_details.rows[0].commission,
//             game_status: game_statusData,
//             total_participants,
//             winner_ball,
//             winner_ball_image_url: ballImageUrls[winner_ball],
//             played_at,
//             winning_amount,
//             winning_amount_single,
//             user_selections: [],
//             game_status_final: "Lost", // Default status
//           };
//         }

//         // Determine user's status based on winning ball
//         let UserStatus = "Lost";
//         if (
//           parseInt(user_selected_winning_ball) ===
//           parseInt(gameMap[game_id].winner_ball)
//         ) {
//           UserStatus = "Win";
//           gameMap[game_id].game_status_final = "Win"; // If any user wins, set the game status to Win
//         } else if (parseInt(gameMap[game_id].winner_ball) === 0) {
//           UserStatus = "House Wins";
//           gameMap[game_id].game_status_final = "House Wins"; // If House Wins, override the status
//         } else if (
//           parseInt(gameMap[game_id].winner_ball) === 8 &&
//           parseInt(user_selected_winning_ball) >= 1 &&
//           parseInt(user_selected_winning_ball) <= 8
//         ) {
//           UserStatus = "Win";
//           gameMap[game_id].game_status_final = "Win"; // If user wins, set to Win
//         } else if (
//           parseInt(gameMap[game_id].winner_ball) === 9 &&
//           parseInt(user_selected_winning_ball) >= 9 &&
//           parseInt(user_selected_winning_ball) <= 15
//         ) {
//           UserStatus = "Win";
//           gameMap[game_id].game_status_final = "Win"; // Set to Win if user wins
//         }

//         // Add user selection for this game
//         gameMap[game_id].user_selections.push({
//           user_selected_winning_ball,
//           user_selected_ball_image_url:
//             ballImageUrls[user_selected_winning_ball],
//           UserStatus,
//         });
//       }

//       // Convert gameMap to an array
//       const resulting_data = Object.values(gameMap)
//         .map((game) => {
//           // If the game_status_final is still "Lost" and there was no "Win" or "House Wins", it's "Lost"
//           if (
//             game.game_status_final !== "Win" &&
//             game.game_status_final !== "House Wins"
//           ) {
//             game.game_status_final = "Lost";
//           }

//           return {
//             ...game,
//             game_status: game.game_status_final, // Set the final game status
//           };
//         })
//         .sort((a, b) => new Date(b.played_at) - new Date(a.played_at));

//       res.json({
//         error: false,
//         data: resulting_data,
//         message: "Games Get Successfully",
//       });
//     }
//   } catch (err) {
//     console.log(err);
//     res.json({ error: true, data: [], message: "Catch error" });
//   } finally {
//     client.release();
//   }
// };
exports.getGameUserByGameId = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const ballImageUrls = await fetchBallImages();
    const { user_id, limit = 10, page = 1 } = req.query; // Default limit: 10, page: 1
    const offset = (page - 1) * limit; // Calculate offset for pagination

    const userData = await pool.query(
      "SELECT * FROM game_users WHERE user_id=$1",
      [user_id]
    );

    if (userData.rows.length === 0) {
      return res.json({
        error: true,
        data: [],
        message: "Can't Get Games or Games data Empty",
      });
    }

    const gameMap = {};

    for (const userGame of userData.rows) {
      const user_selected_winning_ball = userGame.winning_ball;
      const game_id = userGame.game_id;

      if (!user_selected_winning_ball) continue;

      // Fetch game details only once per game
      if (!gameMap[game_id]) {
        const game_details = await pool.query(
          "SELECT * FROM games WHERE game_id=$1 AND game_status='completed' ORDER BY created_at DESC LIMIT 1",
          [game_id]
        );

        if (game_details.rows.length === 0) {
          console.log(`Game with id ${game_id} doesn't exist`);
          continue;
        }

        const gameData = game_details.rows[0];
        const played_at = gameData.played_at;
        const winning_amount = parseFloat(gameData.winning_amount) || 0;
        const winning_amount_single = parseFloat(
          gameData.winning_amount_single || 0
        );

        // Parse winner details (ensure valid JSON parsing)
        const winnerDetails =
          typeof gameData.winner_details === "string"
            ? JSON.parse(gameData.winner_details)
            : gameData.winner_details || [];

        const winningBalls =
          typeof gameData.winner_ball === "string"
            ? JSON.parse(gameData.winner_ball)
            : gameData.winner_ball || [];

        const totalParticipantsQuery = await pool.query(
          "SELECT COUNT(DISTINCT user_id) AS total_participants FROM game_users WHERE game_id=$1",
          [game_id]
        );
        const total_participants =
          totalParticipantsQuery.rows[0]?.total_participants || 0;

        // Store game details in the map
        gameMap[game_id] = {
          game_id,
          entry_fee: gameData.entry_fee,
          commission: gameData.commission,
          game_status: "Lost", // Default
          total_participants,
          winner_ball: [], // This will store the new structured format
          played_at,
          winning_amount: winning_amount.toFixed(2),
          winning_amount_single: winning_amount_single.toFixed(2),
          user_selections: [],
          winners: [],
        };

        // Process winners and restructure `winner_ball`
        const winnersGroupedByBall = winnerDetails.reduce((acc, winner) => {
          if (!acc[winner.ball]) acc[winner.ball] = [];
          acc[winner.ball].push(winner);
          return acc;
        }, {});

        // Define jackpot distribution percentages
        const distribution = {
          1: [100],
          2: [60, 40],
          3: [50, 30, 20],
        };

        Object.entries(winnersGroupedByBall).forEach(([ball, users], index) => {
          const position = index + 1; // Assign position (1st, 2nd, 3rd)
          const winningPercentage = distribution[winnerDetails.length][index];
          const totalBallWinningAmount =
            (winning_amount * winningPercentage) / 100;
          const amountPerUser = totalBallWinningAmount / users.length;

          // **NEW STRUCTURE FOR `winner_ball`**
          gameMap[game_id].winner_ball.push({
            ball: parseInt(ball),
            ball_image_url: ballImageUrls[ball] || null,
            position: `${position} position`,
            percentage: winningPercentage,
            total_amount: totalBallWinningAmount.toFixed(2),
            amount_per_user: amountPerUser.toFixed(2),
          });

          users.forEach((user) => {
            gameMap[game_id].winners.push({
              position: `${position} position`,
              user_id: user.user_id,
              ball: parseInt(ball),
              percentage: winningPercentage / users.length,
              amount: amountPerUser.toFixed(2),
              ball_image_url: ballImageUrls[ball] || null,
            });

            // Mark the user's status if they are in the winners list
            if (user.user_id === user_id) {
              gameMap[game_id].game_status = "Win";
            }
          });
        });
      }

      // Determine user's status based on selected ball
      let UserStatus = "Lost";
      if (
        gameMap[game_id].winner_ball.some(
          (wb) => wb.ball === user_selected_winning_ball
        )
      ) {
        UserStatus = "Win";
      } else if (gameMap[game_id].winner_ball.some((wb) => wb.ball === 0)) {
        UserStatus = "House Wins";
      }

      // Add user selection
      gameMap[game_id].user_selections.push({
        user_selected_winning_ball,
        user_selected_ball_image_url:
          ballImageUrls[user_selected_winning_ball] || null,
      });
    }

    // Convert gameMap to an array
    const sorted_data = Object.values(gameMap).sort(
      (a, b) => new Date(b.played_at) - new Date(a.played_at)
    );

    // Apply pagination
    const paginatedData = sorted_data.slice(offset, offset + parseInt(limit));

    res.json({
      error: false,
      data: paginatedData,
      currentPage: parseInt(page),
      totalPages: Math.ceil(sorted_data.length / limit),
      totalRecords: sorted_data.length,
      message: "Games Get Successfully",
    });
  } catch (err) {
    console.log(err);
    res.json({ error: true, data: [], message: "Catch error" });
  } finally {
    client.release();
  }
};

exports.getGameUserByGameId1 = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const ballImageUrls = await fetchBallImages();
    const { user_id } = req.query;

    const userData = await pool.query(
      "SELECT * FROM game_users WHERE user_id=$1",
      [user_id]
    );

    if (userData.rows.length === 0) {
      return res.json({
        error: true,
        data: [],
        message: "Can't Get Games or Games data Empty",
      });
    }

    const gameMap = {};

    for (const userGame of userData.rows) {
      const user_selected_winning_ball = userGame.winning_ball;
      const game_id = userGame.game_id;

      if (!user_selected_winning_ball) continue;

      // Fetch game details only once per game
      if (!gameMap[game_id]) {
        const game_details = await pool.query(
          "SELECT * FROM games WHERE game_id=$1 AND game_status='completed' ORDER BY created_at DESC LIMIT 1",
          [game_id]
        );

        if (game_details.rows.length === 0) {
          console.log(`Game with id ${game_id} doesn't exist`);
          continue;
        }

        const gameData = game_details.rows[0];
        const played_at = gameData.played_at;
        const winning_amount = parseFloat(gameData.winning_amount) || 0;
        const winning_amount_single = parseFloat(
          gameData.winning_amount_single || 0
        );

        // Parse winner details (ensure valid JSON parsing)
        const winnerDetails =
          typeof gameData.winner_details === "string"
            ? JSON.parse(gameData.winner_details)
            : gameData.winner_details || [];

        const winningBalls =
          typeof gameData.winner_ball === "string"
            ? JSON.parse(gameData.winner_ball)
            : gameData.winner_ball || [];

        const totalParticipantsQuery = await pool.query(
          "SELECT COUNT(DISTINCT user_id) AS total_participants FROM game_users WHERE game_id=$1",
          [game_id]
        );
        const total_participants =
          totalParticipantsQuery.rows[0]?.total_participants || 0;

        // Store game details in the map
        gameMap[game_id] = {
          game_id,
          entry_fee: gameData.entry_fee,
          commission: gameData.commission,
          game_status: "Lost", // Default
          total_participants,
          winner_ball: [], // This will store the new structured format
          played_at,
          winning_amount: winning_amount.toFixed(2),
          winning_amount_single: winning_amount_single.toFixed(2),
          user_selections: [],
          winners: [],
        };

        // Process winners and restructure `winner_ball`
        const winnersGroupedByBall = winnerDetails.reduce((acc, winner) => {
          if (!acc[winner.ball]) acc[winner.ball] = [];
          acc[winner.ball].push(winner);
          return acc;
        }, {});

        // Define jackpot distribution percentages
        const distribution = {
          1: [100],
          2: [60, 40],
          3: [50, 30, 20],
        };

        Object.entries(winnersGroupedByBall).forEach(([ball, users], index) => {
          const position = index + 1; // Assign position (1st, 2nd, 3rd)
          const winningPercentage = distribution[winnerDetails.length][index];
          const totalBallWinningAmount =
            (winning_amount * winningPercentage) / 100;
          const amountPerUser = totalBallWinningAmount / users.length;

          // **NEW STRUCTURE FOR `winner_ball`**
          gameMap[game_id].winner_ball.push({
            ball: parseInt(ball),
            ball_image_url: ballImageUrls[ball] || null,
            position: `${position} position`,
            percentage: winningPercentage,
            total_amount: totalBallWinningAmount.toFixed(2),
            amount_per_user: amountPerUser.toFixed(2),
          });

          users.forEach((user) => {
            gameMap[game_id].winners.push({
              position: `${position} position`,
              user_id: user.user_id,
              ball: parseInt(ball),
              percentage: winningPercentage / users.length,
              amount: amountPerUser.toFixed(2),
              ball_image_url: ballImageUrls[ball] || null,
            });

            // Mark the user's status if they are in the winners list
            if (user.user_id === user_id) {
              gameMap[game_id].game_status = "Win";
            }
          });
        });
      }

      // Determine user's status based on selected ball
      let UserStatus = "Lost";
      if (
        gameMap[game_id].winner_ball.some(
          (wb) => wb.ball === user_selected_winning_ball
        )
      ) {
        UserStatus = "Win";
      } else if (gameMap[game_id].winner_ball.some((wb) => wb.ball === 0)) {
        UserStatus = "House Wins";
      }

      // Add user selection
      gameMap[game_id].user_selections.push({
        user_selected_winning_ball,
        user_selected_ball_image_url:
          ballImageUrls[user_selected_winning_ball] || null,
        // UserStatus,
      });
    }

    // Convert gameMap to an array
    const resulting_data = Object.values(gameMap).sort(
      (a, b) => new Date(b.played_at) - new Date(a.played_at)
    );

    res.json({
      error: false,
      data: resulting_data,
      message: "Games Get Successfully",
    });
  } catch (err) {
    console.log(err);
    res.json({ error: true, data: [], message: "Catch error" });
  } finally {
    client.release();
  }
};

// get game whose status is scheduled
exports.getScheduledGames = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const ballImageUrls = await fetchBallImages();
    const user_id = req.query.user_id;
    const userData = await pool.query(
      "SELECT * FROM games WHERE game_status != 'completed' ORDER BY game_id DESC LIMIT 1"
    );
    if (userData.rows.length === 0) {
      res.json({
        error: true,
        winnerScreen: true,
        data: [],
        message: "No Current game ",
      });
    } else {
      const restartedStatus = userData.rows[0].restarted;
      const restartedRound = userData.rows[0].restarted_round;
      const total_games = userData.rows.length;
      const game_status = userData.rows[0].game_status;
      let resulting_data = [];
      for (let i = 0; i < total_games; i++) {
        const game_id = userData.rows[i].game_id;
        const game_users = await pool.query(
          "SELECT * FROM game_users WHERE game_id=$1",
          [game_id]
        );
        const game_users1 = await pool.query(
          "SELECT COUNT(DISTINCT user_id) AS total_participants FROM game_users WHERE game_id=$1",
          [game_id]
        );
        const total_participants = game_users.rows.length;
        const actual_participants = game_users1.rows[0].total_participants;
        // console.log("actual_participants", actual_participants);
        let jackpot = 0;
        if (game_status === "scheduled") {
          jackpot =
            parseFloat(userData.rows[i].entry_fee) *
            parseFloat(total_participants);
        } else {
          // substract commision amount from jackpot
          const commisssion = userData.rows[i].commission;
          const entry_fee = userData.rows[i].entry_fee;
          jackpot = parseFloat(entry_fee) * parseFloat(total_participants);
          const commission_amount =
            parseFloat(jackpot) * (parseFloat(commisssion) / 100);
          // deduct commission from jackpot
          jackpot = jackpot - commission_amount;
        }
        // Query to get the count of each winning_ball selected
        const ball_counts_result = await pool.query(
          "SELECT winning_ball, COUNT(*) FROM game_users WHERE game_id=$1 GROUP BY winning_ball",
          [game_id]
        );

        // Initialize ball_counts object with keys from 1 to 15, each set to 0
        let ball_counts = {};
        for (let j = 1; j <= 15; j++) {
          // ball_counts[j] = 0;
          // console.log(ballImageUrls[j]);
          ball_counts[j] = {
            count: 0,
            imageUrl: ballImageUrls[j], // Get the URL from the mapping
          };
        }

        // Update ball_counts with the actual counts
        for (let row of ball_counts_result.rows) {
          ball_counts[row.winning_ball] = {
            count: parseInt(row.count),
            imageUrl: ballImageUrls[row.winning_ball], // Get the URL from the mapping}
          };
        }

        const game_user_current = await pool.query(
          "SELECT * FROM game_users WHERE game_id=$1 AND user_id=$2",
          [game_id, user_id]
        );
        let user_participated = false;
        // let user_selcted_ball = 0;
        // let user_selcted_ball = [];
        let user_selected_ball_details = [];

        if (game_user_current.rows.length > 0) {
          user_participated = true;
          user_selected_ball_details = game_user_current.rows.map((row) => ({
            selected_ball: row.winning_ball,
            game_user_id: row.game_users_id,
            ball_image: ballImageUrls[row.winning_ball],
            round: row.round_no,
          }));
          // user_selcted_ball = game_user_current.rows[0].winning_ball;

          // user_selceted_ball_image_url =
          //   ballImageUrls[game_user_current.rows[0].winning_ball];
          // user_selcted_ball_game_user_id =
          //   game_user_current.rows[0].game_users_id;
        }

        const game_details = {
          game_id: game_id,
          entry_fee: userData.rows[i].entry_fee,
          commission: userData.rows[i].commission,
          game_status: userData.rows[i].game_status,
          total_participants: actual_participants,
          ball_counts_participants: ball_counts,
          user_participated: user_participated,
          user_selected_ball_details: user_selected_ball_details,
          restartedStatus: restartedStatus,
          restartedRound: restartedRound,
          // user_selcted_ball: user_selcted_ball,
          // user_selceted_ball_image_url: user_selceted_ball_image_url,
          // user_selcted_ball_game_user_id: user_selcted_ball_game_user_id,

          jackpot:
            Number(jackpot) % 1 === 0
              ? Number(jackpot)
              : Number(jackpot).toFixed(2),
        };
        resulting_data.push(game_details);
      }
      res.json({
        error: false,
        data: resulting_data,
        message: "Games Get Successfully",
      });
    }
  } catch (err) {
    console.log(err);
    res.json({ error: true, data: [], message: "Catch error" });
  } finally {
    client.release();
  }
};
// version 2 schedule game
exports.getScheduledGamesv2 = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const ballImageUrls = await fetchBallImages(); // Assuming a function that fetches ball image URLs
    const user_id = req.query.user_id;

    // Parse pagination parameters
    const page = parseInt(req.query.page, 10) || 1; // Default to page 1
    const limit = parseInt(req.query.limit, 10) || 10; // Default to 10 items per page
    const offset = (page - 1) * limit;

    // Fetch paginated games with the required statuses
    const userData = await pool.query(
      `SELECT * FROM games 
       WHERE game_status IN ('scheduled', 'waiting', 'started') 
       ORDER BY game_id DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    if (userData.rows.length === 0) {
      return res.json({
        error: true,
        winnerScreen: true,
        data: [],
        message: "No current games available",
      });
    }

    // Fetch total count for pagination
    const totalCountResult = await pool.query(
      `SELECT COUNT(*) AS total 
       FROM games 
       WHERE game_status IN ('scheduled', 'waiting', 'started')`
    );
    const totalCount = totalCountResult.rows[0]?.total || 0;

    let resulting_data = [];
    for (let game of userData.rows) {
      const game_id = game.game_id;
      const game_status = game.game_status;
      const restartedStatus = game.restarted;
      const groupId = game.group_id;

      const restartedRound = game.restarted_round;

      // Fetch game users for the current game
      const total_participants_query = await pool.query(
        "SELECT COUNT(DISTINCT user_id) AS total_participants FROM game_users WHERE game_id=$1",
        [game_id]
      );
      const actual_participants = total_participants_query.rows[0]
        ? total_participants_query.rows[0].total_participants
        : 0;

      // Calculate jackpot
      let jackpot = 0;
      const entry_fee = parseFloat(game.entry_fee);
      const commission = parseFloat(game.commission);
      //initial_deposit
      let initial_deposit;
      if (game.initial_deposit == null) {
        initial_deposit = 0;
      } else {
        initial_deposit = parseFloat(game.initial_deposit);
      }
      // console.log("ebtry_fee", entry_fee);
      // console.log("actual_participants", actual_participants);
      // console.log("initial_deposit", initial_deposit);
      if (game_status === "scheduled") {
        jackpot = entry_fee * actual_participants + initial_deposit;
      } else {
        const raw_jackpot = entry_fee * actual_participants + initial_deposit;
        const commission_amount = raw_jackpot * (commission / 100);
        jackpot = raw_jackpot - commission_amount;
      }

      // Get ball counts for the game
      const ball_counts_result = await pool.query(
        "SELECT winning_ball, COUNT(*) AS count FROM game_users WHERE game_id=$1 GROUP BY winning_ball",
        [game_id]
      );

      let ball_counts = {};
      for (let i = 1; i <= 15; i++) {
        ball_counts[i] = {
          count: 0,
          imageUrl: ballImageUrls[i],
        };
      }
      for (let row of ball_counts_result.rows) {
        ball_counts[row.winning_ball] = {
          count: parseInt(row.count),
          imageUrl: ballImageUrls[row.winning_ball],
        };
      }

      // Check if the user participated in this game
      // const game_user_current = await pool.query(
      //   "SELECT * FROM game_users WHERE game_id=$1 ",
      //   [game_id]
      // );
      const game_user_current = await pool.query(
        `
        SELECT 
  gu.winning_ball, 
  gu.game_users_id, 
  gu.round_no, 
  u.user_name, 
  u.email,
  u.user_id
FROM 
  game_users gu
JOIN 
  users u 
ON 
  gu.user_id = u.user_id::TEXT
WHERE 
  gu.game_id = $1;
        `,
        [game_id]
      );

      let user_participated = false;
      let user_selected_ball_details = [];
      if (game_user_current.rows.length > 0) {
        user_participated = true;
        user_selected_ball_details = game_user_current.rows.map((row) => ({
          selected_ball: row.winning_ball,
          game_user_id: row.game_users_id,
          ball_image: ballImageUrls[row.winning_ball],
          round: row.round_no,
          user_name: row.user_name,
          user_id: row.user_id,
          email: row.email,
        }));
      }

      // Construct game details
      const game_details = {
        game_id: game_id,
        entry_fee: game.entry_fee,
        commission: game.commission,
        game_status: game_status,
        total_participants: actual_participants,
        ball_counts_participants: ball_counts,
        user_participated: user_participated,
        user_selected_ball_details: user_selected_ball_details,
        restartedStatus: restartedStatus,
        restartedRound: restartedRound,
        group_id: groupId,
        jackpot:
          Number(jackpot) % 1 === 0
            ? Number(jackpot)
            : Number(jackpot).toFixed(2),
      };

      resulting_data.push(game_details);
    }

    res.json({
      error: false,
      data: resulting_data,
      total: totalCount,
      page: page,
      totalPages: Math.ceil(totalCount / limit),
      message: "Games fetched successfully",
    });
  } catch (err) {
    console.error("Error fetching games:", err);
    res.json({ error: true, data: [], message: "An error occurred" });
  } finally {
    client.release();
  }
};

// version 2 my participated games
// exports.getScheduledGamesv2Mine = async (req, res, next) => {
//   const client = await pool.connect();
//   try {
//     const ballImageUrls = await fetchBallImages(); // Assuming a function that fetches ball image URLs
//     const user_id = req.query.user_id;
//     const page = parseInt(req.query.page) || 1; // Default to page 1
//     const limit = parseInt(req.query.limit) || 10; // Default to 10 items per page
//     const offset = (page - 1) * limit;

//     // Fetch all games with the required statuses and user participation
//     const userData = await pool.query(
//       `SELECT g.*
//        FROM games g
//        JOIN game_users gu ON g.game_id = gu.game_id
//        WHERE gu.user_id = $1 AND g.game_status IN ('scheduled', 'waiting', 'started')
//        ORDER BY g.game_id DESC
//        LIMIT $2 OFFSET $3`,
//       [user_id, limit, offset]
//       // [user_id]
//     );

//     if (userData.rows.length === 0) {
//       return res.json({
//         error: true,
//         winnerScreen: true,
//         data: [],
//         message: "No current games available",
//       });
//     }
//     // Fetch total count for pagination
//     const totalCountResult = await pool.query(
//       `SELECT COUNT(DISTINCT g.game_id) AS total
//      FROM games g
//      JOIN game_users gu ON g.game_id = gu.game_id
//      WHERE gu.user_id = $1 AND g.game_status IN ('scheduled', 'waiting', 'started')`,
//       [user_id]
//     );
//     const totalCount = totalCountResult.rows[0]?.total || 0;
//     let resulting_data = [];
//     for (let game of userData.rows) {
//       const game_id = game.game_id;
//       const game_status = game.game_status;
//       const restartedStatus = game.restarted;
//       const restartedRound = game.restarted_round;
//       let initial_deposit;
//       if (game.initial_deposit == null) {
//         initial_deposit = 0;
//       } else {
//         initial_deposit = parseFloat(game.initial_deposit);
//       }
//       // Fetch game users for the current game
//       const game_users = await pool.query(
//         "SELECT * FROM game_users WHERE game_id=$1",
//         [game_id]
//       );

//       // Count total participants
//       const total_participants_query = await pool.query(
//         "SELECT COUNT(DISTINCT user_id) AS total_participants FROM game_users WHERE game_id=$1",
//         [game_id]
//       );
//       const actual_participants = total_participants_query.rows[0]
//         ? total_participants_query.rows[0].total_participants
//         : 0;

//       // Calculate jackpot
//       let jackpot = 0;

//       const entry_fee = parseFloat(game.entry_fee);
//       const commission = parseFloat(game.commission);
//       if (game_status === "scheduled") {
//         jackpot = entry_fee * actual_participants + initial_deposit;
//       } else {
//         const raw_jackpot = entry_fee * actual_participants + initial_deposit;
//         const commission_amount = raw_jackpot * (commission / 100);
//         jackpot = raw_jackpot - commission_amount;
//       }

//       // Get ball counts for the game
//       const ball_counts_result = await pool.query(
//         "SELECT winning_ball, COUNT(*) AS count FROM game_users WHERE game_id=$1 GROUP BY winning_ball",
//         [game_id]
//       );

//       let ball_counts = {};
//       for (let i = 1; i <= 15; i++) {
//         ball_counts[i] = {
//           count: 0,
//           imageUrl: ballImageUrls[i],
//         };
//       }
//       for (let row of ball_counts_result.rows) {
//         ball_counts[row.winning_ball] = {
//           count: parseInt(row.count),
//           imageUrl: ballImageUrls[row.winning_ball],
//         };
//       }

//       // Check if the user participated in this game
//       const game_user_current = await pool.query(
//         "SELECT * FROM game_users WHERE game_id=$1 AND user_id=$2",
//         [game_id, user_id]
//       );

//       let user_participated = false;
//       let user_selected_ball_details = [];
//       if (game_user_current.rows.length > 0) {
//         user_participated = true;
//         user_selected_ball_details = game_user_current.rows.map((row) => ({
//           selected_ball: row.winning_ball,
//           game_user_id: row.game_users_id,
//           ball_image: ballImageUrls[row.winning_ball],
//           round: row.round_no,
//         }));
//       }

//       // Construct game details
//       const game_details = {
//         game_id: game_id,
//         entry_fee: game.entry_fee,
//         commission: game.commission,
//         game_status: game_status,
//         total_participants: actual_participants,
//         ball_counts_participants: ball_counts,
//         user_participated: user_participated,
//         user_selected_ball_details: user_selected_ball_details,
//         restartedStatus: restartedStatus,
//         restartedRound: restartedRound,
//         jackpot:
//           Number(jackpot) % 1 === 0
//             ? Number(jackpot)
//             : Number(jackpot).toFixed(2),
//       };

//       resulting_data.push(game_details);
//     }

//     res.json({
//       error: false,
//       data: resulting_data,
//       total: totalCount,
//       page: page,
//       totalPages: Math.ceil(totalCount / limit),
//       message: "Games fetched successfully",
//     });
//   } catch (err) {
//     console.error("Error fetching games:", err);
//     res.json({ error: true, data: [], message: "An error occurred" });
//   } finally {
//     client.release();
//   }
// };
exports.getScheduledGamesv2Mine = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const ballImageUrls = await fetchBallImages(); // Fetch ball image URLs
    const user_id = req.query.user_id;
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = parseInt(req.query.limit) || 10; // Default to 10 items per page
    const offset = (page - 1) * limit;

    // Fetch all games with the required statuses and user participation
    const userData = await pool.query(
      `SELECT g.* 
       FROM games g 
       JOIN game_users gu ON g.game_id = gu.game_id 
       WHERE gu.user_id = $1 AND g.game_status IN ('scheduled', 'waiting', 'started') 
       ORDER BY g.game_id DESC 
       LIMIT $2 OFFSET $3`,
      [user_id, limit, offset]
    );

    if (userData.rows.length === 0) {
      return res.json({
        error: true,
        winnerScreen: true,
        data: [],
        message: "No current games available",
      });
    }

    // Fetch total count for pagination
    const totalCountResult = await pool.query(
      `SELECT COUNT(DISTINCT g.game_id) AS total 
       FROM games g 
       JOIN game_users gu ON g.game_id = gu.game_id 
       WHERE gu.user_id = $1 AND g.game_status IN ('scheduled', 'waiting', 'started')`,
      [user_id]
    );
    const totalCount = totalCountResult.rows[0]?.total || 0;

    let resulting_data = [];
    for (let game of userData.rows) {
      const game_id = game.game_id;
      const game_status = game.game_status;
      const restartedStatus = game.restarted;
      const restartedRound = game.restarted_round;
      let initial_deposit = game.initial_deposit
        ? parseFloat(game.initial_deposit)
        : 0;

      // Count total participants
      const total_participants_query = await pool.query(
        "SELECT COUNT(DISTINCT user_id) AS total_participants FROM game_users WHERE game_id=$1",
        [game_id]
      );
      const actual_participants = total_participants_query.rows[0]
        ? total_participants_query.rows[0].total_participants
        : 0;

      // Calculate jackpot
      let jackpot = 0;
      const entry_fee = parseFloat(game.entry_fee);
      const commission = parseFloat(game.commission);

      if (game_status === "scheduled") {
        jackpot = entry_fee * actual_participants + initial_deposit;
      } else {
        const raw_jackpot = entry_fee * actual_participants + initial_deposit;
        const commission_amount = raw_jackpot * (commission / 100);
        jackpot = raw_jackpot - commission_amount;
      }

      // Get ball counts for the game
      const ball_counts_result = await pool.query(
        "SELECT winning_ball, COUNT(*) AS count FROM game_users WHERE game_id=$1 GROUP BY winning_ball",
        [game_id]
      );

      let ball_counts = {};
      for (let i = 1; i <= 15; i++) {
        ball_counts[i] = {
          count: 0,
          imageUrl: ballImageUrls[i],
        };
      }
      for (let row of ball_counts_result.rows) {
        ball_counts[row.winning_ball] = {
          count: parseInt(row.count),
          imageUrl: ballImageUrls[row.winning_ball],
        };
      }

      // Check if the user participated in this game
      const game_user_current = await pool.query(
        `SELECT gu.winning_ball, gu.game_users_id, gu.round_no,
          u.user_name, 
  u.email,
  u.user_id
FROM 
  game_users gu
JOIN 
  users u 
ON 
  gu.user_id = u.user_id::TEXT 
         WHERE gu.game_id=$1 `,
        [game_id]
      );

      let user_participated = false;
      let user_selected_ball_details = [];
      if (game_user_current.rows.length > 0) {
        user_participated = true;
        user_selected_ball_details = game_user_current.rows.map((row) => ({
          selected_ball: row.winning_ball,
          game_user_id: row.game_users_id,
          ball_image: ballImageUrls[row.winning_ball],
          round: row.round_no,
          user_name: row.user_name,
          user_id: row.user_id,
          email: row.email,
        }));
      }

      // Construct game details
      const game_details = {
        game_id: game_id,
        entry_fee: game.entry_fee,
        commission: game.commission,
        game_status: game_status,
        total_participants: actual_participants,
        ball_counts_participants: ball_counts,
        user_participated: user_participated,
        user_selected_ball_details: user_selected_ball_details,
        restartedStatus: restartedStatus,
        restartedRound: restartedRound,
        jackpot:
          Number(jackpot) % 1 === 0
            ? Number(jackpot)
            : Number(jackpot).toFixed(2),
      };

      resulting_data.push(game_details);
    }

    res.json({
      error: false,
      data: resulting_data,
      total: totalCount,
      page: page,
      totalPages: Math.ceil(totalCount / limit),
      message: "Games fetched successfully",
    });
  } catch (err) {
    console.error("Error fetching games:", err);
    res.json({ error: true, data: [], message: "An error occurred" });
  } finally {
    client.release();
  }
};

// exports.getCompletedGameLatestByUserId = async (req, res, next) => {
//   const client = await pool.connect();
//   try {
//     const ballImageUrls = await fetchBallImages(); // Fetch ball image URLs
//     const { user_id } = req.query;

//     // Fetch the latest game played by the user
//     const userData = await pool.query(
//       "SELECT * FROM game_users WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1",
//       [user_id]
//     );

//     if (userData.rows.length === 0) {
//       return res.json({
//         error: true,
//         data: [],
//         message: "Can't Get Games or Games data Empty",
//       });
//     }

//     // Get the last played game ID
//     const game_last_played_id = userData.rows[0].game_id;

//     // Fetch user-selected balls for the last game
//     const user_selected_balls = await pool.query(
//       "SELECT * FROM game_users WHERE user_id=$1 AND game_id=$2",
//       [user_id, game_last_played_id]
//     );

//     // Fetch total games played by the user
//     const result = await pool.query(
//       "SELECT COUNT(DISTINCT game_id) AS total_played_games FROM game_users WHERE user_id = $1",
//       [user_id]
//     );
//     const totalPlayedGames = result.rows[0]?.total_played_games || 0;

//     // Fetch game details
//     const game_details = await pool.query(
//       "SELECT * FROM games WHERE game_id=$1",
//       [game_last_played_id]
//     );

//     if (game_details.rows.length === 0) {
//       return res.json({
//         error: true,
//         data: [],
//         message: "Game details not found",
//       });
//     }

//     const gameData = game_details.rows[0];
//     const winnerDetails = gameData.winner_details || [];
//     const winningBalls = gameData.winner_ball || [];
//     const participants = gameData.participants;

//     // Extract user-selected balls
//     const userSelectedBalls = user_selected_balls.rows.map((ball) =>
//       parseInt(ball.winning_ball)
//     );

//     // Determine if the user won or lost
//     let userStatus = "Lost";
//     const matchingBalls = [];

//     userSelectedBalls.forEach((ball) => {
//       if (winningBalls.includes(ball)) {
//         const winner = winnerDetails.find((detail) => detail.ball === ball);
//         if (winner) {
//           userStatus = "Win";
//           matchingBalls.push({
//             ball,
//             percentage: winner.percentage,
//             position: `${winnerDetails.indexOf(winner) + 1} position`, // Determine position
//           });
//         }
//       }
//     });

//     // Calculate total winning amount for the user
//     const winningAmountUpdated = matchingBalls.reduce((sum, match) => {
//       return (
//         sum + (parseFloat(gameData.winning_amount) * match.percentage) / 100
//       );
//     }, 0);

//     // Map user-selected balls with additional details
//     const userSelectedBallsArray = user_selected_balls.rows.map((ball) => ({
//       game_users_id: ball.game_users_id,
//       game_id: ball.game_id,
//       user_id: ball.user_id,
//       winning_ball: ball.winning_ball,
//       ball_image_url: ballImageUrls[ball.winning_ball], // Add ball image URL
//       round_no: ball.round_no,
//       created_at: ball.created_at,
//       updated_at: ball.updated_at,
//     }));

//     // Prepare the final response data
//     const game_details_final = [
//       {
//         game_id: gameData.game_id,
//         entry_fee: gameData.entry_fee,
//         commission: gameData.commission,
//         game_status: userStatus, // Win, Lost, or House Wins
//         total_participants: participants,
//         winner_ball: winningBalls,
//         winner_ball_image_urls: winningBalls.map((ball) => ballImageUrls[ball]), // Array of URLs for all winning balls
//         user_selected_balls: userSelectedBallsArray, // Array of user-selected ball objects
//         played_at: gameData.played_at,
//         winning_amount: Number(gameData.winning_amount).toFixed(2),
//         winning_amount_single: winningAmountUpdated.toFixed(2),
//         matching_balls: matchingBalls, // Details of matching balls
//       },
//     ];

//     console.log("Final Game Details:", game_details_final);

//     // Send the response
//     res.json({
//       error: false,
//       data: game_details_final,
//       message: "Games Get Successfully",
//     });
//   } catch (err) {
//     console.error(err);
//     res.json({ error: true, data: [], message: "Catch error" });
//   } finally {
//     client.release();
//   }
// };
exports.getCompletedGameLatestByUserId = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const ballImageUrls = await fetchBallImages(); // Fetch ball image URLs
    const { user_id } = req.query;

    // Fetch the latest completed game played by the user
    const userData = await pool.query(
      "SELECT * FROM game_users WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1",
      [user_id]
    );

    if (userData.rows.length === 0) {
      return res.json({
        error: true,
        data: [],
        message: "Can't Get Games or Games data Empty",
      });
    }

    // Get the last played game ID
    const game_last_played_id = userData.rows[0].game_id;

    // Fetch game details
    const game_details = await pool.query(
      "SELECT * FROM games WHERE game_id=$1 AND game_status='completed'",
      [game_last_played_id]
    );

    if (game_details.rows.length === 0) {
      return res.json({
        error: true,
        data: [],
        message: "Game details not found",
      });
    }

    const gameData = game_details.rows[0];

    // ✅ Ensure proper JSON parsing for winner_details and winner_ball
    const winnerDetails =
      typeof gameData.winner_details === "string"
        ? JSON.parse(gameData.winner_details)
        : gameData.winner_details || [];

    const winningBalls =
      typeof gameData.winner_ball === "string"
        ? JSON.parse(gameData.winner_ball)
        : gameData.winner_ball || [];

    const totalWinningAmount = parseFloat(gameData.winning_amount) || 0;
    const number_of_winners = winnerDetails.length;
    const participants = gameData.participants || 0;

    // Fetch user-selected balls for the last game
    const user_selected_balls = await pool.query(
      "SELECT * FROM game_users WHERE user_id=$1 AND game_id=$2",
      [user_id, game_last_played_id]
    );

    // Extract user-selected balls
    const userSelectedBalls = user_selected_balls.rows.map((ball) =>
      parseInt(ball.winning_ball)
    );

    // Determine if the user won or lost
    let userStatus = "Lost";
    let matchingBalls = [];

    // Process winners and distribute winnings
    const winnersData = [];

    // Group winners by ball
    const winnersGroupedByBall = winnerDetails.reduce((acc, winner) => {
      if (!acc[winner.ball]) acc[winner.ball] = [];
      acc[winner.ball].push(winner);
      return acc;
    }, {});

    // Define jackpot distribution percentages
    const distribution = {
      1: [100], // 1 Winner gets 100%
      2: [60, 40], // 1st gets 60%, 2nd gets 40%
      3: [50, 30, 20], // 1st gets 50%, 2nd gets 30%, 3rd gets 20%
    };

    let totalWinningAmountCalculated = 0; // Tracks total amount assigned

    Object.entries(winnersGroupedByBall).forEach(([ball, users], index) => {
      const position = index + 1; // Assign position (1st, 2nd, 3rd)
      const winningPercentage = distribution[number_of_winners][index]; // Get percentage for this position
      const winningAmount = (totalWinningAmount * winningPercentage) / 100; // Total amount for this position
      const amountPerUser = winningAmount / users.length; // Divide winnings among multiple users

      users.forEach((user) => {
        winnersData.push({
          position: `${position} position`,
          user_id: user.user_id,
          ball: parseInt(ball),
          percentage: winningPercentage / users.length,
          amount: amountPerUser.toFixed(2),
          ball_image_url: ballImageUrls[ball] || null,
        });

        // If this user is the current logged-in user, mark as win
        if (user.user_id === user_id) {
          userStatus = "Win";
          matchingBalls.push({
            ball: parseInt(ball),
            percentage: winningPercentage / users.length,
            amount: amountPerUser.toFixed(2),
            position: `${position} position`,
            ball_image_url: ballImageUrls[ball] || null,
          });
        }

        totalWinningAmountCalculated += parseFloat(amountPerUser);
      });
    });

    // Calculate total winning amount for the user
    const winningAmountUpdated = matchingBalls.reduce((sum, match) => {
      return sum + parseFloat(match.amount);
    }, 0);

    // Fetch all participants for each ball
    const ballParticipantsQuery = await pool.query(
      `SELECT winning_ball, COUNT(user_id) as total_participants 
       FROM game_users WHERE game_id=$1 GROUP BY winning_ball`,
      [game_last_played_id]
    );

    const ballParticipants = ballParticipantsQuery.rows.reduce((acc, row) => {
      acc[row.winning_ball] = parseInt(row.total_participants);
      return acc;
    }, {});

    // Prepare all balls with participants and amount per ball
    const allBallsData = winningBalls.map((ball, index) => {
      const position = `${index + 1} position`;
      const percentage = distribution[number_of_winners][index];
      const amount = ((totalWinningAmount * percentage) / 100).toFixed(2);
      const totalUsers = ballParticipants[ball] || 1;
      const amountPerUser = (parseFloat(amount) / totalUsers).toFixed(2);

      return {
        ball: parseInt(ball),
        position,
        percentage,
        totalUsers,
        amount,
        amountPerUser,
        ball_image_url: ballImageUrls[ball] || null,
      };
    });

    // ✅ Preserve user_selected_balls in response
    const userSelectedBallsArray = user_selected_balls.rows.map((ball) => ({
      game_users_id: ball.game_users_id,
      game_id: ball.game_id,
      user_id: ball.user_id,
      winning_ball: ball.winning_ball,
      ball_image_url: ballImageUrls[ball.winning_ball] || null,
      round_no: ball.round_no,
      created_at: ball.created_at,
      updated_at: ball.updated_at,
    }));

    // Prepare the final response data
    const game_details_final = {
      game_id: gameData.game_id,
      entry_fee: gameData.entry_fee,
      commission: gameData.commission,
      game_status: userStatus, // Win, Lost, or House Wins
      total_participants: gameData.participants || 0,
      all_balls: allBallsData, // List of all balls and their winnings
      user_selected_balls: userSelectedBallsArray, // User's selected balls
      played_at: gameData.played_at,
      winning_amount: totalWinningAmount.toFixed(2),
      winning_amount_single: winningAmountUpdated.toFixed(2),
      matching_balls: matchingBalls, // User's winnings
    };

    console.log("Final Game Details:", game_details_final);

    // Send the response
    res.json({
      error: false,
      data: game_details_final,
      message: "Games Get Successfully",
    });
  } catch (err) {
    console.error("Error:", err);
    res.json({ error: true, data: [], message: "Catch error" });
  } finally {
    client.release();
  }
};

exports.getGamesCountAdmin = async (req, res, next) => {
  const client = await pool.connect();
  try {
    //  get count of all the games whose status is ScheduledTask, waiting or stRTED they sre called as live game
    const totalGames = await pool.query(
      "SELECT COUNT(*) AS total_games FROM games WHERE game_status IN ('scheduled', 'waiting', 'started')"
    );
    const totalGamesall = await pool.query(
      "SELECT COUNT(*) AS total_games FROM games "
    );
    const totalGamesscheduled = await pool.query(
      "SELECT COUNT(*) AS total_games FROM games WHERE game_status IN ('scheduled')"
    );
    const totalGamescompleted = await pool.query(
      "SELECT COUNT(*) AS total_games FROM games WHERE game_status IN ('completed')"
    );
    res.json({
      error: false,
      live_games: totalGames.rows[0].total_games,
      all_games: totalGamesall.rows[0].total_games,
      scheduled_games: totalGamesscheduled.rows[0].total_games,
      completed_games: totalGamescompleted.rows[0].total_games,
      message: "Games Count Get Successfully",
    });
  } catch (err) {
    console.log(err);
    res.json({ error: true, data: 0, message: "Catch error" });
  } finally {
    client.release();
  }
};
// exports.getCompletedGameLatestByUserId = async (req, res, next) => {
//   const client = await pool.connect();
//   try {
//     const ballImageUrls = await fetchBallImages();
//     const { user_id } = req.query;
//     const userData = await pool.query(
//       "SELECT * FROM game_users WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1",
//       [user_id]
//     );
//     console.log(userData.rows);
//     if (userData.rows.length === 0) {
//       res.json({
//         error: true,
//         data: [],
//         message: "Can't Get Games or Games data Empty",
//       });
//     } else {
//       let game_last_played_id = userData.rows[0].game_id;
//       // get games with game game_details
//       // get all user selected balls by game id and user id
//       let user_selected_balls = await pool.query(
//         "SELECT * FROM game_users WHERE user_id=$1 AND game_id=$2",
//         [user_id, game_last_played_id]
//       );
//       console.log("user_selected_balls.rows");

//       console.log(user_selected_balls.rows);
//       // Query to count the unique game_id for the specified user_id
//       const result = await pool.query(
//         "SELECT COUNT(DISTINCT game_id) AS total_played_games FROM game_users WHERE user_id = $1",
//         [user_id]
//       );

//       const totalPlayedGames = result.rows[0]?.total_played_games || 0;
//       console.log("totalPlayedGames", totalPlayedGames);

//       let game_details = await pool.query(
//         "SELECT * FROM games WHERE game_id=$1",
//         [game_last_played_id]
//       );
//       console.log(game_details.rows[0]);
//       let winners = game_details?.rows[0]?.winners;
//       const game_statusData = game_details.rows[0].game_status;
//       console.log("game_statusData", game_details.rows[0]);
//       let winner_ball = game_details.rows[0].winner_ball;
//       let played_at = game_details.rows[0].played_at;
//       let winning_amount = game_details.rows[0].winning_amount;
//       let participants = game_details.rows[0].participants;
//       let winning_amount_single = game_details.rows[0].winning_amount_single;
//       // let UserStatus = "Win";

//       // Extract all selected winning balls into an array
//       const userSelectedBalls = user_selected_balls.rows.map((ball) =>
//         parseInt(ball.winning_ball)
//       );
//       console.log("User selected balls:", userSelectedBalls);

//       // Check the winner ball
//       let userStatus = "Lost"; // Default to lost
//       let matchingBalls = null;
//       if (winner_ball === 0) {
//         // If winner ball is 0, it's house wins
//         userStatus = "House Wins";
//       }
//       else {
//         // Check if winner ball matches any selected ball
//         if (userSelectedBalls.includes(parseInt(winner_ball))) {
//           userStatus = "Win";
//           matchingBalls = 1;
//         }
//       }

//       console.log("User status:", userStatus);

//       console.log(user_selected_balls);
//       const userSelectedBallsArray = user_selected_balls.rows.map((ball) => {
//         return {
//           game_users_id: ball.game_users_id,
//           game_id: ball.game_id,
//           user_id: ball.user_id,
//           winning_ball: ball.winning_ball,
//           ball_image_url: ballImageUrls[ball.winning_ball], // Add ball image URL
//           round_no: ball.round_no,
//           created_at: ball.created_at,
//           updated_at: ball.updated_at,
//         };
//       });

//       console.log("User Selected Balls Array:", userSelectedBallsArray);
//       user_selected_balls;
//       const winning_amount_updated =
//         parseFloat(winning_amount_single) * parseFloat(matchingBalls);
//       const game_details_final = [
//         {
//           game_id: game_details.rows[0].game_id,
//           entry_fee: game_details.rows[0].entry_fee,
//           commission: game_details.rows[0].commission,
//           game_status: userStatus, // Win, Lost, or House Wins
//           total_participants: participants,
//           winner_ball: winner_ball,
//           winner_ball_image_url: ballImageUrls[winner_ball], // URL of the winner ball image
//           user_selected_balls: userSelectedBallsArray, // Array of user selected ball objects
//           played_at: played_at,
//           winning_amount:
//             Number(winning_amount) % 1 === 0
//               ? Number(winning_amount)
//               : Number(winning_amount).toFixed(2),
//           winning_amount_single:
//             Number(winning_amount_updated) % 1 === 0
//               ? Number(winning_amount_updated)
//               : Number(winning_amount_updated).toFixed(2),
//         },
//       ];

//       console.log("Final Game Details:", game_details_final);
//       // }
//       // }
//       res.json({
//         error: false,
//         data: game_details_final,
//         message: "Games Get Successfully",
//       });
//     }
//   } catch (err) {
//     console.log(err);
//     res.json({ error: true, data: [], message: "Catch error" });
//   } finally {
//     client.release();
//   }
// };

// get all games pagination
exports.getAllGamesPagination = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const ballImageUrls = await fetchBallImages();
    const { page, limit } = req.query;
    const offset = (page - 1) * limit;

    // Fetch games with pagination
    const userData = await pool.query(
      "SELECT * FROM games ORDER BY game_id ASC LIMIT $1 OFFSET $2",
      [limit, offset]
    );

    if (userData.rows.length === 0) {
      return res.json({
        error: true,
        data: [],
        message: "Can't Get Games or Games data Empty",
      });
    }

    // Process each game
    const resulting_data = [];
    for (const game of userData.rows) {
      const game_id = game.game_id;

      // Fetch participants count for this game
      const gameUsers = await pool.query(
        "SELECT * FROM game_users WHERE game_id = $1",
        [game_id]
      );
      const total_participants = gameUsers.rows.length;

      // Fetch winner details
      const winnerDetails = [];
      if (game.winner_details) {
        try {
          // Iterate through the jsonb[] array and extract details
          for (const winner of game.winner_details) {
            const userDetailsQuery = await pool.query(
              "SELECT user_id, user_name, email FROM users WHERE user_id = $1",
              [winner.user_id]
            );

            const userDetails = userDetailsQuery.rows[0];
            if (userDetails) {
              winnerDetails.push({
                user_id: winner.user_id,
                ball: winner.ball,
                percentage: winner.percentage,
                user_name: userDetails.user_name,
                email: userDetails.email,
              });
            }
          }
        } catch (err) {
          console.error(
            `Failed to parse winner_details for game_id ${game_id}:`,
            err.message
          );
        }
      }

      // Create game details object
      const game_details = {
        game_id: game_id,
        entry_fee: game.entry_fee,
        commission: game.commission,
        game_status: game.game_status,
        initial_deposit: game.initial_deposit,
        total_participants: total_participants,
        winner_balls: game.winner_ball,
        winners_count: game.winners,
        winners_details: winnerDetails, // Attach winner details
        played_at: game.played_at,
        created_at: game.created_at,
        winning_amount: game.winning_amount,
      };

      resulting_data.push(game_details);
    }

    // Fetch total games count
    const totalGamesQuery = await pool.query(
      "SELECT COUNT(*) AS total_games FROM games"
    );
    const total_games = totalGamesQuery.rows[0]?.total_games || 0;

    // Send response
    res.json({
      error: false,
      total_games: total_games,
      data: resulting_data,
      page_no: page,
      limit: limit,
      message: "Games fetched successfully",
    });
  } catch (err) {
    console.error("Error fetching games:", err);
    res.json({ error: true, data: [], message: "Catch error" });
  } finally {
    client.release();
  }
};

// exports.announceResultv2 = async (req, res, next) => {
//   const client = await pool.connect();
//   try {
//     const { game_id, group_id, winning_balls, number_of_winners } = req.body;

//     // Ensure either game_id OR group_id is provided, but not both
//     if (!game_id && !group_id) {
//       return res.json({
//         error: true,
//         message: "Provide either game_id or group_id.",
//       });
//     }
//     if (game_id && group_id) {
//       return res.json({
//         error: true,
//         message: "Provide only game_id or group_id, not both.",
//       });
//     }

//     let gamesToProcess = [];

//     // Fetch single game if game_id is provided
//     if (game_id) {
//       const gameData = await pool.query(
//         "SELECT * FROM games WHERE game_id=$1",
//         [game_id]
//       );
//       if (gameData.rows.length === 0) {
//         return res.json({ error: true, message: "Game not found" });
//       }
//       gamesToProcess.push(gameData.rows[0]);
//     }

//     // Fetch all games in the group if group_id is provided
//     if (group_id) {
//       const groupGamesData = await pool.query(
//         "SELECT * FROM games WHERE group_id=$1",
//         [group_id]
//       );
//       if (groupGamesData.rows.length === 0) {
//         return res.json({
//           error: true,
//           message: "No games found in this group",
//         });
//       }
//       gamesToProcess = groupGamesData.rows;
//     }

//     let allResults = [];

//     for (const gameDetails of gamesToProcess) {
//       const { game_id } = gameDetails;
//       let restarted_game = false;
//       let restart_amount = 0;
//       const entry_fee = parseFloat(gameDetails.entry_fee);
//       const commission = parseFloat(gameDetails.commission);
//       const initial_deposit = parseFloat(gameDetails.initial_deposit || 0);

//       // Calculate jackpot
//       const totalParticipantsQuery = await pool.query(
//         "SELECT COUNT(DISTINCT user_id) AS total_participants FROM game_users WHERE game_id=$1",
//         [game_id]
//       );
//       const totalParticipants =
//         totalParticipantsQuery.rows[0]?.total_participants || 0;

//       let jackpot = entry_fee * totalParticipants + initial_deposit;
//       const commissionAmount = jackpot * (commission / 100);
//       jackpot -= commissionAmount;

//       // Predefined distribution percentages
//       const distribution = {
//         1: [100], // 1st place gets 100%
//         2: [60, 40], // 1st gets 60%, 2nd gets 40%
//         3: [50, 30, 20], // 1st gets 50%, 2nd gets 30%, 3rd gets 20%
//       };

//       if (!distribution[number_of_winners]) {
//         return res.json({
//           error: true,
//           message: "Invalid number of winners. Allowed values are 1, 2, or 3.",
//         });
//       }

//       // Validate winning balls
//       const validatedBalls = [];
//       for (const ball of winning_balls) {
//         if (ball === 0) {
//           validatedBalls.push(0);
//           continue;
//         }

//         const participantQuery = await pool.query(
//           "SELECT COUNT(*) AS participant_count FROM game_users WHERE game_id=$1 AND winning_ball=$2",
//           [game_id, ball]
//         );
//         const participantCount = parseInt(
//           participantQuery.rows[0].participant_count
//         );

//         if (participantCount > 0) {
//           validatedBalls.push(ball);
//         }
//       }

//       if (validatedBalls.length < number_of_winners) {
//         return res.json({
//           error: true,
//           message:
//             "One or more winning balls have no participants. Please select valid balls.",
//           invalid_balls: winning_balls.filter(
//             (ball) => !validatedBalls.includes(ball)
//           ),
//         });
//       }

//       // Assign positions and distribute jackpot
//       const winners = [];
//       for (let i = 0; i < number_of_winners; i++) {
//         const ball = validatedBalls[i];
//         const position = i + 1; // Assign positions (1st, 2nd, 3rd)
//         const winningPercentage = distribution[number_of_winners][i]; // Get the percentage for this position
//         const winningAmount = (jackpot * winningPercentage) / 100; // Calculate winning amount

//         if (ball === 0) {
//           winners.push({
//             position,
//             user_id: "house",
//             ball,
//             percentage: winningPercentage,
//             amount: winningAmount,
//           });
//         } else {
//           const winnerQuery = await pool.query(
//             "SELECT DISTINCT user_id FROM game_users WHERE game_id=$1 AND winning_ball=$2",
//             [game_id, ball]
//           );

//           if (winnerQuery.rows.length > 0) {
//             const users = winnerQuery.rows;
//             const amountPerUser = winningAmount / users.length; // Divide winnings among multiple users

//             users.forEach((user) => {
//               winners.push({
//                 position,
//                 user_id: user.user_id,
//                 ball,
//                 percentage: winningPercentage,
//                 amount: amountPerUser,
//               });
//             });
//           }
//         }
//       }

//       // Allocate winnings and update wallets
//       for (const winner of winners) {
//         if (winner.user_id !== "house") {
//           const userWallet = await pool.query(
//             "SELECT * FROM wallet WHERE user_id=$1 AND type=$2",
//             [winner.user_id, "withdrawl"]
//           );

//           if (userWallet.rows.length > 0) {
//             const updatedBalance =
//               parseFloat(userWallet.rows[0].balance) + winner.amount;

//             await pool.query(
//               "UPDATE wallet SET balance=$1 WHERE user_id=$2 AND type=$3",
//               [updatedBalance, winner.user_id, "withdrawl"]
//             );

//             await pool.query(
//               "INSERT INTO transaction_history (user_id, amount, type, game_id) VALUES ($1, $2, $3, $4)",
//               [winner.user_id, winner.amount, "added to wallet", game_id]
//             );
//           }
//         }
//       }

//       // Update game as completed
//       const winner_details = JSON.stringify(winners);
//       const played_at = new Date();
//       await pool.query(
//         "UPDATE games SET game_status=$1, winning_amount=$2, number_of_winners=$3, winner_details=$6, participants=$7, winners=$8, winner_ball=$9, played_at=$4, restart_amount=$10 WHERE game_id=$5",
//         [
//           "completed",
//           jackpot,
//           number_of_winners,
//           played_at,
//           game_id,
//           winner_details,
//           totalParticipants,
//           winners.length,
//           validatedBalls,
//           restart_amount,
//         ]
//       );

//       allResults.push({
//         game_id,
//         jackpot,
//         winners,
//         restarted_game,
//         restart_amount,
//       });
//     }

//     res.json({
//       error: false,
//       message: group_id
//         ? "Results announced for all games in the group"
//         : "Result announced for the game",
//       results: allResults,
//     });
//   } catch (err) {
//     console.error(err);
//     res.json({ error: true, message: "An error occurred" });
//   } finally {
//     client.release();
//   }
// };
exports.announceResultv2 = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { game_id, group_id, winning_balls, number_of_winners } = req.body;

    // Ensure either game_id OR group_id is provided, but not both
    if (!game_id && !group_id) {
      return res.json({
        error: true,
        message: "Provide either game_id or group_id.",
      });
    }
    if (game_id && group_id) {
      return res.json({
        error: true,
        message: "Provide only game_id or group_id, not both.",
      });
    }

    let gamesToProcess = [];
    let skippedGames = [];

    // Fetch single game if game_id is provided
    if (game_id) {
      const gameData = await pool.query(
        "SELECT * FROM games WHERE game_id=$1",
        [game_id]
      );
      if (gameData.rows.length === 0) {
        return res.json({ error: true, message: "Game not found" });
      }
      gamesToProcess.push(gameData.rows[0]);
    }

    // Fetch all games in the group if group_id is provided
    if (group_id) {
      const groupGamesData = await pool.query(
        "SELECT * FROM games WHERE group_id=$1",
        [group_id]
      );
      if (groupGamesData.rows.length === 0) {
        return res.json({
          error: true,
          message: "No games found in this group",
        });
      }
      gamesToProcess = groupGamesData.rows;
    }

    let allResults = [];

    for (const gameDetails of gamesToProcess) {
      const { game_id } = gameDetails;
      let restarted_game = false;
      let restart_amount = 0;
      const entry_fee = parseFloat(gameDetails.entry_fee);
      const commission = parseFloat(gameDetails.commission);
      const initial_deposit = parseFloat(gameDetails.initial_deposit || 0);

      // Calculate jackpot
      const totalParticipantsQuery = await pool.query(
        "SELECT COUNT(DISTINCT user_id) AS total_participants FROM game_users WHERE game_id=$1",
        [game_id]
      );
      const totalParticipants =
        totalParticipantsQuery.rows[0]?.total_participants || 0;

      let jackpot = entry_fee * totalParticipants + initial_deposit;
      const commissionAmount = jackpot * (commission / 100);
      jackpot -= commissionAmount;

      // Predefined distribution percentages
      const distribution = {
        1: [100], // 1st place gets 100%
        2: [60, 40], // 1st gets 60%, 2nd gets 40%
        3: [50, 30, 20], // 1st gets 50%, 2nd gets 30%, 3rd gets 20%
      };

      if (!distribution[number_of_winners]) {
        return res.json({
          error: true,
          message: "Invalid number of winners. Allowed values are 1, 2, or 3.",
        });
      }

      // Validate winning balls
      const validatedBalls = [];
      const invalidBalls = [];

      for (const ball of winning_balls) {
        if (ball === 0) {
          validatedBalls.push(0);
          continue;
        }

        const participantQuery = await pool.query(
          "SELECT COUNT(*) AS participant_count FROM game_users WHERE game_id=$1 AND winning_ball=$2",
          [game_id, ball]
        );
        const participantCount = parseInt(
          participantQuery.rows[0].participant_count
        );

        if (participantCount > 0) {
          validatedBalls.push(ball);
        } else {
          invalidBalls.push(ball);
        }
      }

      // If no valid balls have participants, skip this game
      if (validatedBalls.length === 0) {
        skippedGames.push({
          game_id,
          message:
            "Game not processed because no user participated in the winning ball(s).",
          missing_balls: invalidBalls,
        });
        continue; // Skip this game and move to the next one
      }

      // Assign positions and distribute jackpot
      const winners = [];
      for (let i = 0; i < number_of_winners; i++) {
        const ball = validatedBalls[i];
        const position = i + 1; // Assign positions (1st, 2nd, 3rd)
        const winningPercentage = distribution[number_of_winners][i]; // Get the percentage for this position
        const winningAmount = (jackpot * winningPercentage) / 100; // Calculate winning amount

        if (ball === 0) {
          winners.push({
            position,
            user_id: "house",
            ball,
            percentage: winningPercentage,
            amount: winningAmount,
          });
        } else {
          const winnerQuery = await pool.query(
            "SELECT DISTINCT user_id FROM game_users WHERE game_id=$1 AND winning_ball=$2",
            [game_id, ball]
          );

          if (winnerQuery.rows.length > 0) {
            const users = winnerQuery.rows;
            const amountPerUser = winningAmount / users.length; // Divide winnings among multiple users

            users.forEach((user) => {
              winners.push({
                position,
                user_id: user.user_id,
                ball,
                percentage: winningPercentage,
                amount: amountPerUser,
              });
            });
          }
        }
      }

      // Allocate winnings and update wallets
      for (const winner of winners) {
        if (winner.user_id !== "house") {
          const userWallet = await pool.query(
            "SELECT * FROM wallet WHERE user_id=$1 AND type=$2",
            [winner.user_id, "withdrawl"]
          );

          if (userWallet.rows.length > 0) {
            const updatedBalance =
              parseFloat(userWallet.rows[0].balance) + winner.amount;

            await pool.query(
              "UPDATE wallet SET balance=$1 WHERE user_id=$2 AND type=$3",
              [updatedBalance, winner.user_id, "withdrawl"]
            );

            await pool.query(
              "INSERT INTO transaction_history (user_id, amount, type, game_id) VALUES ($1, $2, $3, $4)",
              [winner.user_id, winner.amount, "added to wallet", game_id]
            );
          }
        }
      }

      // Update game as completed
      const winner_details = JSON.stringify(winners);
      const played_at = new Date();
      await pool.query(
        "UPDATE games SET game_status=$1, winning_amount=$2, number_of_winners=$3, winner_details=$6, participants=$7, winners=$8, winner_ball=$9, played_at=$4, restart_amount=$10 WHERE game_id=$5",
        [
          "completed",
          jackpot,
          number_of_winners,
          played_at,
          game_id,
          winner_details,
          totalParticipants,
          winners.length,
          validatedBalls,
          restart_amount,
        ]
      );

      allResults.push({
        game_id,
        jackpot,
        winners,
        restarted_game,
        restart_amount,
      });
    }

    res.json({
      error: false,
      message: group_id
        ? "Results announced for all games in the group"
        : "Result announced for the game",
      completed_games: allResults,
      skipped_games: skippedGames,
    });
  } catch (err) {
    console.error(err);
    res.json({ error: true, message: "An error occurred" });
  } finally {
    client.release();
  }
};

//   const client = await pool.connect();
//   try {
//     const { game_id, group_id, winning_balls, number_of_winners } = req.body;

//     // Ensure either game_id OR group_id is provided, but not both
//     if (!game_id && !group_id) {
//       return res.json({
//         error: true,
//         message: "Provide either game_id or group_id.",
//       });
//     }
//     if (game_id && group_id) {
//       return res.json({
//         error: true,
//         message: "Provide only game_id or group_id, not both.",
//       });
//     }

//     let gamesToProcess = [];
//     let incompleteGames = [];

//     // Fetch single game if game_id is provided
//     if (game_id) {
//       const gameData = await pool.query(
//         "SELECT * FROM games WHERE game_id=$1",
//         [game_id]
//       );
//       if (gameData.rows.length === 0) {
//         return res.json({ error: true, message: "Game not found" });
//       }
//       gamesToProcess.push(gameData.rows[0]);
//     }

//     // Fetch all games in the group if group_id is provided
//     if (group_id) {
//       const groupGamesData = await pool.query(
//         "SELECT * FROM games WHERE group_id=$1",
//         [group_id]
//       );
//       if (groupGamesData.rows.length === 0) {
//         return res.json({
//           error: true,
//           message: "No games found in this group",
//         });
//       }
//       gamesToProcess = groupGamesData.rows;
//     }

//     let allResults = [];

//     for (const gameDetails of gamesToProcess) {
//       const { game_id } = gameDetails;
//       let restarted_game = false;
//       let restart_amount = 0;
//       const entry_fee = parseFloat(gameDetails.entry_fee);
//       const commission = parseFloat(gameDetails.commission);
//       const initial_deposit = parseFloat(gameDetails.initial_deposit || 0);

//       // Calculate jackpot
//       const totalParticipantsQuery = await pool.query(
//         "SELECT COUNT(DISTINCT user_id) AS total_participants FROM game_users WHERE game_id=$1",
//         [game_id]
//       );
//       const totalParticipants =
//         totalParticipantsQuery.rows[0]?.total_participants || 0;

//       let jackpot = entry_fee * totalParticipants + initial_deposit;
//       const commissionAmount = jackpot * (commission / 100);
//       jackpot -= commissionAmount;

//       // Predefined distribution percentages
//       const distribution = {
//         1: [100], // 1st place gets 100%
//         2: [60, 40], // 1st gets 60%, 2nd gets 40%
//         3: [50, 30, 20], // 1st gets 50%, 2nd gets 30%, 3rd gets 20%
//       };

//       if (!distribution[number_of_winners]) {
//         return res.json({
//           error: true,
//           message: "Invalid number of winners. Allowed values are 1, 2, or 3.",
//         });
//       }

//       // Validate winning balls across all games in the group
//       let allValidBallsInGroup = new Set();

//       if (group_id) {
//         const allGameUsersInGroup = await pool.query(
//           "SELECT DISTINCT winning_ball FROM game_users WHERE game_id IN (SELECT game_id FROM games WHERE group_id = $1)",
//           [group_id]
//         );
//         allGameUsersInGroup.rows.forEach((row) => {
//           allValidBallsInGroup.add(row.winning_ball);
//         });
//       }

//       // Check if each winning ball has participants in the current game
//       const validatedBalls = [];
//       const invalidBalls = [];

//       for (const ball of winning_balls) {
//         if (ball === 0 || allValidBallsInGroup.has(ball)) {
//           validatedBalls.push(ball);
//         } else {
//           invalidBalls.push(ball);
//         }
//       }

//       // If a game has no participants for at least one winning ball, mark it as incomplete
//       if (invalidBalls.length > 0) {
//         incompleteGames.push({
//           game_id,
//           message:
//             "Game not completed because no user participated in winning ball(s).",
//           invalid_balls: invalidBalls,
//         });
//         continue; // Skip further processing for this game
//       }

//       // Assign positions and distribute jackpot
//       const winners = [];
//       for (let i = 0; i < number_of_winners; i++) {
//         const ball = validatedBalls[i];
//         const position = i + 1; // Assign positions (1st, 2nd, 3rd)
//         const winningPercentage = distribution[number_of_winners][i]; // Get the percentage for this position
//         const winningAmount = (jackpot * winningPercentage) / 100; // Calculate winning amount

//         if (ball === 0) {
//           winners.push({
//             position,
//             user_id: "house",
//             ball,
//             percentage: winningPercentage,
//             amount: winningAmount,
//           });
//         } else {
//           const winnerQuery = await pool.query(
//             "SELECT DISTINCT user_id FROM game_users WHERE game_id=$1 AND winning_ball=$2",
//             [game_id, ball]
//           );

//           if (winnerQuery.rows.length > 0) {
//             const users = winnerQuery.rows;
//             const amountPerUser = winningAmount / users.length; // Divide winnings among multiple users

//             users.forEach((user) => {
//               winners.push({
//                 position,
//                 user_id: user.user_id,
//                 ball,
//                 percentage: winningPercentage,
//                 amount: amountPerUser,
//               });
//             });
//           }
//         }
//       }

//       // Allocate winnings and update wallets
//       for (const winner of winners) {
//         if (winner.user_id !== "house") {
//           const userWallet = await pool.query(
//             "SELECT * FROM wallet WHERE user_id=$1 AND type=$2",
//             [winner.user_id, "withdrawl"]
//           );

//           if (userWallet.rows.length > 0) {
//             const updatedBalance =
//               parseFloat(userWallet.rows[0].balance) + winner.amount;

//             await pool.query(
//               "UPDATE wallet SET balance=$1 WHERE user_id=$2 AND type=$3",
//               [updatedBalance, winner.user_id, "withdrawl"]
//             );

//             await pool.query(
//               "INSERT INTO transaction_history (user_id, amount, type, game_id) VALUES ($1, $2, $3, $4)",
//               [winner.user_id, winner.amount, "added to wallet", game_id]
//             );
//           }
//         }
//       }

//       // Update game as completed
//       const winner_details = JSON.stringify(winners);
//       const played_at = new Date();
//       await pool.query(
//         "UPDATE games SET game_status=$1, winning_amount=$2, number_of_winners=$3, winner_details=$6, participants=$7, winners=$8, winner_ball=$9, played_at=$4, restart_amount=$10 WHERE game_id=$5",
//         [
//           "completed",
//           jackpot,
//           number_of_winners,
//           played_at,
//           game_id,
//           winner_details,
//           totalParticipants,
//           winners.length,
//           validatedBalls,
//           restart_amount,
//         ]
//       );

//       allResults.push({
//         game_id,
//         jackpot,
//         winners,
//         restarted_game,
//         restart_amount,
//       });
//     }

//     res.json({
//       error: false,
//       message: group_id
//         ? "Results announced for all games in the group"
//         : "Result announced for the game",
//       completed_games: allResults,
//       incomplete_games: incompleteGames,
//     });
//   } catch (err) {
//     console.error(err);
//     res.json({ error: true, message: "An error occurred" });
//   } finally {
//     client.release();
//   }
// };

// exports.announceResultv2 = async (req, res, next) => {
//   const client = await pool.connect();
//   try {
//     const { game_id, group_id, winning_balls, number_of_winners } = req.body;

//     // Ensure either game_id OR group_id is provided, but not both
//     if (!game_id && !group_id) {
//       return res.json({
//         error: true,
//         message: "Provide either game_id or group_id.",
//       });
//     }
//     if (game_id && group_id) {
//       return res.json({
//         error: true,
//         message: "Provide only game_id or group_id, not both.",
//       });
//     }

//     let gamesToProcess = [];

//     // Fetch single game if game_id is provided
//     if (game_id) {
//       const gameData = await pool.query(
//         "SELECT * FROM games WHERE game_id=$1",
//         [game_id]
//       );
//       if (gameData.rows.length === 0) {
//         return res.json({ error: true, message: "Game not found" });
//       }
//       gamesToProcess.push(gameData.rows[0]);
//     }

//     // Fetch all games in the group if group_id is provided
//     if (group_id) {
//       const groupGamesData = await pool.query(
//         "SELECT * FROM games WHERE group_id=$1",
//         [group_id]
//       );
//       if (groupGamesData.rows.length === 0) {
//         return res.json({
//           error: true,
//           message: "No games found in this group",
//         });
//       }
//       gamesToProcess = groupGamesData.rows;
//     }

//     let allResults = [];

//     for (const gameDetails of gamesToProcess) {
//       const { game_id } = gameDetails;
//       let restarted_game = false;
//       let restart_amount = 0;
//       const entry_fee = parseFloat(gameDetails.entry_fee);
//       const commission = parseFloat(gameDetails.commission);
//       const initial_deposit = parseFloat(gameDetails.initial_deposit || 0);

//       // Calculate jackpot
//       const totalParticipantsQuery = await pool.query(
//         "SELECT COUNT(DISTINCT user_id) AS total_participants FROM game_users WHERE game_id=$1",
//         [game_id]
//       );
//       const totalParticipants =
//         totalParticipantsQuery.rows[0]?.total_participants || 0;

//       let jackpot = entry_fee * totalParticipants + initial_deposit;
//       const commissionAmount = jackpot * (commission / 100);
//       jackpot -= commissionAmount;

//       // Predefined distribution percentages
//       const distribution = {
//         1: [100], // 1st place gets 100%
//         2: [60, 40], // 1st gets 60%, 2nd gets 40%
//         3: [50, 30, 20], // 1st gets 50%, 2nd gets 30%, 3rd gets 20%
//       };

//       if (!distribution[number_of_winners]) {
//         return res.json({
//           error: true,
//           message: "Invalid number of winners. Allowed values are 1, 2, or 3.",
//         });
//       }

//       // Validate winning balls
//       const validatedBalls = [];
//       for (const ball of winning_balls) {
//         if (ball === 0) {
//           validatedBalls.push(0);
//           continue;
//         }

//         const participantQuery = await pool.query(
//           "SELECT COUNT(*) AS participant_count FROM game_users WHERE game_id=$1 AND winning_ball=$2",
//           [game_id, ball]
//         );
//         const participantCount = parseInt(
//           participantQuery.rows[0].participant_count
//         );

//         if (participantCount > 0) {
//           validatedBalls.push(ball);
//         }
//       }

//       if (validatedBalls.length < number_of_winners) {
//         return res.json({
//           error: true,
//           message:
//             "One or more winning balls have no participants. Please select valid balls.",
//           invalid_balls: winning_balls.filter(
//             (ball) => !validatedBalls.includes(ball)
//           ),
//         });
//       }

//       // Assign positions and distribute jackpot
//       const winners = [];
//       for (let i = 0; i < number_of_winners; i++) {
//         const ball = validatedBalls[i];
//         const position = i + 1; // Assign positions (1st, 2nd, 3rd)
//         const winningPercentage = distribution[number_of_winners][i]; // Get the percentage for this position
//         const winningAmount = (jackpot * winningPercentage) / 100; // Calculate winning amount

//         if (ball === 0) {
//           winners.push({
//             position,
//             user_id: "house",
//             ball,
//             percentage: winningPercentage,
//             amount: winningAmount,
//           });
//         } else {
//           const winnerQuery = await pool.query(
//             "SELECT DISTINCT user_id FROM game_users WHERE game_id=$1 AND winning_ball=$2",
//             [game_id, ball]
//           );

//           if (winnerQuery.rows.length > 0) {
//             const users = winnerQuery.rows;
//             const amountPerUser = winningAmount / users.length; // Divide winnings among multiple users

//             users.forEach((user) => {
//               winners.push({
//                 position,
//                 user_id: user.user_id,
//                 ball,
//                 percentage: winningPercentage,
//                 amount: amountPerUser,
//               });
//             });
//           }
//         }
//       }

//       // Allocate winnings and update wallets
//       for (const winner of winners) {
//         if (winner.user_id !== "house") {
//           const userWallet = await pool.query(
//             "SELECT * FROM wallet WHERE user_id=$1 AND type=$2",
//             [winner.user_id, "withdrawl"]
//           );

//           if (userWallet.rows.length > 0) {
//             const updatedBalance =
//               parseFloat(userWallet.rows[0].balance) + winner.amount;

//             await pool.query(
//               "UPDATE wallet SET balance=$1 WHERE user_id=$2 AND type=$3",
//               [updatedBalance, winner.user_id, "withdrawl"]
//             );

//             await pool.query(
//               "INSERT INTO transaction_history (user_id, amount, type, game_id) VALUES ($1, $2, $3, $4)",
//               [winner.user_id, winner.amount, "added to wallet", game_id]
//             );
//           }
//         }
//       }

//       // Update game as completed
//       const winner_details = JSON.stringify(winners);
//       const played_at = new Date();
//       await pool.query(
//         "UPDATE games SET game_status=$1, winning_amount=$2, number_of_winners=$3, winner_details=$6, participants=$7, winners=$8, winner_ball=$9, played_at=$4, restart_amount=$10 WHERE game_id=$5",
//         [
//           "completed",
//           jackpot,
//           number_of_winners,
//           played_at,
//           game_id,
//           winner_details,
//           totalParticipants,
//           winners.length,
//           validatedBalls,
//           restart_amount,
//         ]
//       );

//       allResults.push({
//         game_id,
//         jackpot,
//         winners,
//         restarted_game,
//         restart_amount,
//       });
//     }

//     res.json({
//       error: false,
//       message: group_id
//         ? "Results announced for all games in the group"
//         : "Result announced for the game",
//       results: allResults,
//     });
//   } catch (err) {
//     console.error(err);
//     res.json({ error: true, message: "An error occurred" });
//   } finally {
//     client.release();
//   }
// };

exports.announceResult = async (req, res, next) => {
  // function calling
  // Example user data: Replace this with actual data from your database or API
  // const userSelections = [
  //   { userId: 1, username: "User1", selectedBall: 2 },
  //   { userId: 2, username: "User2", selectedBall: 3 },
  //   { userId: 3, username: "User3", selectedBall: 2 },
  //   { userId: 4, username: "User4", selectedBall: 15 },
  // ];

  // // Function to fetch users who selected a specific ball
  // function getUsersForBall(ball) {
  //   // Filter users based on their selected ball
  //   return userSelections.filter((user) => user.selectedBall === ball);
  // }

  // // Example usage
  // const selectedBall = 2; // Admin-selected ball
  // const usersForBall = getUsersForBall(selectedBall);

  // console.log(`Users for ball ${selectedBall}:`, usersForBall);
  // end
  // new logic
  // function distributeJackpot(entry_fee, participated_users, commission, winners) {
  //   // Calculate the initial jackpot
  //   let jackpot = parseFloat(entry_fee) * parseFloat(participated_users);

  //   // Deduct commission from jackpot
  //   const commission_amount = parseFloat(jackpot) * (parseFloat(commission) / 100);
  //   jackpot -= commission_amount;

  //   // Validate admin selection
  //   if (!winners || winners.length === 0 || winners.length > 3) {
  //     throw new Error("Admin must select between 1 and 3 winners.");
  //   }

  //   // Ensure unique and valid ball numbers
  //   const validBalls = winners.every(
  //     (ball) => ball >= 1 && ball <= 15 && winners.filter((b) => b === ball).length === 1
  //   );
  //   if (!validBalls) {
  //     throw new Error("Invalid or duplicate ball selection. Choose unique balls between 1 and 15.");
  //   }

  //   // Define distribution ratios
  //   const distributionRatios = {
  //     1: [1],
  //     2: [0.6, 0.4],
  //     3: [0.5, 0.3, 0.2],
  //   };

  //   const selectedRatios = distributionRatios[winners.length];
  //   let totalDistributed = 0;

  //   // Calculate amounts for each winner
  //   const winnerAmounts = winners.map((ball, index) => {
  //     const ratio = selectedRatios[index];
  //     const amount = jackpot * ratio;

  //     // Fetch users for this ball
  //     const usersForBall = getUsersForBall(ball); // Implement this function
  //     const numUsers = usersForBall.length;

  //     if (numUsers === 0) {
  //       console.warn(`No users selected ball ${ball}. Skipping distribution.`);
  //       return { ball, amount: 0, users: [] };
  //     }

  //     // Distribute amount equally among users of this ball
  //     const perUserAmount = amount / numUsers;
  //     totalDistributed += amount;

  //     return {
  //       ball,
  //       amount,
  //       users: usersForBall.map((user) => ({
  //         user,
  //         amount: perUserAmount,
  //       })),
  //     };
  //   });

  //   // Ensure total distribution matches the jackpot
  //   if (Math.abs(totalDistributed - jackpot) > 0.01) {
  //     throw new Error("Distribution error: Total does not match jackpot.");
  //   }

  //   return {
  //     jackpot,
  //     commission_amount,
  //     winnerAmounts,
  //   };
  // }

  // // Example usage:
  // const entry_fee = 10; // Example entry fee
  // const participated_users = 100; // Example number of participants
  // const commission = 10; // 10% commission
  // const winners = [2, 3, 15]; // Admin selected balls

  // try {
  //   const distribution = distributeJackpot(entry_fee, participated_users, commission, winners);
  //   console.log(distribution);
  // } catch (error) {
  //   console.error(error.message);
  // }

  // // Helper function to fetch users who selected a specific ball
  // function getUsersForBall(ball) {
  //   // Replace with actual logic to fetch users based on the selected ball
  //   return [
  //     { id: 1, name: "User1" },
  //     { id: 2, name: "User2" },
  //   ]; // Example users
  // }

  // end logic
  const client = await pool.connect();
  try {
    const ballImageUrls = await fetchBallImages();
    const { game_id, winning_ball } = req.body;
    const gameUser = await pool.query("SELECT * FROM games WHERE game_id=$1", [
      game_id,
    ]);
    console.log("winning_ball", winning_ball);
    if (gameUser.rows.length > 0) {
      // save game details
      let game_details = gameUser.rows[0];
      let entry_fee = gameUser.rows[0].entry_fee;
      let commisssion = gameUser.rows[0].commission;
      let game_statusData = "completed";
      let jackpot = 0;
      let commision_winning_amount = 0;
      // get all users count participated in this game
      const gameUsersAll = await pool.query(
        "SELECT COUNT(DISTINCT user_id) AS total_participants FROM game_users WHERE game_id=$1",
        [game_id]
      );
      const participated_users = gameUsersAll.rows[0].total_participants;
      // conballImageUrlsst gameUsersAll = await pool.query(
      //   "SELECT * FROM game_users WHERE game_id=$1",
      //   [game_id]
      // );
      // let participated_users = gameUsersAll.rows.length;
      console.log("users ");
      // console.log(gameUsersAll)

      // if winning_ball is 0
      if (parseInt(winning_ball) === parseInt(0)) {
        const gameUsersWinners1 = await pool.query(
          "SELECT * FROM game_users WHERE game_id=$1",
          [game_id]
        );
        const gameP = gameUsersWinners1.rows.length;
        jackpot = 0;
        commision_winning_amount = parseFloat(entry_fee) * parseInt(gameP);

        const played_at = new Date();
        const gameUserWinner = await pool.query(
          "UPDATE games SET winner_ball=$1, game_status=$2,winning_amount=$3,commision_winning_amount=$4,participants=$5,winners=$6,played_at=$7 WHERE game_id=$8 RETURNING *",
          [
            winning_ball,
            game_statusData,
            jackpot,
            commision_winning_amount,
            participated_users,
            0,
            played_at,
            game_id,
          ]
        );
        if (gameUserWinner.rows.length > 0) {
          res.json({
            error: false,
            winner_ball_image_url: ballImageUrls[winning_ball], // Add the URL of the winner ball
            game_details: gameUserWinner.rows[0],
            participated_users: participated_users,
            winners: 0,
            message: "Result Announced Successfully",
          });
        } else {
          res.json({
            error: true,
            again_start_game: true,
            message: "Cant Announce Winner Ball Right Now !",
          });
        }
      } else {
        // if winning ball is other than 9,8 and white 0
        console.log(winning_ball);

        const gameUsersWinnersP = await pool.query(
          "SELECT DISTINCT user_id FROM game_users WHERE game_id = $1",
          [game_id.toString()]
        );
        //         console.log("GAMEUSERWINNERS");
        let gameUsersWinnersPart = gameUsersWinnersP.rows.length;
        const gameUsersWinnersPW = await pool.query(
          "SELECT DISTINCT user_id FROM game_users WHERE game_id = $1 AND winning_ball = $2",
          [game_id.toString(), winning_ball.toString()]
        );
        //         console.log("GAMEUSERWINNERS");
        let gameUsersWinnersPartWin = gameUsersWinnersPW.rows.length;
        let userIdsArray = gameUsersWinnersPW.rows.map((row) => ({
          user_id: row.user_id,
        }));
        console.log("ids user ");
        console.log(userIdsArray);

        const totalGameUsers = await pool.query(
          "SELECT COUNT(*) AS total FROM game_users WHERE game_id = $1",
          [game_id]
        );
        console.log("Total Game User Entries:", totalGameUsers.rows[0].total);

        let participated_usersWinner = totalGameUsers.rows[0].total;
        // let actual_users_game_balls = winningUsersCount;

        console.log(gameUsersWinnersPartWin);
        // console.log("actual_users_game_balls");
        // console.log(actual_users_game_balls);
        console.log("participated_usersWinner");
        console.log(participated_usersWinner);

        if (
          parseInt(gameUsersWinnersPartWin) === parseInt(0) ||
          parseInt(gameUsersWinnersPartWin) === null ||
          parseInt(gameUsersWinnersPartWin) === "null"
        ) {
          console.log("dshjdsh");
          return res.json({
            error: true,
            game_details: game_details,
            again_start_game: true,
            message: "No User Winner",
          });
        } else {
          console.log("else ");
          // const participated_usersWinner = gameUsersWinners.rows.length;
          console.log("participated_usersWinner", participated_usersWinner);
          // console.log("participated_usersWinner", participated_users);

          // get jackpot
          jackpot =
            parseFloat(entry_fee) * parseFloat(participated_usersWinner);
          // deduct commision from jackpot
          const commission_amount =
            parseFloat(jackpot) * (parseFloat(commisssion) / 100);
          // deduct commission from jackpot
          jackpot = jackpot - commission_amount;

          const winning_amount_single =
            parseFloat(jackpot) / parseFloat(gameUsersWinnersPartWin);
          // update user win games of participated_usersWinners
          console.log(winning_amount_single);
          console.log(jackpot);

          // Create a map to track the count of wins for each user
          // const userWinCounts = winningUserIds.reduce((acc, userId) => {
          //   acc[userId] = (acc[userId] || 0) + 1;
          //   return acc;
          // }, {});
          const userWinCounts = userIdsArray.reduce((acc, { user_id }) => {
            acc[user_id] = (acc[user_id] || 0) + 1;
            return acc;
          }, {});

          for (const userId in userWinCounts) {
            const winCount = userWinCounts[userId];
            const totalWinningAmount = winCount * winning_amount_single;

            // const user_id = gameUsersWinners.rows[i].user_id;
            const userWinGames = await pool.query(
              "SELECT * FROM users WHERE user_id=$1",
              [userId]
            );
            if (userWinGames.rows.length > 0) {
              const playedGame = await pool.query(
                "UPDATE users SET win_games=$1 WHERE user_id=$2 RETURNING *",
                [
                  parseFloat(userWinGames.rows[0].win_games) + parseFloat(1),
                  userId,
                ]
              );
              // add winning_amount_single to user wallet
              const userWallet = await pool.query(
                "SELECT * FROM wallet WHERE user_id=$1",
                [userId]
              );
              if (userWallet.rows.length > 0) {
                console.log(
                  parseFloat(userWallet.rows[0].balance) +
                    parseFloat(totalWinningAmount)
                );
                console.log("AAAAAAAA");

                const wallet = await pool.query(
                  "UPDATE wallet SET balance=$1 WHERE user_id=$2 RETURNING *",
                  [
                    parseFloat(userWallet.rows[0].balance) +
                      parseFloat(totalWinningAmount),
                    userId,
                  ]
                );
                if (wallet.rows.length > 0) {
                  console.log("wallet updated");
                  const gameTransactions = await pool.query(
                    "INSERT INTO transaction_history (user_id, amount,type,game_id) VALUES ($1, $2,$3,$4) RETURNING *",
                    [userId, totalWinningAmount, "added to wallet", game_id]
                  );
                  console.log(gameTransactions.rows);
                }
              }
              // end
            }
          }

          // // Update the game lastly
          const played_at = new Date();
          const gameUserWinner = await pool.query(
            "UPDATE games SET winner_ball=$1, game_status=$2,winning_amount=$3,commision_winning_amount=$4,participants=$5,winners=$6,played_at=$7,winning_amount_single=$8 WHERE game_id=$9 RETURNING *",
            [
              winning_ball,
              game_statusData,
              jackpot,
              commission_amount,
              // participated_users,
              gameUsersWinnersPart,
              gameUsersWinnersPartWin,
              played_at,
              winning_amount_single,
              game_id,
            ]
          );
          if (gameUserWinner.rows.length > 0) {
            res.json({
              error: false,
              winner_ball_image_url: ballImageUrls[winning_ball], // Add the URL of the winner ball

              game_details: gameUserWinner.rows[0],
              participated_users: gameUsersWinnersPart,
              winners: gameUsersWinnersPartWin,
              message: "Result Announced Successfully",
            });
          } else {
            res.json({
              error: true,
              again_start_game: true,
              message: "Cant Announce Winner Ball Right Now !",
            });
          }
        }
      }
    } else {
      res.json({
        error: true,
        again_start_game: true,
        message: "Game Not Found",
      });
    }
  } catch (err) {
    console.log(err);
    res.json({ error: true, data: [], message: "Catch error" });
  } finally {
    client.release();
  }
};

// get games by year
exports.getGamesByYear = async (req, res) => {
  const client = await pool.connect();
  try {
    const ballImageUrls = await fetchBallImages();
    const year = req.query.year; // assuming the year is passed as a URL parameter
    const query = `
            SELECT EXTRACT(MONTH FROM created_at) AS month, COUNT(*) AS count
            FROM games
            WHERE EXTRACT(YEAR FROM created_at) = $1
            GROUP BY month
            ORDER BY month ASC
        `;
    const result = await pool.query(query, [year]);
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
      message: "Games Found",
    });
  } catch (err) {
    res.json({ error: true, data: [], message: "Catch error" });
  } finally {
    client.release();
  }
};
exports.getAllNotifications = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { user_id, is_read } = req.query;
    const page = parseInt(req.query.page, 10) || 1; // Default page 1
    const limit = parseInt(req.query.limit, 10) || 10; // Default 10 items per page
    const offset = (page - 1) * limit;

    let query = `SELECT * FROM notifications WHERE 1=1 `;
    let values = [];
    let countQuery = `SELECT COUNT(*) AS total FROM notifications WHERE 1=1 `;
    let countValues = [];

    if (user_id) {
      query += `AND (user_id = $${values.length + 1} ) `;
      countQuery += `AND (user_id = $${countValues.length + 1} ) `;
      values.push(user_id);
      countValues.push(user_id);
    }

    if (is_read !== undefined) {
      query += `AND is_read = $${values.length + 1} `;
      countQuery += `AND is_read = $${countValues.length + 1} `;
      values.push(is_read === "true");
      countValues.push(is_read === "true");
    }

    query += `ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${
      values.length + 2
    }`;
    values.push(limit, offset);

    countValues.push(); // Ensure count query uses the correct values

    // Execute queries
    const notifications = await pool.query(query, values);
    const totalResult = await pool.query(countQuery, countValues);
    const total = totalResult.rows[0]?.total || 0;

    res.json({
      error: false,
      data: notifications.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      message: "Notifications fetched successfully",
    });
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.json({ error: true, data: [], message: "An error occurred" });
  } finally {
    client.release();
  }
};
exports.markNotificationRead = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { notification_id, is_read } = req.body;

    if (!notification_id || typeof is_read !== "boolean") {
      return res.json({
        error: true,
        message:
          "Invalid parameters. Provide notification_id and is_read (true/false).",
      });
    }

    const result = await pool.query(
      "UPDATE notifications SET is_read = $1 WHERE notifications_id = $2 RETURNING *",
      [is_read, notification_id]
    );

    if (result.rowCount === 0) {
      return res.json({
        error: true,
        message: "Notification not found or already updated.",
      });
    }

    res.json({
      error: false,
      message: `Notification ${notification_id} marked as ${
        is_read ? "read" : "unread"
      }.`,
      data: result.rows[0],
    });
  } catch (err) {
    console.error("Error updating notification status:", err);
    res.json({ error: true, message: "Internal server error." });
  } finally {
    client.release();
  }
};
exports.markALLNotificationRead = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { is_read, user_id } = req.body;

    if (typeof is_read !== "boolean" || !user_id) {
      return res.json({
        error: true,
        message:
          "Invalid parameters. Provide is_read (true/false) and user_id.",
      });
    }

    const result = await pool.query(
      "UPDATE notifications SET is_read = $1 WHERE user_id = $2 RETURNING *",
      [is_read, user_id]
    );

    if (result.rowCount === 0) {
      return res.json({
        error: true,
        message: "Notification not found or already updated.",
      });
    }

    res.json({
      error: false,
      message: `Notification  marked as ${is_read ? "read" : "unread"}.`,
      data: result.rows[0],
    });
  } catch (err) {
    console.error("Error updating notification status:", err);
    res.json({ error: true, message: "Internal server error." });
  } finally {
    client.release();
  }
};
