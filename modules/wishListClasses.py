from modules.controlFunctions import *

class wishListViewManager():
	@catchAPIException
	def mainLoop(self):
		wishlister = getInput("Who's wishlist would you like to see? ").strip().capitalize()
		self.displayWishList(wishlister)

	def displayWishList(self, wishlister):
		response = queryServer("/viewWishList", {"wishlister":wishlister})
		if response.status_code == 404:
			print("Sorry, that person is not in this group.")
		else:
			print(response.text)
			if response.status_code == 201:
				addManager(wishListManager(wishlister))

class wishListManager():
	def __init__(self, name):
		self.name = name

	@catchAPIException
	def mainLoop(self):
		changeItem = getInput("Would you like to add or delete an item from your wishlist? [Add/Delete] ").strip().lower()
		if changeItem == "add":
			self.addToWishList()
		elif changeItem == "delete":
			self.deleteFromWishList()
		else:
			print("That is not a valid command.")
		self.displayWishList()

	def displayWishList(self):
		print(queryServer("/viewWishList", {"wishlister":self.name}).text)

	@catchAPIException
	def addToWishList(self):
		newItem = getInput("What is the name of the item you would like to add? ").strip().capitalize()
		itemLink = input("If you would like to add a link, please enter it now: ").strip()
		while itemLink != "" and not(validateURL(itemLink)):
			print("Sorry, that is not a valid URL. (Type in the entire name, including the 'https://...'")
			itemLink = input("If you would like to add a link, please enter it now: [Enter to skip] ").strip()
		if itemLink == "":
			itemLink = None
		response = queryServer("/addWishList", {"item": newItem, "link": itemLink})
		if response.status_code == 403:
			print("Sorry, that item is already on your list.")
		else:
			print("Your wishlist has been updated.")

	@catchAPIException
	def deleteFromWishList(self):
		deleteItem = getInput("What is the name of the item you would like to remove? ").strip().capitalize()
		response = queryServer("/removeWishList", {"item": deleteItem})
		if response.status_code == 404:
			print("Sorry, that item is not on your list.")
		else:
			print("Your wishlist has been updated.")
