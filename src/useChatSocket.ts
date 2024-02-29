import { useCallback, useEffect, useRef, useState } from 'react'

import { Message } from './components/Dialog'

export const useChatSocket = () => {
  const [inputText, setInputText] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([
    { speakerId: 0, text: 'Hello!' },
  ])
  const [inputFiles2, setInputFiles2] = useState<FileList | null>(null);  

  const addMessage = useCallback(
    (speakerId: number, text: string) => {
      setMessages((ms) => [...ms, { speakerId: speakerId, text: text }])
    },
    [setMessages]
  )

  const socketRef = useRef<WebSocket>()
  useEffect(() => {
    const websocket = new WebSocket('ws://localhost:8000/chat')
    socketRef.current = websocket

    const onMessage = (event: MessageEvent<string>) => {
      const text = JSON.parse(event.data).text ?? ''
      addMessage(0, text)
    }
    websocket.addEventListener('message', onMessage)

    return () => {
      websocket.close()
      websocket.removeEventListener('message', onMessage)
    }
  }, [])

  const readFiles = useCallback((files: FileList) => {
    const promises = Array.from(files).map((file) => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          resolve(content);
        };
        reader.onerror = (event) => {
          reject(event.target?.error);
        };
        reader.readAsText(file);
      });
    });

    return Promise.all(promises);
  }, []);

  const onSubmit = useCallback(async () => {
    let fileContents: string[] = [];
    if (inputFiles2) {
      try {
        fileContents = await readFiles(inputFiles2);
      } catch (error) {
        console.error('ファイルの読み込み中にエラーが発生しました。', error);
        return;
      }
    }

    const messageData = {
      text: inputText,
      files: inputFiles2 ? fileContents : []
    };

    const tmpAry =[messageData.text];
    const ary = messageData.files.length>0 ? tmpAry.concat(messageData.files) : tmpAry;
    socketRef.current?.send(JSON.stringify(ary));
    const displayMessage = messageData.files.length>0 ? 
              'テキスト内容:'+ messageData.text +
              '\n添付ファイル内容:\n'+messageData.files
              : inputText;
    console.log("json:"+JSON.stringify(ary));
    setMessages((ms) => [...ms, { speakerId: 1, text: displayMessage.replace(',','\n') }]);
    setInputText('')
    setInputFiles2(null);
  }, [addMessage, setInputText, inputText])
  return { inputText, setInputText, inputFiles2, setInputFiles2, messages, onSubmit}
}
