import {AzureChatOpenAI} from "@langchain/openai"
import express, {json} from "express"
import cors from "cors"
import {AIMessage, HumanMessage, SystemMessage} from "@langchain/core/messages"
import fetch from "node-fetch"
import serverless from "serverless-http"

const app = express()

app.use(cors({
    origin: "https://wardvanassche.github.io/bitbot/", // ✅ your Vite frontend runs here on Github pages
    methods: ['GET', 'POST'],
    credentials: true
}));

app.use(express.json())
app.use(express.urlencoded({extended: true}))

const model = new AzureChatOpenAI({
    temperature: 0.8,
})

app.post("/", async (req, res) => {
    try {
        let prompt = req.body.prompt
        let history = req.body.history

        console.log("Received prompt:", prompt)
        console.log("Received history:", history)


        // Fetch coinwatch api
        const fetchCoinWatchData = async () => {
            const COINWATCH_API_KEY = process.env.COINWATCH_API_KEY;

            const response = await fetch('https://api.livecoinwatch.com/coins/list', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': COINWATCH_API_KEY
                },
                body: JSON.stringify({
                    codes: ['BTC', 'ETH'],
                    currency: 'USD',
                    meta: true
                })
            });

            return await response.json();
        };

        const coinWatchData = await fetchCoinWatchData();
        console.log(coinWatchData);


        // Add date and time
        const date = new Date()


        // Empty array messages for history
        let messages = [
            new SystemMessage(`You are a Bitcoin and Ethereum expert and assistant. Use this live Bitcoin data to answer the users prompts: ${JSON.stringify(coinWatchData)}. Today's date and time is ${date}. Please use markdown for styling.`)
        ]

        for (const {human, ai} of history) {
            messages.push(new HumanMessage(human))
            messages.push(new AIMessage(ai))
        }

        messages.push(new HumanMessage(prompt))

        const stream = await model.stream(messages)
        res.setHeader("Content-Type", "text/plain")
        for await (const chunk of stream) {
            console.log(chunk.content)
            res.write(chunk.content)
        }
        res.end()

    } catch (error) {
        console.error("Error processing request:", error)
        res.status(500).send(`Internal Server Error: ${error.message}`)
    }
})

// export default serverless(app)
app.listen(3000, () => {    
    console.log("Server is running on port 3000")
}
)