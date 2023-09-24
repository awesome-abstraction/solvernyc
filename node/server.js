const express = require("express");
const axios = require("axios");
const OpenAI = require("openai");
const dotenv = require("dotenv");
const { ethers, getDefaultProvider } = require("ethers");
const { Web3 } = require("web3");
const web3 = new Web3(process.env.INFURA);
const execute = require('./ax-chain/scripts/cross-chain.js')
const send_token = require('./send-token.js')
dotenv.config();

const app = express();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const contractABI = [
    {
        'constant': false,
        'inputs': [
            {
                'name': '_to',
                'type': 'address'
            },
            {
                'name': '_value',
                'type': 'uint256'
            }
        ],
        'name': 'transfer',
        'outputs': [
            {
                'name': '',
                'type': 'bool'
            }
        ],
    }
]

app.get("/nodesolver", async (req, res) => {
    console.log("In solver");

    const prompt = req.query.prompt;
    const systemPrompt = "You are a helpful assistant that assists the user to execute crypto transactions."

    const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
            {
                "role": "system",
                "content": systemPrompt
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        functions: [
            {
                "name": "send_token",
                "description": "Send a given amount of a token to a given address",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "token": {
                            "type": "string",
                            "enum": ["USDC", "ETH"]
                        },
                        "amount": {
                            "type": "integer",
                            "description": "The amount of the token being sent, e.g. 2.05"
                        },
                        "address": {
                            "type": "string",
                            "description": "The address that the tokens are being sent to, e.g. "
                        }
                    },
                    "required": ["token, amount, address"]
                }
            },
            {
                "name": "cross_chain_transfer",
                "description": "Send USDC from Goerli Ethereum to Polygon.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "fromChain":{
                            "type": "string",
                            "enum": ["Ethereum"]
                        },
                        "toChain":{
                            "type": "string",
                            "enum": ["Polygon"]
                        },
                        "tokenSymbol": {
                            "type": "string",
                            "enum": ["USDC"]
                        },
                        "amount": {
                            "type": "string",
                            "description": "The amount of the token being sent across L1/L2s, e.g. 1"
                        },
                        "recipient": {
                            "type": "string",
                            "description": "The address that the tokens are being sent to, e.g. 0x..."
                        }
                    },
                    "required": ["fromChain, toChain, tokenSymbol, amount, recipient"]
                }
            },
        ],
        function_call: "auto",
    });

    const function_call = response.choices[0].message.function_call;

    if(function_call) {
        if(function_call.name === "send_token") {
            const params = JSON.parse(function_call.arguments);
            console.log(params);

            const output = await send_token(params.token, params.amount, params.address);
            console.log(output);
        }
        if(function_call.name === "cross_chain_transfer") {
            const params = JSON.parse(function_call.arguments);
            const output = await execute(params.toChain, params.amount, recipients, params.tokenSymbol);
            console.log(output);
        }
    }

    return JSON.stringify(response);
})

app.listen(3000);