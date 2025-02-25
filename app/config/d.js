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
      if (gameData.rows.length === 0) {
        res.json({
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
  
      const game_winners = gameData.rows[0].winners;
      if (parseInt(game_winners) === parseInt(0)) {
        res.json({
          error: true,
          data: [],
          message: "No Winners Found",
        });
      }
  
      // get game users by game id
      const gameUsers = await pool.query(
        "SELECT * FROM game_users WHERE game_id=$1",
        [game_id]
      );
      if (gameUsers.rows.length === 0) {
        res.json({
          error: true,
          data: [],
          message: "Can't Get Games or Games data Empty",
        });
      }
      console.log("gameUsers", gameUsers.rows);
      console.log("winning_ball", winning_ball);
      console.log("winning_amount_single", winning_amount_single);
      if (parseInt(winning_ball) === parseInt(8)) {

      } else if (parseInt(winning_ball) === parseInt(9)) { } else {
        const gameUsers2 = await pool.query(
          "SELECT * FROM game_users WHERE game_id=$1 AND winning_ball = $2",
          [game_id, reset_winner_ball]
        );
        console.log("New winners", gameUsers2.rows);
        // amount deduct
        if (gameUsers2.rows.length === 0) {
          return res.json({
            error: true,
            data: [],
            message: "No Winners Found",
          });
        }
        // get all game users with winning ball 0
        const gameUsers1 = await pool.query(
          "SELECT * FROM game_users WHERE game_id=$1 AND winning_ball = $2",
          [game_id, winning_ball]
        );
        console.log("Prev winners", gameUsers1.rows);
        // amount deduct
        const gameUsersWinners = await pool.query(
          "SELECT DISTINCT user_id FROM game_users WHERE game_id = $1 AND winning_ball = $2",
          [game_id.toString(), winning_ball.toString()]
        );
        console.log(gameUsersWinners.rows);
  
        let participated_usersWinner = gameUsersWinners.rows.length;
        let actual_users_game_balls = gameUsers1.rows.length;
        // No record then no winner
        if (parseInt(participated_usersWinner) === parseInt(0)) {
          console.log("dshjdsh");
          res.json({
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
          jackpot = parseFloat(entry_fee) * parseFloat(actual_users_game_balls);
          // deduct commision from jackpot
          const commission_amount =
            parseFloat(jackpot) * (parseFloat(commisssion) / 100);
          // deduct commission from jackpot
          jackpot = jackpot - commission_amount;
  
          const winning_amount_single =
            parseFloat(jackpot) / parseFloat(participated_usersWinner);
  
        
          for (let i = 0; i < parseInt(participated_usersWinner); i++) {
            const user_id = gameUsersWinners.rows[i].user_id;
      
            // Fetch user's current wallet balance in a single query
            const userWallet = await client.query(
              "SELECT balance FROM wallet WHERE user_id=$1 FOR UPDATE", // Lock the row
              [user_id]
            );
      
            if (userWallet.rows.length === 0) {
              console.log(`User ${user_id} wallet not found`);
              continue; // Skip to the next user if wallet is not found
            }
      
            // Calculate new balance
            const newBalance =
              parseFloat(userWallet.rows[0].balance) - parseFloat(winning_amount_single);
      
            // Check if the user has enough balance to deduct
            if (newBalance < 0) {
              console.log(`User ${user_id} does not have enough balance`);
              continue; // Skip this user if they don't have sufficient balance
            }
      
            // Update the user's wallet balance
            const updatedWallet = await client.query(
              "UPDATE wallet SET balance=$1 WHERE user_id=$2 RETURNING *",
              [newBalance, user_id]
            );
      
            console.log(`Wallet updated for user ${user_id}:`, updatedWallet.rows[0]);
      
            // Insert transaction into transaction history
            const transaction = await client.query(
              "INSERT INTO transaction_history (user_id, amount, type, game_id) VALUES ($1, $2, $3, $4) RETURNING *",
              [user_id, winning_amount_single, "diverted", game_id]
            );
      
            console.log(`Transaction recorded for user ${user_id}:`, transaction.rows[0]);
          }
        }
        // UPADTE NEW USERS
        //-------------------------------------
  // ADDD 
    // get all game users with winning ball 0
    const gameUsers = await pool.query(
      "SELECT * FROM game_users WHERE game_id=$1 AND winning_ball = $2",
      [game_id, reset_winner_ball]
    );
    console.log("Prev winners", gameUsers.rows);
    // amount deduct
    const gameUsersWinners1 = await pool.query(
      "SELECT DISTINCT user_id FROM game_users WHERE game_id = $1 AND winning_ball = $2",
      [game_id.toString(), reset_winner_ball.toString()]
    );
    console.log(gameUsersWinners1.rows);
  
    let participated_usersWinner1 = gameUsersWinners1.rows.length;
    let actual_users_game_balls1 = gameUsers.rows.length;
    // No record then no winner
    if (parseInt(participated_usersWinner1) === parseInt(0)) {
      console.log("dshjdsh");
      res.json({
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
      jackpot = parseFloat(entry_fee) * parseFloat(actual_users_game_balls1);
      // deduct commision from jackpot
      const commission_amount =
        parseFloat(jackpot) * (parseFloat(commisssion) / 100);
      // deduct commission from jackpot
      jackpot = jackpot - commission_amount;
  
       winning_amount_single1 =
        parseFloat(jackpot) / parseFloat(participated_usersWinner1);
  
   
      for (let i = 0; i < parseInt(participated_usersWinner1); i++) {
        const user_id = gameUsersWinners1.rows[i].user_id;
  
        // Fetch user's current wallet balance in a single query
        const userWallet = await client.query(
          "SELECT balance FROM wallet WHERE user_id=$1 FOR UPDATE", // Lock the row
          [user_id]
        );
  
        if (userWallet.rows.length === 0) {
          console.log(`User ${user_id} wallet not found`);
          continue; // Skip to the next user if wallet is not found
        }
  
        // Calculate new balance
        const newBalance =
          parseFloat(userWallet.rows[0].balance) + parseFloat(winning_amount_single1);
  
        // Check if the user has enough balance to deduct
        if (newBalance < 0) {
          console.log(`User ${user_id} does not have enough balance`);
          continue; // Skip this user if they don't have sufficient balance
        }
  
        // Update the user's wallet balance
        const updatedWallet = await client.query(
          "UPDATE wallet SET balance=$1 WHERE user_id=$2 RETURNING *",
          [newBalance, user_id]
        );
  
        console.log(`Wallet updated for user ${user_id}:`, updatedWallet.rows[0]);
  
        // Insert transaction into transaction history
        const transaction = await client.query(
          "INSERT INTO transaction_history (user_id, amount, type, game_id) VALUES ($1, $2, $3, $4) RETURNING *",
          [user_id, winning_amount_single, "added to wallet", game_id]
        );
  
        console.log(`Transaction recorded for user ${user_id}:`, transaction.rows[0]);
      }
    }
      
        //   // Update Winners Now
  
        //   // Update the game lastly
        //   // const played_at = new Date();
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