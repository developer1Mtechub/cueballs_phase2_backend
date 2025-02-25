const nodemailer = require('nodemailer');
const imageURL = require('./EmailImage');
const { welcomeImagee, tickImage } = require('./socialIcons');
const fetchSocialLinks = require('./utils/social_links');

const WelcomeEmail = async (email, subject) => {
  const socialLinks = await fetchSocialLinks();
  // console.log(socialLinks)
  // console.log(socialLinks.facebook_image_url)


  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: "testing.mtechub@gmail.com",
      pass: "obzllcsiuvbrksnf",

    },
  });

  const mailOptions = {
    from: "cuballdash@gmail.com",
    to: email,
    subject: subject,
    html: `
        <!DOCTYPE html>
        <html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">

        <head>
          <meta charset="utf-8">
          <meta name="x-apple-disable-message-reformatting">
          <meta http-equiv="x-ua-compatible" content="ie=edge">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
          <!--[if mso]>
            <xml><o:officedocumentsettings><o:pixelsperinch>96</o:pixelsperinch></o:officedocumentsettings></xml>
          <![endif]-->
          <title>Welcome to Cue Balls👋</title>
          <link
            href="https://fonts.googleapis.com/css?family=Rubik:ital,wght@0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,200;1,300;1,400;1,500;1,600;1,700"
            rel="stylesheet" media="screen">
          <style>
            .hover-underline:hover {
              text-decoration: underline !important;
            }
        
            @media (max-width: 600px) {
              .sm-w-full {
                width: 100% !important;
              }
        
              .sm-px-24 {
                padding-left: 24px !important;
                padding-right: 24px !important;
              }
        
              .sm-py-32 {
                padding-top: 32px !important;
                padding-bottom: 32px !important;
              }
        
              .sm-leading-32 {
                line-height: 32px !important;
              }
            }
          </style>
        </head>
        <body
          style="margin: 0; width: 100%; padding: 0; word-break: break-word; -webkit-font-smoothing: antialiased; background-color: #eceff1;">
          <div style="font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; display: none;">We are please to
            Welcome to Cue Balls</div>
          <div role="article" aria-roledescription="email" aria-label="Welcome to TSM Academy 👋" lang="en"
            style="font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly;">
        
            <div style="display: block; text-align: center; margin-top:40px">
              <div
                style="mso-line-height-rule: exactly;
                display: inline-block;
                justify-content: center; border-radius: 4px; background-color: #ffffff; padding: 28px; text-align: center; font-family: Rubik, -apple-system, 'Segoe UI', sans-serif; font-size: 16px; line-height: 24px; color: #626262;width: 600px;margin-block: 40px;">
                <a href="https://1.envato.market/vuexy_admin"
                  style="font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly;">
                  <img src=${imageURL} width="155"
                    alt="Cue balls logo"
                    style="width:79px;height:62px; display: flex;justify-content: left; line-height: 100%; border: 0;">
                </a>
                <p
                  style="color:#060502; display: flex;justify-content: center; font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; margin-block: 30px; font-size: 22px;line-height: 38px; font-weight: 600;">
                  Dive into the fun – your 8 Pool Ball Gaming journey starts now! 🎱✨</p>
                <img src=${welcomeImagee} width="155"
                  alt="Cue balls logo" style="width: 100%;height: 207px; line-height: 100%; border: 0;">
        
                <p
                  style="font-size: 14px; font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; margin: 0; margin-top: 24px; margin-bottom: 24px;">
                  Congratulations and welcome to the Cue Ball community! We're excited to have you on
                  board. Your registration is now complete, and you're all set to dive into the thrilling world of
                  cue sports.
                  If you ever have questions, need assistance,
                  or just want to share your experiences, our support
                  team is here for you. Reach out to us at
                  <span style="font-weight: 600;color: #F5BC01;">cueball-support@gmail.com</span>
        
                </p>
                <div style="display: table; width: 100%;">
<div style="display: table-row;">

                  <div style="display: table-cell;   margin: 10px; padding: 10px;overflow: auto;">
                    <img src=${tickImage}
                      width="155" alt="Cue balls logo" style="width: 38px;height: 38px; line-height: 100%; border: 0;">
                    <p
                      style="color:#060502; align: center; font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; margin-bottom: 0; font-size: 13px; font-weight: 600;">
                      Select Ball</p>
                    <p
                      style="color:rgba(6, 5, 2, 0.6); display: flex;justify-content: center; font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; margin-bottom: 0; font-size: 10px; line-height: 18px;">
                      You have the power to personalize your game by choosing your preferred ball from the
                      iconic 8 Pool set. Whether it's the
                      classic solid colors or the mesmerizing stripes, the choice is yours</p>
                      </div>
                  <div style="display: table-cell; margin: 10px; padding: 10px;overflow: auto;">
                    <img src=${tickImage}
                      width="155" alt="Cue balls logo" style="width: 38px;height: 38px; line-height: 100%; border: 0;">
                    <p
                      style="color:#060502; align:center; font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; margin-bottom: 0; font-size: 13px; font-weight: 600;">
                      Pay Entry Fees</p>
                    <p
                      style="color:rgba(6, 5, 2, 0.6); display: flex;justify-content: center; font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; margin-bottom: 0; font-size: 10px;line-height: 18px;">
                      Simply choose the ball you want to play the game with and pay the specified entry fee
                      securely through our platform.</p>
                  </div>
                  <div style="display: table-cell;  margin: 10px; padding: 10px;overflow: auto;">
                    <img src=${tickImage}
                      width="155" alt="Cue balls logo" style="width: 38px;height: 38px; line-height: 100%; border: 0;">
                    <p
                      style="color:#060502; align: center; font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; margin-bottom: 0; font-size: 13px; font-weight: 600;">
                      Win Game, Get Paid</p>
                    <p
                      style="color:rgba(6, 5, 2, 0.6); display: flex;justify-content: center; font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; margin-bottom: 0; font-size: 10px;line-height: 18px;">
                      It's not just a game; it's a rewarding adventure. Start playing, start winning, and let the
                      rewards roll in! Dive into the Cue Ball
                      Gaming experience where your victories are celebrated and paid off!</p>
                  </div>
                  </div>
                </div>
        
                <table style="width: 100%;" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td
                      style="font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; padding-top: 32px; padding-bottom: 32px;">
                      <div
                        style="font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; height: 1px; background-color: #eceff1; line-height: 1px;">
                        &zwnj;</div>
                    </td>
                  </tr>
                </table>
                <p
                  style="font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; margin: 0; margin-bottom: 16px;font-size: 14px;">
                  Now, go ahead, break the rack, and have a blast on the virtual felt!
                 
                </p>
                <p
                  style="font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; margin: 0; margin-bottom: 16px;font-size: 13px;color:rgba(6, 5, 2, 1)">
                  &copy; 2023 Cue Ball. All right reserved
                </p>
                <p align="center"
                  style="font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; margin-bottom: 16px; cursor: default;">
                  <a href=${socialLinks.instagram_url}
                    style="font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; color: #263238; text-decoration: none;"><img
                      src=${socialLinks.instagram_image_url} width="17"
                      alt="Facebook"
                      style="max-width: 100%; vertical-align: middle; line-height: 100%; border: 0; margin-right: 12px;"></a>
        
                  <a href=${socialLinks.facebook_url}
                    style="font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; color: #263238; text-decoration: none;"><img
                      src=${socialLinks.facebook_image_url}  width="17"
                      alt="Twitter"
                      style="max-width: 100%; vertical-align: middle; line-height: 100%; border: 0; margin-right: 12px;"></a>
        
                  <a href=${socialLinks.linkedin_url}
                    style="font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; color: #263238; text-decoration: none;"><img
                      src=${socialLinks.linkedin_image_url} width="17"
                      alt="Instagram"
                      style="max-width: 100%; vertical-align: middle; line-height: 100%; border: 0; margin-right: 12px;"></a>
                  <a href=${socialLinks.twitter_url}
                    style="font-family: 'Rubik', sans-serif; mso-line-height-rule: exactly; color: #263238; text-decoration: none;"><img
                      src=${socialLinks.twitter_image_url} width="17"
                      alt="Instagram"
                      style="max-width: 100%; vertical-align: middle; line-height: 100%; border: 0; margin-right: 12px;"></a>
                </p>
              </div>
            </div>
          </div>
        </body>
        
        </html>
        
        `,
  };

  // send email message
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log(`Email sent: ${info.response}`);
    }
  });

}
module.exports = WelcomeEmail;