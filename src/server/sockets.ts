/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { deserialize, serialize } from "class-transformer";
import { Server, Socket } from "socket.io";
import { v4 as uuidV4 } from "uuid";
import Game, { GameStatus } from "../shared/chess/game";
import Move from "../shared/chess/move";
import Person, { PersonRole } from "../shared/chess/person";
import { OPPOSITE_SIDE } from "../shared/constants";
import {
  ERROR_EVENT,
  GAME_STATUS_CHANGED_EVENT,
  GAME_UPDATE_EVENT,
  JoinGameData,
  JOIN_GAME_EVENT,
  MAKE_MOVE_EVENT,
  READY_EVENT,
  USER_ID_EVENT,
  CREATE_GAME_EVENT,
  GAME_EXPIRED_EVENT,
  SEND_MESSAGE_EVENT,
  MESSAGE_EVENT,
  MessageData,
} from "../shared/events";
import { findGamePersonIsIn } from "./helpers";
import state from "./state";
import { validateJoinGameData } from "./validation";

const GAME_EXPIRE_TIME = 1000 * 60 * 60 * 12; // 12 hours
// const GAME_EXPIRE_TIME = 5000;

export default function registerSocketListeners(io: Server): void {
  io.on("connection", (socket: Socket) => {
    console.log("User connected");
    state.socketInfo.set(socket, {});

    function sendError(message: string, disconnect = false) {
      console.info(`error: ${message}`);
      socket.emit(ERROR_EVENT, message);
      if (disconnect) socket.disconnect();
    }

    function emitGameUpdate(gameId: string) {
      const gameJson = serialize(state.games[gameId]);
      io.to(gameId).emit(GAME_UPDATE_EVENT, gameJson);
    }

    socket.onAny((event, args) => {
      console.info(event, args);
    });

    socket.on(CREATE_GAME_EVENT, (callback) => {
      console.log("received create game event");

      const gameId = uuidV4();
      state.games[gameId] = new Game();

      setTimeout(() => {
        console.log(`Game ${gameId} expired`);
        if (state.games[gameId]) {
          socket.to(gameId).emit(GAME_EXPIRED_EVENT);
          delete state.games[gameId];
        }
      }, GAME_EXPIRE_TIME);

      callback(gameId);
    });

    socket.on(JOIN_GAME_EVENT, (data: JoinGameData) => {
      console.log("received join game event: ", data);

      const validationResult = validateJoinGameData(data);
      if (!validationResult.valid) {
        sendError(validationResult.errorMessage);
        return;
      }

      const game = state.games[data.gameId];

      const userId = uuidV4();
      console.log(`Generating user id... ${userId}`);

      game.people.set(userId, new Person(data.name, data.role, data.side));
      console.log("game.people:", game.people);

      socket.join(data.gameId);
      emitGameUpdate(data.gameId);
      socket.emit(USER_ID_EVENT, userId);
      socket.emit(READY_EVENT);
      state.socketInfo.get(socket)!.userId = userId;
    });

    socket.on(MAKE_MOVE_EVENT, (data: string) => {
      const userId = state.socketInfo.get(socket)!.userId!;
      const gameId = findGamePersonIsIn(userId);
      if (!gameId) {
        sendError("Cannot find game with player");
        return;
      }

      const game = state.games[gameId];
      const person = game.people.get(userId)!;
      const move = deserialize(Move, data);

      if (
        !game.board.checkMove(move) ||
        person.role != PersonRole.Player ||
        person.side != game.board.currentSide
      ) {
        sendError("Illegal move");
        return;
      }

      game.board.move(move);
      emitGameUpdate(gameId);

      // Check checkmate
      if (game.board.checkCheckmate(game.board.currentSide)) {
        console.log(`🔥 ${game.board.currentSide} got checkmated!`);

        game.gameStatus = GameStatus.HasWinner;
        game.winner = OPPOSITE_SIDE[game.board.currentSide];

        emitGameUpdate(gameId);
        io.to(gameId).emit(GAME_STATUS_CHANGED_EVENT, game.gameStatus);
      }
    });

    socket.on(SEND_MESSAGE_EVENT, (msg: string) => {
      const userId = state.socketInfo.get(socket)?.userId ?? "";
      const gameId = findGamePersonIsIn(userId);
      if (!gameId) return;

      if (typeof msg != "string") {
        sendError("FATAL: Message isn't a string");
        return;
      }

      if (msg.length > 255) {
        sendError("Message can't be longer than 255 characters");
        return;
      }

      if (msg.length == 0) return;

      const name = state.games[gameId].people.get(userId)?.name;
      if (!name) return;
      const data: MessageData = {
        name: name,
        message: msg,
      };
      io.to(gameId).emit(MESSAGE_EVENT, data);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");

      const userId = state.socketInfo.get(socket)!.userId;
      if (!userId) return;

      const gameId = findGamePersonIsIn(userId);
      if (!gameId) return;

      state.games[gameId].people.delete(userId);

      emitGameUpdate(gameId);

      // Delete game if empty
      if (state.games[gameId].people.size == 0) {
        console.log(`Deleteing game: ${gameId}`);
        delete state.games[gameId];
      }
    });
  });
}
