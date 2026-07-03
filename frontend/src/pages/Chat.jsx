import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import api, { API_URL } from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Chat() {
  const { interestId } = useParams();
  const { user } = useAuth();
  const [interest, setInterest] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const socketRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        const { data: interestData } = await api.get(`/interests/${interestId}`);
        setInterest(interestData);

        const { data: history } = await api.get(`/chat/${interestId}/messages`);
        setMessages(history);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load conversation');
        return;
      }

      const token = localStorage.getItem('token');
      const socket = io(API_URL, { auth: { token } });
      socketRef.current = socket;

      socket.emit('join_room', interestId);

      socket.on('receive_message', (msg) => {
        setMessages((prev) => [...prev, msg]);
      });

      socket.on('error_message', (msg) => setError(msg));
    }
    load();

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [interestId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function sendMessage(e) {
    e.preventDefault();
    if (!text.trim() || !socketRef.current) return;
    socketRef.current.emit('send_message', { interestId, text });
    setText('');
  }

  if (error) return <div className="container"><p className="error">{error}</p></div>;
  if (!interest) return <div className="container"><p>Loading chat...</p></div>;

  const otherParty = user.role === 'owner' ? interest.tenant : interest.owner;

  return (
    <div className="container narrow">
      <h1>Chat with {otherParty?.name}</h1>
      <p className="muted">Re: {interest.listing?.location} - ₹{interest.listing?.rent}/month</p>
      <div className="chat-box">
        {messages.map((m) => (
          <div key={m._id} className={`chat-msg ${m.sender?._id === user.id || m.sender === user.id ? 'mine' : ''}`}>
            <span className="chat-sender">{m.sender?.name || (m.sender === user.id ? 'You' : otherParty?.name)}</span>
            <p>{m.text}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={sendMessage} className="chat-input-row">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
