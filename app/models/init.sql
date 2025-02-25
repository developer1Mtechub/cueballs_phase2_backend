
CREATE SEQUENCE IF NOT EXISTS my_sequence START 100000;

CREATE TABLE IF NOT EXISTS users(
  user_id INT NOT NULL DEFAULT nextval('my_sequence') PRIMARY KEY,
  email TEXT,
  user_name TEXT,
  password TEXT,
  access_token TEXT,
  signup_type TEXT,
  role TEXT, -- user,admin,super_admin
  deleted_user TEXT,
  played_games TEXT,
  stripe_customer_id TEXT,
  caller_id TEXT,
  agent_name TEXT,
  permissions jsonb[],
  win_games TEXT,
  deleted_at TIMESTAMP,
  account_status TEXT,
  device_token TEXT,
  web_token TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
 
);
CREATE TABLE IF NOT EXISTS user_card(
  user_id INT NOT NULL DEFAULT nextval('my_sequence') PRIMARY KEY,
  payer_id TEXT,
  payment_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
 
);
CREATE TABLE IF NOT EXISTS otp_verification_user(
  user_id INT NOT NULL DEFAULT nextval('my_sequence') PRIMARY KEY,
  email TEXT,
  otp TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
 
);
CREATE TABLE IF NOT EXISTS games(
  games_id INT NOT NULL DEFAULT nextval('my_sequence') PRIMARY KEY,
  game_id TEXT,
  entry_fee TEXT,
  commission TEXT,
  initial_deposit TEXT,
  game_status TEXT,
  winner_ball INT[] DEFAULT '{}',
  winning_amount TEXT,
  winning_amount_single TEXT,
  commision_winning_amount TEXT,
  participants TEXT,
  winners TEXT,
  restarted Boolean,
  group_id TEXT,
  restarted_round TEXT,
  restart_amount TEXT,
  played_at TEXT,
  number_of_winners INT DEFAULT 1, -- New column
  winner_details JSON,             -- New column
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
 
);
CREATE TABLE IF NOT EXISTS game_users(
  game_users_id INT NOT NULL DEFAULT nextval('my_sequence') PRIMARY KEY,
  game_id TEXT,
  user_id TEXT,
  winning_ball TEXT,
  round_no TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
 
);
CREATE TABLE IF NOT EXISTS notifications(
    notifications_id INT NOT NULL DEFAULT nextval('my_sequence') PRIMARY KEY,
    user_id TEXT,
    title TEXT,
    body TEXT,
    type TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feedback(
  feedback_id INT NOT NULL DEFAULT nextval('my_sequence') PRIMARY KEY,
  name TEXT,
  email TEXT,
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
 
);

CREATE TABLE IF NOT EXISTS app_share_link(
  link_id INT NOT NULL DEFAULT nextval('my_sequence') PRIMARY KEY,
  url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
 
);

CREATE TABLE IF NOT EXISTS contact_us(
  message_id INT NOT NULL DEFAULT nextval('my_sequence') PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
 
);

CREATE TABLE IF NOT EXISTS transaction_history(
  transaction_history_id INT NOT NULL DEFAULT nextval('my_sequence') PRIMARY KEY,
  user_id TEXT,
  game_id TEXT,
  amount TEXT,
  type TEXT,
  money_type TEXT,
  money_type_details TEXT,
  withdrawl_object TEXT,
  screenshot TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
 
);
CREATE TABLE IF NOT EXISTS transaction_request(
  transaction_request_id INT NOT NULL DEFAULT nextval('my_sequence') PRIMARY KEY,
  user_id TEXT,
  amount TEXT,
  type TEXT,
  payment_object jsonb[],
  status TEXT,
  screenshot TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
 
);
CREATE TABLE IF NOT EXISTS wallet(
  wallet_id INT NOT NULL DEFAULT nextval('my_sequence') PRIMARY KEY,
  user_id TEXT,
  balance TEXT,
  type TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
 
);
CREATE TABLE IF NOT EXISTS limits(
  limits_id INT NOT NULL DEFAULT nextval('my_sequence') PRIMARY KEY,
  deposit_limit TEXT,
  withdrawl_limit TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
 
);

CREATE TABLE IF NOT EXISTS game_rounds(
  restarted_round_id INT NOT NULL DEFAULT nextval('my_sequence') PRIMARY KEY,
  game_id TEXT,
  round_no TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
 
);
CREATE TABLE IF NOT EXISTS balls_images(
  balls_images_id INT NOT NULL DEFAULT nextval('my_sequence') PRIMARY KEY,
  image_url TEXT,
  name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
 
);
CREATE TABLE IF NOT EXISTS privacy_policy(
  privacy_policy_id INT NOT NULL DEFAULT nextval('my_sequence') PRIMARY KEY,
  content TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
 
);
CREATE TABLE IF NOT EXISTS terms_and_conditions(
  terms_and_conditions_id INT NOT NULL DEFAULT nextval('my_sequence') PRIMARY KEY,
  content TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
 
);
CREATE TABLE IF NOT EXISTS social_links(
  social_links_id INT NOT NULL DEFAULT nextval('my_sequence') PRIMARY KEY,
  facebook_url TEXT,
  facebook_image_url TEXT,
  instagram_image_url TEXT,
  instagram_url TEXT,
  twitter_url TEXT,
  twitter_image_url TEXT,
  linkedin_url TEXT,
  linkedin_image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
 
);
CREATE TABLE IF NOT EXISTS support_email(
  support_email_id INT NOT NULL DEFAULT nextval('my_sequence') PRIMARY KEY,
  email TEXT,
  phone_no TEXT,
  address TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
 
);
CREATE TABLE IF NOT EXISTS website_download(
  website_download_id INT NOT NULL DEFAULT nextval('my_sequence') PRIMARY KEY,
  play_store_url TEXT,
  app_store_url TEXT,
  download_now_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
 
);
CREATE TABLE IF NOT EXISTS qr_bonus_flyer(
  qr_bonus_flyer_id INT NOT NULL DEFAULT nextval('my_sequence') PRIMARY KEY,
  bonus_name TEXT,
  start_date TEXT,
  end_date TEXT,
  bonus_coins TEXT,
  offer_percentage TEXT,
  qr_image TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
 
);
CREATE TABLE IF NOT EXISTS user_bonus_redemptions (
  redemption_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  qr_bonus_flyer_id INT NOT NULL REFERENCES qr_bonus_flyer(qr_bonus_flyer_id),
  redeemed_at TEXT,
  UNIQUE (user_id, qr_bonus_flyer_id) -- Ensure a user can redeem each flyer only once
);

-- Check if a user with type 'admin' exists
SELECT COUNT(*) FROM users WHERE signup_type = 'admin';
-- ALTER TABLE qr_bonus_flyer ADD COLUMN money_type_details jsonb[];
-- ALTER TABLE transaction_history ADD COLUMN withdrawl_object jsonb[];

-- ALTER TABLE games ADD COLUMN number_of_winners INT DEFAULT 1;
-- ALTER TABLE games ADD COLUMN winner_details JSON;
-- ALTER TABLE games ALTER COLUMN winner_ball TYPE INT[] USING string_to_array(winner_ball, ',')::INT[];
-- ALTER TABLE games ALTER COLUMN winner_ball SET DEFAULT '{}';
-- If no user with type 'admin' exists, insert a new user
INSERT INTO users (user_id, signup_type, email,password,role)
SELECT nextval('my_sequence'), 'admin', 'rimshanimo22@gmail.com','Mtechub@123','admin'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin');

