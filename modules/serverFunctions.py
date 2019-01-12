import getpass
import requests

SERVER_URL = "http://localhost:8080"
group = ""
token = ""

def sendPostRequest(subdomain, payload):
	payload["group"] = group
	payload["token"] = token
	r = requests.post(SERVER_URL + subdomain, json=payload)
	if r.status_code == 500:
		print("There is a problem with the server. Please try again later.")
		exit()
	else:
		return r

def signIn():
	global token
	while token == "":
		userName = input("Please enter your Name: ").strip().capitalize()
		passWord = getpass.getpass("Please enter your Password: ")
		response = sendPostRequest("/signin", {"user": userName, "pass": passWord})
		if response.status_code == 404:
			print("That person is not in this group.")
			createAccount = input("Would you like register as a new member? [Y/N] ").strip().lower()
			if createAccount == "y":
				signUp(userName)
		elif response.status_code == 403:
			print("Sorry, that password isn't quite right.")
		else:
			token = response.text
			print("You are now signed in!")


def signUp(userName):
	global token
	passWord = getpass.getpass("Please choose a Password: ")
	repeatPassWord = getpass.getpass("Please confirm your Password: ")
	while passWord != repeatPassWord:
		print("Sorry, your passwords don't match.")
		passWord = getpass.getpass("Please choose a Password: ")
		repeatPassWord = getpass.getpass("Please confirm your Password: ")
	response = sendPostRequest("/signup", {"user": userName, "pass": passWord})
	token = response.text
	print("You are now signed in!")