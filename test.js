import nodemailer from "nodemailer";
import {google} from "googleapis";

// These id's and secrets should come from .env file.

const CLIENT_ID="579714708688-l12dt38r72e4u8c2f6g2eqalcjsmnmkg.apps.googleusercontent.com";
const CLIENT_SECRET="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";
const REDIRECT_URI="https://developers.google.com/oauthplayground";
const REFRESH_TOKEN="1//04g3FDiRRyOE8CgYIARAAGAQSNwF-L9IrWZRn0ocQldIFrQbkqcTEqewcB-ztpXT7XhcYg94XnKvtkyTUJnnv9BBJVxPr4TmPpm8";


const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

async function sendMail() {
  try {
    const accessToken = await oAuth2Client.getAccessToken();

    const transport = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: 'paramjeetnpradhan@gmail.com',
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        refreshToken: REFRESH_TOKEN,
        accessToken: accessToken,
      },
    });

    const mailOptions = {
      from: 'Paramjeet Pradhan <paramjeetnpradhan@gmail.com>',
      to: 'paramjeetxpradhan@gmail.com',
      subject: 'Hello from gmail using API',
      text: 'Hello from gmail email using API',
      html: '<h1>Hello from gmail email using API</h1>',
    };

    const result = await transport.sendMail(mailOptions);
    return result;
  } catch (error) {
    return error;
  }
}

sendMail()
  .then((result) => console.log('Email sent...', result))
  .catch((error) => console.log(error.message));