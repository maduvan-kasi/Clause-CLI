'use strict';

const express = require('express')
const app = express()
const port = 8080

const crypto = require('crypto')
const salt = "0X5VZL67DNF"

const fs = require('fs')
const userDataFileName = "./users.json"
const tokensFileName = "./activeTokens.json"

app.use(express.json())

app.post('/signin', (req, res) => {
	delete require.cache[require.resolve(userDataFileName)]
	var userDataFile = require(userDataFileName)
	const hash = crypto.createHmac('sha256', salt)
	hash.update(req.body["pass"])

	if (userDataFile[req.body["user"]] == hash.digest('hex')) {
		var token = crypto.randomBytes(16).toString('hex')
		var tokenMap = {}
		tokenMap[req.body["user"]] = token
		fs.writeFile(tokensFileName, JSON.stringify(tokenMap), 'utf-8', (err) => {
			if (err) {
				console.log(err)
			}
		});
		res.send(token)
	} else {
		res.sendStatus(403)
	}
})

app.post('/signup', (req, res) => {
	var userData
	fs.readFile(userDataFile, {encoding: 'utf-8'}, (err, data) => {
	    if (!err) {
			userData = JSON.parse(data)
			const hash = crypto.createHmac('sha256', salt)
			hash.update(req.body["pass"])

			userData[req.body["user"]] = hash.digest('hex')
			console.log(JSON.stringify(userData))
			fs.writeFile(userDataFile, JSON.stringify(userData), {encoding: 'utf-8'}, (err) => {
				if (err) {
					console.log(err);
				}
			});

			res.send("User created.");
	    } else {
	        console.log(err);
	        res.send("There was a problem with the server.")
	    }
	});
})

app.post('/home', (req, res) => {
	delete require.cache[require.resolve(tokensFileName)]
	var tokensFile = require(tokensFileName)
	console.log(req.body["token"])
	for (var user in tokensFile){
		console.log(tokensFile[user])
		if (tokensFile[user] == req.body["token"]) {
			res.send(`Welcome ${user}!`)
			return;
		}
	}
	res.sendStatus(403)
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))