// urls.js

// const PaypalSandBoxUrl="https://api.sandbox.paypal.com/v1"
// const PaypalSandBoxUrlmV2="https://api-m.sandbox.paypal.com/v1"

const PaypalSandBoxUrl = process.env.PaypalSandBoxUrl;
const PaypalSandBoxUrlmV2 = process.env.PaypalSandBoxUrlmV2;

// const user_name_auth='Afr5n4T1tgpdQLKnsB-Ui0HGCbieS-7Vl94XiUn8KqdJpmDSuW1N5gbREo8zxXAlNMhBBUskKAAA64Vp'
// const password_auth='EJYRL27v1CYggjsLmfl79rxWtCHuZBuhNsNWpxKQfxrO5LBUuOms144aA38Qvm8tuAhlwQNT8gmBI_gq'
// const user_name_auth='ASD5NE39kQ2Bwmp4_-_rrGNAozwrxro9KXGXpLZu2RuANixX8tDDQjw-xHNYeABS-0lsxUTwQP8-y8r2'
// const password_auth='ENmSIL6RygTQ8PuT0t-1X0xZD-d9OWw7TdYB7q0ohuc9XmClmwqqqH4_WGk6Dpq9BtlFHiFvZQXn24fN'

// live keys
// const user_name_auth='AaLRUGNwphaI0Bbf4BbITQ4gSYyQS44C0QdUwH6CBc4TG8WSpx_Ps8qXxkkUMm5Bo7boLeYMyHwlUhzu'
// const password_auth='EMWjomC-k1ytxaDeTtvSSq-2jxb7Y5Za44ePA3b2xtklRN_LF5WtmA9xRgt7N8VedrTkfIEcA9qfrmN9'
// const Email_Subject_Paypal= 'Withdrawl Amount Successfully!'
// const mode='sandbox'
// const email_note='Thanks for your patronage!'
const user_name_auth = process.env.user_name_auth;
const password_auth = process.env.password_auth;
const Email_Subject_Paypal = process.env.Email_Subject_Paypal;
const mode = process.env.mode;
const email_note = process.env.email_note;

const getAccessToken = async () => {
  const auth = Buffer.from(`${user_name_auth}:${password_auth}`).toString(
    "base64"
  );

  const response = await fetch(`${PaypalSandBoxUrlmV2}/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await response.json();
  return data.access_token;
};
module.exports = {
  user_name_auth,
  password_auth,
  Email_Subject_Paypal,
  email_note,
  mode,
  getAccessToken,
  PaypalSandBoxUrl,
  PaypalSandBoxUrlmV2,
};
