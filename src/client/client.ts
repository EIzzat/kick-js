import WebSocket from "ws";
import EventEmitter from "events";
import { getChannelData } from "../core/kickApi";
import { createWebSocket } from "../core/websocket";
import { parseMessage } from "../utils/messageHandling";
import type { KickChannelInfo } from "../types/channels";
import type { KickClient, ClientOptions } from "../types/client";

import axios from "axios";
import type { MessageData } from "../types/events";

export const createClient = (
  channelName: string,
  options: ClientOptions = {},
): KickClient => {
  const emitter = new EventEmitter();
  let socket: WebSocket | null = null;
  let channelInfo: KickChannelInfo | null = null;

  let token: string | null = null;
  let cookies: string | null = null;

  const defaultOptions: ClientOptions = {
    plainEmote: true,
    logger: false,
  };

  const mergedOptions = { ...defaultOptions, ...options };

  const initialize = async () => {
    try {
      channelInfo = await getChannelData(channelName);
      if (!channelInfo) {
        throw new Error("Unable to fetch channel data");
      }

      socket = createWebSocket(channelInfo.chatroom.id);

      socket.on("open", () => {
        if (mergedOptions.logger) {
          console.log(`Connected to channel: ${channelName}`);
        }
        emitter.emit("ready", getUser());
      });

      socket.on("message", (data: WebSocket.Data) => {
        const parsedMessage = parseMessage(data.toString());

        if (parsedMessage) {
          if (
            mergedOptions.plainEmote &&
            parsedMessage.type === "ChatMessage"
          ) {
            const parsedMessagePlain = parsedMessage.data as MessageData;

            parsedMessagePlain.content = parsedMessagePlain.content.replace(
              /\[emote:(\d+):(\w+)\]/g,
              (_, __, emoteName) => emoteName,
            );
          }
          emitter.emit(parsedMessage.type, parsedMessage.data);
        }
      });

      socket.on("close", () => {
        if (mergedOptions.logger) {
          console.log(`Disconnected from channel: ${channelName}`);
        }
        emitter.emit("disconnect");
      });
    } catch (error) {
      console.error("Error during initialization:", error);
      throw error;
    }
  };

  const getUser = () =>
    channelInfo
      ? {
          id: channelInfo.id,
          username: channelInfo.slug,
          tag: channelInfo.user.username,
        }
      : null;

  const on = (event: string, listener: (...args: any[]) => void) => {
    emitter.on(event, listener);
  };

  // TODO: Implement authentication, this is just a placeholder
  // const login = async (credentials: { token: string; cookies: string }) => {
  //   token = credentials.token;
  //   cookies = credentials.cookies;

  //   console.log("Logged in successfully");
  // };

  const sendMessage = async (messageContent: string) => {
    if (!token || !cookies || !channelInfo) {
      throw new Error("Not logged in or channel info not available");
    }
    // TODO: Implement message sending, this is just a placeholder

    // try {
    //   const response = await axios.post(
    //     `https://kick.com/api/v2/messages/send/${channelInfo.id}`,
    //     {
    //       content: messageContent,
    //       type: "message",
    //     },
    //     {
    //       headers: {
    //         accept: "application/json, text/plain, */*",
    //         authorization: `Bearer ${token}`,
    //         "content-type": "application/json",
    //         "x-xsrf-token": token,
    //         cookie: cookies,
    //         Referer: `https://kick.com/${channelInfo.slug}`,
    //       },
    //     },
    //   );

    //   if (response.status === 200) {
    //     console.log(`Message sent successfully: ${messageContent}`);
    //   } else {
    //     console.error(`Failed to send message. Status: ${response.status}`);
    //   }
    // } catch (error) {
    //   console.error("Error sending message:", error);
    // }
  };

  void initialize();

  return {
    on,
    get user() {
      return getUser();
    },
    sendMessage,
  };
};