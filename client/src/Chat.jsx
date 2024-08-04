import { useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { uniqBy } from "lodash";
import Avatar from "./Avatar";
import Logo from "./Logo";
import Contact from "./Contact";
import { UserContext } from "./UserContext";

export default function Chat() {
    const [ws, setWs] = useState(null);
    const [onlinePeople, setOnlinePeople] = useState({});
    const [offlinePeople, setOfflinePeople] = useState({});
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [newMessageText, setNewMessageText] = useState('');
    const [messages, setMessages] = useState([]);
    const { id, setId, setUsername, username } = useContext(UserContext);
    const divUnderMessages = useRef();

    useEffect(() => {
        connectToWs();

        return () => {
            if (ws) {
                ws.close();
            }
        };
    }, [selectedUserId]);

    function connectToWs() {
        const ws = new WebSocket('ws://localhost:4040');
        setWs(ws);
        ws.addEventListener('message', handleMessage);
        ws.addEventListener('close', () => {
            setTimeout(() => {
                console.log('Disconnected. Trying to reconnect.');
                connectToWs();
            }, 1000);
        });
        ws.addEventListener('error', (err) => {
            console.error('WebSocket error:', err);
        });
    }

    function showOnlinePeople(peopleArray) {
        const people = {};
        peopleArray.forEach(({ userId, username, avatarUrl }) => {
            people[userId] = { username, avatarUrl };
        });
        setOnlinePeople(people);
    }

    function handleMessage(ev) {
        const messageData = JSON.parse(ev.data);
        console.log({ ev, messageData });
        if ('online' in messageData) {
            showOnlinePeople(messageData.online);
        } else if ('text' in messageData || 'file' in messageData) {
            if (messageData.sender === selectedUserId || messageData.recipient === selectedUserId) {
                setMessages(prev => uniqBy([...prev, messageData], '_id'));
            }
        }
    }

    function logout() {
        axios.post('/logout').then(() => {
            setWs(null);
            setId(null);
            setUsername(null);
        }).catch(err => console.error('Logout error:', err));
    }

    function sendFile(ev) {
        ev.preventDefault();
        const reader = new FileReader();
        const file = ev.target.files[0];
        reader.readAsDataURL(file);
        reader.onload = () => {
            sendMessage(null, {
                name: file.name,
                data: reader.result.split(',')[1],
            });
        };
        reader.onerror = (error) => {
            console.error('File reading error:', error);
        };
    }

    const sendMessage = (ev, fileData = null) => {
        ev?.preventDefault();
        
        if (!selectedUserId || (!newMessageText.trim() && !fileData)) return;
        
        const message = {
            recipient: selectedUserId,
            text: newMessageText.trim(),
            sender: id,
            createdAt: new Date().toISOString(),
            file: fileData || null,
        };

        // Send message through WebSocket
        ws.send(JSON.stringify(message));

        // Update the messages state
        setMessages(prevMessages => [...prevMessages, message]);
        
        // Clear the input field
        setNewMessageText('');
    };

    function formatTime(isoTimestamp) {
        const date = new Date(isoTimestamp);
        if (isNaN(date.getTime())) {
            console.error(`Invalid timestamp format received: ${isoTimestamp}`);
            return 'Invalid date';
        }
        return date.toLocaleString('en-US', {
            hour: 'numeric',
            minute: 'numeric',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    useEffect(() => {
        const div = divUnderMessages.current;
        if (div) {
            div.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, [messages]);

    useEffect(() => {
        axios.get('/people').then(res => {
            const offlinePeopleArr = res.data
                .filter(p => p._id !== id)
                .filter(p => !Object.keys(onlinePeople).includes(p._id));
            const offlinePeople = {};
            offlinePeopleArr.forEach(p => {
                offlinePeople[p._id] = p;
            });
            setOfflinePeople(offlinePeople);
        }).catch(err => console.error('Error fetching people:', err));
    }, [onlinePeople]);

    useEffect(() => {
        if (selectedUserId) {
            axios.get('/messages/' + selectedUserId).then(res => {
                setMessages(res.data);
            }).catch(err => console.error('Error fetching messages:', err));
        }
    }, [selectedUserId]);

    const onlinePeopleExclOurUser = { ...onlinePeople };
    delete onlinePeopleExclOurUser[id];

    const messagesWithoutDupes = uniqBy(messages, '_id');

    return (
        <div className="flex h-screen">
            {/* Sidebar */}
            <div className="bg-white w-1/3 flex flex-col rounded-lg shadow-lg">
                {/* Header */}
                <div className="flex-grow p-4">
                    <div className="flex items-center mb-6">
                        <Logo />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800 mb-4">Online</h2>
                        {Object.keys(onlinePeopleExclOurUser).map(userId => (
                            <Contact
                                key={userId}
                                id={userId}
                                online={true}
                                username={onlinePeopleExclOurUser[userId]?.username}
                                avatarUrl={onlinePeopleExclOurUser[userId]?.avatarUrl}
                                onClick={() => setSelectedUserId(userId)}
                                selected={userId === selectedUserId}
                                className="text-3xl"
                            />
                        ))}
                        <h2 className="text-3xl font-bold text-gray-800 mb-4">Offline</h2>
                        {Object.keys(offlinePeople).map(userId => (
                            <Contact
                                key={userId}
                                id={userId}
                                online={false}
                                username={offlinePeople[userId]?.username}
                                avatarUrl={offlinePeople[userId]?.avatarUrl}
                                onClick={() => setSelectedUserId(userId)}
                                selected={userId === selectedUserId}
                                className="text-3xl"
                            />
                        ))}
                    </div>
                </div>
                {/* Footer */}
                <div className="p-4 bg-gradient-to-r from-blue-100 to-blue-300 rounded-b-lg flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Avatar userId={id} username={username} size="w-8 h-8" />
                        <span className="text-lg text-gray-800">{username}</span>
                    </div>
                    <button
                        onClick={logout}
                        className="text-lg bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none transition duration-300"
                    >
                        Logout
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex flex-col bg-blue-50 w-2/3 p-2">
                {selectedUserId ? (
                    <>
                        {/* Header */}
                        <div className="flex items-center bg-blue-100 p-4 border-b border-gray-300">
                            <div className="flex items-center bg-white rounded-full shadow-md p-2 mr-4">
                                <Avatar
                                    userId={selectedUserId}
                                    username={selectedUserId ? (onlinePeople[selectedUserId]?.username || offlinePeople[selectedUserId]?.username) : ''}
                                    size="w-12 h-12"
                                />
                            </div>
                            <div className="flex flex-col">
                                <h2 className="text-xl font-semibold text-gray-800">
                                    {selectedUserId ? (onlinePeople[selectedUserId]?.username || offlinePeople[selectedUserId]?.username) : 'Select a contact'}
                                </h2>
                                <span className={`text-sm font-medium ${onlinePeople[selectedUserId] ? 'text-green-500' : 'text-gray-500'}`}>
                                    {onlinePeople[selectedUserId] ? 'Online' : 'Offline'}
                                </span>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-grow p-4 overflow-y-scroll bg-gray-50">
                            {messagesWithoutDupes.length === 0 ? (
                                <div className="text-xl text-center text-gray-400 mt-64">
                                    &larr; Start a conversation with this person
                                </div>
                            ) : (
                                <div>
                                    {messagesWithoutDupes.map(message => (
                                        <div key={message._id} className={`mb-2 flex ${message.sender === id ? 'justify-end' : 'justify-start'}`}>
                                            <div
                                                className={`p-3 rounded-lg text-left ${message.sender === id 
                                                    ? 'bg-blue-900 text-white rounded-br-none shadow-lg' 
                                                    : 'bg-white text-gray-800 rounded-bl-none shadow-md'
                                                }`}
                                            >
                                                {message.text && <div>{message.text}</div>}
                                                {message.file && (
                                                    <div>
                                                        <a
                                                            href={`${axios.defaults.baseURL}/uploads/${message.file}?t=${new Date().getTime()}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="border-b flex items-center gap-1"
                                                        >
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                fill="none"
                                                                viewBox="0 0 24 24"
                                                                strokeWidth={1.5}
                                                                stroke="currentColor"
                                                                className="w-4 h-4"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    d="M3 16.5V6a3 3 0 013-3h12a3 3 0 013 3v10.5M3 16.5a3 3 0 003 3h12a3 3 0 003-3M3 16.5L7.5 12m-3 3H21"
                                                                />
                                                            </svg>
                                                            See File
                                                        </a>
                                                    </div>
                                                )}
                                                <div className="text-xs text-gray-400 mt-1">{formatTime(message.createdAt)}</div>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={divUnderMessages}></div>
                                </div>
                            )}
                        </div>

                        {/* Input */}
                        <form className="flex items-center bg-white p-4 border-t border-gray-300 space-x-4 sticky bottom-0">
                            <input
                                type="text"
                                value={newMessageText}
                                onChange={(e) => setNewMessageText(e.target.value)}
                                placeholder="Type your message here"
                                className="flex-grow p-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:border-blue-300 text-lg"
                            />
                            <label className="cursor-pointer">
                                <input type="file" className="hidden" onChange={sendFile} />
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                                </svg>
                            </label>
                            <button
                                type="button"
                                onClick={(e) => sendMessage(e)}
                                className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none transition duration-300 text-lg"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                                </svg>
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="flex-grow flex items-center justify-center text-gray-400 text-xl">
                        &larr;Select a Contact From Sidebar to Start Conversation...
                    </div>
                )}
            </div>
        </div>
    );
}
