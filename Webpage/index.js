'use strict';

const express = require('express')
const app = express()
const port = 8080

const crypto = require('crypto')
const salt = "REDACTED"

const chance = require('chance').Chance()

const moment = require('moment')

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

function findNameByToken(token) {
	var tokensFile = refreshFile(tokensFileName)
	for (var user in tokensFile) {
		if (tokensFile[user] == token) {
			return user
		}
	}
	return undefined
}

function findNameByAlias(alias, chatList) {
	for (var chatter in chatList) {
		if (chatList[chatter].sender == alias) {
			return chatter
		}
	}
	return undefined
}

function generateAlias(group) {
	var alias = chance.animal().toLowerCase()
	alias = alias.charAt(0).toUpperCase() + alias.slice(1)
	while (group.aliases.includes(alias)){
		alias = chance.animal().toLowerCase()
		alias = alias.charAt(0).toUpperCase() + alias.slice(1)
	}
	group.aliases.push(alias)
	return alias
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
	groupBody.aliases = []
	groupsFile[req.body.groupName] = groupBody
	fs.writeFile(groupsFileName, JSON.stringify(groupsFile, null, 2), defaultCallback)
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
			fs.writeFile(tokensFileName, JSON.stringify(tokensFile, null, 2), defaultCallback)
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
	memberBody.sentChats = {}
	memberBody.receivedChats = {}
	memberBody.wishlist = {}
	groupsFile[req.body.group].members[req.body.user] = memberBody
	fs.writeFile(groupsFileName, JSON.stringify(groupsFile, null, 2), defaultCallback)

	var token = crypto.randomBytes(16).toString('hex')
	tokensFile[req.body.user] = token
	fs.writeFile(tokensFileName, JSON.stringify(tokensFile, null, 2), defaultCallback)
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
		var member = findNameByToken(req.body.token)
		responseMsg += `You are giving a gift to ${groupsFile[groupName].members[member].giftGivee}!\n`

		var eventDate = moment(groupsFile[groupName].eventDate).utcOffset(0)
		eventDate.set({hour:0,minute:0,second:0,millisecond:0})
		var currentDate = moment().utcOffset(0)
		currentDate.set({hour:0,minute:0,second:0,millisecond:0})
		var daysTilEvent = eventDate.diff(currentDate, "days")

		if (daysTilEvent == 0) {
			responseMsg += "Your exchange takes place today!"
		} else if (daysTilEvent > 0) {
			responseMsg += `Your exchange takes place in ${daysTilEvent} days.`
		} else {
			responseMsg += `Your exchange took place ${-1 * daysTilEvent} days ago.\n`
			responseMsg += `This group will be deleted in ${10 + daysTilEvent} days.`
		}
	}
	res.send(responseMsg)
})

app.post('/draw', (req, res) => {
	var groupsFile = refreshFile(groupsFileName)
	var groupName = req.body.group

	drawNames(groupsFile, groupName)
	groupsFile[groupName].drawnNames = true
	fs.writeFile(groupsFileName, JSON.stringify(groupsFile, null, 2), defaultCallback)

	res.sendStatus(200)
})

app.post('/chats', (req, res) => {
	var groupsFile = refreshFile(groupsFileName)
	var user = groupsFile[req.body.group].members[findNameByToken(req.body.token)]

	var response = "Sent Chats:\n"
	for (var chat in user.sentChats) {
		response += chat + "\n"
	}
	response += "Received Chats:\n"
	for (var chat in user.receivedChats) {
		response += user.receivedChats[chat].sender + "\n"
	}

	res.send(response)
})

app.post('/viewChat', (req, res) => {
	var groupsFile = refreshFile(groupsFileName)
	var user = groupsFile[req.body.group].members[findNameByToken(req.body.token)]

	var chat
	if (req.body.type == "sent") {
		chat = user.sentChats[req.body.chatee]
	} else if (req.body.type == "received") {
		chat = user.receivedChats[findNameByAlias(req.body.chatee, user.receivedChats)]
	}

	var response = "Chats:\n"
	while (chat.next != undefined) {
		response += (chat.sender + ": " + chat.message + "\n")
		chat = chat.next
	}
	response += (chat.sender + ": " + chat.message)

	res.send(response)
})

app.post('/sendChat', (req, res) => {
	var groupsFile = refreshFile(groupsFileName)
	var user = groupsFile[req.body.group].members[findNameByToken(req.body.token)]
	
	if (req.body.create == false) {
		var chat, otherChat, userAlias
		if (req.body.type == "sent") {
			var partnerName = req.body.chatee
			chat = user.sentChats[partnerName]
			otherChat = groupsFile[req.body.group].members[partnerName].receivedChats[findNameByToken(req.body.token)]
			userAlias = otherChat.sender
		} else if (req.body.type == "received") {
			var partnerName = findNameByAlias(req.body.chatee, user.receivedChats)
			chat = user.receivedChats[partnerName]
			otherChat = groupsFile[req.body.group].members[partnerName].sentChats[findNameByToken(req.body.token)]
			userAlias = findNameByToken(req.body.token)
		}
		
		while (chat.next != undefined) {
			chat = chat.next
		}
		chat.next = {"sender": findNameByToken(req.body.token), "message": req.body.message}

		while (otherChat.next != undefined) {
			otherChat = otherChat.next
		}
		otherChat.next = {"sender": userAlias, "message": req.body.message}
	} else {
		var partnerName = req.body.chatee
		user.sentChats[partnerName] = {"sender": findNameByToken(req.body.token), "message": req.body.message}
		groupsFile[req.body.group].members[partnerName].receivedChats[findNameByToken(req.body.token)] = {"sender": generateAlias(groupsFile[req.body.group]), "message": req.body.message}
	}

	fs.writeFile(groupsFileName, JSON.stringify(groupsFile, null, 2), defaultCallback)
	res.sendStatus(200)
	
})

app.post('/viewWishList', (req, res) => {
	var groupsFile = refreshFile(groupsFileName)
	var wishListOwner = groupsFile[req.body.group].members[req.body.wishlister]
	if (wishListOwner != undefined) {
		var response
		if (req.body.wishlister == findNameByToken(req.body.token)) {
			response = `Your Wishlist:\n`
			res.status(201)
		} else {
			response = `${req.body.wishlister}'s Wishlist:\n`
		}
		for (var item in wishListOwner.wishlist) {
			response += item
			if (wishListOwner.wishlist[item] == null) {
				response += " [no link]\n"
			} else {
				response += ": " + wishListOwner.wishlist[item] + "\n"
			}
		}
		res.send(response)
	} else {
		res.sendStatus(404)
	}
})

app.post('/addWishList', (req, res) => {
	var groupsFile = refreshFile(groupsFileName)
	var user = groupsFile[req.body.group].members[findNameByToken(req.body.token)]

	if (user.wishlist.hasOwnProperty(req.body.item)) {
		res.sendStatus(403)
	} else {
		user.wishlist[req.body.item] = req.body.link
		fs.writeFile(groupsFileName, JSON.stringify(groupsFile, null, 2), defaultCallback)
		res.sendStatus(200)
	}
})

app.post('/removeWishList', (req, res) => {
	var groupsFile = refreshFile(groupsFileName)
	var user = groupsFile[req.body.group].members[findNameByToken(req.body.token)]

	if (user.wishlist.hasOwnProperty(req.body.item)) {
		delete user.wishlist[req.body.item]
		fs.writeFile(groupsFileName, JSON.stringify(groupsFile, null, 2), defaultCallback)
		res.sendStatus(200)
	} else {
		res.sendStatus(404)
	}
})

app.listen(port, () => console.log(`Clause CLI started on port ${port}!`))