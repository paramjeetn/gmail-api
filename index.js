import express from "express";
import {google} from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { PubSub } from "@google-cloud/pubsub";

const app = express();
const port=3000;
app.get('/', (req, res) => {
  res.send('Hello, this is a Gmail API example!');
});

const CLIENT_ID="579714708688-f9t4vp17ea77hm42rfmk0p69s3s70r24.apps.googleusercontent.com";
const CLIENT_SECRET="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";
const REDIRECT_URI="https://gmail-api-eight.vercel.app/auth/callback";
const PROJECT_ID = "projects/test-414603";
const TOPIC_NAME = "projects/test-414603/topics/real-estate";
const SUBSCRIPTION_NAME = "projects/test-414603/topics/real-estate/real-estate-sub";

const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
const pubsub = new PubSub({ projectId: PROJECT_ID });

// Create Pub/Sub topic if it doesn't exist
const topic = pubsub.topic(TOPIC_NAME) || pubsub.createTopic(TOPIC_NAME);


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

    const subscription = topic.subscription(SUBSCRIPTION_NAME) || topic.createSubscription(SUBSCRIPTION_NAME);

    // Retrieve the user's Gmail messages with a maximum of 5 messages
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const messages = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 5,
    });

    // Process individual message details and store in an array
    for (const message of messages.data.messages) {
      const messageDetails = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
      });

      const messageBody = messageDetails.data.payload.parts && messageDetails.data.payload.parts[0]
        ? Buffer.from(messageDetails.data.payload.parts[0].body.data, 'base64').toString('utf-8')
        : 'No body data';

      // Publish message to Pub/Sub topic
      await topic.publish(Buffer.from(JSON.stringify({
        messageId: messageDetails.data.id,
        body: messageBody,
      })));
    }

    res.status(200).send('Messages retrieved successfully!');
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).send(`Error retrieving messages: ${error.message}`);
  }
}); 
    
// Create an endpoint for Pub/Sub to push updates
app.post('/pubsubcallback', express.json(), (req, res) => {
  console.log('Received Pub/Sub message:', req.body);
  // Handle the received Pub/Sub message here
  res.status(200).send('Received Pub/Sub message');
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});