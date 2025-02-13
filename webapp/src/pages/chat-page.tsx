import { useState, useEffect } from "react";
import BaseAppLayout from "../components/base-app-layout";
import { ChatUI } from "../components/chat-ui/chat-ui";
import { ChatMessage, ChatMessageType } from "../components/chat-ui/types";
import useWebSocket from 'react-use-websocket';
import { getCurrentUser } from 'aws-amplify/auth';
import DOMPurify from 'dompurify';

export type ChatPageProps = {
  wsUrl: string,
  idToken: string

}

export default function ChatPage(props: ChatPageProps) {
  const [running, setRunning] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const wsUrl = `${props.wsUrl}?idToken=${props.idToken}`;
  const [bedrockSessionId, setBedrockSessionId] = useState('');

  const { sendMessage, lastMessage } = useWebSocket(wsUrl, {
    shouldReconnect: () => true, // Automatically reconnect on close
    reconnectInterval: 3000, // Reconnect every 3 seconds
  });

  const generateSessionId = async () => {
    const user = await getCurrentUser();
    const sessionId = user.username + '-' + Math.random().toString(36).substring(2, 8);
    setBedrockSessionId(sessionId);
    localStorage.setItem('bedrockSessionId', sessionId);
  };

  const isValidJSON = (str: any): boolean => {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  };

  useEffect(() => {
    const storedBedrockSessionId = localStorage.getItem('bedrockSessionId');
    const bedrockHistory = localStorage.getItem(`bedrockHistory-${storedBedrockSessionId}`);
    const storedBedrockHistory = bedrockHistory !== null && isValidJSON(bedrockHistory) && Array.isArray(JSON.parse(bedrockHistory))
      ? JSON.parse(bedrockHistory)
      : [];
    if (storedBedrockSessionId) {
      setBedrockSessionId(storedBedrockSessionId);
      if (storedBedrockHistory === null || storedBedrockHistory.length === 0) {
        loadConversationHistory(storedBedrockSessionId, storedBedrockHistory);
      } else {
        setMessages(storedBedrockHistory);
      }
    } else {
      generateSessionId();
    }
  }, []);


  const loadConversationHistory = async (sessionId: string, _history: string[] = []) => {
    const data = {
      type: 'load',
      session_id: sessionId,
    };

    sendMessage(JSON.stringify(data));
  };

  useEffect(() => {
    if (lastMessage !== null && lastMessage.data.length > 0) {
      const message = JSON.parse(lastMessage.data);
      if (message.type === 'conversation_history') {
        const messageChunk = JSON.parse(message.chunk);
        setMessages((prevMessages) => [...prevMessages, ...messageChunk]);
      }
    }
  }, [lastMessage, sendMessage]);

  const onSend = async (message: string) => {
    setRunning(true);
    const sanitizedMessage = DOMPurify.sanitize(message);
    const data = {
      prompt: sanitizedMessage,
      session_id: bedrockSessionId,
    }

    const humanMessage: ChatMessage = {
      type: ChatMessageType.Human,
      content: message,
    }

    setMessages((prevMessages) => [
      ...prevMessages,
      humanMessage,
      {
        type: ChatMessageType.AI,
        content: "",
      },
    ]);

    sendMessage(JSON.stringify(data));
  };


  useEffect(() => {
    console.info(lastMessage)
    if (lastMessage !== null && lastMessage.data.length > 0) {
      console.info(lastMessage)
      const message = JSON.parse(lastMessage.data);

      // Handle session ID updates from the server
      if (typeof message === 'string' && message.includes('You have not been allow-listed for this application')) {
        handleError(message);
      } else if (message.type === 'message_start') {
        updateMessages(message);
      } else if (message.type === 'content_block_delta') {
        updateMessages(message);
      } else if (message.type === 'message_stop') {
        updateMessages(message);
        updateMessagesOnStop();
        setRunning(false);
      } else if (message.type === 'error' || message.message === 'Internal server error') {
        updateMessages({ delta: { text: message.error || message.message } })
        handleError(message.error || message.message);
        setRunning(false);
      } else {
        if (typeof message === 'object' && message !== null) {
          const messageString = JSON.stringify(message);
          if (!messageString.includes('Message Received')) {
            console.log('Uncaught String Message:');
            console.log(messageString);
          }
        } else if (typeof message === 'string') {
          if (!message.includes('Message Received')) {
            console.log('Uncaught String Message:');
            console.log(message);
          }
        } else {
          console.log('Uncaught Message (non-string, non-object):');
          console.log(message);
        }
      }
    }
  }, [lastMessage]);

  const updateMessages = (message: { delta: any; }) => {
    // console.log('message:', message)
    if (message && message.delta && message.delta.text) {
      setMessages((prevMessages) => {
        const updatedMessages = [...prevMessages];
        const lastIndex = updatedMessages.length - 1;
        const lastMessage = updatedMessages[lastIndex];
        if (lastMessage && lastMessage.type === ChatMessageType.AI) {
          const newContent = lastMessage.content + message.delta.text;
          updatedMessages[lastIndex] = {
            ...lastMessage,
            content: newContent,
          };
        }
        return updatedMessages;
      });
    }
  };

  const updateMessagesOnStop = () => {
    setMessages((prevMessages) => {
      const updatedMessages = [...prevMessages];
      const lastIndex = updatedMessages.length - 1;
      localStorage.setItem(`bedrockHistory-${bedrockSessionId}`, JSON.stringify(updatedMessages));
      updatedMessages[lastIndex] = {
        ...updatedMessages[lastIndex],
      };
      return updatedMessages;
    });
  };

  const handleError = (errormessage: string) => {
    // let popupMsg = 'Sorry, We encountered an issue, Please try resubmitting your message.'
    // if (errormessage.includes('allow-listed')) {
    //   popupMsg = errormessage
    // } else if (errormessage.includes('throttlingException')) {
    //   popupMsg = 'Sorry, We encountered a Throttling issue, Please try resubmitting your message.'
    // }
    // setPopupMessage(popupMsg);
    // setTimeout(() => setShowPopup(false), 3000);
    // setShowPopup(true);
    console.error('WebSocket error:', errormessage);
  };

  const onClearConversation = async () => {
    setMessages([]);
    const bedrockSessionId = localStorage.getItem('bedrockSessionId');
    localStorage.removeItem(`bedrockHistory-${bedrockSessionId}`);
    await generateSessionId();
    console.info("chat history cleared")
  };


  return (
    <BaseAppLayout
      content={
        <ChatUI
          onSendMessage={onSend}
          onClearConversation={onClearConversation}
          messages={messages}
          running={running}
        />
      }
    />
  );
}

