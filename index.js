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
const REDIRECT_URI="http://localhost:3000/auth/callback";
const REFRESH_TOKEN="1//04g3FDiRRyOE8CgYIARAAGAQSNwF-L9IrWZRn0ocQldIFrQbkqcTEqewcB-ztpXT7XhcYg94XnKvtkyTUJnnv9BBJVxPr4TmPpm8";

const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

app.get('/', (req, res) => {
  res.send('Hello, this is a Gmail API example!');
});

app.get('/auth', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.readonly'],
  });
  res.redirect(authUrl);
});

app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Decode the JWT token to get the user ID
    // const decodedToken = jwtDecode(tokens.id_token);
    // const userId = decodedToken.email;

    // console.log('User ID:', userId);

    // Retrieve the user's Gmail messages with a maximum of 5 messages
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const messages = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 5,
    });

    // Log individual message details and save to a JSON file
    const data = messages.data.messages.map(async (message) => {
      const messageDetails = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
      });
      const senderEmail = messageDetails.data.payload.headers.find(header => header.name === 'From').value;
      const senderName = senderEmail.split('<')[0].trim(); // Extract sender name from 'From' field
      const messageId = messageDetails.data.id;
      const messageSnippet = messageDetails.data.snippet;
      const messageBody = messageDetails.data.payload.parts && messageDetails.data.payload.parts[0]
      ? Buffer.from(messageDetails.data.payload.parts[0].body.data, 'base64').toString('utf-8')
      : 'No body data';  
      return {
        senderEmail,
        senderName,
        messageId,
        messageSnippet,
        messageBody,
      };
    });
  
    const jsonData = await Promise.all(data);
    const jsonFileName = 'gmail_messages.json';

    // Save the data to a JSON file
    fs.writeFileSync(jsonFileName, JSON.stringify(jsonData, null, 2));

    console.log('Data saved to:', jsonFileName);

    res.download(jsonFileName, (err) => {
      if (err) {
        console.error('Error sending JSON file:', err.message);
        res.status(500).send(`Error sending JSON file: ${err.message}`);
      } else {
        console.log('JSON file sent successfully');
        // Remove the JSON file after sending
        fs.unlinkSync(jsonFileName);
        res.redirect("/")
      }
    })
    
    
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).send(`Error decoding token: ${error.message}`);
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});