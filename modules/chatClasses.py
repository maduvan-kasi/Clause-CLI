from modules.controlFunctions import *

class chatManager():
	@catchAPIException
	def mainLoop(self):
		response = queryServer("/chats", {})
		print(response.text)

		chats = response.text.split('\n')
		sentChats = chats[1:chats.index("Received Chats:")]
		receivedChats = chats[chats.index("Received Chats:")+1:]

		print("Choose a chat to continue it, or type another name to start a new one.")
		selectChat = getInput("Who would you like to chat with? ").strip().capitalize()

		if (selectChat in sentChats) or (selectChat in receivedChats):
			chatType = "sent" if (selectChat in sentChats) else "received"
			addManager(directChatManager(chatType, selectChat))
		else:
			self.sendChat("send", selectChat, True)

	def sendChat(self, chatType, chatee, new):
		message = input("What would you like to say? ").strip()
		response = queryServer("/sendChat", {"type":chatType, "chatee":chatee, "message":message, "create":new})
		print("Your message has been sent.")

class directChatManager(chatManager):
	@catchAPIException
	def __init__(self, chatType, chatee):
		self.chatType = chatType
		self.chatee = chatee

	def mainLoop(self):
		response = queryServer("/viewChat", {"type":self.chatType, "chatee":self.chatee})
		print(response.text)
		continueChat = ""
		while continueChat != "y" and continueChat != "n":
			continueChat = getInput("Would you like to continue this chat? [Y/N] ").strip().lower()
			if continueChat == "y":
				self.sendChat(self.chatType, self.chatee, False)
			elif continueChat == "n":
				removeManager()