import discord
from discord import app_commands
import os
from dotenv import load_dotenv

# Charge les variables d'environnement depuis le fichier .env
load_dotenv()

TOKEN = os.getenv("DISCORD_TOKEN")

class MyClient(discord.Client):
    def __init__(self):
        intents = discord.Intents.default()
        super().__init__(intents=intents)
        self.tree = app_commands.CommandTree(self)

    async def setup_hook(self):
        await self.tree.sync()  # sync global des slash commands
        print("Slash commands synchronisées")

client = MyClient()

@client.tree.command(name="hello", description="Dit hello world")
async def hello(interaction: discord.Interaction):
    await interaction.response.send_message("hello world")

client.run(TOKEN)
