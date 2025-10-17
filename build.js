// build.js - простой сборщик для Render
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Создаем папку build если не существует
if (!existsSync('./build')) {
  mkdirSync('./build', { recursive: true });
}

// HTML файл
const html = `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#10A37F" />
    <meta name="description" content="Eclipse Project - Бесплатная версия Claude" />
    <title>Eclipse Project - AI Assistant</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
          'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
          sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        background-color: #1a1a1a;
        color: white;
        height: 100vh;
        overflow: hidden;
      }
      
      #root {
        height: 100vh;
      }
      
      .loading {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        flex-direction: column;
        gap: 20px;
      }
      
      .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid rgba(16, 163, 127, 0.3);
        border-top: 4px solid #10A37F;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  </head>
  <body>
    <div id="root">
      <div class="loading">
        <div class="spinner"></div>
        <div>Загрузка Eclipse Project...</div>
      </div>
    </div>
    <script type="module" src="/app.js"></script>
  </body>
</html>`;

// Основной JS файл (объединяем все в один)
const appJs = `
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'https://esm.sh/react@18.2.0';
import ReactDOM from 'https://esm.sh/react-dom@18.2.0/client';
import axios from 'https://esm.sh/axios@1.6.0';

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
      \\\`\\\${msg.role === 'user' ? 'Пользователь' : 'Eclipse'}: \\\${msg.content}\\\`
    ).join('\\\\n\\\\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \\\`eclipse-chat-\\\${chatId}.txt\\\`;
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

  return React.createElement(AppContext.Provider, { value }, children);
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
  
  return React.createElement(
    'button',
    {
      onClick: () => setTheme(theme === 'light' ? 'dark' : 'light'),
      className: 'p-2 rounded-lg hover:bg-opacity-20 transition-colors',
      style: { 
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
      }
    },
    theme === 'light' ? '🌙' : '☀️'
  );
};

const Sidebar = () => {
  const { theme, chats, currentChat, setCurrentChat, createNewChat, deleteChat, exportChat } = useApp();
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredChats = useMemo(() => {
    return chats.filter(chat => 
      chat.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chat.messages.some(msg => 
        msg.content.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [chats, searchTerm]);

  return React.createElement(
    'div',
    {
      className: 'w-80 h-full flex flex-col border-r p-4',
      style: { 
        backgroundColor: theme === 'dark' ? COLORS.sidebar.dark : COLORS.sidebar.light,
        borderColor: theme === 'dark' ? '#404040' : '#e5e5e5'
      }
    },
    [
      // Заголовок и кнопка нового чата
      React.createElement(
        'div',
        { className: 'flex items-center justify-between mb-6', key: 'header' },
        [
          React.createElement(
            'h1',
            {
              className: 'text-xl font-bold',
              style: { color: COLORS.primary },
              key: 'title'
            },
            'Eclipse Project'
          ),
          React.createElement(ThemeToggle, { key: 'theme' })
        ]
      ),

      React.createElement(
        'button',
        {
          onClick: createNewChat,
          className: 'w-full py-3 px-4 rounded-lg mb-6 font-medium transition-all hover:scale-105 active:scale-95',
          style: { 
            backgroundColor: COLORS.primary,
            color: 'white'
          },
          key: 'new-chat'
        },
        '+ Новый чат'
      ),

      // Поиск
      React.createElement(
        'div',
        { className: 'relative mb-4', key: 'search' },
        [
          React.createElement('input', {
            type: 'text',
            placeholder: 'Поиск в чатах...',
            value: searchTerm,
            onChange: (e) => setSearchTerm(e.target.value),
            className: 'w-full py-2 px-3 pl-10 rounded-lg border focus:outline-none focus:ring-2 transition-all',
            style: { 
              backgroundColor: theme === 'dark' ? '#404040' : 'white',
              borderColor: theme === 'dark' ? '#555' : '#ddd',
              color: theme === 'dark' ? 'white' : 'black'
            },
            key: 'search-input'
          }),
          React.createElement(
            'span',
            { className: 'absolute left-3 top-2.5', key: 'search-icon' },
            '🔍'
          )
        ]
      ),

      // Список чатов
      React.createElement(
        'div',
        { className: 'flex-1 overflow-y-auto', key: 'chat-list' },
        filteredChats.map(chat => 
          React.createElement(
            'div',
            {
              key: chat.id,
              className: \\\`p-3 rounded-lg mb-2 cursor-pointer transition-all group \\\${currentChat?.id === chat.id ? 'ring-2' : ''}\\\`,
              style: { 
                backgroundColor: currentChat?.id === chat.id 
                  ? (theme === 'dark' ? 'rgba(16, 163, 127, 0.2)' : 'rgba(16, 163, 127, 0.1)')
                  : 'transparent',
                border: theme === 'dark' ? '1px solid #404040' : '1px solid #e5e5e5',
                color: theme === 'dark' ? 'white' : 'black'
              },
              onClick: () => setCurrentChat(chat)
            },
            [
              React.createElement(
                'div',
                { className: 'flex justify-between items-start', key: 'content' },
                [
                  React.createElement(
                    'div',
                    { className: 'flex-1 min-w-0', key: 'text' },
                    [
                      React.createElement(
                        'h3',
                        { className: 'font-medium truncate', key: 'title' },
                        chat.title
                      ),
                      React.createElement(
                        'p',
                        {
                          className: 'text-sm opacity-70 truncate mt-1',
                          style: { color: theme === 'dark' ? '#ccc' : '#666' },
                          key: 'preview'
                        },
                        chat.messages[0]?.content || 'Нет сообщений'
                      )
                    ]
                  ),
                  React.createElement(
                    'div',
                    { 
                      className: 'flex opacity-0 group-hover:opacity-100 transition-opacity',
                      key: 'actions'
                    },
                    [
                      React.createElement(
                        'button',
                        {
                          onClick: (e) => {
                            e.stopPropagation();
                            exportChat(chat.id);
                          },
                          className: 'p-1 hover:bg-opacity-20 rounded ml-1',
                          title: 'Экспорт',
                          key: 'export'
                        },
                        '📥'
                      ),
                      React.createElement(
                        'button',
                        {
                          onClick: (e) => {
                            e.stopPropagation();
                            deleteChat(chat.id);
                          },
                          className: 'p-1 hover:bg-opacity-20 rounded ml-1',
                          title: 'Удалить',
                          key: 'delete'
                        },
                        '🗑️'
                      )
                    ]
                  )
                ]
              )
            ]
          )
        )
      )
    ]
  );
};

// ... (остальные компоненты остаются аналогичными, но с React.createElement)

const EclipseProject = () => {
  const { theme } = useApp();

  React.useEffect(() => {
    document.body.style.backgroundColor = theme === 'dark' 
      ? COLORS.background.dark 
      : COLORS.background.light;
    document.body.style.color = theme === 'dark' 
      ? COLORS.text.dark 
      : COLORS.text.light;
  }, [theme]);

  return React.createElement(
    'div',
    { className: 'h-screen flex overflow-hidden' },
    [
      React.createElement(Sidebar, { key: 'sidebar' }),
      React.createElement(
        'div',
        { className: 'flex-1 flex flex-col', key: 'main' },
        [
          React.createElement(
            'div',
            {
              className: 'flex-1 flex flex-col',
              style: { 
                backgroundColor: theme === 'dark' ? COLORS.background.dark : COLORS.background.light
              },
              key: 'chat-area'
            },
            currentChat ? 
              React.createElement(
                'div',
                { className: 'flex-1 overflow-y-auto', key: 'messages' },
                [
                  ...currentChat.messages.map((message, index) =>
                    React.createElement(Message, { key: index, message })
                  ),
                  isLoading && React.createElement(
                    'div',
                    { className: 'flex gap-4 p-6', key: 'loading' },
                    [
                      React.createElement(
                        'div',
                        {
                          className: 'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white',
                          style: { backgroundColor: COLORS.primary },
                          key: 'avatar'
                        },
                        '🤖'
                      ),
                      React.createElement(
                        'div',
                        { className: 'flex-1', key: 'content' },
                        [
                          React.createElement(
                            'div',
                            { className: 'flex items-center gap-2 mb-2', key: 'header' },
                            React.createElement('span', { className: 'font-medium', key: 'name' }, 'Eclipse')
                          ),
                          React.createElement(
                            'div',
                            { className: 'flex space-x-2', key: 'dots' },
                            [
                              React.createElement('div', { className: 'w-2 h-2 rounded-full bg-gray-400 animate-bounce', key: 'dot1' }),
                              React.createElement('div', { className: 'w-2 h-2 rounded-full bg-gray-400 animate-bounce', style: { animationDelay: '0.2s' }, key: 'dot2' }),
                              React.createElement('div', { className: 'w-2 h-2 rounded-full bg-gray-400 animate-bounce', style: { animationDelay: '0.4s' }, key: 'dot3' })
                            ]
                          )
                        ]
                      )
                    ]
                  )
                ]
              ) :
              React.createElement(
                'div',
                {
                  className: 'flex-1 flex flex-col items-center justify-center p-8',
                  key: 'welcome'
                },
                [
                  React.createElement(
                    'div',
                    {
                      className: 'w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl mb-4',
                      style: { backgroundColor: COLORS.primary },
                      key: 'icon'
                    },
                    '🤖'
                  ),
                  React.createElement(
                    'h2',
                    { className: 'text-2xl font-bold mb-4', key: 'title' },
                    'Добро пожаловать в Eclipse Project!'
                  ),
                  React.createElement(
                    'p',
                    {
                      className: 'text-lg opacity-70 text-center max-w-md',
                      key: 'description'
                    },
                    'Бесплатная версия нейросети Claude с расширенным функционалом. Начните новый чат, чтобы общаться с AI-ассистентом.'
                  )
                ]
              )
        ]
      ),
      React.createElement(MessageInput, { key: 'input' }),
      React.createElement(SettingsPanel, { key: 'settings' })
    ]
  );
};

const App = () => {
  return React.createElement(
    AppProvider,
    null,
    React.createElement(EclipseProject)
  );
};

// Запуск приложения
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
`;

// Записываем файлы
writeFileSync('./build/index.html', html);
writeFileSync('./build/app.js', appJs);

console.log('✅ Build completed successfully!');
console.log('📁 Files created:');
console.log('   - build/index.html');
console.log('   - build/app.js');
