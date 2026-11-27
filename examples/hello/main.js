import { createGame } from "@reforge/engine";
import "@reforge/engine/style.css";

const response = await fetch("./game.json");
const game = createGame(await response.json(), document.getElementById("game"), {
  assetBase: "./",
});
game.on("error", (e) => (document.title = `Error: ${e.message}`));
game.start();
