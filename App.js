// Eclipse Project - Бесплатная версия Claude с расширенным функционалом
// Файл: App.js

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';

// =============================================
// СТИЛИ И КОНСТАНТЫ
// =============================================

const COLORS = {
  primary: '#10A37F',
  primaryDark: '#0d8a6c',
  background: {
    light: '#ffffff',
    dark: '#1a1a1a'
  },
  text: {
    light: '#333333',
    dark: '#ffffff'
  },
  sidebar: {
    light: '#f8f9fa',
    dark: '#2d2d2d'
  }
};

// =============================================
// КОНТЕКСТЫ И ПРОВАЙДЕРЫ
// =============================================

const AppContext = React.createContext();

const AppProvider = ({ children }) => {
  const [theme, setTheme] = useState('dark');
  const [chats, setChats] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [settings, setSettings] = useState({
    temperature: 0.7,
    maxTokens: 4000,
    model: 'claude-3-sonnet-20240229'
  });
  const [isLoading, setIsLoading] = useState(false);

  // Загрузка данных из localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('eclipse-theme');
    const savedChats = localStorage.getItem('eclipse-chats');
    const savedSettings = localStorage.getItem('eclipse-settings');

    if (savedTheme) setTheme(savedTheme);
    if (savedChats) setChats(JSON.parse(savedChats));
    if (savedSettings) setSettings(JSON.parse(savedSettings));
  }, []);

  // Сохранение данных в localStorage
  useEffect(() => {
    localStorage.setItem('eclipse-theme', theme);
    localStorage.setItem('eclipse-chats', JSON.stringify(chats));
    localStorage.setItem('eclipse-settings', JSON.stringify(settings));
  }, [theme, chats, settings]);

  const createNewChat = useCallback(() => {
    const newChat = {
      id: Date.now().toString(),
      title: 'Новый чат',
      messages: [],
      createdAt: new Date().toISOString()
    };
    setChats(prev => [newChat, ...prev]);
    setCurrentChat(newChat);
    return newChat;
  }, []);

  const addMessage = useCallback((chatId, message) => {
    setChats(prev => prev.map(chat => {
      if (chat.id === chatId) {
        const updatedChat = {
          ...chat,
          messages: [...chat.messages, message],
          title: chat.messages.length === 0 ? message.content.substring(0, 30) + '...' : chat.title
        };
        return updatedChat;
      }
      return chat;
    }));

    if (currentChat?.id === chatId) {
      setCurrentChat(prev => ({
        ...prev,
        messages: [...prev.messages, message]
      }));
    }
  }, [currentChat]);

  const deleteChat = useCallback((chatId) => {
    setChats(prev => prev.filter(chat => chat.id !== chatId));
    if (currentChat?.id === chatId) {
      setCurrentChat(chats.find(chat => chat.id !== chatId) || null);
    }
  }, [currentChat, chats]);

  const exportChat = useCallback((chatId) => {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    const content = chat.messages.map(msg => 
      `${msg.role === 'user' ? 'Пользователь' : 'Eclipse'}: ${msg.content}`
    ).join('\n\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eclipse-chat-${chatId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [chats]);

  const value = {
    theme,
    setTheme,
    chats,
    setChats,
    currentChat,
    setCurrentChat,
    settings,
    setSettings,
    isLoading,
    setIsLoading,
    createNewChat,
    addMessage,
    deleteChat,
    exportChat
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

const useApp = () => {
  const context = React.useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

// =============================================
// КАСТОМНЫЕ ХУКИ
// =============================================

const useClaudeAPI = () => {
  const { settings, addMessage, setIsLoading } = useApp();
  const API_KEY = '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';

  const sendMessage = useCallback(async (chatId, message, messageHistory = []) => {
    setIsLoading(true);
    
    try {
      const response = await axios.post('https://api.anthropic.com/v1/messages', {
        model: settings.model,
        max_tokens: settings.maxTokens,
        temperature: settings.temperature,
        messages: [...messageHistory, message]
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01'
        }
      });

      const assistantMessage = {
        role: 'assistant',
        content: response.data.content[0].text,
        timestamp: new Date().toISOString()
      };

      addMessage(chatId, assistantMessage);
      return assistantMessage;
    } catch (error) {
      console.error('API Error:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'Извините, произошла ошибка при обработке вашего запроса. Пожалуйста, попробуйте еще раз.',
        timestamp: new Date().toISOString(),
        isError: true
      };
      addMessage(chatId, errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [settings, addMessage, setIsLoading]);

  return { sendMessage };
};

// =============================================
// КОМПОНЕНТЫ ИНТЕРФЕЙСА
// =============================================

const ThemeToggle = () => {
  const { theme, setTheme } = useApp();
  
  return (
    <button
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      className="p-2 rounded-lg hover:bg-opacity-20 transition-colors"
      style={{ 
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
      }}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
};

const Sidebar = () => {
  const { theme, chats, currentChat, setCurrentChat, createNewChat, deleteChat, exportChat } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredChats = useMemo(() => {
    return chats.filter(chat => 
      chat.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chat.messages.some(msg => 
        msg.content.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [chats, searchTerm]);

  return (
    <div 
      className="w-80 h-full flex flex-col border-r p-4"
      style={{ 
        backgroundColor: theme === 'dark' ? COLORS.sidebar.dark : COLORS.sidebar.light,
        borderColor: theme === 'dark' ? '#404040' : '#e5e5e5'
      }}
    >
      {/* Заголовок и кнопка нового чата */}
      <div className="flex items-center justify-between mb-6">
        <h1 
          className="text-xl font-bold"
          style={{ color: COLORS.primary }}
        >
          Eclipse Project
        </h1>
        <ThemeToggle />
      </div>

      <button
        onClick={createNewChat}
        className="w-full py-3 px-4 rounded-lg mb-6 font-medium transition-all hover:scale-105 active:scale-95"
        style={{ 
          backgroundColor: COLORS.primary,
          color: 'white'
        }}
      >
        + Новый чат
      </button>

      {/* Поиск */}
      <div className="relative mb-4">
        <input
          type="text"
          placeholder="Поиск в чатах..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full py-2 px-3 pl-10 rounded-lg border focus:outline-none focus:ring-2 transition-all"
          style={{ 
            backgroundColor: theme === 'dark' ? '#404040' : 'white',
            borderColor: theme === 'dark' ? '#555' : '#ddd',
            color: theme === 'dark' ? 'white' : 'black'
          }}
        />
        <span className="absolute left-3 top-2.5">🔍</span>
      </div>

      {/* Список чатов */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.map(chat => (
          <div
            key={chat.id}
            className={`p-3 rounded-lg mb-2 cursor-pointer transition-all group ${
              currentChat?.id === chat.id ? 'ring-2' : ''
            }`}
            style={{ 
              backgroundColor: currentChat?.id === chat.id 
                ? (theme === 'dark' ? 'rgba(16, 163, 127, 0.2)' : 'rgba(16, 163, 127, 0.1)')
                : 'transparent',
              border: theme === 'dark' ? '1px solid #404040' : '1px solid #e5e5e5',
              color: theme === 'dark' ? 'white' : 'black'
            }}
            onClick={() => setCurrentChat(chat)}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{chat.title}</h3>
                <p 
                  className="text-sm opacity-70 truncate mt-1"
                  style={{ color: theme === 'dark' ? '#ccc' : '#666' }}
                >
                  {chat.messages[0]?.content || 'Нет сообщений'}
                </p>
              </div>
              <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    exportChat(chat.id);
                  }}
                  className="p-1 hover:bg-opacity-20 rounded ml-1"
                  title="Экспорт"
                >
                  📥
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChat(chat.id);
                  }}
                  className="p-1 hover:bg-opacity-20 rounded ml-1"
                  title="Удалить"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Message = ({ message }) => {
  const { theme } = useApp();
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-4 p-6 ${isUser ? 'bg-opacity-5' : ''}`}>
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-medium">
        {isUser ? (
          <div style={{ backgroundColor: '#8b5cf6' }}>👤</div>
        ) : (
          <div style={{ backgroundColor: COLORS.primary }}>🤖</div>
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-medium">
            {isUser ? 'Вы' : 'Eclipse'}
          </span>
          <span 
            className="text-sm opacity-60"
            style={{ color: theme === 'dark' ? '#ccc' : '#666' }}
          >
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        </div>
        <div 
          className={`prose max-w-none ${
            message.isError ? 'text-red-400' : ''
          }`}
          style={{ 
            color: theme === 'dark' ? 'white' : 'black'
          }}
        >
          {message.content.split('\n').map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      </div>
    </div>
  );
};

const ChatArea = () => {
  const { theme, currentChat, isLoading } = useApp();
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentChat?.messages, isLoading]);

  if (!currentChat) {
    return (
      <div 
        className="flex-1 flex flex-col items-center justify-center p-8"
        style={{ 
          backgroundColor: theme === 'dark' ? COLORS.background.dark : COLORS.background.light,
          color: theme === 'dark' ? COLORS.text.dark : COLORS.text.light
        }}
      >
        <div 
          className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl mb-4"
          style={{ backgroundColor: COLORS.primary }}
        >
          🤖
        </div>
        <h2 className="text-2xl font-bold mb-4">Добро пожаловать в Eclipse Project!</h2>
        <p className="text-lg opacity-70 text-center max-w-md">
          Бесплатная версия нейросети Claude с расширенным функционалом. 
          Начните новый чат, чтобы общаться с AI-ассистентом.
        </p>
      </div>
    );
  }

  return (
    <div 
      className="flex-1 flex flex-col"
      style={{ 
        backgroundColor: theme === 'dark' ? COLORS.background.dark : COLORS.background.light
      }}
    >
      {/* Заголовок чата */}
      <div 
        className="border-b p-4"
        style={{ 
          borderColor: theme === 'dark' ? '#404040' : '#e5e5e5'
        }}
      >
        <h2 
          className="font-semibold text-lg"
          style={{ color: theme === 'dark' ? 'white' : 'black' }}
        >
          {currentChat.title}
        </h2>
      </div>

      {/* Сообщения */}
      <div className="flex-1 overflow-y-auto">
        {currentChat.messages.map((message, index) => (
          <Message key={index} message={message} />
        ))}
        
        {isLoading && (
          <div className="flex gap-4 p-6">
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white">
              <div style={{ backgroundColor: COLORS.primary }}>🤖</div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium">Eclipse</span>
              </div>
              <div className="flex space-x-2">
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

const MessageInput = () => {
  const { theme, currentChat, createNewChat, addMessage } = useApp();
  const { sendMessage } = useClaudeAPI();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const chat = currentChat || createNewChat();
    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    addMessage(chat.id, userMessage);
    setInput('');
    setIsLoading(true);

    try {
      await sendMessage(chat.id, userMessage, chat.messages);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div 
      className="border-t p-4"
      style={{ 
        backgroundColor: theme === 'dark' ? COLORS.background.dark : COLORS.background.light,
        borderColor: theme === 'dark' ? '#404040' : '#e5e5e5'
      }}
    >
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Введите ваше сообщение... (Shift+Enter для новой строки)"
            disabled={isLoading}
            rows={3}
            className="w-full p-4 pr-12 rounded-lg border resize-none focus:outline-none focus:ring-2 transition-all"
            style={{ 
              backgroundColor: theme === 'dark' ? '#2d2d2d' : 'white',
              borderColor: theme === 'dark' ? '#555' : '#ddd',
              color: theme === 'dark' ? 'white' : 'black',
              focusBorderColor: COLORS.primary
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-3 bottom-3 p-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
            style={{ 
              backgroundColor: COLORS.primary,
              color: 'white'
            }}
          >
            {isLoading ? '⏳' : '➤'}
          </button>
        </div>
        
        <div className="flex justify-center gap-4 mt-3">
          <button
            type="button"
            onClick={() => setInput(prev => prev + '\n```\n\n```')}
            className="text-sm px-3 py-1 rounded border opacity-70 hover:opacity-100 transition-opacity"
            style={{ 
              borderColor: theme === 'dark' ? '#555' : '#ddd',
              color: theme === 'dark' ? 'white' : 'black'
            }}
          >
            Вставить код
          </button>
          <button
            type="button"
            onClick={() => setInput('')}
            className="text-sm px-3 py-1 rounded border opacity-70 hover:opacity-100 transition-opacity"
            style={{ 
              borderColor: theme === 'dark' ? '#555' : '#ddd',
              color: theme === 'dark' ? 'white' : 'black'
            }}
          >
            Очистить
          </button>
        </div>
      </form>
    </div>
  );
};

const SettingsPanel = () => {
  const { theme, settings, setSettings } = useApp();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Кнопка открытия настроек */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 p-3 rounded-lg hover:bg-opacity-20 transition-colors z-50"
        style={{ 
          backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
        }}
        title="Настройки"
      >
        ⚙️
      </button>

      {/* Модальное окно настроек */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div 
            className="max-w-md w-full rounded-lg p-6 max-h-[90vh] overflow-y-auto"
            style={{ 
              backgroundColor: theme === 'dark' ? COLORS.background.dark : COLORS.background.light,
              color: theme === 'dark' ? 'white' : 'black'
            }}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Настройки модели</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-opacity-20 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Temperature */}
              <div>
                <label className="block mb-2">
                  Temperature: {settings.temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.temperature}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    temperature: parseFloat(e.target.value)
                  }))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{ 
                    backgroundColor: theme === 'dark' ? '#404040' : '#e5e5e5',
                    accentColor: COLORS.primary
                  }}
                />
                <div className="flex justify-between text-sm opacity-70 mt-1">
                  <span>Более детерминировано</span>
                  <span>Более креативно</span>
                </div>
              </div>

              {/* Max Tokens */}
              <div>
                <label className="block mb-2">
                  Максимальное количество токенов: {settings.maxTokens}
                </label>
                <input
                  type="range"
                  min="100"
                  max="8000"
                  step="100"
                  value={settings.maxTokens}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    maxTokens: parseInt(e.target.value)
                  }))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{ 
                    backgroundColor: theme === 'dark' ? '#404040' : '#e5e5e5',
                    accentColor: COLORS.primary
                  }}
                />
                <div className="flex justify-between text-sm opacity-70 mt-1">
                  <span>Коротко</span>
                  <span>Подробно</span>
                </div>
              </div>

              {/* Модель */}
              <div>
                <label className="block mb-2">Модель</label>
                <select
                  value={settings.model}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    model: e.target.value
                  }))}
                  className="w-full p-3 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                  style={{ 
                    backgroundColor: theme === 'dark' ? '#2d2d2d' : 'white',
                    borderColor: theme === 'dark' ? '#555' : '#ddd',
                    color: theme === 'dark' ? 'white' : 'black'
                  }}
                >
                  <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                  <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                  <option value="claude-2.1">Claude 2.1</option>
                </select>
              </div>

              {/* Предустановленные промпты */}
              <div>
                <label className="block mb-2">Быстрые промпты</label>
                <div className="grid gap-2">
                  {[
                    'Напиши код для...',
                    'Объясни концепцию...',
                    'Помоги с решением проблемы...',
                    'Проанализируй текст...'
                  ].map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        // Здесь можно добавить логику для быстрых промптов
                        setIsOpen(false);
                      }}
                      className="p-3 text-left rounded-lg border hover:bg-opacity-20 transition-colors"
                      style={{ 
                        borderColor: theme === 'dark' ? '#555' : '#ddd'
                      }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// =============================================
// ГЛАВНЫЙ КОМПОНЕНТ
// =============================================

const EclipseProject = () => {
  const { theme } = useApp();

  useEffect(() => {
    document.documentElement.className = theme;
    document.body.style.backgroundColor = theme === 'dark' 
      ? COLORS.background.dark 
      : COLORS.background.light;
    document.body.style.color = theme === 'dark' 
      ? COLORS.text.dark 
      : COLORS.text.light;
  }, [theme]);

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <ChatArea />
        <MessageInput />
      </div>
      <SettingsPanel />
    </div>
  );
};

const App = () => {
  return (
    <AppProvider>
      <EclipseProject />
    </AppProvider>
  );
};

export default App;
