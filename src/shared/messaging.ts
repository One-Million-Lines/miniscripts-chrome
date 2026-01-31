/// <reference types="chrome" />
import { MessageType } from "./types";

export async function sendMessage<T extends MessageType>(
  message: T
): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

export async function sendMessageToTab<T extends MessageType>(
  tabId: number,
  message: T
): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

export function onMessage(
  callback: (message: MessageType, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => boolean | void
) {
  chrome.runtime.onMessage.addListener(callback);
}
