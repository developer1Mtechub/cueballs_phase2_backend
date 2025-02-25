const nodemailer = require('nodemailer');
const imageURL = require('./EmailImage');
const urls = require('./urls');
const { FacebookImageUrl, InstagramImageUrl, TwitterImageUrl, youtubeImageUrl, facebookLink, instagramLink, twitterLink, youtubeLink } = require('./socialIcons');
const fetchSocialLinks = require('./utils/social_links');


const EmailLinkButton = async (email, resetLink, buttonText, subject, password, message) => {
    const socialLinks = await fetchSocialLinks();
    const transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
            user: "testing.mtechub@gmail.com",
            pass: "obzllcsiuvbrksnf",

        },
    });

    const mailOptions = {
        from: "cueballdash@gmail.com",
        to: email,
        subject: subject,
        html: `
        <html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns: o="urn:schemas-microsoft-com:office:office">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title></title> <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
    <style>
        .fa {
            padding: 5px;
            font-size: 20px;
            width: 20px;
            text-align: center;
            text-decoration: none;
            margin: 5px 2px;
            color:white
        }
        table,
        td,
        div,
        h1,
        p {
            font-family: Arial, sans-serif;
        }

        @media screen and (max-width: 530px) {
            .unsub {
                display: block;
                padding: 8px;
                margin-top: 14px;
                border-radius: 6px;
                background-color: #555555;
                text-decoration: none !important;
                font-weight: bold;
            }

            .col-lge {
                max-width: 100% !important;
            }
        }

        @media screen and (min-width: 531px) {
            .col-sml {
                max-width: 27% !important;
            }

            .col-lge {
                max-width: 73% !important;
            }
        }
    </style>
</head>

<body style="margin:0;padding:0;word-spacing:normal;background-color:#e9e9eb;text-align:center">
    <div role="article" aria-roledescription="email" lang="en"
        style="text-size-adjust:100%;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;background-color:#e9e9eb;padding: 10%;padding-top: 30px;">
        <table role="presentation" style="width:100%;border:none;border-spacing:0;">
            <tr>
                <td align="center" style="padding:0;">

                    <table role="presentation"
                        style="width:94%;max-width:600px;border:none;border-spacing:0;text-align:left;font-family:Arial,sans-serif;font-size:16px;line-height:22px;color:#363636;">
                       
                        <tr>
                            <td style="padding:30px;background-color:#ffffff;text-align:center">
                                <a href=${urls.login_url} style="text-decoration:none;margin-bottom:1%;"><img src=${imageURL} width="165"
                                    alt="Logo"
                                    style="width:165px;max-width:80%;height:auto;border:none;text-decoration:none;color:#ffffff;"></a>
                                <h1
                                    style="text-align:center;margin-top:0;margin-bottom:16px;font-size:26px;line-height:32px;font-weight:bold;letter-spacing:-0.02em;">
                                    ${subject}
                                </h1>
                                <p style="margin:10;text-align:center;">
                                    <b>Hy !</b>
                                </p>
                                <p style="margin:10px;margin-bottom:0px;text-align: center;">
                                    ${message}</p>
                            </td>
                        </tr>
                        <tr>
                            <td align="center" style="padding:30px;background-color:#ffffff;padding-top: 0;">
                                <table border="0" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td
                                            style="border-radius: 4px; background-color: #007aff; color:white;padding:20px;border-radius: 10px;">
                                            <a href=${resetLink} target="_blank"
                                                style="text-decoration: none;color:white;">
                                                ${buttonText}
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <tr>
                            <td
                                style="padding:30px;text-align:center;font-size:12px;background-color:#007aff;color:#ffffff;">
                                <p style="margin:0;font-size:14px;line-height:20px;">&reg;This email was sent by Zipto
                                    . &copy; 2023 All rights reserved.<br></p>
                                    <a href=${facebookLink} style="text-decoration:none;margin-bottom:1%;margin-top: 1%;">
                                    <img
                                    src=${socialLinks.facebook_image_url} width="24" alt="Logo"
                                    style="width:24px;max-width:80%;height:auto;border:none;text-decoration:none;color:#ffffff;"></a>
                                    <a href=${instagramLink} style="text-decoration:none;margin-bottom:1%;"><img
                                        src=${InstagramImageUrl} width="24" alt="Logo"
                                        style="width:24px;max-width:80%;height:auto;border:none;text-decoration:none;color:#ffffff;"></a>
                                        <a href=${twitterLink} style="text-decoration:none;margin-bottom:1%;"><img
                                            src=${TwitterImageUrl} width="24" alt="Logo"
                                            style="width:24px;max-width:80%;height:auto;border:none;text-decoration:none;color:#ffffff;"></a>
                                        
                                                <a href=${youtubeLink} style="text-decoration:none;margin-bottom:1%;"><img
                                                    src=${youtubeImageUrl} width="24" alt="Logo"
                                                    style="width:24px;max-width:80%;height:auto;border:none;text-decoration:none;color:#ffffff;"></a>
                            </td>
                        </tr>
                    </table>

                </td>
            </tr>
        </table>
    </div>
</body>

</html>`,
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
module.exports = EmailLinkButton;