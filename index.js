const fs = require('fs');
const express = require('express');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const cron = require('node-cron');
const axios = require('axios');

const app = express();
const PORT = 3000;

const credentials = require('./credentials.json');
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const TOKEN_PATH = 'token.json';

const oauth2Client = new OAuth2Client(
    credentials.installed.client_id,
    credentials.installed.client_secret,
    credentials.installed.redirect_uris,
);
app.get("/",(req,res)=>{
  res.send("Hello, you are welcome!");
})
app.get('/auth', (req, res) => {
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'online',
        scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    });
    res.redirect(authUrl);
});

app.get('/auth/callback', async (req, res) => {
    const { code } = req.query;
    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Store the refresh token in a text file
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));

        res.send('Authentication successful! You can now use the stored refresh token.');
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).send(`Error decoding token: ${error.message}`);
    }
});

cron.schedule('15 23 * * *', () => {
  console.log('Running scheduled task at 6 am...');
  fetchData();
});
const endpointUrl="http://localhost:3000/get-gmail-data"
async function fetchData() {
  try {
      const response = await axios.get(endpointUrl);
      console.log('Response from the endpoint:', response.data);
  } catch (error) {
      console.error('Error calling the endpoint:', error.message);
  }
}


app.get('/get-gmail-data', async (req, res) => {
  if (useStoredRefreshToken()) {
      try {
          const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
          const messages = await gmail.users.messages.list({
              userId: 'me',
              maxResults: 5,
          });

          const threadPromises = messages.data.messages.map(async (message) => {
              const messageDetails = await gmail.users.messages.get({
                  userId: 'me',
                  id: message.id,
              });

              // Extracting the body of the first part of the message
              const messageBody = messageDetails.data.payload.parts && messageDetails.data.payload.parts[0]
                  ? Buffer.from(messageDetails.data.payload.parts[0].body.data, 'base64').toString('utf-8')
                  : null;

              return {
                  messageId: messageDetails.data.id,
                  messageBody,
              };
          });

          const threadMessages = await Promise.all(threadPromises);

          // Filter messages with bodies
          const messagesWithBodies = threadMessages.filter(message => message.messageBody !== null);

          res.json(messagesWithBodies);
      } catch (error) {
          console.error('Error getting Gmail messages:', error.message);
          res.status(500).send(`Error getting Gmail messages: ${error.message}`);
      }
  } else {
      res.status(401).send('Stored refresh token not found. Please authenticate first.');
  }
});


// Function to check if a refresh token is available and use it
function useStoredRefreshToken() {
    try {
        // Check if the token file exists
        if (fs.existsSync(TOKEN_PATH)) {
            const storedTokens = JSON.parse(fs.readFileSync(TOKEN_PATH));
            oauth2Client.setCredentials(storedTokens);
            return true;
        } else {
            console.log('Stored refresh token not found.');
            return false;
        }
    } catch (err) {
        console.error('Error reading stored refresh token:', err.message);
        return false;
    }
}

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
