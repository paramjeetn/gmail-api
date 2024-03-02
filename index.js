import express from "express";
import {google} from "googleapis";
import { OAuth2Client } from "google-auth-library";
import {jwtDecode} from 'jwt-decode'
import fs from "fs";



const app = express();
const port=3000;
// These id's and secrets should come from .env file.

const CLIENT_ID="579714708688-f9t4vp17ea77hm42rfmk0p69s3s70r24.apps.googleusercontent.com";
const CLIENT_SECRET="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";
const REDIRECT_URI="https://gmail-api-eight.vercel.app/auth/callback";
const REFRESH_TOKEN="1//04g3FDiRRyOE8CgYIARAAGAQSNwF-L9IrWZRn0ocQldIFrQbkqcTEqewcB-ztpXT7XhcYg94XnKvtkyTUJnnv9BBJVxPr4TmPpm8";

const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

app.get('/', (req, res) => {
  res.send('Hello, this is a Gmail API example!');
});

app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Retrieve the user's Gmail messages with a maximum of 5 messages
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const messages = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 5,
    });

    // Process individual message details and store in an array
    const messageData = [];
    for (const message of messages.data.messages) {
      const messageDetails = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
      });
      const senderEmail = messageDetails.data.payload.headers.find(header => header.name === 'From').value;
      const senderName = senderEmail.split('<')[0].trim();
      const messageId = messageDetails.data.id;
      const messageSnippet = messageDetails.data.snippet;
      const messageBody = messageDetails.data.payload.parts && messageDetails.data.payload.parts[0]
        ? Buffer.from(messageDetails.data.payload.parts[0].body.data, 'base64').toString('utf-8')
        : 'No body data';
      const cleanmessage = messageBody.replace(/[\n\r]/g,"");
      messageData.push({
        senderEmail,
        senderName,
        messageId,
        messageSnippet,
        cleanmessage,
      });
    }

    // Generate HTML dynamically using the processed data
    const htmlTemplate = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Gmail Messages</title>
      </head>
      <body>
        <h1>Your Gmail Messages</h1>
        <ul>
          ${messageData.map(message => `
            <li>
              <b>From:</b> ${message.senderName} &lt;${message.senderEmail}&gt;
              <br>
              <b>ID:</b> ${message.messageId}
              <br>
              <b>Snippet:</b> ${message.messageSnippet}
              <br>
              <b>Body:</b> ${message.cleanmessage}
            </li>
          `).join('')}
        </ul>
      </body>
      </html>
    `;

    // Send the generated HTML as the response
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write(htmlTemplate);
    res.end();
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).send(`Error retrieving messages: ${error.message}`);
  }
});


app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});