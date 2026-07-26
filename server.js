const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const puppeteer = require('puppeteer');
const app = express();
app.use(express.json());

// const client = new Client({
//     authStrategy: new LocalAuth(),
//     puppeteer: { headless: true }
// });

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    executablePath: puppeteer.executablePath(),
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// QR code event
client.on('qr', qr => {
    console.log('Scan this QR code with WhatsApp:');
    qrcode.generate(qr, { small: true });
});

isClientReady = false;
// Authentication events
client.on('authenticated', () => console.log('✅ WhatsApp authenticated successfully.'));
client.on('auth_failure', msg => console.error('❌ WhatsApp authentication failure:', msg));

// Ready event
client.on('ready', () => { isClientReady = true; console.log('🚀 WhatsApp client is ready!') });

// Disconnection event
client.on('disconnected', reason => console.warn('⚠️ WhatsApp client disconnected:', reason));

// Message events for debugging
client.on('message', msg => {
    console.log('📩 Incoming message:', {
        id: msg.id._serialized,
        from: msg.from,
        to: msg.to,
        body: msg.body
    });
});

client.on('message_ack', (msg, ack) => {
    console.log('📊 Message ACK:', {
        ack,
        ackName: getAckName(ack),
        id: msg?.id?._serialized,
        from: msg?.from,
        to: msg?.to,
        body: msg?.body,
        sendFailure: msg?._data?.isSendFailure
    });
});

function getAckName(ack) {
    const statuses = {
        '-1': 'ERROR',
        '0': 'PENDING',
        '1': 'SERVER_ACK',
        '2': 'DELIVERY_ACK',
        '3': 'READ',
        '4': 'PLAYED'
    };
    return statuses[String(ack)] || 'UNKNOWN';
}

client.initialize();

// Health check
app.get('/', (req, res) =>  {    
    const msg = `Server is running ${this.isClientReady ? '✅' : '❌'} and WhatsApp client is ${isClientReady ? 'ready' : 'not ready'}.`;
    res.send(msg);
});

app.get('/', (req, res) => {
    const msg = `Server is running ✅ and WhatsApp client is ${isClientReady ? 'ready' : 'not ready'}.`;
    res.send(msg);
});



app.post('/send-message-test', async (req, res) => {
    const { phone, message } = req.body;

    if (!phone || !message) {
        return res.status(400).json({ error: 'Phone and message required' });
    }

    try {

        const numberDetails =  `${phone}@c.us`; //await client.getNumberId(phone);

        if (!numberDetails) {
            return res.status(404).json({ error: 'Number not registered on WhatsApp' });
        }

        if (!numberDetails._serialized.endsWith('@c.us')) {
            return res.status(400).json({ error: `Cannot send to ${numberDetails._serialized}` });
        }

        const response = await client.sendMessage(numberDetails._serialized, message);
        console.log('📤 Full send response:', response);

        res.json({
            success: true,
            numberDetails: numberDetails._serialized,
            messageId: response?.id?._serialized || null,
            rawResponse: response
        });
    } catch (err) {
        console.error('❌ Send error:', err);
        res.status(500).json({ error: err.message });
    }
});


// Send message endpoint
app.post('/send-message', async (req, res) => {
    const { phone, message } = req.body;

    console.log('➡️ API Request:', { phone, message });

    if (!phone || !message) {
        console.error('❌ Missing phone or message');
        return res.status(400).json({ error: 'Phone and message required' });
    }

    try {
        console.log('🔍 Checking WhatsApp registration for:', phone);
        const numberDetails = `${phone}@c.us`;
        console.log('📋 Number details:', numberDetails);

        if (!numberDetails) {
            console.error('❌ Number not registered on WhatsApp');
            return res.status(404).json({ error: 'Number not registered on WhatsApp' });
        }

        if (!numberDetails.endsWith('@c.us')) {
            console.error('❌ Invalid target:', numberDetails._serialized);
            return res.status(400).json({ error: `Cannot send to ${numberDetails._serialized}` });
        }
 
        const response = await client.sendMessage(numberDetails, message);
        console.log('📤 Full send response:', response);


 // Wait for ACK event for this message
        const ackResult = await new Promise((resolve) => {
            const handler = (msg, ack) => {
                console.log('======================================');
               console.log('message_ack event received:', msg);
               console.log('message_ack event received:', ack);
               console.log('======================================');
                    client.off('message_ack', handler); // remove listener after match
                    resolve({
                        ack,
                        ackName: getAckName(ack),
                        id: msg.id._serialized,
                        from: msg.from,
                        to: msg.to,
                        body: msg.body,
                        sendFailure: msg?._data?.isSendFailure
                    });
                
            };
            client.on('message_ack', handler);
        });

        res.json({
            success: true,
            ackResult
        });

        // res.json({
        //     success: true,
        //     numberDetails,
        //     messageId: response?.id?._serialized || null,
        //     rawResponse: response
        // });
    } catch (err) {
        console.error('❌ Send error:', err);
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Server running on port ${PORT}`));