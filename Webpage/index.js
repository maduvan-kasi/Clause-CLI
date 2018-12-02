'use strict';

const express = require('express')
const app = express()
const port = 8080

const crypto = require('crypto')
const salt = "REDACTED"

const fs = require('fs')
const groupsFileName = "./groups.json"
const tokensFileName = "./activeTokens.json"

function defaultCallback(err) {
	if(err) {
		console.log(err)
	}
}

function refreshFile(fileName) {
	delete require.cache[require.resolve(fileName)]
	return require(fileName)
}

function findName(token) {
	var tokensFile = refreshFile(tokensFileName)
	for (var user in tokensFile) {
		if (tokensFile[user] == token) {
			return user
		}
	}
	return undefined
}

function drawNames(groupsObject, groupName) {
	var memberPool = []
	for (var member in groupsObject[groupName].members) {
		memberPool.push(member)
	}

	for (var member in groupsObject[groupName].members) {
		var givee = memberPool.splice(Math.random() * memberPool.length, 1)[0]
		while (givee == member && memberPool.length > 1) {
			memberPool.push(givee)
			givee = memberPool.splice(Math.random() * memberPool.length, 1)[0]
		}
		if (givee == member) {
			drawNames(groupsObject, groupName)
			return
		} else {
			groupsObject[groupName].members[member].giftGivee = givee
		}
	}
}

app.use(express.json())

app.post('/findgroup', (req, res) => {
	var groupsFile = refreshFile(groupsFileName)
	for (var groupName in groupsFile){
		if (groupName == req.body.groupName) {
			res.sendStatus(200)
			return
		}
	}
	res.sendStatus(403)
})

app.post('/creategroup', (req, res) => {
	var groupsFile = refreshFile(groupsFileName)
	for (var groupName in groupsFile){
		if (groupName == req.body.groupName) {
			res.sendStatus(403)
			return
		}
	}
	var groupBody = {}
	groupBody.members = {}
	groupBody.drawnNames = false
	groupBody.eventDate = req.body.date
	groupsFile[req.body.groupName] = groupBody
	fs.writeFile(groupsFileName, JSON.stringify(groupsFile), defaultCallback)
	res.sendStatus(200)
})

app.post('/signin', (req, res) => {
	var groupsFile = refreshFile(groupsFileName)
	var tokensFile = refreshFile(tokensFileName)

	if (groupsFile[req.body.group].members[req.body.user] == undefined){
		res.sendStatus(404)
	} else {
		const hash = crypto.createHmac('sha256', salt)
		hash.update(req.body.pass)

		if (groupsFile[req.body.group].members[req.body.user].key == hash.digest('hex')){
			var token = crypto.randomBytes(16).toString('hex')
			tokensFile[req.body.user] = token
			fs.writeFile(tokensFileName, JSON.stringify(tokensFile), defaultCallback)
			res.send(token)
		} else {
			res.sendStatus(403)
		}
	}
})

app.post('/signup', (req, res) => {
	var groupsFile = refreshFile(groupsFileName)
	var tokensFile = refreshFile(tokensFileName)

	const hash = crypto.createHmac('sha256', salt)
	hash.update(req.body.pass)

	var memberBody = {}
	memberBody.key = hash.digest('hex')
	memberBody.questions = {}
	memberBody.wishlist = {}
	groupsFile[req.body.group].members[req.body.user] = memberBody
	fs.writeFile(groupsFileName, JSON.stringify(groupsFile), defaultCallback)

	var token = crypto.randomBytes(16).toString('hex')
	tokensFile[req.body.user] = token
	fs.writeFile(tokensFileName, JSON.stringify(tokensFile), defaultCallback)
	res.send(token)
})

app.post('/home', (req, res) => {
	var groupsFile = refreshFile(groupsFileName)
	var groupName = req.body.group
	var responseMsg = "Here is your group:\n"
	for (var member in groupsFile[groupName].members) {
		responseMsg += member + "\n"
	}
	if (groupsFile[groupName].drawnNames == false) {
		responseMsg += "Your group hasn't drawn names yet."
		res.status(201)
	} else {
		var member = findName(req.body.token)
		responseMsg += `You are giving a gift to ${groupsFile[groupName].members[member].giftGivee}!`
	}
	res.send(responseMsg)
})

app.post('/draw', (req, res) => {
	var groupsFile = refreshFile(groupsFileName)
	var groupName = req.body.group

	drawNames(groupsFile, groupName)
	groupsFile[groupName].drawnNames = true
	fs.writeFile(groupsFileName, JSON.stringify(groupsFile), defaultCallback)

	res.sendStatus(200)
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))