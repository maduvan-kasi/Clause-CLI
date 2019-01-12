import requests

import modules.serverFunctions as serverFunctions

managerStack = []

def addManager(manager):
	managerStack.append(manager)

def removeManager():
	managerStack.pop()

def getInput(prompt):
	userInput = input(prompt)
	if userInput == "exit":
		if len(managerStack) > 1:
			removeManager()
			raise IOError("User exited")
		else:
			exitProgram()
	else:
		return userInput

def queryServer(subdomain, payload):
	return serverFunctions.sendPostRequest(subdomain, payload)

def validateURL(url):
	try:
		response = requests.get(url)
		if response.status_code == 200:
			return True
	except:
		return False

def catchAPIException(func):
	def wrapper(*args, **kwargs):
		try:
			return func(*args, **kwargs)
		except IOError as e:
			pass
	return wrapper

def exitProgram():
	print("Thanks for using Clause CLI!")
	exit()